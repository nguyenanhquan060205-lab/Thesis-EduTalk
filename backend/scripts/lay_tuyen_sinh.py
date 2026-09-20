"""Lấy thông báo tuyển sinh 2026 → `kho_tri_thuc/xet_tuyen/` và `ho_tro/`.

    conda activate Edutalk
    cd backend
    python scripts/lay_tuyen_sinh.py          # tải và sinh .md
    python scripts/lay_tuyen_sinh.py --xem    # chỉ in, không ghi file

Một trang duy nhất của Hội đồng tuyển sinh, lấp được hai chủ đề `do_lo_hong.py` đang
báo đỏ: **phương thức xét tuyển** (mục I–III) và **học bổng, hỗ trợ** (mục IV).

BỎ HAI BẢNG DANH SÁCH NGÀNH ở mục 1.4:

- Bảng 39 ngành chính quy kèm tổ hợp — kho đã có rồi, sinh từ
  `tuyen_sinh_huit_2026.json`, cùng nguồn mà mô hình dùng để lọc tổ hợp. Chép lại là
  tạo bản thứ hai, hai bản lệch nhau lúc nào không biết.
- Bảng 5 ngành liên kết quốc tế — ngoài phạm vi 39 ngành của mô hình.

GIỮ bốn bảng còn lại vì chúng KHÔNG trùng với thứ đã có trong kho: tổ hợp gồm những
môn nào (JSON chỉ có mã tổ hợp, không có tên môn), quy đổi chứng chỉ ngoại ngữ, điểm
cộng theo đối tượng, và 9 ngành được giảm 50% học phí học kỳ đầu.
"""

import argparse
import pathlib
import re
import sys
from datetime import date

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

TRANG = "https://ts.huit.edu.vn/tin-tuyen-sinh/thong-tin-tuyen-sinh-dai-hoc-nam-2026"
KHO = GOC / "data" / "kho_tri_thuc"
DEM = GOC / "data" / ".dem_ctdt" / "_tuyen_sinh.html"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 EduTalk-RAG"
NAM = 2026

# Mục IV nói về quyền lợi, học bổng, hỗ trợ → thuộc thư mục `ho_tro`. Mục I–III nói về
# cách xét tuyển → `xet_tuyen`. Tên thư mục quyết định `loai` của chunk (tai_lieu.py).
MUC_HO_TRO = "IV"


def gon(s: str) -> str:
    return re.sub(r"\s+", " ", s).replace("\xa0", " ").strip()


def tai_trang() -> str:
    import httpx

    if DEM.exists() and DEM.stat().st_size > 2000:
        return DEM.read_text(encoding="utf-8", errors="ignore")
    r = httpx.get(TRANG, headers={"User-Agent": UA}, timeout=60, follow_redirects=True)
    r.raise_for_status()
    DEM.parent.mkdir(parents=True, exist_ok=True)
    DEM.write_text(r.text, encoding="utf-8")
    return r.text


# ── Đổi bảng thành câu văn ───────────────────────────────────────────────────
# Bảng nhúng thẳng vào chunk sẽ thành một dãy số không biết số nào của cột nào. Viết
# lại thành câu thì vector mới bám được nghĩa — cùng lý do `nguon_co_cau_truc.py` viết
# JSON tuyển sinh ra văn xuôi thay vì đưa nguyên bảng.


def bang_to_hop(b) -> str:
    cau = [
        f"Tổ hợp {h[0]} gồm ba môn {h[1]}, {h[2]} và {h[3]}."
        for h in b[1:]
        if len(h) >= 4 and re.fullmatch(r"[A-Z]\d{2}", h[0].strip())
    ]
    return "Các tổ hợp môn xét tuyển của Trường Đại học Công Thương TP.HCM. " + " ".join(cau)


def bang_chung_chi(b) -> str:
    """Hàng 1 là các mức điểm quy đổi, hàng sau là từng chứng chỉ ứng với mức đó."""
    muc = [gon(x).replace("Mức điểm", "").replace(" ", "") for x in b[1]] if len(b) > 1 else []
    cau = []
    for h in b[2:]:
        if len(h) < 3:
            continue
        if h[0].startswith("CERFR"):
            cau.append(
                "Quy đổi theo khung CEFR: "
                + "; ".join(f"{gon(x)} tương ứng {m} điểm" for x, m in zip(h, muc))
                + "."
            )
            continue
        # Bảng gốc chèn khoảng trắng giữa các chữ số ("25 0 - 270", "1 0 0 - 115") do
        # cách trang giãn chữ. Dán liền lại; dấu " - " ngăn cách hai mốc vẫn còn nên
        # "4.5 - 5.0" không bị dính thành một số.
        ten = gon(h[1])
        gia_tri = [re.sub(r"(\d)\s+(?=\d)", r"\1", gon(x)) for x in h[2:]]
        if not ten or not gia_tri:
            continue
        cau.append(
            f"Chứng chỉ {ten}: "
            + "; ".join(f"mức {g} quy đổi thành {m} điểm" for g, m in zip(gia_tri, muc))
            + "."
        )
    return (
        "Bảng quy đổi chứng chỉ ngoại ngữ sang điểm môn Tiếng Anh khi xét tuyển. "
        + " ".join(cau)
    )


