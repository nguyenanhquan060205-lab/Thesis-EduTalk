"""Cộng tín chỉ trong `kho_tri_thuc/ctdt/` và báo ngành nào lệch.

    conda activate Edutalk
    cd backend
    python scripts/kiem_ctdt.py
    python scripts/kiem_ctdt.py --ma 7340301     # soi một ngành

VÌ SAO CẦN. Mọi lỗi của `lay_ctdt.py` tới giờ đều **im lặng**: file vẫn có tiêu đề
`## Học kỳ N`, vẫn có dòng `Nguồn:`, đọc vào vẫn trôi chảy — chỉ sai số. Đã dính:

- ngành Luật lấy nhầm "Tổng số tín chỉ LÝ THUYẾT 89" thay cho "toàn khóa 121";
- khoa Thực phẩm in một cột mã học phần thay vì hai → 0 học phần, vẫn báo "✅";
- trang Kế toán trộn hai kiểu mã Unicode cho chữ "kỳ" → mất học kỳ 5, 6, 7;
- trang khoa nhúng đúng cái PDF đã có trong danh sách → chương trình vào kho hai lần.

Không có cái nào ném lỗi. Cộng số là cách duy nhất phát hiện ra.

Bốn phép kiểm, tất cả chỉ dựa vào chính nội dung file:

1. Thân mục cộng < số tín chỉ ghi trên tiêu đề  →  THIẾU học phần
2. Thân mục cộng > 3 lần số ghi trên tiêu đề    →  HÚT NHẦM bảng phía sau
3. Tổng toàn khoá khai ở đoạn mở đầu phải nằm giữa tổng-nhỏ-nhất và tổng-lớn-nhất
   khi cộng theo học kỳ (một học kỳ có nhiều mục là các nhánh chọn một)
4. Hai mục trùng tiêu đề y hệt                  →  nguồn bị nạp hai lần
"""

import argparse
import json
import pathlib
import re
import sys
from collections import defaultdict

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

THU_MUC = GOC / "data" / "kho_tri_thuc" / "ctdt"
F_TUYEN_SINH = GOC / "data" / "co_cau_truc" / "tuyen_sinh_huit_2026.json"

# Ngành trường KHÔNG còn đăng chương trình đào tạo. Ghi ra đây để bộ kiểm báo riêng
# thay vì xếp vào "chưa có file" — một dòng đỏ không bao giờ tắt được thì người ta
# quen mắt bỏ qua, rồi bỏ qua luôn lỗi thật bên cạnh.
#
# Tìm thấy link mới thì XOÁ dòng tương ứng ở đây, thêm link vào
# docs/RAG_docs/danh_s_ch_ng_nh_o_t_o_huit.md rồi chạy lại doc_danh_sach_link.py.
KHONG_CON_CTDT = {
    "7380107": "trang khoa đã gỡ (law.huit.edu.vn/.../chuong-trinh-dao-tao-nganh-luat-"
               "kinh-te trả 404); ngành vẫn có học phí trong kho_tri_thuc/hoc_phi/",
}

RE_MUC = re.compile(r"^## (.+?)$(.*?)(?=^## |\Z)", re.M | re.S)
# Neo vào ĐẦU tiêu đề. Bắt giữa câu thì tiêu đề khối kiến thức của ngành Marketing —
# "3 Chuyên ngành (bao gồm kiến thức học kỳ doanh nghiệp được bố trí giảng dạy vào học
# kỳ 7)" — bị tính thành một học kỳ thật, và ngành đó được xếp vào nhóm "cộng khớp"
# dù chẳng có kế hoạch học kỳ nào.
RE_KY = re.compile(r"^\s*(?:H[ọo]c\s*k[ỳy]|HK)\s*(\d+)", re.I)
# Không khớp "00 tín chỉ KHÔNG tích lũy" — chữ "không" chen vào nên mẫu này trượt, đúng
# ý muốn. Một tiêu đề có thể ghi NHIỀU mức: HK7 ngành Điều khiển & TĐH là "15 tín chỉ
# ... cử nhân - hoặc 23 tín chỉ ... kỹ sư". Lấy hết, coi như các nhánh chọn một.
RE_TC_TIEU_DE = re.compile(r"(\d{1,3})\s*t[íi]n\s*ch[ỉi]\s*t[íi]ch\s*l[ũu]y", re.I)
RE_TC_THAN = re.compile(r"\((\d{1,2})\s*t[íi]n\s*ch[ỉi]\)")
RE_TONG = re.compile(r"to[àa]n\s+kho[áa]\s+l[àa]\s+(\d{2,3})\s*t[íi]n\s*ch[ỉi]", re.I)

