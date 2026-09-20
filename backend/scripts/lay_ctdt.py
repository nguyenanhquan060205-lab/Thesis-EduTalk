"""Tải chương trình đào tạo 39 ngành (HTML · PDF · Google Drive) → `kho_tri_thuc/ctdt/`.

    conda activate Edutalk
    cd backend
    python scripts/doc_danh_sach_link.py        # bước 0: .md của người → .json
    python scripts/lay_ctdt.py --tai            # bước 1: tải mọi nguồn về đệm
    python scripts/lay_ctdt.py --trich          # bước 2: trích → .md
    python scripts/lay_ctdt.py --trich --ma 7520115   # làm thử MỘT ngành

Nguồn: `data/co_cau_truc/nguon_ctdt.json`, sinh từ
`docs/RAG_docs/danh_s_ch_ng_nh_o_t_o_huit.md`. Sửa link thì sửa file `.md` rồi chạy
lại `doc_danh_sach_link.py`.

LÀM MỘT NGÀNH TRƯỚC. `data/kho_tri_thuc/README.md` nói rõ: đừng chuẩn bị hết 39 ngành
rồi mới nạp. Làm 2–3 ngành, chạy `nap_kho.py`, hỏi thử, xem lấy đúng đoạn không, chỉnh
cách viết — ổn rồi mới đổ hàng loạt. Chuẩn bị xong hết mới phát hiện chunk chia sai thì
phải làm lại từ đầu. Cờ `--ma` có là vì vậy.

MỖI MỤC MANG LINK RIÊNG. Một ngành có nhiều nguồn (tổng quan · chuẩn đầu ra · tiến độ
kỹ sư · tiến độ cử nhân). `tai_lieu.py` cắt chunk theo tiêu đề `##`, nên mỗi mục thành
một chunk; link đặt trong thân mục sẽ đi theo chunk vào Chroma và model trích dẫn được
đúng nguồn của đoạn nó dùng.

KHÔNG tự nạp vào kho. Script chỉ sinh `.md` và in báo cáo — đọc bằng mắt rồi mới chạy
`nap_kho.py`. Số sai trong kho thì chatbot đọc ra kèm dòng "Nguồn:", nghe đáng tin hơn
cả lúc không có RAG.
"""

import argparse
import hashlib
import json
import pathlib
import re
import sys
import time
import unicodedata
from datetime import date

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

F_NGUON = GOC / "data" / "co_cau_truc" / "nguon_ctdt.json"
F_TUYEN_SINH = GOC / "data" / "co_cau_truc" / "tuyen_sinh_huit_2026.json"
THU_MUC_RA = GOC / "data" / "kho_tri_thuc" / "ctdt"
DEM = GOC / "data" / ".dem_ctdt"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 EduTalk-RAG"
NGHI = 0.8  # giây giữa hai lần gọi — đừng dội vào máy chủ của trường

# Viết đủ "Học kỳ 6:" hay viết tắt "HK7 (Học kỳ doanh nghiệp):" — cùng một thứ. Ngành
# Điều khiển & TĐH dùng cả hai kiểu trong MỘT tài liệu: HK1–6 viết đủ, HK7–8 viết tắt.
# Chỉ nhận kiểu đầu thì hai học kỳ cuối dồn hết vào mục học kỳ 6 (82 TC thay vì 19).
RE_HOC_KY = re.compile(r"(?:h[ọo]c\s*k[ỳy]|\bHK)\s*\d+", re.I)

# Học phần trong PDF: "0101100651 11200001 Triết học Mác - Lênin 3(3,0)".
# Mốc neo là `N(a,b)` — chắc chắn là số tín chỉ. KHÔNG bắt số trần: mã học phần cũng
# toàn chữ số, lấy nhầm thì ra "Triết học Mác – Lênin (0101100651 tín chỉ)".
# `\s*` trước ngoặc là bắt buộc: khoa viết "3(3,0)", khoa khác viết "2 (1,1)". Thiếu
# nó thì cả một ngành chỉ rút được 1 học phần mà script vẫn báo "✅ có danh sách".
# Cột mã: khoa Cơ khí/Luật in HAI cột ("0101100651 11200001 Triết học..."), khoa Thực
# phẩm chỉ in MỘT ("0101100651 Triết học..."). Bắt cứng hai cột thì cả khoa Thực phẩm
# ra 0 học phần, mà mốc "Học kỳ N" vẫn cắt được nên báo cáo hiện "6 học kỳ/6 học phần"
# trông như có dữ liệu. Cột thứ hai để tuỳ chọn.
RE_HP_PDF = re.compile(r"\d{6,10}(?:\s+\d{6,10})?\s+(.+?)\s*(\d{1,2})\s*\(\d+\s*,\s*\d+\)")
# Học phần trong bảng HTML: ô "3 (3,0)" hoặc ô toàn số 1..12
RE_TC_NGOAC = re.compile(r"^\s*([1-9]|1[0-2])\s*\(")
RE_TC_TRAN = re.compile(r"^\s*([1-9]|1[0-2])\s*$")
RE_DONG_NHOM = re.compile(r"^h[ọo]c\s*ph[ầa]n\s*(b[ắa]t\s*bu[ộo]c|t[ựu]\s*ch[ọo]n)", re.I)


