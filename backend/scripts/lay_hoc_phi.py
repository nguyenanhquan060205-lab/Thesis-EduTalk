"""Lấy học phí 39 ngành từ hocphi.huit.edu.vn → `kho_tri_thuc/hoc_phi/`.

    conda activate Edutalk
    cd backend
    python scripts/lay_hoc_phi.py           # tải và sinh .md
    python scripts/lay_hoc_phi.py --xem     # chỉ in ra, không ghi file

Trang là ASP.NET WebForms, dữ liệu nằm sẵn trong HTML của lần tải đầu — không cần
trình duyệt. Bộ chọn khoá (`K26DH` / `K16DH` / `K15DH`) chạy bằng postback, nên chỉ
lấy được khoá đang chọn sẵn là **Khóa 26 – Năm 2026**. Đúng khoá mình phục vụ.

MỖI NGÀNH MỘT FILE, không gộp chung. Metadata của chunk lấy từ phần đầu file, mà
`ma_nganh` là thứ bộ đo truy hồi và bộ lọc theo ngành dùng để biết đoạn này thuộc
ngành nào. Gộp 39 ngành vào một file thì cả 39 chunk mang chung một mã — sai hết.

BỎ 5 CHƯƠNG TRÌNH LIÊN KẾT QUỐC TẾ. Trang có thêm Shinawatra, Lỗ Đông, Bắc Kinh,
Đài Loan — học phí 198–257 triệu, gấp rưỡi hệ chính quy. Lẫn vào kho thì thí sinh
hỏi học phí ngành Ngôn ngữ Trung Quốc có thể nhận về con số 254 triệu.
"""

import argparse
import json
import pathlib
import re
import sys
import unicodedata
from datetime import date

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

TRANG = "https://hocphi.huit.edu.vn/"
THU_MUC_RA = GOC / "data" / "kho_tri_thuc" / "hoc_phi"
F_TUYEN_SINH = GOC / "data" / "co_cau_truc" / "tuyen_sinh_huit_2026.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 EduTalk-RAG"

KHOA, NAM = 26, 2026

# Số tín chỉ trên trang học phí KHÔNG phải số tín chỉ của chương trình đào tạo.
# Đo trên cả 39 ngành: tổng lý thuyết + thực hành luôn đúng 123 với bậc cử nhân và
# 153 với bậc kỹ sư (riêng Công nghệ thực phẩm 159) — không ngành nào lệch. Trong khi
# chương trình đào tạo ghi 121 và 151 tín chỉ tích luỹ. Đây là hai cách đếm khác nhau:
# trang học phí đếm tín chỉ TÍNH TIỀN, chương trình đào tạo đếm tín chỉ TÍCH LUỸ để
# tốt nghiệp.
#
# Không nói rõ thì kho có hai con số chọi nhau cho cùng một ngành, chatbot bốc trúng
# chunk nào trả lời theo chunk đó — đúng cái bẫy đã tránh được với mã tổ hợp C14/X01.
#
# Đơn giá suy ngược từ chính bảng giá, tái tạo đúng cả 44 con số trên trang, sai số 0:
#     98 × 1.100.000 + 25 × 1.350.000 = 141.550.000  (Công nghệ sinh học, cử nhân)
#    100 × 1.100.000 + 53 × 1.350.000 = 181.550.000  (Công nghệ thông tin, kỹ sư)
#    105 × 1.100.000 + 54 × 1.350.000 = 188.400.000  (Công nghệ thực phẩm, kỹ sư)
GHI_CHU_TIN_CHI = (
    "Số tín chỉ nêu trên là số tín chỉ dùng để tính học phí, không phải số tín chỉ "
    "tích luỹ để tốt nghiệp ghi trong chương trình đào tạo. Đơn giá áp dụng chung cho "
    "mọi ngành: 1.100.000 đồng một tín chỉ lý thuyết và 1.350.000 đồng một tín chỉ "
    "thực hành, nên ngành nào nhiều giờ thực hành hơn thì học phí cao hơn."
)

# Trang viết tên ngành khác bảng tuyển sinh ở vài chỗ. Không phải ngành khác — chỉ là
# cách viết. Dò tự động bằng cách bỏ dấu vẫn trượt, nên khai tay, kèm mã để rõ ràng.
TEN_KHAC = {
    "logistic va quan ly chuoi cung ung": "7510605",   # trang thiếu chữ "s"
    "cong nghe ky thuat dieu khien va tu dong hoa": "7510303",  # bảng viết tắt TĐH
}


def khong_dau(s: str) -> str:
    # `đ` phải đổi tay: nó là MỘT ký tự riêng (U+0111), không phải "d" cộng dấu, nên
    # NFD không tách được và bộ lọc `[^a-z0-9]` xoá thẳng. Thiếu dòng này thì
    # "điều khiển và tự động hóa" thành "ieu khien va tu ong hoa", so tên ngành
    # trượt và ngành đó bị xếp nhầm sang nhóm liên kết quốc tế.
    s = s.lower().replace("đ", "d")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def ten_tep(ma: str, ten: str) -> str:
    return f"{ma}_{re.sub(r'[^a-z0-9]+', '_', khong_dau(ten)).strip('_')}.md"


