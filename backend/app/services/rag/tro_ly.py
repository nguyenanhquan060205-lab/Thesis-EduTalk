"""Truy xuất — dựng khối ngữ cảnh cho một câu hỏi. RAG thuần, một đường duy nhất.

    câu hỏi ──▶ ghép lịch sử ──▶ nhúng ──▶ Chroma top-k ──▶ lọc ngưỡng ──▶ ngữ cảnh

Không có đường tắt nào tra thẳng vào dict. Dữ liệu có cấu trúc (điểm chuẩn, tổ hợp)
vẫn dùng được vì `nguon_co_cau_truc.py` đã viết nó thành văn xuôi ở bước thu thập,
rồi nhúng vào Chroma như mọi tài liệu khác — Chroma là nơi truy vấn duy nhất.

Có một thời điểm ở đây từng có nhánh "tra bảng" (so khớp tên ngành rồi tra dict,
kiểu function calling). Đã gỡ: đề tài là RAG, thêm một đường truy vấn thứ hai làm
kiến trúc mất mạch lạc mà theo số đo cũng không cải thiện gì — truy hồi bằng vector
đạt Hit@1 100% trên cả bốn mức khó, và context precision hai hướng bằng nhau
(0.303). Số liệu so sánh nằm ở docs/KETQUA_RAG.md.
"""

import logging
import re

from app.services.rag.kho import TOP_K, lay_kho

log = logging.getLogger(__name__)

# Chặn câu lạc đề. Không có ngưỡng thì "hôm nay trời thế nào" vẫn kéo về 4 ngành
# ngẫu nhiên rồi nhét vào prompt — model sẽ cố ghép chúng vào câu trả lời.
#
# Hai hằng số dưới ĐO RA, không phải đoán. Chạy 10 câu đúng chủ đề và 8 câu lạc
# đề qua kho 39 ngành, xem khoảng cách của đoạn gần nhất:
#
#     đúng chủ đề   0.162 … 0.286
#     lạc đề        0.384 … 0.491
#                          ↑ khe hở 0.286–0.384, cắt ở giữa
#
# Cosine: 0 là trùng khớp, 1 là không liên quan.
#
# ⚠️ Hai số này gắn với `gemini-embedding-2` ở 768 chiều. Đổi model nhúng hoặc số
# chiều là phải ĐO LẠI — không gian vector khác thì thang khoảng cách cũng khác.
# Chạy lại bằng cách so phân bố hai nhóm câu hỏi như trên.
NGUONG_LAC_DE = 0.35

# Đoạn gần nhất đã hợp lệ thì những đoạn còn lại chỉ được cách nó chừng này. Giữ
# nguyên top-k cứng sẽ luôn nhồi đủ 4 đoạn kể cả khi chỉ có 1 đoạn thật sự liên
# quan — 3 đoạn thừa làm loãng ngữ cảnh và dụ model trả lời nhầm ngành.
BIEN_DO = 0.12

# Số lượt hỏi cũ của NGƯỜI DÙNG ghép vào trước câu hỏi ngắn. 2 là đủ để bắt được
# "ngành nào" của lượt trước; nhiều hơn thì kéo cả chủ đề đã bỏ dở vào.
SO_LUOT_GHEP = 2

# Không để một LOẠI tài liệu chiếm hết chỗ trong prompt.
#
# Kho có 39 chunk `nganh` viết theo cùng một khuôn ("Ngành X, mã ngành …, Trường Đại
# học Công Thương TP.HCM (HUIT). Ngành này thuộc nhóm … Các tổ hợp xét tuyển …"). Câu
# nào về tuyển sinh HUIT chúng cũng hợp một chút, mà có tới 39 cái cùng hợp một chút —
# nên chúng thắng vì ĐÔNG, không vì đúng hơn. Đo ngày 20/09/2026, câu "Điểm thi đánh
# giá năng lực có xét vào HUIT được không?" lấy về đúng 4 chunk `nganh`, trong khi
# đoạn trả lời được nằm ở hạng 9.
#
# Cách chữa: lấy dư ứng viên rồi chọn lại, mỗi loại tối đa 2 đoạn. Không đụng vào
# `truy_xuat()` — đó là phép tìm láng giềng thuần, phải giữ nguyên để trang quản trị
# và script đo thấy đúng thứ hạng thật. Chọn lọc là CHÍNH SÁCH, thuộc về chỗ dựng
# ngữ cảnh.
TOI_DA_MOI_LOAI = 2
HE_SO_UNG_VIEN = 5  # lấy k×5 rồi mới lọc, cho phép đoạn hạng sâu có cơ hội