def chuan_hoa(s: str) -> str:
    """Đưa mọi văn bản nguồn về NFC trước khi đem so khớp.

    Trang của trường soạn bằng Word nên trong CÙNG một bảng có hai kiểu mã hoá: dòng
    này "ỳ" là U+1EF3 dựng sẵn, dòng kia là "y" + U+0300 dấu rời. Nhìn trên màn hình
    giống hệt nhau, nhưng `[ỳy]` chỉ khớp kiểu thứ nhất. Trang Kế toán vì thế mất
    trắng học kỳ 5, 6, 7 của cả ba chuyên ngành — 10 mục dồn hết vào mục học kỳ 4
    cuối cùng, mà báo cáo vẫn ghi "✅ có danh sách học phần".
    """
    return unicodedata.normalize("NFC", s).replace("\xa0", " ")


def khong_dau(s: str) -> str:
    # `đ` phải đổi tay: nó là MỘT ký tự riêng (U+0111), không phải "d" cộng dấu, nên
    # NFD không tách được. Thiếu dòng này thì tên tệp ra "cong_nghe_ky_thuat_ien_ien_tu"
    # thay vì "..._dien_dien_tu", và mọi phép so tên ngành có chữ đ đều trượt.
    return "".join(
        c
        for c in unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
        if unicodedata.category(c) != "Mn"
    )


def ten_tep(ma: str, ten: str) -> str:
    return f"{ma}_{re.sub(r'[^a-z0-9]+', '_', khong_dau(ten)).strip('_')}.md"


def ten_cac_nganh() -> dict[str, str]:
    return {
        ma: m["ten"]
        for ma, m in json.loads(F_TUYEN_SINH.read_text(encoding="utf-8"))["nganh"].items()
    }


# ── Bước 1: tải ──────────────────────────────────────────────────────────────


# Trang khoa hay nhúng PDF qua trình xem: `doc.huit.edu.vn/vpdf/?url=<pdf thật>`.
# Chỉ tải HTML thì được cái vỏ, không có chữ nào của chương trình đào tạo.
RE_PDF_NHUNG = re.compile(r"""['"(]([^'"()<>\s]*\.pdf)""", re.I)
RE_VPDF = re.compile(r"""vpdf/\?url=([^'"&<>\s]+)""", re.I)

# Link `.pdf` trần trong trang phần lớn là thông báo ở cột bên (học phí, rèn luyện,
# tuần sinh hoạt). Chỉ nhận tên tệp có mùi chương trình đào tạo. Link trong trình xem
# `vpdf` thì nhận vô điều kiện — nó chính là nội dung trang.
TU_KHOA_CTDT = ("ctdt", "chuong-trinh", "chuong_trinh", "dao-tao", "dao_tao",
                "tien-do", "tien_do", "chuan-dau-ra", "chuan_dau_ra", "khung")


# Trang khoa để nguyên kho lưu trữ chương trình các khoá trước (`...cdt-2016.pdf`,
# `...cdt-2017.pdf`, `...2020_ctm.pdf`). Chúng cũng có "chuong-trinh-dao-tao" trong tên
# nên lọt bộ lọc từ khoá, rồi vào kho thành bộ "Học kỳ 1..6" thứ hai với số liệu khác
# hẳn — thí sinh hỏi học kỳ 1 học gì sẽ nhận hai câu trả lời chọi nhau.
RE_NAM_TEP = re.compile(r"(?:^|[^\d])(20[0-2]\d)(?:[^\d]|$)")


def nam_trong_ten(url: str) -> int | None:
    m = RE_NAM_TEP.findall(url.rsplit("/", 1)[-1])
    return max(int(x) for x in m) if m else None


