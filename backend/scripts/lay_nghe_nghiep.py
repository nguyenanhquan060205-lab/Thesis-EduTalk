"""Rút mục "Vị trí việc làm" từ nguồn ĐÃ TẢI → `kho_tri_thuc/nghe_nghiep/`.

    conda activate Edutalk
    cd backend
    python scripts/lay_nghe_nghiep.py          # sinh .md
    python scripts/lay_nghe_nghiep.py --xem    # chỉ in, không ghi

Không cào thêm trang nào: dùng lại đúng bộ nhớ đệm mà `lay_ctdt.py --tai` đã tải về
`data/.dem_ctdt/`. Hầu hết chương trình đào tạo của trường đều có sẵn mục này.

KHÔNG TỰ VIẾT NỘI DUNG. Ngành nào nguồn không có thì để trống và báo ra, chứ không
suy đoán "học ngành này chắc làm được mấy việc kia". Cơ hội việc làm và mức lương là
thứ thí sinh 18 tuổi dùng để chọn ngành; bịa ra rồi gắn dòng `Nguồn:` vào thì nó
nghe đáng tin hơn cả lúc không có RAG — đúng cái bẫy `kho_tri_thuc/README.md` cảnh báo.

CỔNG KIỂM. Cụm "vị trí việc làm" còn xuất hiện giữa câu mô tả học phần
("...giới thiệu vị trí việc làm mà người học có thể đảm nhận..."), không phải mục
thật. Nên chỉ nhận khi nó đứng như một TIÊU ĐỀ (có dấu hai chấm ngay sau) và phần
thân bên dưới thực sự liệt kê — đủ dài và có từ hai gạch đầu dòng trở lên.
"""

import argparse
import json
import pathlib
import re
import sys
from datetime import date

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from lay_ctdt import DEM, doc_mot_nguon, ten_cac_nganh, ten_tep  # noqa: E402

THU_MUC_RA = GOC / "data" / "kho_tri_thuc" / "nghe_nghiep"
NAM = 2026

# Tiêu đề mục. Dấu hai chấm là TUỲ CHỌN: trên trang khoa cụm "Cơ hội nghề nghiệp"
# thường là thẻ tiêu đề riêng nên sau khi rút chữ nó không còn dấu gì. Đòi dấu hai
# chấm thì bỏ sót 25 ngành. Đổi lại phải dựa hẳn vào cổng kiểm bên dưới để loại cụm
# nằm lọt giữa câu văn.
RE_TIEU_DE = re.compile(
    r"(?:v[ịi]\s*tr[íi]\s*(?:vi[ệe]c\s*l[àa]m|c[ôo]ng\s*t[áa]c|c[ôo]ng\s*vi[ệe]c)"
    r"|c[ơo]\s*h[ộo]i\s*(?:vi[ệe]c\s*l[àa]m|ngh[ềe]\s*nghi[ệe]p)"
    r"|tri[ểe]n\s*v[ọo]ng\s*ngh[ềe]\s*nghi[ệe]p"
    r"|vi[ệe]c\s*l[àa]m\s*sau\s*(?:khi\s*)?t[ốo]t\s*nghi[ệe]p"
    r"|đ[ảa]m\s*nh[ậa]n\s*(?:c[áa]c\s*)?v[ịi]\s*tr[íi])(?:[^:\n]{0,40}:)?",
    re.I,
)
# `(?:…:)?` chứ không phải `…:?` — nhóm tuỳ chọn phải ôm CẢ dấu hai chấm. Viết kiểu
# cũ thì khi không có dấu hai chấm, phần `[^:\n]{0,40}` vẫn ngoạm 40 ký tự kế tiếp và
# đoạn trích bắt đầu giữa chừng một từ: "inh doanh quốc tế…", "t thúc chương trình…".

# Trang khoa đặt cột điều hướng ngay cạnh nội dung, rút chữ xong nó dính vào đuôi
# đoạn. Thấy mấy cụm này thì đoạn đó là menu, không phải vị trí việc làm.
RAC = ("thông tin dự án", "danh sách nhóm nghiên cứu", "tin nổi bật", "xem thêm",
       "đăng ký xét tuyển", "liên hệ", "bài viết")
# Mốc dừng: tiêu đề mục kế tiếp của tài liệu
RE_DUNG = re.compile(
    r"\d{1,2}\s*[.)]\s*[A-ZĐÀ-Ỹ]|Chu[ẩa]n\s*đ[ầa]u\s*ra|Kh[ốo]i\s*l[ưu][ợo]ng|"
    r"N[ộo]i\s*dung\s*ch[ươu][ơo]ng\s*tr[ìi]nh|K[ếe]\s*ho[ạa]ch\s*đ[àa]o\s*t[ạa]o|"
    r"H[ọo]c\s*k[ỳy]\s*\d",
    re.I,
)