# Chữ mở đầu của câu hỏi NỐI TIẾP — câu dựa vào lượt trước thay vì tự nêu lại chủ ngữ
# ("về học phí…", "còn điểm chuẩn thì sao", "vậy ngành đó học mấy năm"). Chỉ xét ở
# ĐẦU câu: giữa câu thì "về" là giới từ bình thường ("học về lập trình").
RE_NOI_TIEP = re.compile(
    r"^\s*(?:v[ềe]|c[òo]n|th[ếe]|v[ậa]y|ngo[àa]i\s*ra|n[óo]|"
    r"c[áa]i\s*(?:đ|d)[óo]|ng[àa]nh\s*(?:n[àa]y|(?:đ|d)[óo])|(?:đ|d)i[ềe]u\s*(?:đ|d)[óo])\b",
    re.I,
)


class NguCanh:
    def __init__(self, doan: list[dict]):
        self.doan = doan

    def __bool__(self) -> bool:
        return bool(self.doan)

    def van_ban(self) -> str:
        """Khối ngữ cảnh chèn vào prompt.

        Ghi rõ nguồn ngay trên từng đoạn để model trích dẫn được, và để lúc bot
        trả lời sai thì lần ngược ra được đoạn nào gây ra.
        """
        khoi = []
        for i, d in enumerate(self.doan, 1):
            khoi.append(f"[{i}] (Nguồn: {self._nhan(d['meta'])})\n{d['noi_dung']}")
        return "\n\n".join(khoi)

    @staticmethod
    def _nhan(m: dict) -> str:
        """Nhãn nguồn tới cấp MỤC, không chỉ tên tài liệu.

        "Đề án tuyển sinh HUIT 2026 — Điều kiện xét tuyển" cho thí sinh biết mở
        trang nào ra kiểm chứng; nêu trống tên tài liệu 80 trang thì coi như
        không trích dẫn.
        """
        nhan = m.get("nguon", "?")
        if m.get("muc"):
            nhan += f" — {m['muc']}"
        if m.get("nam"):
            nhan += f", năm {m['nam']}"
        return nhan

    def nguon(self) -> list[str]:
        """Danh sách nguồn để phía web hiển thị — gộp trùng theo (tài liệu, mục).

        Gộp theo (tài liệu, mục) chứ không theo nhãn đầy đủ: hai chunk cùng một
        mục nhưng khác `nam` sẽ ra hai dòng gần y hệt, chỉ khác đuôi ", năm 2026" —
        nhìn như lỗi hiển thị.
        """
        ra: list[str] = []
        da_co: set[tuple] = set()
        for d in self.doan:
            m = d["meta"]
            khoa = (m.get("nguon"), m.get("muc"))
            if khoa in da_co:
                continue
            da_co.add(khoa)
            ra.append(self._nhan(m))
        return ra

    def tom_tat_log(self) -> str:
        return " · ".join(
            f"{d['meta'].get('nganh') or d['meta'].get('tep', '?')} "
            f"({d['khoang_cach']:.3f})"
            for d in self.doan
        )