def bang_diem_cong(b) -> str:
    cau = [
        f"{gon(h[1])}: được cộng tối đa {gon(h[2])}."
        for h in b[1:]
        if len(h) >= 3 and gon(h[1])
    ]
    return "Điểm cộng khuyến khích theo đối tượng thí sinh. " + " ".join(cau)


def bang_giam_hoc_phi(b) -> str:
    ds = [f"{gon(h[2])} (mã {gon(h[1])})" for h in b[1:] if len(h) >= 3 and gon(h[1]).isdigit()]
    return (
        f"Danh mục {len(ds)} ngành được giảm 50% học phí học kỳ đầu tiên đối với sinh viên "
        f"trúng tuyển chương trình đại học chính quy năm {NAM}: " + "; ".join(ds) + "."
    )


# Bảng nào đổi bằng hàm nào, nhận diện bằng tiêu đề cột — bám thứ tự xuất hiện thì
# trang đảo thứ tự một cái là gắn nhầm hết mà không có gì báo.
BO_DOI_BANG = [
    (lambda h: h[:1] == ["Tổ hợp"], bang_to_hop),
    (lambda h: any("chứng chỉ" in x.lower() for x in h), bang_chung_chi),
    (lambda h: any("điểm xét thưởng" in x.lower() for x in h), bang_diem_cong),
    (lambda h: [x.upper() for x in h[:2]] == ["STT", "MÃ NGÀNH"], bang_giam_hoc_phi),
]
# Hai bảng danh sách ngành ở mục 1.4 — bỏ hẳn, xem docstring
BO_QUA_BANG = lambda h: h[:3] == ["TT", "Mã ngành", "Tên ngành"]  # noqa: E731


def thay_bang(html: str) -> str:
    """Đổi mỗi <table> thành một đoạn văn, hoặc xoá nếu là bảng trùng/ngoài phạm vi."""
    from bs4 import BeautifulSoup

    s = BeautifulSoup(html, "html.parser")
    for x in s(["script", "style", "nav", "header", "footer"]):
        x.decompose()

    for tb in s.find_all("table"):
        hang = [
            [gon(c.get_text(" ", strip=True)) for c in tr.find_all(["td", "th"])]
            for tr in tb.find_all("tr")
        ]
        hang = [h for h in hang if any(h)]
        if not hang:
            tb.decompose()
            continue
        dau = hang[0]
        if BO_QUA_BANG(dau):
            tb.decompose()
            continue
        for nhan_dien, doi in BO_DOI_BANG:
            if nhan_dien(dau):
                tb.replace_with(s.new_string(" " + doi(hang) + " "))
                break
        else:
            tb.decompose()  # bảng lạ: bỏ, đừng đoán
    return s.get_text(" ", strip=True)


# ── Cắt mục ──────────────────────────────────────────────────────────────────
# Mốc: "I." … "IV." cho mục lớn, "1.1." … "4.3." cho mục con. Cắt ở mục CON để mỗi
# chunk gọn một ý — chunk ôm cả mục lớn sẽ cho vector trung bình của mọi ý trong đó.
RE_MOC = re.compile(r"(?:(?<=\s)|^)((?:[IVX]{1,4}|\d\.\d)\.)\s+(?=\S)")


def cat_muc(van: str) -> list[tuple[str, str, str]]:
    """→ [(số mục, tiêu đề, nội dung)]. Số mục dùng để biết thuộc xet_tuyen hay ho_tro."""
    moc = list(RE_MOC.finditer(van))
    ra = []
    for i, m in enumerate(moc):
        dau = m.end()
        cuoi = moc[i + 1].start() if i + 1 < len(moc) else len(van)
        than = gon(van[dau:cuoi])
        if len(than) < 60:  # mục rỗng hoặc chỉ là mục lục
            continue
        # Tiêu đề = phần trước dấu ":" đầu tiên, hoặc trước gạch đầu dòng ("Quyền lợi
        # - Sinh viên được giới thiệu chỗ ở…"), hoặc trước dấu chấm.
        td = re.split(r":|\s+-\s+|\.\s", than, maxsplit=1)[0]
        td = gon(td)[:90] or "Thông tin tuyển sinh"
        ra.append((m.group(1).rstrip("."), td, than))
    return ra