DAI_TOI_THIEU = 140  # ngắn hơn thì là câu dẫn, không phải danh sách
GACH_TOI_THIEU = 2   # phải liệt kê từ hai mục trở lên
DAI_TOI_DA = 1800


def rut_mot(van_ban: str) -> str | None:
    for m in RE_TIEU_DE.finditer(van_ban):
        than = van_ban[m.end() : m.end() + DAI_TOI_DA]
        if d := RE_DUNG.search(than):
            than = than[: d.start()]
        than = re.sub(r"\s+", " ", than).strip(" .;-–")
        if len(than) < DAI_TOI_THIEU:
            continue
        if len(re.findall(r"[-–•;]\s*\S", than)) < GACH_TOI_THIEU:
            continue
        # Bắt đầu giữa một từ nghĩa là mốc cắt lệch — bỏ, đừng ghi đoạn cụt vào kho
        if not re.match(r"[A-ZĐÀ-Ỹ0-9\-–•]", than):
            continue
        if any(x in than.lower() for x in RAC):
            continue
        return than
    return None


def viet_md(ma: str, ten: str, than: str, link: str, nhan: str) -> str:
    # Tách gạch đầu dòng thành câu để đoạn đọc trôi; vector bám nghĩa tốt hơn bảng.
    y = [x.strip(" .;-–ü") for x in re.split(r"\s+[-–•ü]\s*", than) if len(x.strip()) > 12]
    # Bỏ câu dẫn kiểu "Sinh viên tốt nghiệp có thể đảm nhiệm các vị trí:" — nó kết
    # thúc bằng dấu hai chấm, là lời mở đầu danh sách chứ không phải một vị trí.
    y = [x for x in y if not x.rstrip().endswith(":")]
    noi_dung = (
        f"Sinh viên tốt nghiệp ngành {ten} của Trường Đại học Công Thương TP.HCM (HUIT) "
        f"có thể đảm nhận các vị trí việc làm sau: "
        + "; ".join(y) + "."
        if len(y) > 1
        else f"Vị trí việc làm của sinh viên tốt nghiệp ngành {ten}: {than}."
    )
    return "\n".join([
        "---",
        f'nganh: "{ma}"',
        f"nam: {NAM}",
        f"nguon: Vị trí việc làm sau tốt nghiệp ngành {ten} ({nhan}), "
        "Trường Đại học Công Thương TP.HCM",
        f"link: {link}",
        f"ngay_lay: {date.today().isoformat()}",
        "---",
        "",
        f"# Cơ hội việc làm ngành {ten}",
        "",
        f"## Vị trí việc làm ngành {ten}",
        "",
        noi_dung,
        "",
        f"Nguồn: {link}",
        "",
    ])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xem", action="store_true", help="chỉ in, không ghi file")
    ap.add_argument("--ma", help="chỉ làm một ngành")
    a = ap.parse_args()

    ten_nganh = ten_cac_nganh()
    ds = {m: t for m, t in ten_nganh.items() if not a.ma or m == a.ma}
    co, khong = [], []

    for ma, ten in ds.items():
        f_man = DEM / ma / "manifest.json"
        if not f_man.exists():
            khong.append((ma, ten, "chưa tải nguồn"))
            continue
        thay = None
        for x in json.loads(f_man.read_text(encoding="utf-8")):
            f = DEM / ma / x["tep"]
            if x.get("loi") or not f.exists():
                continue
            van_ban, _, _ = doc_mot_nguon(f)
            if van_ban and (than := rut_mot(van_ban)):
                thay = (than, x["url"], x.get("nhan") or "tài liệu của khoa")
                break
        (co.append((ma, ten, *thay)) if thay else khong.append((ma, ten, "nguồn không có mục này")))

    print(f"\n{'═' * 76}\n  VỊ TRÍ VIỆC LÀM — rút từ nguồn đã tải\n{'═' * 76}")
    print(f"\n✅ Có ({len(co)}/{len(ds)}):")
    for ma, ten, than, _, _ in co:
        print(f"    {ma}  {ten[:32]:34} {len(than):4} ký tự · {than[:60]}…")
    if khong:
        print(f"\n➖ Không có ({len(khong)}):")
        for ma, ten, vi_sao in khong:
            print(f"    {ma}  {ten[:32]:34} {vi_sao}")

    if a.xem:
        print("\n(--xem: không ghi file)")
        return

    THU_MUC_RA.mkdir(parents=True, exist_ok=True)
    for ma, ten, than, link, nhan in co:
        (THU_MUC_RA / ten_tep(ma, ten)).write_text(
            viet_md(ma, ten, than, link, nhan), encoding="utf-8"
        )
    print(f"\n→ Đã ghi {len(co)} file vào {THU_MUC_RA.relative_to(GOC)}/")
    print("   Ngành không có thì ĐỂ TRỐNG — đừng tự viết thay, xem docstring.")
    print("   Chạy `python scripts/nap_kho.py` để nạp vào kho vector.")


if __name__ == "__main__":
    main()