def ghep_lich_su(cau_hoi: str, lich_su: list[dict] | None) -> str:
    """Ghép vài lượt gần nhất vào trước câu hỏi để đi truy xuất.

    VÌ SAO CẦN: thí sinh hỏi *"Ngành CNTT thế nào?"* rồi lượt sau chỉ gõ
    *"2026"*. Nhúng riêng chữ "2026" cho ra một vector vô nghĩa — không ngành nào
    gần nó cả, và ngưỡng lạc đề sẽ vứt sạch ngữ cảnh. Model vẫn trả lời được (nó
    thấy `history`), nhưng trả lời **không có dữ liệu**, tức là bịa.

    Chỉ lấy lượt của NGƯỜI DÙNG, không lấy câu bot trả lời: câu bot dài, nhiều
    chữ thừa, ghép vào sẽ dìm mất mấy chữ ngắn ngủi của câu hỏi thật.

    Ghép khi câu hỏi NGẮN (< 8 từ) HOẶC mở đầu bằng chữ nối tiếp. Câu dài mà tự nêu
    chủ ngữ thì thôi, vì ghép thêm lịch sử chỉ kéo vector lệch về chủ đề cũ — thí sinh
    vừa đổi sang hỏi ngành khác thì lại lôi ngành cũ về.

    ⚠️ Chỉ đếm độ dài là KHÔNG ĐỦ. Đo thật trên web: sau khi hỏi về ngành Công nghệ
    thông tin, thí sinh gõ tiếp *"về học phí cho đến khi ra trường là bao nhiêu ?"* —
    12 từ nên không ghép lịch sử, mà câu đó **không có chủ ngữ**. Vector đi truy xuất
    không mang tên ngành nào, kho trả về học phí của Công nghệ tài chính, Ngôn ngữ Anh,
    Tài chính ngân hàng, và bot đáp "chưa có dữ liệu học phí" dù kho có đủ 39 ngành.
    Độ dài không đo được tính tự đủ nghĩa.

    Nhận diện bằng dấu hiệu NGÔN NGỮ, không tra danh sách ngành: đường truy xuất của
    chatbot là thuần vector, thêm một nhánh so khớp từ khoá vào đây là phá đúng thứ
    `bo_dau()` bên `nguon_co_cau_truc.py` dặn đừng làm.
    """
    if not lich_su:
        return cau_hoi
    ngan = len(cau_hoi.split()) < 8
    if not (ngan or RE_NOI_TIEP.match(cau_hoi)):
        return cau_hoi
    truoc = [
        m.get("text", "") for m in lich_su if m.get("role") == "user"
    ][-SO_LUOT_GHEP:]
    return " ".join([*truoc, cau_hoi]).strip() if truoc else cau_hoi


def lay_ngu_canh(
    cau_hoi: str,
    k: int = TOP_K,
    lay_ve: list[dict] | None = None,
    lich_su: list[dict] | None = None,
) -> NguCanh:
    """`lay_ve`: kết quả truy xuất đã có sẵn, để script đo khỏi nhúng câu hỏi hai
    lần. Bỏ trống thì tự truy xuất — đường đi bình thường của backend."""
    doan: list[dict] = []
    truy_van = ghep_lich_su(cau_hoi, lich_su)
    if truy_van != cau_hoi:
        log.info("Ghép lịch sử để truy xuất: %r", truy_van[:80])

    # ── Truy xuất ngữ nghĩa — ĐƯỜNG DUY NHẤT
    if lay_ve is None:
        lay_ve = lay_kho().truy_xuat(truy_van, k * HE_SO_UNG_VIEN)
    if lay_ve and lay_ve[0]["khoang_cach"] <= NGUONG_LAC_DE:
        tran = lay_ve[0]["khoang_cach"] + BIEN_DO
        dem: dict[str, int] = {}
        for d in lay_ve:
            if d["khoang_cach"] > tran:
                break  # Chroma đã trả về theo thứ tự gần dần
            loai = d["meta"].get("loai", "?")
            if dem.get(loai, 0) >= TOI_DA_MOI_LOAI:
                continue  # loại này đủ chỗ rồi, nhường cho loại khác
            dem[loai] = dem.get(loai, 0) + 1
            doan.append(d)
            if len(doan) >= k:
                break
    elif lay_ve:
        log.info(
            "Câu lạc đề (gần nhất %.3f > %.2f) — trả lời không có ngữ cảnh",
            lay_ve[0]["khoang_cach"], NGUONG_LAC_DE,
        )

    nc = NguCanh(doan)
    log.info("RAG · %d đoạn · %s", len(doan), nc.tom_tat_log() or "không có")
    return nc