# Mục "không tích luỹ" (GDTC, GDQP) cố ý không tính vào tổng — bỏ qua khi đối chiếu
RE_KHONG_TL = re.compile(r"kh[ôo]ng\s*t[íi]ch\s*l[ũu]y", re.I)


def ten_cac_nganh() -> dict[str, str]:
    return {
        ma: m["ten"]
        for ma, m in json.loads(F_TUYEN_SINH.read_text(encoding="utf-8"))["nganh"].items()
    }


def doc_file(f: pathlib.Path) -> dict:
    t = f.read_text(encoding="utf-8")
    ma = m.group(1) if (m := re.search(r'^nganh:\s*"?(\d{7})', t, re.M)) else "?"
    tong = int(m.group(1)) if (m := RE_TONG.search(t)) else None
    thu_cong = bool(re.search(r"^thu_cong:\s*true\s*$", t, re.M))

    muc = []
    for tieu_de, than in RE_MUC.findall(t):
        if not (k := RE_KY.search(tieu_de)):
            continue
        khai = [int(x) for x in RE_TC_TIEU_DE.findall(tieu_de)]
        than_tc = sum(int(x) for x in RE_TC_THAN.findall(than))
        muc.append({
            "ky": int(k.group(1)),
            "tieu_de": tieu_de.strip(),
            "khai": khai,
            "than": than_tc,
            "so_hp": len(RE_TC_THAN.findall(than)),
        })
    return {"ma": ma, "tong": tong, "thu_cong": thu_cong, "muc": muc}


