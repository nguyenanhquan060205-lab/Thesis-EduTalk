"""Đọc tài liệu văn xuôi `.md` trong `backend/data/kho_tri_thuc/` và chia chunk.

Nguồn văn xuôi của kho: điều kiện xét tuyển, học bổng, cơ hội việc làm, chương
trình đào tạo. Khác với JSON tuyển sinh (đã có cấu trúc sẵn), mấy tài liệu này là
văn bản tự do nên phải qua đủ bước làm sạch và chia chunk.
"""

import hashlib
import logging
import pathlib
import re

from app.core import paths

log = logging.getLogger(__name__)

THU_MUC = paths.KHO_TRI_THUC

# Trần cứng của bộ nhúng là 8.192 token. Cắt sớm hơn nhiều vì một chunk ôm nhiều
# chủ đề sẽ cho vector "trung bình cộng" của mọi chủ đề — không sát cái nào cả.
TU_TOI_DA = 1200
TU_TOI_THIEU = 25  # đoạn ngắn hơn thì gộp vào đoạn trước, đứng riêng là vô nghĩa

# Chồng lấn (overlap): đuôi của chunk trước lặp lại ở đầu chunk sau, để thông tin
# nằm đúng chỗ ranh giới không bị cắt rời khỏi cả hai bên.
#
# ⚠️ Đánh đổi, không phải lợi ích thuần: phần lặp cũng đi vào vector, nên chunk
# càng ngắn thì phần lặp càng chiếm tỉ trọng lớn và kéo vector của chunk sau lệch
# về phía chủ đề của chunk trước. 25 từ trên nền chunk 80–300 từ là khoảng 10–25%
# — chấp nhận được. Đừng nâng lên khi chưa đo.
#
# Chưa đo được ích lợi thật vì kho hiện chỉ có 39 chunk sinh từ JSON, mà mỗi chunk
# đó đã tự chứa đủ nghĩa nên không đi qua đường này. Có tài liệu văn xuôi thật rồi
# thì đo bằng `scripts/kiem_truy_hoi.py`, bật/tắt hằng số này để so.
TU_CHONG_LAN = 25

# `loai` suy ra từ TÊN THƯ MỤC, không phải từ phần đầu file. Một chỗ khai báo thì
# không có chuyện thư mục ghi một đằng phần đầu file ghi một nẻo — mà kiểu lệch đó
# thì code không báo lỗi, chỉ làm bộ lọc theo loại trả về thiếu tài liệu.
LOAI_HOP_LE = {
    "xet_tuyen": "phương thức và điều kiện xét tuyển",
    "ho_so": "hồ sơ, thủ tục, thời gian nộp và nhập học",
    "ho_tro": "học bổng, miễn giảm học phí, vay vốn",
    "hoc_phi": "học phí toàn khoá theo ngành",
    "quy_che": "quy chế đào tạo, điều kiện tốt nghiệp",
    "nghe_nghiep": "cơ hội việc làm theo ngành",
    "ctdt": "chương trình đào tạo theo ngành",
}

TRUONG_BAT_BUOC = ("nam", "nguon")


def tach_dau_file(van_ban: str) -> tuple[dict, str]:
    """Tách khối `---` ở đầu file thành dict.

    Tự viết thay vì kéo thêm PyYAML: mọi trường ở đây đều là giá trị đơn
    (`loai: dieu_kien`), không có danh sách hay lồng nhau. Thêm một thư viện chỉ
    để đọc sáu dòng khoá-giá-trị là không đáng, nhất là khi vừa mới phải gỡ một
    mớ xung đột phiên bản.
    """
    if not van_ban.startswith("---"):
        return {}, van_ban
    het = van_ban.find("\n---", 3)
    if het == -1:
        return {}, van_ban
    dau, than = van_ban[3:het], van_ban[het + 4 :]
    meta = {}
    for dong in dau.splitlines():
        dong = dong.split("#")[0].strip()
        if not dong or ":" not in dong:
            continue
        k, v = dong.split(":", 1)
        v = v.strip().strip("\"'")
        if v in ("null", "~", ""):
            continue
        meta[k.strip()] = int(v) if v.isdigit() else v

    # Tài liệu theo ngành khai `nganh: "7480201"`, còn cả hệ thống tra `ma_nganh`
    # (nguon_co_cau_truc.py đặt tên đó, danh_gia.py và bộ lọc theo ngành đều theo).
    # Không quy về một tên thì chunk chương trình đào tạo tuy ĐÚNG ngành vẫn bị
    # coi như không thuộc ngành nào: bài đo truy hồi chấm trượt, còn lọc theo
    # ngành thì bỏ sót — cả hai đều im lặng.
    #
    # Ép về CHUỖI: dấu nháy trong front-matter hay bị rơi, lúc đó `int(v)` biến nó
    # thành số và `7480201 == "7480201"` là False.
    if "nganh" in meta and "ma_nganh" not in meta:
        meta["ma_nganh"] = str(meta["nganh"])
    return meta, than