def loc_ban_cu(ung_vien: list[str], links: list[dict]) -> list[str]:
    """Bỏ PDF nhúng có năm trong tên cũ hơn bản mới nhất mà ngành này đang có.

    Chỉ lọc khi biết chắc năm: tệp không ghi năm thì giữ, vì phần lớn tệp không ghi
    năm là bản hiện hành. Link do người soạn liệt kê luôn được coi là bản chuẩn.
    """
    nam = [n for u in ung_vien + [x["url"] for x in links] if (n := nam_trong_ten(u))]
    if not nam:
        return ung_vien
    moi_nhat = max(nam)
    return [u for u in ung_vien if (nam_trong_ten(u) or moi_nhat) >= moi_nhat]


def tim_pdf_nhung(html: str, goc: str) -> list[str]:
    from urllib.parse import unquote, urljoin

    ra = []
    for u, chac_chan in [(u, True) for u in RE_VPDF.findall(html)] + [
        (u, False) for u in RE_PDF_NHUNG.findall(html)
    ]:
        u = unquote(u)
        if "vpdf" in u.lower():
            continue
        if not chac_chan and not any(t in u.lower() for t in TU_KHOA_CTDT):
            continue
        day_du = urljoin(goc, u)
        if day_du not in ra:
            ra.append(day_du)
    return ra[:3]