def gon(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def tai_trang() -> str:
    import httpx

    r = httpx.get(TRANG, headers={"User-Agent": UA}, timeout=60, follow_redirects=True)
    r.raise_for_status()
    return r.text


def doc_trang(html: str) -> list[dict]:
    """Mỗi `div.box-1` là một ngành; `div.left` / `div.right` là bậc cử nhân / kỹ sư."""
    from bs4 import BeautifulSoup

    s = BeautifulSoup(html, "html.parser")

    # Kiểm khoá đang chọn khớp với khoá script này tuyên bố phục vụ. Trường đổi mặc
    # định sang khoá khác mà script cứ ghi "khoá 26" thì số vào kho sai lặng lẽ.
    chon = [o for o in s.select("select option") if o.has_attr("selected")]
    if chon and not re.search(rf"Kh[óo]a\s*{KHOA}\b", chon[0].get_text()):
        sys.exit(f"Trang đang mở khoá {gon(chon[0].get_text())!r}, script chờ khoá {KHOA}")

    ra = []
    for b in s.find_all("div", class_="box-1"):
        td = b.find("div", class_="title")
        if not td:
            continue
        bac = []
        for phan in b.find_all("div", class_=["left", "right"]):
            van = gon(phan.get_text(" ", strip=True))
            if "Học phí toàn khoá" not in van:
                continue
            nhan = phan.find("p", class_="centered-text-list")
            tien = phan.find("h1", class_="f1")
            bac.append({
                "bac": gon(nhan.get_text(" ", strip=True)) if nhan else "",
                "hoc_phi": gon(tien.get_text(strip=True)) if tien else "",
                "thoi_gian": m.group(1) if (m := re.search(r"Thời gian học:\s*([\d,.]+\s*năm)", van)) else "",
                "ly_thuyet": m.group(1) if (m := re.search(r"lý thuyết:\s*(\d+)", van)) else "",
                "thuc_hanh": m.group(1) if (m := re.search(r"thực hành:\s*(\d+)", van)) else "",
            })
        if bac:
            ra.append({"ten_trang": gon(td.get_text(" ", strip=True)), "bac": bac})
    return ra


def ghep_ma(ds: list[dict], ten39: dict[str, str]) -> tuple[list[dict], list[dict]]:
    """Gắn mã ngành. Trả về (khớp, bỏ qua) — bỏ qua chính là liên kết quốc tế."""
    theo_ten = {khong_dau(t): m for m, t in ten39.items()}
    khop, bo = [], []
    for x in ds:
        k = khong_dau(x["ten_trang"])
        ma = theo_ten.get(k) or TEN_KHAC.get(k)
        if ma:
            khop.append({**x, "ma": ma, "ten": ten39[ma]})
        else:
            bo.append(x)
    return khop, bo


def viet_md(x: dict) -> str:
    cau = []
    for b in x["bac"]:
        c = f"Bậc {b['bac'].lower()}: học phí toàn khoá {b['hoc_phi']} đồng"
        if b["thoi_gian"]:
            c += f", thời gian học {b['thoi_gian']}"
        if b["ly_thuyet"] and b["thuc_hanh"]:
            c += (
                f", tính trên {b['ly_thuyet']} tín chỉ lý thuyết và "
                f"{b['thuc_hanh']} tín chỉ thực hành"
            )
        cau.append(c + ".")

    return "\n".join([
        "---",
        f'nganh: "{x["ma"]}"',
        f"nam: {NAM}",
        f"nguon: Học phí ngành {x['ten']} khoá {KHOA} năm {NAM}, "
        "Trường Đại học Công Thương TP.HCM",
        f"link: {TRANG}",
        f"ngay_lay: {date.today().isoformat()}",
        "---",
        "",
        f"# Học phí ngành {x['ten']}",
        "",
        f"## Học phí toàn khoá ngành {x['ten']}",
        "",
        f"Ngành {x['ten']}, mã ngành {x['ma']}, Trường Đại học Công Thương TP.HCM (HUIT), "
        f"áp dụng cho khoá {KHOA} tuyển sinh năm {NAM}. " + " ".join(cau)
        + " Trường công bố học phí theo cả khoá học chứ không theo từng năm, và mức này "
        "chưa bao gồm học phần Giáo dục quốc phòng và an ninh. "
        + GHI_CHU_TIN_CHI,
        "",
        f"Nguồn: {TRANG}",
        "",
    ])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xem", action="store_true", help="chỉ in, không ghi file")
    a = ap.parse_args()

    ten39 = {
        ma: m["ten"]
        for ma, m in json.loads(F_TUYEN_SINH.read_text(encoding="utf-8"))["nganh"].items()
    }
    ds = doc_trang(tai_trang())
    khop, bo = ghep_ma(ds, ten39)

    print(f"\nĐọc {TRANG} — khoá {KHOA} ({NAM})")
    print(f"  {len(ds)} khối trên trang → {len(khop)} ngành chính quy · {len(bo)} bỏ qua\n")

    for x in sorted(khop, key=lambda v: v["ma"]):
        print(f"  {x['ma']}  {x['ten'][:34]:36} "
              + " | ".join(f"{b['bac']} {b['hoc_phi']}" for b in x["bac"]))

    if bo:
        print(f"\n  Bỏ qua {len(bo)} chương trình liên kết quốc tế:")
        for x in bo:
            print(f"     {x['ten_trang'][:58]:60} {x['bac'][0]['hoc_phi']}")

    thieu = [m for m in ten39 if not any(x["ma"] == m for x in khop)]
    if thieu:
        print(f"\n  ❌ {len(thieu)} ngành không thấy trên trang học phí:")
        for m in thieu:
            print(f"     {m}  {ten39[m]}")

    if a.xem:
        print("\n(--xem: không ghi file)")
        return

    THU_MUC_RA.mkdir(parents=True, exist_ok=True)
    for x in khop:
        (THU_MUC_RA / ten_tep(x["ma"], x["ten"])).write_text(viet_md(x), encoding="utf-8")
    print(f"\n→ Đã ghi {len(khop)} file vào {THU_MUC_RA.relative_to(GOC)}/")
    print("   Chạy `python scripts/nap_kho.py` để nạp vào kho vector.")


if __name__ == "__main__":
    main()