# Trang của trường gọi PT2 là "Xét kết quả học tập THPT", không một lần dùng chữ
# "học bạ" ở mục đó — trong khi thí sinh luôn hỏi "xét học bạ". Khoảng cách từ ngữ này
# làm đoạn đúng không lọt top-4: `do_lo_hong.py` chấm "🔴 giả có" cho đúng hai câu
# học bạ và đánh giá năng lực dù kho có đủ nội dung.
#
# Đây là chú giải TÊN GỌI, không phải thêm dữ kiện: vẫn đúng PT2 = xét kết quả học tập
# THPT, chỉ nói thêm rằng người ta quen gọi nó là xét học bạ.
CHU_GIAI = {
    "1.3": " Cách gọi quen thuộc: phương thức 2 (xét kết quả học tập THPT) chính là "
           "xét học bạ THPT; phương thức 3 và phương thức 5 là xét điểm thi đánh giá "
           "năng lực, thường viết tắt là ĐGNL.",
}

# Mục dài ôm nhiều ý rời nhau (mục 4.3 liệt kê cả chục loại học bổng và hỗ trợ) thì
# vector của nó là trung bình cộng của mọi ý, không sát ý nào. Cắt nhỏ theo gạch đầu
# dòng. Đo được: câu hỏi miễn giảm học phí trước đó cách 0.353, vượt ngưỡng lạc đề
# 0.35 nên bị loại thẳng, dù nội dung nằm ngay trong mục đó.
DAI_TOI_DA = 1400
RE_GACH_DAU_DONG = re.compile(r"\s+[-•]\s+")


def cat_nho(than: str) -> list[str]:
    if len(than) <= DAI_TOI_DA:
        return [than]
    y = RE_GACH_DAU_DONG.split(than)
    phan, hien = [], ""
    for x in y:
        if hien and len(hien) + len(x) > DAI_TOI_DA * 0.7:
            phan.append(hien)
            hien = x
        else:
            hien = f"{hien} - {x}" if hien else x
    if hien:
        phan.append(hien)
    return phan or [than]


def viet_md(tieu_de: str, muc: list, loai_nguon: str) -> str:
    d = [
        "---",
        f"nam: {NAM}",
        f"nguon: {loai_nguon}, Trường Đại học Công Thương TP.HCM",
        f"link: {TRANG}",
        f"ngay_lay: {date.today().isoformat()}",
        "---",
        "",
        f"# {tieu_de}",
        "",
    ]
    for so, td, than in muc:
        than += CHU_GIAI.get(so, "")
        phan = cat_nho(than)
        for i, p in enumerate(phan, 1):
            nhan = f"{so}. {td}" + (f" (phần {i}/{len(phan)})" if len(phan) > 1 else "")
            d += [f"## {nhan}", "", p, "", f"Nguồn: {TRANG}", ""]
    return "\n".join(d)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xem", action="store_true", help="chỉ in, không ghi file")
    a = ap.parse_args()

    muc = cat_muc(thay_bang(tai_trang()))
    xt = [m for m in muc if not m[0].startswith(MUC_HO_TRO) and not m[0].startswith("4")]
    ht = [m for m in muc if m[0].startswith(MUC_HO_TRO) or m[0].startswith("4")]

    print(f"\nĐọc {TRANG}")
    print(f"  {len(muc)} mục → xet_tuyen {len(xt)} · ho_tro {len(ht)}\n")
    for so, td, than in muc:
        cho = "ho_tro  " if (so.startswith(MUC_HO_TRO) or so.startswith("4")) else "xet_tuyen"
        print(f"  [{cho}] {so + '.':6} {td[:56]:58} {len(than):5} ký tự")

    if a.xem:
        print("\n(--xem: không ghi file)")
        return

    for thu_muc, ds, ten_tep, tieu_de, nguon in (
        ("xet_tuyen", xt, f"tuyen_sinh_{NAM}.md",
         f"Phương thức xét tuyển đại học chính quy năm {NAM}",
         f"Thông báo tuyển sinh đại học chính quy năm {NAM}"),
        ("ho_tro", ht, f"quyen_loi_hoc_bong_{NAM}.md",
         f"Quyền lợi, học bổng và hỗ trợ sinh viên năm {NAM}",
         f"Thông báo tuyển sinh đại học chính quy năm {NAM}, mục quyền lợi và học bổng"),
    ):
        if not ds:
            print(f"\n  ⚠️  Không có mục nào cho {thu_muc}/ — kiểm lại mốc cắt")
            continue
        f = KHO / thu_muc / ten_tep
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(viet_md(tieu_de, ds, nguon), encoding="utf-8")
        print(f"\n→ {f.relative_to(GOC)} · {len(ds)} mục")

    print("\n   Chạy `python scripts/nap_kho.py` để nạp vào kho vector.")


if __name__ == "__main__":
    main()
