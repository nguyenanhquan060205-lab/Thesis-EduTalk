"""Đọc danh sách link do người soạn → `data/co_cau_truc/nguon_ctdt.json`.

    conda activate Edutalk
    cd backend
    python scripts/doc_danh_sach_link.py

Nguồn gốc là file người sửa: `docs/RAG_docs/danh_s_ch_ng_nh_o_t_o_huit.md`.
Sửa link thì sửa ở đó rồi chạy lại script này — **đừng sửa tay file JSON**, nó là bản
sinh ra. Hai nơi cùng giữ link thì sớm muộn cũng lệch nhau mà không ai biết.

Script chỉ đọc và kiểm, không tải trang nào. Việc tải là của `lay_ctdt.py`.
"""

import json
import pathlib
import re
import sys
from collections import defaultdict
from datetime import date

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

F_VAO = GOC.parent / "docs" / "RAG_docs" / "danh_s_ch_ng_nh_o_t_o_huit.md"
F_RA = GOC / "data" / "co_cau_truc" / "nguon_ctdt.json"
F_TUYEN_SINH = GOC / "data" / "co_cau_truc" / "tuyen_sinh_huit_2026.json"

LINK_GOC = "https://huit.edu.vn/ctdtdh/chuong-trinh-dao-tao-dai-hoc-chinh-quy-khoa-26-nam-2026"

RE_NGANH = re.compile(r"^###\s*(\d{7})\s*[-–]\s*(.+?)\s*$")

# Ngoặc CÂN BẰNG, không phải `[^)]+`. Tên file trên web trường có dấu ngoặc:
# `.../tien do dao tao (ky su).pdf` và cả `.../()7a_ Chuan dau ra.pdf`. Dùng
# `[^)]+` thì URL bị cắt ngay dấu `)` đầu tiên → tải về 404 mà nhìn vẫn giống link thật.
_URL = r"(https?://(?:[^()\s]|\([^()]*\))*)"
RE_LINK_MD = re.compile(r"\*\*(.+?):\*\*.*?\[Link\]\(" + _URL + r"\)")
RE_LINK_CON = re.compile(r"^\s*\*\s*(.+?):\s*\[Link\]\(" + _URL + r"\)")
RE_LINK_TRAN = re.compile(r"(https?://\S+)")
RE_DRIVE = re.compile(r"drive\.google\.com/file/d/([\w-]+)")


def kieu_link(url: str) -> str:
    if "drive.google.com" in url:
        return "drive"
    if re.search(r"\.(pdf|docx?)(\?|$)", url, re.I):
        return "pdf"
    return "html"


def url_tai(url: str) -> str:
    """URL dùng để TẢI. Link Drive dạng xem không tải được, phải đổi sang dạng export."""
    if m := RE_DRIVE.search(url):
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    return url


def doc_file() -> dict[str, list[dict]]:
    ra: dict[str, list[dict]] = {}
    ma = None
    for dong in F_VAO.read_text(encoding="utf-8").splitlines():
        if m := RE_NGANH.match(dong):
            ma = m.group(1)
            ra[ma] = []
            continue
        if ma is None:
            continue

        nhan, url = None, None
        if m := RE_LINK_MD.search(dong):
            nhan, url = m.group(1).strip(), m.group(2)
        elif m := RE_LINK_CON.match(dong):
            nhan, url = m.group(1).strip(), m.group(2)
        elif m := RE_LINK_TRAN.search(dong.strip()):
            # Dòng dán link trần, không có nhãn (ví dụ mục "Bị xoá")
            nhan, url = "Không nhãn", m.group(1)

        if url and not any(x["url"] == url for x in ra[ma]):
            ra[ma].append({"nhan": nhan, "url": url, "tai": url_tai(url), "kieu": kieu_link(url)})
    return ra


def main() -> None:
    if not F_VAO.exists():
        sys.exit(f"Không thấy {F_VAO}")

    khoi = doc_file()
    ten = {
        m: v["ten"]
        for m, v in json.loads(F_TUYEN_SINH.read_text(encoding="utf-8"))["nganh"].items()
    }

    print(f"Đọc {F_VAO.name}: {len(khoi)} ngành · {sum(len(v) for v in khoi.values())} link\n")

    loi = 0

    thieu = [m for m in ten if m not in khoi]
    thua = [m for m in khoi if m not in ten]
    if thieu:
        loi += 1
        print(f"❌ Thiếu {len(thieu)} ngành so với mô hình:")
        for m in thieu:
            print(f"     {m}  {ten[m]}")
    if thua:
        loi += 1
        print(f"❌ Mã lạ, mô hình không có: {thua}")

    # Một URL dùng cho hai ngành gần như luôn là chép nhầm dòng
    theo_url = defaultdict(list)
    for m, ds in khoi.items():
        for x in ds:
            theo_url[x["url"]].append(m)
    trung = {u: ms for u, ms in theo_url.items() if len(ms) > 1}
    # Trang tuyển sinh chung thì nhiều ngành dùng là đúng, bỏ qua
    trung = {u: ms for u, ms in trung.items() if "ts.huit.edu.vn" not in u}
    if trung:
        loi += 1
        print(f"\n⚠️  {len(trung)} URL bị dùng cho nhiều ngành — nghi chép nhầm:")
        for u, ms in trung.items():
            print("     " + " · ".join(f"{m} {ten.get(m, '?')}" for m in ms))
            print(f"       {u}")

    rong = [m for m, ds in khoi.items() if not ds]
    if rong:
        print(f"\n⚠️  {len(rong)} ngành không có link nào: " + ", ".join(rong))

    dem = defaultdict(int)
    for ds in khoi.values():
        for x in ds:
            dem[x["kieu"]] += 1
    print("\nTheo kiểu nguồn: " + " · ".join(f"{k} {v}" for k, v in sorted(dem.items())))
    print(f"Ngành chỉ có 1 link: {sum(1 for v in khoi.values() if len(v) == 1)}")

    F_RA.write_text(
        json.dumps(
            {
                "nguon": "Chương trình đào tạo đại học chính quy khoá 26 năm 2026",
                "link_goc": LINK_GOC,
                "sinh_tu": str(F_VAO.relative_to(GOC.parent)),
                "ngay_lay": date.today().isoformat(),
                "ghi_chu": "SINH TỰ ĐỘNG — sửa link ở file .md rồi chạy scripts/doc_danh_sach_link.py",
                "nganh": khoi,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n→ Đã ghi {F_RA.relative_to(GOC)}")
    if loi:
        print("\n⚠️  Có cảnh báo ở trên — sửa file .md rồi chạy lại.")


if __name__ == "__main__":
    main()