def tai_ve(nguon: dict, chi_ma: str | None) -> None:
    import httpx

    ten_nganh = ten_cac_nganh()
    ds = {k: v for k, v in nguon["nganh"].items() if not chi_ma or k == chi_ma}
    print(f"Tải {len(ds)} ngành về {DEM.relative_to(GOC)}/\n")

    for i, (ma, links) in enumerate(ds.items(), 1):
        thu_muc = DEM / ma
        thu_muc.mkdir(parents=True, exist_ok=True)
        ghi_chu, moi, hong, bo = [], 0, 0, 0
        da_co: dict[str, str] = {}  # sha256 → tên tệp đã nhận, để loại bản trùng

        def nhan_trung(f: pathlib.Path, muc: dict) -> bool:
            """Đánh dấu tệp trùng nội dung với tệp đã nhận trước đó của cùng ngành.

            Trang khoa nhúng đúng cái PDF mà danh sách link cũng trỏ thẳng tới, nên
            một chương trình vào kho hai lần. Không chặn thì file `.md` có hai bộ
            "Học kỳ 1..6" y hệt nhau, chatbot lấy về hai đoạn trùng và bỏ mất chỗ cho
            đoạn khác. So theo nội dung chứ không theo URL — hai URL khác nhau vẫn
            có thể là một tệp.
            """
            if not f.exists():
                return False
            h = hashlib.sha256(f.read_bytes()).hexdigest()
            if h in da_co and da_co[h] != f.name:
                muc["trung"] = da_co[h]
                return True
            da_co.setdefault(h, f.name)
            return False

        def tai_mot(f: pathlib.Path, url: str, la_pdf: bool) -> str | None:
            """Tải một URL vào `f`. Trả về thông điệp lỗi, hoặc None nếu xong."""
            if f.exists() and f.stat().st_size > 2000:
                return None
            try:
                r = httpx.get(url, headers={"User-Agent": UA}, timeout=60,
                              follow_redirects=True)
                r.raise_for_status()
                # Drive đôi khi trả trang cảnh báo HTML thay vì file
                if la_pdf and r.content[:4] != b"%PDF":
                    return "Máy chủ trả HTML, không phải PDF"
                f.write_bytes(r.content)
                time.sleep(NGHI)
            except Exception as e:  # noqa: BLE001 — một link hỏng không chặn phần còn lại
                return f"{type(e).__name__}: {str(e)[:60]}"
            return None

        for j, lk in enumerate(links):
            la_pdf = lk["kieu"] in ("pdf", "drive")
            f = thu_muc / f"{j:02d}.{'pdf' if la_pdf else 'html'}"
            ghi_chu.append({"tep": f.name, **lk})
            co_truoc = f.exists()
            if loi := tai_mot(f, lk["tai"], la_pdf):
                hong += 1
                ghi_chu[-1]["loi"] = loi
                continue
            moi += not co_truoc

            bo += nhan_trung(f, ghi_chu[-1])

            if la_pdf or not f.exists():
                continue
            # Trang chỉ là cái vỏ bọc trình xem PDF → lấy luôn PDF bên trong
            html = f.read_text(encoding="utf-8", errors="ignore")
            for k, u in enumerate(loc_ban_cu(tim_pdf_nhung(html, lk["url"]), links)):
                fp = thu_muc / f"{j:02d}n{k}.pdf"
                ghi_chu.append(
                    {"tep": fp.name, "nhan": f"{lk['nhan']} (PDF nhúng)",
                     "url": u, "tai": u, "kieu": "pdf"}
                )
                co_truoc = fp.exists()
                if loi := tai_mot(fp, u, True):
                    hong += 1
                    ghi_chu[-1]["loi"] = loi
                    continue
                moi += not co_truoc
                if nhan_trung(fp, ghi_chu[-1]):
                    bo += 1

        ghi_chu = [x for x in ghi_chu if not x.get("trung")]
        (thu_muc / "manifest.json").write_text(
            json.dumps(ghi_chu, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        ten = ten_nganh.get(ma, ma)
        print(f"  {i:2d}/{len(ds)} {ma} {ten[:30]:32} {len(links)} link · mới {moi}"
              + (f" · bỏ trùng {bo}" if bo else "")
              + (f" · hỏng {hong}" if hong else ""))


# ── Bước 2: trích ────────────────────────────────────────────────────────────


def doc_bang_html(html: str):
    from bs4 import BeautifulSoup

    ra = []
    for b in BeautifulSoup(html, "html.parser").find_all("table"):
        hang = []
        for h in b.find_all("tr"):
            o = [
                chuan_hoa(c.get_text(" ", strip=True)).strip()
                for c in h.find_all(["td", "th"])
            ]
            if any(o):
                hang.append(o)
        if hang:
            ra.append(hang)
    return ra


def hoc_ky_tu_bang(b) -> list[tuple[str, list[tuple[str, str]]]]:
    ra, hien_tai, nhan = [], [], None
    for h in b:
        gop = " ".join(h)
        if RE_HOC_KY.search(gop) and len(gop) < 120:
            if nhan:
                ra.append((nhan, hien_tai))
            nhan, hien_tai = gop.strip(" .|"), []
            continue
        if nhan is None or len(h) < 3:
            continue
        ten = max((o for o in h if re.search(r"[A-Za-zÀ-ỹ]", o)), key=len, default="")
        tc = next((m.group(1) for o in h if o != ten and (m := RE_TC_NGOAC.match(o))), "")
        if not tc:
            tc = next((m.group(1) for o in h if o != ten and (m := RE_TC_TRAN.match(o))), "")
        if len(ten) >= 4 and tc and not RE_HOC_KY.search(ten) and not RE_DONG_NHOM.match(ten):
            hien_tai.append((ten, tc))
    if nhan:
        ra.append((nhan, hien_tai))
    return [(n, hp) for n, hp in ra if hp]


def hoc_ky_tu_pdf(van_ban: str) -> list[tuple[str, list[tuple[str, str]]]]:
    """Cắt theo mốc 'Học kỳ N' rồi bắt học phần TRONG từng khối.

    Cắt trước khi bắt là cố ý: phần đầu tài liệu thường có bảng danh mục học phần toàn
    khoá, bắt thẳng trên cả văn bản sẽ gom luôn bảng đó và nhân đôi số môn.
    """
    # Ngoặc chen giữa số và dấu hai chấm: "Học kỳ 7 (Cấp bằng cử nhân):",
    # "Học kỳ 7 (Cấp bằng kỹ sư):", "Học kỳ 8 (Học kỳ doanh nghiệp):". Đòi dấu `:`
    # dính liền số thì mất trắng ba khối này — ngành Chế tạo máy hụt đúng 47 tín chỉ
    # mà vẫn báo "✅ có danh sách học phần". Dấu `:` vẫn bắt buộc, nếu không thì câu
    # văn xuôi kiểu "bố trí giảng dạy vào học kỳ 7)" cũng thành một mốc.
    moc = list(
        re.finditer(r"(?:H[ọo]c\s*k[ỳy]|\bHK)\s*\d+\s*(?:\([^)]{0,60}\))?\s*:", van_ban, re.I)
    )
    ra = []
    for i, m in enumerate(moc):
        dau = m.end()
        cuoi = moc[i + 1].start() if i + 1 < len(moc) else len(van_ban)
        # Nhãn = phần chữ ngay sau "Học kỳ N:", cắt ngay khi bắt đầu phần bảng —
        # tức ở mã học phần đầu tiên (10 chữ số) HOẶC dòng nhóm "Học phần bắt buộc".
        # 110 ký tự là quá chặt: nhãn HK7 của ngành Điều khiển & TĐH ghi cả hai mức
        # ("15 tín chỉ ... cử nhân - hoặc 23 tín chỉ ... kỹ sư"), cắt ở 110 thì mất
        # vế kỹ sư và tổng toàn khoá cộng ra 143 thay vì 151. Phần cắt thật là mấy
        # mốc ở dưới, con số này chỉ là chặn trên cho trường hợp không có mốc nào.
        duoi = van_ban[dau:cuoi][:240]
        # Thêm "TT Mã" / "Tên học phần": sang trang mới, PDF lặp lại dòng tiêu đề bảng
        # ngay sau mốc học kỳ, không cắt thì nó dính vào tiêu đề mục.
        nhan = re.split(
            r"\d{10}|H[ọo]c\s*ph[ầa]n\s+(?:b[ắa]t|t[ựu])|TT\s+M[ãa]|T[êe]n\s+h[ọo]c\s*ph[ầa]n",
            duoi,
        )[0]
        nhan = re.sub(r"\s+", " ", m.group() + nhan).strip(" :·|.")
        nhan = re.sub(r"\s+\d{1,3}$", "", nhan)  # số trang lạc vào cuối nhãn
        hp = []
        for ten, tc in RE_HP_PDF.findall(van_ban[dau:cuoi]):
            # Vài dòng gộp nhiều mã học phần (các lựa chọn GDTC) — bỏ phần số ở đầu tên
            ten = re.sub(r"^[\d\s.…]+", "", ten).strip(" .-–")
            if len(ten) >= 4:
                hp.append((ten, tc))
        if hp:
            ra.append((nhan, hp))
    return ra


def khoi_kien_thuc(bang) -> list[tuple[str, str]]:
    for b in bang:
        dau = khong_dau(" ".join(b[0]))
        if "kien thuc" in dau and "tin chi" in dau:
            ra = [
                (h[0].strip(), re.search(r"\d{1,3}", h[1]).group())
                for h in b[1:]
                if len(h) >= 2 and re.search(r"\d{1,3}", h[1])
            ]
            if ra:
                return ra
    return []


# Khối kiến thức trong PDF (khoa Sinh học – Môi trường dùng mẫu này): bảng mất cấu
# trúc khi rút chữ, còn lại chuỗi "Giáo dục đại cương 24 Kiến thức cơ sở ngành 44 …
# Tổng cộng 121". Bắt từng cặp <tên khối> <số>.
RE_KHOI_PDF = re.compile(
    r"(Gi[áa]o d[ụu]c [đd][ạa]i c[ươu][ơo]ng|Ki[ếe]n th[ứu]c [^\d]{3,40}?|C[ơo] s[ởo] ng[àa]nh|"
    r"Chuy[êe]n ng[àa]nh[^\d]{0,30}?|Chuy[êe]n s[âa]u[^\d]{0,30}?)\s+(\d{1,3})\b"
)


def khoi_kien_thuc_pdf(van_ban: str) -> list[tuple[str, str]]:
    m = re.search(r"C[ấa]u\s+tr[úu]c\s+ch[ươu][ơo]ng\s+tr[ìi]nh(.{0,600})", van_ban, re.I)
    if not m:
        return []
    doan = m.group(1)
    doan = re.split(r"T[ổo]ng\s+c[ộo]ng|\d\.\s*Danh\s+s[áa]ch", doan)[0]
    ra = [(re.sub(r"\s+", " ", k).strip(" .:-"), v) for k, v in RE_KHOI_PDF.findall(doan)]
    return [(k, v) for k, v in ra if len(k) >= 6][:6]


# Bảng cuối chương trình đào tạo liệt kê NHIỀU dòng "Tổng số tín chỉ ...": lý thuyết,
# thực hành, rồi mới tới toàn khoá. Lấy dòng đầu khớp là lấy nhầm số nhỏ hơn — ngành
# Luật từng ra "89 tín chỉ" trong khi tài liệu ghi "toàn khóa ... 121". Sai kiểu này
# không có gì báo lỗi, chatbot đọc ra kèm dòng "Nguồn:" nên nghe càng đáng tin.
RE_TC_BO_PHAN = re.compile(
    r"l[ýy]\s*thuy[ếe]t|th[ựu]c\s*h[àa]nh|th[ựu]c\s*t[ậa]p|t[ựu]\s*ch[ọo]n|"
    r"b[ắa]t\s*bu[ộo]c|kh[ôo]ng\s*t[íi]ch\s*l[ũu]y",
    re.I,
)


def tong_tin_chi(van_ban: str) -> str | None:
    """Nhiều cách viết khác nhau giữa các khoa — thử lần lượt, dừng ở cái khớp đầu."""
    # Ưu tiên tuyệt đối: câu nói thẳng "toàn khoá"
    if m := re.search(
        r"t[íi]n\s+ch[ỉi]\s+to[àa]n\s+kh[óo]a?[^\d]{0,60}?(\d{2,3})", van_ban, re.I
    ):
        return m.group(1)

    for mau in (
        r"t[ổo]ng\s+s[ốo]\s+t[íi]n\s+ch[ỉi]([^\d]{0,60}?)(\d{2,3})",
        r"kh[ốo]i\s+l[ưu][ợo]ng\s+ch[ươu][ơo]ng\s+tr[ìi]nh([^\d]{0,30})(\d{2,3})\s*t[íi]n",
        r"t[ổo]ng\s+c[ộo]ng()\s+(\d{2,3})\b",
        r"t[ổo]ng([^\n\d]{0,50}?)(\d{2,3})\s*t[íi]n\s*ch[ỉi]",
    ):
        for m in re.finditer(mau, van_ban, re.I):
            if not RE_TC_BO_PHAN.search(m.group(1)):
                return m.group(2)
    return None


def thoi_gian_dao_tao(van_ban: str) -> str | None:
    m = re.search(r"th[ờo]i\s+gian\s+[đd][àa]o\s+t[ạa]o[^\d]{0,20}([\d,\.]+)\s*n[ăa]m", van_ban, re.I)
    return m.group(1).replace(".", ",") if m else None


def mo_ta_nganh(van_ban: str) -> str:
    """Đoạn giới thiệu ngành. Mỗi khoa đặt tên mục một kiểu nên thử vài mốc."""
    for mau in (
        r"M[ôo]\s*t[ảa]\s+ch[ươu][ơo]ng\s+tr[ìi]nh(.{80,700})",
        r"T[ổo]ng\s+quan\s+ch[ươu][ơo]ng\s+tr[ìi]nh(.{80,700})",
        r"Gi[ớo]i\s+thi[ệe]u\s+ng[àa]nh(.{80,700})",
    ):
        if m := re.search(mau, van_ban, re.I | re.S):
            t = re.sub(r"\s+", " ", m.group(1)).strip(" :–-")
            return t[: t.rfind(".") + 1] if "." in t else t
    return ""


def doc_mot_nguon(f: pathlib.Path) -> tuple[str, list, list]:
    """(văn bản, bảng HTML, học kỳ) của một tệp nguồn."""
    if f.suffix == ".pdf":
        from pypdf import PdfReader

        try:
            t = " ".join((p.extract_text() or "") for p in PdfReader(str(f)).pages)
        except Exception:  # noqa: BLE001 — PDF hỏng thì bỏ qua nguồn đó
            return "", [], []
        # Gộp CẢ xuống dòng: tên học phần dài bị PDF ngắt giữa chừng
        # ("Giáo dục quốc phòng - an\nninh 1 3(3,0)"). Chỉ gộp dấu cách thì regex học
        # phần không khớp qua dòng và mất luôn môn đó — học kỳ 1 hụt 8 tín chỉ.
        t = re.sub(r"\s+", " ", chuan_hoa(t))
        return t, [], hoc_ky_tu_pdf(t)

    from bs4 import BeautifulSoup

    html = f.read_text(encoding="utf-8", errors="ignore")
    bang = doc_bang_html(html)
    # Nối MỌI bảng thành một mạch rồi mới cắt, thay vì xử lý từng bảng riêng. Trang
    # Ngôn ngữ Anh chia kế hoạch ra 4 bảng, và tiêu đề "Học kỳ 6" rơi đúng vào hàng
    # CUỐI của bảng 3 trong khi học phần của nó nằm ở đầu bảng 4. Cắt theo từng bảng
    # thì mục học kỳ 6 rỗng nên bị loại, 16 hàng học phần bên kia thành mồ côi —
    # mất nguyên một học kỳ mà không có dấu hiệu nào. Bảng tóm tắt đứng trước phần
    # kế hoạch thì vô hại: chưa gặp tiêu đề học kỳ nào nên hàng của nó bị bỏ qua.
    hk = hoc_ky_tu_bang([hang for b in bang for hang in b])
    return chuan_hoa(BeautifulSoup(html, "html.parser").get_text(" ", strip=True)), bang, hk


# Chỗ tài liệu của TRƯỜNG tự mâu thuẫn, đã đối chiếu tận PDF gốc. Ghi ra đây để lần
# sau không ai mất công soi lại, và để `kiem_ctdt.py` thôi báo đỏ — nó báo đỏ mãi thì
# người ta quen mắt rồi bỏ qua cả những lỗi thật.
#     (mã ngành, số học kỳ, chuỗi nhận nhánh): (số tiêu đề ghi, số đúng, lý do)
SAI_SOT_NGUON = {
    ("7540101", 7, "cử nhân"): (
        15, 14,
        "tiêu đề trong tài liệu của khoa ghi 15 tín chỉ nhưng chỉ liệt kê 5 học phần "
        "cộng lại 14 tín chỉ; bản kỹ sư có thêm học phần Chuyên đề vệ sinh công nghiệp "
        "(1 tín chỉ) mới đủ 15",
    ),
}


def sua_sai_sot(ma: str, tieu_de: str) -> tuple[str, str]:
    """Trả về (tiêu đề đã sửa, câu ghi chú) nếu mục này nằm trong bảng sai sót."""
    for (m, ky, nhanh), (sai, dung, vi_sao) in SAI_SOT_NGUON.items():
        if m != ma or not re.match(rf"^\s*(?:H[ọo]c\s*k[ỳy]|HK)\s*{ky}\b", tieu_de, re.I):
            continue
        if khong_dau(nhanh) not in khong_dau(tieu_de):
            continue
        moi = re.sub(rf"\b{sai}(\s*t[íi]n\s*ch[ỉi]\s*t[íi]ch\s*l[ũu]y)", rf"{dung}\1", tieu_de)
        return moi, (
            f" Ghi chú: học kỳ này tích luỹ {dung} tín chỉ — {vi_sao}."
        )
    return tieu_de, ""


def viet_md(ma, ten, nam, tong, khoi, mo_ta, muc_hoc_ky, link_chinh, thoi_gian=None) -> str:
    d = [
        "---",
        f'nganh: "{ma}"',
        f"nam: {nam}",
        f"nguon: Chương trình đào tạo ngành {ten}, Trường Đại học Công Thương TP.HCM",
        f"link: {link_chinh}",
        f"ngay_lay: {date.today().isoformat()}",
        "---",
        "",
        f"# Chương trình đào tạo ngành {ten}",
        "",
    ]
    mo = (
        f"Ngành {ten}, mã ngành {ma}, Trường Đại học Công Thương TP.HCM (HUIT). "
        f"Chương trình đào tạo trình độ đại học chính quy, áp dụng cho khoá tuyển sinh năm {nam}."
    )
    if tong:
        mo += f" Tổng khối lượng tích luỹ toàn khoá là {tong} tín chỉ."
    if thoi_gian:
        mo += f" Thời gian đào tạo {thoi_gian} năm."
    d += [mo, ""]

    if mo_ta:
        d += ["## Mô tả chương trình", "", mo_ta, ""]
    if khoi:
        d += [
            "## Cấu trúc chương trình",
            "",
            f"Ngành {ten} chia theo các khối kiến thức: "
            + "; ".join(f"{k} {v} tín chỉ" for k, v in khoi)
            + ".",
            "",
        ]

    for tieu_de, hp, link in muc_hoc_ky:
        tieu_de, ghi_chu = sua_sai_sot(ma, tieu_de)
        d += [
            f"## {tieu_de}",
            "",
            f"Ngành {ten} — các học phần trong {tieu_de.lower()} gồm: "
            + ", ".join(f"{t} ({tc} tín chỉ)" for t, tc in hp)
            + "."
            + ghi_chu,
            "",
            f"Nguồn: {link}",
            "",
        ]
    return "\n".join(d).rstrip() + "\n"


def trich_xuat(nguon: dict, nam: int, chi_ma: str | None) -> None:
    ten_nganh = ten_cac_nganh()
    THU_MUC_RA.mkdir(parents=True, exist_ok=True)
    bao_cao = []
    ds = {k: v for k, v in nguon["nganh"].items() if not chi_ma or k == chi_ma}

    for ma in ds:
        ten = ten_nganh.get(ma, ma)

        # File có `thu_cong: true` là bản người soạn tay — luôn tốt hơn bản cào, vì
        # nhiều trang chỉ đăng ảnh hoặc PDF bố cục lạ. Đè lên là mất trắng công soạn
        # mà không ai biết, nên dừng trước khi ghi.
        f_ra = THU_MUC_RA / ten_tep(ma, ten)
        if f_ra.exists() and re.search(
            r"^thu_cong:\s*true\s*$", f_ra.read_text(encoding="utf-8"), re.M
        ):
            bao_cao.append((ma, ten, "✋", "giữ bản viết tay (thu_cong: true)"))
            continue

        thu_muc = DEM / ma
        f_man = thu_muc / "manifest.json"
        if not f_man.exists():
            bao_cao.append((ma, ten, "—", "chưa tải (chạy --tai trước)"))
            continue

        gom_tong, gom_khoi, gom_mo_ta, gom_tg = None, [], "", None
        link_chinh, theo_nguon = None, []
        for lk in json.loads(f_man.read_text(encoding="utf-8")):
            f = thu_muc / lk["tep"]
            if lk.get("loi") or not f.exists():
                continue
            link_chinh = link_chinh or lk["url"]
            van_ban, bang, hk = doc_mot_nguon(f)
            if not van_ban:
                continue
            gom_tong = gom_tong or tong_tin_chi(van_ban)
            gom_khoi = gom_khoi or khoi_kien_thuc(bang) or khoi_kien_thuc_pdf(van_ban)
            gom_mo_ta = gom_mo_ta or mo_ta_nganh(van_ban)
            gom_tg = gom_tg or thoi_gian_dao_tao(van_ban)
            if hk:
                theo_nguon.append((lk, hk))

        # Chỉ thêm nhãn nguồn vào tiêu đề khi có TỪ HAI nguồn học kỳ trở lên — ngành
        # bên khoa Thực phẩm có cả hệ kỹ sư lẫn cử nhân, không phân biệt thì hai bộ
        # học kỳ trộn vào nhau. Một nguồn thì nhãn chỉ làm tiêu đề dài vô ích.
        can_nhan = len(theo_nguon) > 1
        muc_hoc_ky = [
            (f"{td} — {lk['nhan']}" if can_nhan and lk.get("nhan") else td, hp, lk["url"])
            for lk, hk in theo_nguon
            for td, hp in hk
        ]

        if not (muc_hoc_ky or gom_khoi or gom_tong or gom_mo_ta):
            bao_cao.append((ma, ten, "—", "tải được nhưng không rút được gì"))
            continue

        (THU_MUC_RA / ten_tep(ma, ten)).write_text(
            viet_md(ma, ten, nam, gom_tong, gom_khoi, gom_mo_ta, muc_hoc_ky, link_chinh, gom_tg),
            encoding="utf-8",
        )
        co = []
        if muc_hoc_ky:
            co.append(f"{len(muc_hoc_ky)} mục học kỳ/{sum(len(h) for _, h, _ in muc_hoc_ky)} học phần")
        if gom_khoi:
            co.append(f"{len(gom_khoi)} khối kiến thức")
        if gom_tong:
            co.append(f"tổng {gom_tong} TC")
        if gom_mo_ta:
            co.append("mô tả")
        bao_cao.append((ma, ten, "✅" if muc_hoc_ky else "⚠️", " · ".join(co)))

    print(f"\n{'═' * 78}\n  KẾT QUẢ (nam={nam})\n{'═' * 78}")
    for cot, nhan in (
        ("✅", "Có danh sách học phần"),
        ("⚠️", "Chỉ có cấu trúc/mô tả"),
        ("✋", "Bản viết tay, không đụng tới"),
        ("—", "Chưa lấy được"),
    ):
        nhom = [x for x in bao_cao if x[2] == cot]
        if not nhom:
            continue
        print(f"\n{cot} {nhan} ({len(nhom)}):")
        for ma, ten, _, gc in nhom:
            print(f"    {ma}  {ten[:34]:36} {gc}")
    print(
        f"\nFile .md ở {THU_MUC_RA.relative_to(GOC)}/"
        "\n⚠️  Chạy `python scripts/kiem_ctdt.py` rồi ĐỌC BẰNG MẮT trước khi `nap_kho.py`."
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tai", action="store_true", help="chỉ tải nguồn về")
    ap.add_argument("--trich", action="store_true", help="chỉ trích xuất")
    ap.add_argument("--ma", help="chỉ làm một mã ngành, ví dụ 7520115")
    ap.add_argument("--nam", type=int, default=2026, help="năm áp dụng, ghi vào phần đầu .md")
    a = ap.parse_args()
    nguon = json.loads(F_NGUON.read_text(encoding="utf-8"))
    if a.tai or not a.trich:
        tai_ve(nguon, a.ma)
    if a.trich or not a.tai:
        trich_xuat(nguon, a.nam, a.ma)


if __name__ == "__main__":
    main()