def chia_chunk(than: str) -> list[tuple[str, str]]:
    """Chia theo ĐOẠN VĂN, mỗi chunk mang theo tiêu đề mục chứa nó.

    Mang theo tiêu đề vì mỗi chunk sẽ được nhúng độc lập và lúc truy xuất nó
    đứng một mình. Đoạn *"Thí sinh phải nộp trước ngày 30/6"* mà tách khỏi tiêu
    đề *"Xét học bạ"* thì không ai biết nó nói về phương thức nào.

    Trả về (nội dung, tiêu đề mục) — tiêu đề đi vào metadata `muc` để trích dẫn
    được tới cấp mục, kiểu "Nguồn: Đề án tuyển sinh 2026 — Điều kiện xét tuyển",
    chứ không chỉ nêu trống tên tài liệu.
    """
    chunks: list[tuple[str, str]] = []
    tieu_de = ""
    duoi_truoc = ""  # phần đuôi của chunk trước, để chồng lấn sang chunk sau

    for khoi in re.split(r"\n\s*\n", than):
        khoi = khoi.strip()
        if not khoi:
            continue
        if khoi.startswith("#"):
            # Sang mục mới thì CẮT chuỗi chồng lấn. Kéo đuôi của mục "Điều kiện
            # xét tuyển" sang đầu mục "Học phí" chỉ làm nhoè vector của cả hai.
            tieu_de = khoi.lstrip("#").strip()
            duoi_truoc = ""
            continue

        tu_goc = khoi.split()

        if len(tu_goc) < TU_TOI_THIEU and chunks:
            noi_dung, muc = chunks[-1]
            chunks[-1] = (noi_dung + "\n" + khoi, muc)
            continue

        dau = ([f"{tieu_de}."] if tieu_de else []) + (
            duoi_truoc.split() if duoi_truoc else []
        )
        tu = dau + tu_goc

        # Đoạn dài quá thì cắt tiếp, chỗ cắt cũng chồng lấn.
        while len(tu) > TU_TOI_DA:
            chunks.append((" ".join(tu[:TU_TOI_DA]), tieu_de))
            tu = ([f"{tieu_de}."] if tieu_de else []) + tu[TU_TOI_DA - TU_CHONG_LAN :]
        chunks.append((" ".join(tu), tieu_de))
        duoi_truoc = " ".join(tu_goc[-TU_CHONG_LAN:])

    return chunks


def doc_tat_ca(thu_muc: pathlib.Path | None = None) -> list[tuple[str, str, dict]]:
    """Trả về danh sách (id, nội dung, metadata) của mọi tài liệu văn xuôi.

    Bỏ qua file bắt đầu bằng `_` (file mẫu) và `README.md` (hướng dẫn cho người,
    không phải tri thức cho bot) — nạp nhầm thì bot sẽ đi tư vấn thí sinh về cách
    chuẩn bị dữ liệu RAG.
    """
    thu_muc = thu_muc or THU_MUC
    if not thu_muc.exists():
        return []

    ra: list[tuple[str, str, dict]] = []
    da_thay: set[str] = set()

    for f in sorted(thu_muc.rglob("*.md")):
        if f.name.startswith("_") or f.name.lower() == "readme.md":
            continue

        # Loại = thư mục ngay dưới `kho_tri_thuc/`. File nào nằm lẫn ở thư mục
        # gốc thì bỏ qua chứ không đoán bừa — đoán sai loại thì bộ lọc theo chủ
        # đề âm thầm trả về thiếu tài liệu.
        tuong_doi = f.relative_to(thu_muc)
        loai = tuong_doi.parts[0] if len(tuong_doi.parts) > 1 else ""
        if loai not in LOAI_HOP_LE:
            log.warning(
                "BỎ QUA %s — phải nằm trong một thư mục loại: %s",
                tuong_doi, ", ".join(sorted(LOAI_HOP_LE)),
            )
            continue

        meta, than = tach_dau_file(f.read_text(encoding="utf-8"))

        thieu = [t for t in TRUONG_BAT_BUOC if t not in meta]
        if thieu:
            # Không nạp bừa. Tài liệu thiếu `nam` sẽ khiến bot trích số của năm
            # cũ mà nghe vẫn hoàn toàn hợp lý — sai kiểu không ai phát hiện được.
            log.warning("BỎ QUA %s — thiếu trường bắt buộc: %s", tuong_doi, ", ".join(thieu))
            continue

        if meta.get("loai") and meta["loai"] != loai:
            log.warning(
                "%s: phần đầu file ghi loai=%r nhưng nằm trong thư mục %r — "
                "lấy theo thư mục", tuong_doi, meta["loai"], loai,
            )
        meta["loai"] = loai

        for i, (c, muc) in enumerate(chia_chunk(than)):
            bam = hashlib.sha256(" ".join(c.split()).encode()).hexdigest()[:16]
            if bam in da_thay:
                # Đề án tuyển sinh và website trường thường chép lại nhau nguyên
                # đoạn. Hai chunk gần trùng sẽ chiếm hết top-k, đẩy thông tin
                # khác ra ngoài.
                log.info("Bỏ chunk trùng trong %s (đoạn %d)", f.name, i + 1)
                continue
            da_thay.add(bam)
            sieu = {**meta, "tep": str(tuong_doi), "bam": bam}
            if muc:
                sieu["muc"] = muc
            # Kèm loại vào id: `ctdt/7480201.md` và `nghe_nghiep/7480201.md` cùng
            # tên file, không kèm loại thì hai chunk đè lên nhau trong Chroma.
            ra.append((f"{loai}-{f.stem}-{i}", c, sieu))

    return ra