def kiem_mot(d: dict, ten: str) -> list[str]:
    loi = []
    muc = d["muc"]
    if not muc:
        return loi  # không có kế hoạch học kỳ — báo riêng ở phần tổng hợp

    # (4) trùng tiêu đề
    dem = defaultdict(int)
    for m in muc:
        dem[m["tieu_de"]] += 1
    for td, n in dem.items():
        if n > 1:
            loi.append(f"TRÙNG {n} lần: {td[:64]}")

    for m in muc:
        if not m["khai"]:
            continue
        # Tiêu đề ghi nhiều mức thì so với mức nhỏ nhất khi bắt thiếu, mức lớn nhất
        # khi bắt hút nhầm — nghi ngờ phải có lợi cho dữ liệu, đừng báo đỏ oan.
        nho, lon = min(m["khai"]), max(m["khai"])
        khai_in = "/".join(str(x) for x in m["khai"])
        # (1) thiếu học phần — thân phải ĐỦ ít nhất số tín chỉ tiêu đề khai,
        #     thường còn dư vì nhóm tự chọn liệt kê rộng hơn số phải lấy
        if m["than"] < nho:
            loi.append(
                f"THIẾU  HK{m['ky']}: tiêu đề khai {khai_in} TC · "
                f"thân chỉ có {m['than']} TC / {m['so_hp']} học phần"
            )
        # (2) hút nhầm bảng phía sau
        elif m["than"] > lon * 3:
            loi.append(
                f"HÚT NHẦM HK{m['ky']}: tiêu đề khai {khai_in} TC · "
                f"thân tới {m['than']} TC / {m['so_hp']} học phần"
            )

    # (3) tổng theo học kỳ phải bao được tổng khai ở đoạn mở đầu
    if d["tong"]:
        theo_ky = defaultdict(list)
        for m in muc:
            theo_ky[m["ky"]] += m["khai"]
        theo_ky = {k: v for k, v in theo_ky.items() if v}
        if theo_ky:
            nho = sum(min(v) for v in theo_ky.values())
            lon = sum(max(v) for v in theo_ky.values())
            if not nho <= d["tong"] <= lon:
                loi.append(
                    f"TỔNG   đoạn mở đầu ghi {d['tong']} TC · cộng {len(theo_ky)} học kỳ "
                    f"chỉ ra {nho}–{lon} TC"
                )
    return loi


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ma", help="chỉ kiểm một mã ngành")
    a = ap.parse_args()

    ten_nganh = ten_cac_nganh()
    files = sorted(f for f in THU_MUC.glob("*.md") if not f.name.startswith("_"))
    if a.ma:
        files = [f for f in files if f.name.startswith(a.ma)]

    print(f"\n{'═' * 78}\n  KIỂM {len(files)} FILE Ở {THU_MUC.relative_to(GOC)}/\n{'═' * 78}")

    hong, sach, khong_ky, tay = [], [], [], []
    for f in files:
        d = doc_file(f)
        ten = ten_nganh.get(d["ma"], f.stem)
        if loi := kiem_mot(d, ten):
            hong.append((d, ten, loi))
        elif d["muc"]:
            sach.append((d, ten))
        elif d["thu_cong"]:
            # File người soạn tay có thể xếp theo KHỐI KIẾN THỨC thay vì theo học kỳ
            # (ngành Luật). Không có mục học kỳ ở đây là đúng thiết kế, đừng xếp chung
            # với những ngành trang khoa không đăng bảng học phần.
            tay.append((d, ten))
        else:
            khong_ky.append((d, ten))

    if hong:
        print(f"\n❌ LỆCH SỐ ({len(hong)}):")
        for d, ten, loi in hong:
            print(f"\n   {d['ma']}  {ten}")
            for x in loi:
                print(f"      {x}")

    if sach:
        print(f"\n✅ Cộng khớp ({len(sach)}):")
        for d, ten in sach:
            ky = sorted({m["ky"] for m in d["muc"]})
            tong = f"tổng {d['tong']} TC" if d["tong"] else "không khai tổng"
            nhan_tay = " · viết tay" if d["thu_cong"] else ""
            print(f"    {d['ma']}  {ten[:34]:36} {len(d['muc'])} mục · "
                  f"HK {ky[0]}–{ky[-1]} · {tong}{nhan_tay}")

    if tay:
        print(f"\n✋ Viết tay, xếp theo khối kiến thức ({len(tay)}):")
        for d, ten in tay:
            print(f"    {d['ma']}  {ten[:34]:36} kiểm bằng mắt, script không cộng được")

    if khong_ky:
        print(f"\n➖ Không có kế hoạch học kỳ, chỉ mô tả ({len(khong_ky)}):")
        print("    " + ", ".join(f"{d['ma']} {ten[:22]}" for d, ten in khong_ky))

    vang = [m for m in ten_nganh if not any(f.name.startswith(m) for f in files)]
    thieu = [m for m in vang if m not in KHONG_CON_CTDT]
    da_biet = [m for m in vang if m in KHONG_CON_CTDT]

    if da_biet and not a.ma:
        print(f"\n🗑️  Trường không còn đăng chương trình đào tạo ({len(da_biet)}):")
        for m in da_biet:
            print(f"    {m}  {ten_nganh[m][:34]:36} {KHONG_CON_CTDT[m]}")
    if thieu and not a.ma:
        print(f"\n⛔ Chưa có file ({len(thieu)}): "
              + ", ".join(f"{m} {ten_nganh[m][:22]}" for m in thieu))

    print(f"\n{'─' * 78}")
    print(f"  {len(sach)} khớp · {len(hong)} lệch · {len(tay)} viết tay · "
          f"{len(khong_ky)} chỉ mô tả"
          + (f" · {len(thieu)} chưa có" if thieu and not a.ma else "")
          + (f" · {len(da_biet)} trường đã gỡ" if da_biet and not a.ma else ""))
    if hong:
        print("  Sửa bộ trích trong scripts/lay_ctdt.py rồi chạy lại --trich.")


if __name__ == "__main__":
    main()
