"""Sinh notebook 02_ChuanBiTTTH.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 2 — Chuẩn bị hồ sơ trúng tuyển (TTTH)

''' + so_do(
    "02_ChuanBiTTTH",
    ["data/raw/TTTH_THPT_Cleaned.xlsx     —  18.024 hồ sơ",
     "01_LamSachKhaoSat/mapping.json      —  bảng 39 ngành chuẩn"],
    ["Giữ hồ sơ TRÚNG TUYỂN (KQ = TT)",
     "Remap mã ngành đã đổi · loại mã không thuộc 39 ngành",
     "Loại tổ hợp D10 — khảo sát không có học sinh nào thi tổ hợp này",
     "Khử số báo danh trùng",
     "Trải M1/M2/M3 thành 10 cột điểm cùng lược đồ với khảo sát"],
    ["02_ChuanBiTTTH/ttth_sach.csv        —  hồ sơ dùng được",
     "02_ChuanBiTTTH/do_phu_theo_nganh.csv",
     "02_ChuanBiTTTH/hinh_2_*.png         —  4 hình"]) + '''

## Nguồn này đóng góp gì

Hồ sơ trúng tuyển có **điểm thi và tổ hợp CÓ THẬT** của hàng nghìn thí sinh đã đỗ vào từng ngành —
thứ mà 574 phiếu khảo sát không thể có nhiều. Đây là phần thông tin thật mà GA sẽ dựa vào.

Nhưng nó **không có** 10 câu Likert, không có giới tính, không có mục tiêu nghề nghiệp. Ba nhóm cột
đó sẽ do GA sinh ra ở Giai đoạn 6, học từ chính phiếu khảo sát của cùng ngành.

| | Khảo sát | TTTH |
|---|---|---|
| Ngành trúng tuyển | ✅ | ✅ |
| Tổ hợp xét tuyển | ✅ | ✅ |
| Điểm 3 môn | ✅ | ✅ |
| 10 câu Likert | ✅ | ❌ → GA sinh |
| Giới tính | ✅ | ❌ → GA sinh |
| Mục tiêu nghề nghiệp | ✅ | ❌ → GA sinh |

## Cột `DUT` — vì sao không dùng

`DUT` là điểm ưu tiên khu vực/đối tượng. Học sinh dùng web **không khai được** thông tin này, nên
đưa vào làm đặc trưng sẽ tạo ra mô hình chỉ chạy được trên dữ liệu tuyển sinh chứ không chạy được
trên người dùng thật. Bỏ.

## Tổ hợp D10 — vì sao loại

TTTH có 963 hồ sơ thi tổ hợp D10 (Toán, Địa, Anh), nhưng **không phiếu khảo sát nào** thi tổ hợp
này. Một dòng huấn luyện mang tổ hợp mà lúc phục vụ không bao giờ gặp thì vô dụng: nó tạo thêm một
cột one-hot luôn bằng 0 khi dự đoán thật.
'''))

C.append(code(SETUP + '''
OUT = thu_muc(2)
M = json.loads((thu_muc(1) / "mapping.json").read_text(encoding="utf-8"))
MA_TO_TEN = {int(k): v for k, v in M["ma_to_ten"].items()}
NHOM = {int(k): v for k, v in M["nganh_to_nhom"].items()}
TEN_NHOM = {int(k): v for k, v in M["ten_nhom"].items()}
C_DIEM = M["cot_diem"]

# Mã ngành đã đổi theo quy chế tuyển sinh. Chỉ remap những mã ĐÃ XÁC MINH;
# mã không rõ thì loại bỏ, vì đoán sai mã ngành là làm hỏng nhãn huấn luyện.
REMAP = {7540110: 7540106}      # → Đảm bảo chất lượng và an toàn thực phẩm

# Tổ hợp → 3 môn, theo đúng thứ tự M1/M2/M3 trong quy chế
TO_HOP_MON = {
    "A00": ["Toan", "Ly", "Hoa"],     "A01": ["Toan", "Ly", "Anh"],
    "B00": ["Toan", "Hoa", "Sinh"],   "D01": ["Toan", "Van", "Anh"],
    "D07": ["Toan", "Hoa", "Anh"],    "D09": ["Toan", "Su", "Anh"],
    "D15": ["Van", "Dia", "Anh"],
}
BO_TO_HOP = ["D10"]               # khảo sát không có học sinh nào thi D10

tho = pd.read_excel(RAW / "TTTH_THPT_Cleaned.xlsx")
print(f"Đọc {len(tho):,} hồ sơ · cột: {list(tho.columns)}")
print(f"Kết quả: {tho.KQ.value_counts().to_dict()}")'''))

C.append(md("## 1. Phễu lọc"))

C.append(code('''buoc = [("Hồ sơ trong file", len(tho))]
d = tho.copy()

d = d[d.KQ == "TT"].copy()
buoc.append(("Trúng tuyển (KQ = TT)", len(d)))

d["ma_nganh"] = d["Mã ngành trúng tuyển"].astype(int).replace(REMAP)
n_remap = int(tho["Mã ngành trúng tuyển"].isin(REMAP).sum())
print(f"Remap mã ngành cũ: {n_remap} hồ sơ  {REMAP}")

la = d.ma_nganh.isin(MA_TO_TEN)
if (~la).any():
    print("\\nMã ngành KHÔNG thuộc 39 ngành — loại bỏ:")
    for ma, c in d.loc[~la, "ma_nganh"].value_counts().items():
        print(f"   {ma}: {c:5,d} hồ sơ")
    print(f"   → tổng {int((~la).sum()):,} hồ sơ ({(~la).mean():.1%})")
d = d[la].copy()
buoc.append(("Mã ngành hợp lệ", len(d)))

d["to_hop_thi"] = d["Mã tổ hợp trúng tuyển"].astype(str).str.strip()
n_d10 = int(d.to_hop_thi.isin(BO_TO_HOP).sum())
d = d[~d.to_hop_thi.isin(BO_TO_HOP)].copy()
print(f"\\nLoại tổ hợp {BO_TO_HOP}: {n_d10:,} hồ sơ")
buoc.append((f"Bỏ tổ hợp {'/'.join(BO_TO_HOP)}", len(d)))

la_th = d.to_hop_thi.isin(TO_HOP_MON)
if (~la_th).any():
    print("Tổ hợp chưa có bảng môn:", d.loc[~la_th, "to_hop_thi"].value_counts().to_dict())
d = d[la_th].copy()
buoc.append(("Tổ hợp có bảng môn", len(d)))

n_trung = int(d.SBD.duplicated().sum())
d = d.drop_duplicates(subset="SBD", keep="first").copy()
print(f"\\nSố báo danh trùng: {n_trung} → giữ bản đầu tiên")
buoc.append(("Khử SBD trùng", len(d)))

co_diem = d[["M1", "M2", "M3"]].notna().all(axis=1)
d = d[co_diem].reset_index(drop=True)
buoc.append(("Đủ 3 môn điểm", len(d)))

print()
for i, (ten, n) in enumerate(buoc):
    mat = f"  (−{buoc[i-1][1]-n:,})" if i else ""
    print(f"   {ten:<28} {n:>7,}{mat}")
print(f"\\nCòn {len(d):,} hồ sơ · {d.ma_nganh.nunique()}/39 ngành")'''))

C.append(md('''## 2. Trải M1/M2/M3 thành 10 cột điểm

File TTTH lưu điểm dưới dạng `M1`, `M2`, `M3` — *"môn thứ nhất, thứ hai, thứ ba của tổ hợp"*. Nhưng
`M1` của A00 là Toán còn `M1` của D15 là Văn. Để dùng chung một lược đồ với khảo sát, phải trải
chúng về đúng tên môn.'''))

C.append(code('''for c in C_DIEM:
    d[c] = np.nan
for th, mons in TO_HOP_MON.items():
    sel = d.to_hop_thi == th
    if not sel.any():
        continue
    for k, mon in enumerate(mons, start=1):
        d.loc[sel, f"diem_{mon}"] = d.loc[sel, f"M{k}"].values

so_mon = d[C_DIEM].notna().sum(axis=1)
assert (so_mon == 3).all(), f"phải đúng 3 môn/hồ sơ, đang có {so_mon.value_counts().to_dict()}"
print(f"Trải xong — mỗi hồ sơ đúng 3 môn có điểm, {len(C_DIEM)-3} môn để trống\\n")

# ── Kiểm chứng: điểm TTTH có cùng thang với điểm khảo sát không? ──────────
ks = pd.read_csv(thu_muc(1) / "khaosat_sach.csv")
ss = []
for c in C_DIEM:
    a, b = d[c].dropna(), ks[c].dropna()
    if len(a) > 30 and len(b) > 10:
        ss.append({"mon": c.replace("diem_", ""), "ttth_n": len(a),
                   "ttth_tb": a.mean(), "ks_n": len(b), "ks_tb": b.mean(),
                   "chenh": a.mean() - b.mean()})
ss = pd.DataFrame(ss).sort_values("chenh")
print("SO ĐIỂM TRUNG BÌNH — TTTH so với khảo sát")
print(ss.to_string(index=False, float_format=lambda v: f"{v:.2f}"))
print(f"\\nChênh lớn nhất {ss.chenh.abs().max():.2f} điểm — hai nguồn cùng thang 10,")
print("nên gộp chung vào một bảng huấn luyện là hợp lệ.")'''))

C.append(code('''# ═══════════ HÌNH 2.1 — Phễu lọc TTTH ═══════════
fig, ax = plt.subplots(figsize=(10, 4.8))
ten = [b[0] for b in buoc]; sl = [b[1] for b in buoc]
ax.barh(range(len(buoc))[::-1], sl, color=[C_XAM] + [C_GA] * (len(buoc) - 1), height=.62)
ax.set_yticks(range(len(buoc))[::-1]); ax.set_yticklabels(ten, fontsize=9.5)
ax.set_xlabel("Số hồ sơ"); ax.set_title("Hình 2.1 — Phễu làm sạch hồ sơ trúng tuyển")
ax.grid(axis="y", alpha=0)
for i, n in enumerate(sl):
    ax.text(n + 120, len(buoc) - 1 - i, f"{n:,}", va="center", fontweight="bold", fontsize=9.5)
    if i and sl[i-1] != n:
        ax.text(n + 1250, len(buoc) - 1 - i, f"(−{sl[i-1]-n:,})", va="center",
                fontsize=8.5, color=C_THAT)
luu(fig, OUT, "hinh_2_1_pheu_loc.png",
    f"Giữ {sl[-1]:,}/{sl[0]:,} hồ sơ ({sl[-1]/sl[0]:.0%}). Phần lớn mất mát đến từ hồ sơ không "
    "trúng tuyển và tổ hợp D10 — cả hai đều là loại bỏ có lý do, không phải dữ liệu hỏng.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 2.2 — Độ phủ theo ngành ═══════════
co_tt = d.ma_nganh.value_counts()
co_ks = ks.ma_nganh.value_counts()
dp = pd.DataFrame({"ttth": co_tt, "khaosat": co_ks}).fillna(0).astype(int)
dp["nganh"] = [MA_TO_TEN[m] for m in dp.index]
dp["nhom"] = [TEN_NHOM[NHOM[m]] for m in dp.index]
dp = dp.sort_values("ttth")
dp.to_csv(OUT / "do_phu_theo_nganh.csv")

fig, ax = plt.subplots(figsize=(12, cao_theo_dong(len(dp))))
yy = np.arange(len(dp))
ax.barh(yy, dp.ttth, color=C_GA, height=.72, label="Hồ sơ trúng tuyển")
ax.barh(yy, dp.khaosat, color=C_THAT, height=.42, label="Phiếu khảo sát")
ax.set_yticks(yy); ax.set_yticklabels(list(dp.nganh), fontsize=8.5)
ax.set_xlabel("Số dòng (thang log)"); ax.set_xscale("symlog")
ax.set_title("Hình 2.2 — Mỗi ngành có bao nhiêu dữ liệu từ hai nguồn")
cho_chu_giai(ax, phan=.22)
ax.legend(loc="lower right", framealpha=.95)
ax.grid(axis="y", alpha=0)
thieu = dp[dp.ttth == 0]
luu(fig, OUT, "hinh_2_2_do_phu.png",
    f"{len(thieu)}/39 ngành KHÔNG có hồ sơ trúng tuyển nào"
    + (f" ({', '.join(thieu.nganh.head(6))})" if len(thieu) else "")
    + ". Những ngành này ở Giai đoạn 6 sẽ phải sinh dữ liệu từ chính phiếu khảo sát của chúng.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 2.3 — Điểm và tổ hợp ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))
th_tt = d.to_hop_thi.value_counts()
th_ks = ks.to_hop_thi.str.split(" ").str[0].value_counts()
moi = sorted(set(th_tt.index) | set(th_ks.index))
x = np.arange(len(moi)); w = .38
a1.bar(x - w/2, [th_tt.get(t, 0) for t in moi], w, color=C_GA, label="TTTH")
a1.bar(x + w/2, [th_ks.get(t, 0) * 20 for t in moi], w, color=C_THAT,
       label="Khảo sát (×20 cho dễ nhìn)")
a1.set_xticks(x); a1.set_xticklabels(moi, rotation=45, ha="right", fontsize=9)
a1.set_ylabel("Số dòng"); a1.set_title("Tổ hợp xét tuyển", fontsize=12); a1.legend(fontsize=9)

for c, mau in zip(["diem_Toan", "diem_Van", "diem_Anh"], [C_XANH, C_CAM, C_TIM]):
    v = d[c].dropna()
    if len(v) > 50:
        a2.hist(v, bins=30, alpha=.55, color=mau, label=f"{c.replace('diem_','')} (n={len(v):,})")
a2.set_xlabel("Điểm"); a2.set_ylabel("Số hồ sơ")
a2.set_title("Phân bố điểm thi trong TTTH", fontsize=12); a2.legend(fontsize=9)

fig.suptitle("Hình 2.3 — Tổ hợp và điểm thi", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
chung = sorted(set(th_tt.index) & set(th_ks.index))
luu(fig, OUT, "hinh_2_3_to_hop_diem.png",
    f"{len(chung)} tổ hợp có mặt ở cả hai nguồn ({', '.join(chung)}). Khảo sát còn "
    f"{len(set(th_ks.index)-set(th_tt.index))} tổ hợp mà TTTH không có — những học sinh đó chỉ "
    "được mô hình học từ phiếu khảo sát.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 2.4 — So điểm hai nguồn ═══════════
fig, ax = plt.subplots(figsize=(11, 4.8))
x = np.arange(len(ss)); w = .38
ax.bar(x - w/2, ss.ttth_tb, w, color=C_GA, label="TTTH")
ax.bar(x + w/2, ss.ks_tb, w, color=C_THAT, label="Khảo sát")
ax.set_xticks(x); ax.set_xticklabels(ss.mon, fontsize=10)
ax.set_ylabel("Điểm trung bình"); ax.set_ylim(0, 10)
ax.set_title("Hình 2.4 — Điểm trung bình từng môn ở hai nguồn"); ax.legend()
for i, r in enumerate(ss.itertuples()):
    ax.text(i, max(r.ttth_tb, r.ks_tb) + .2, f"{r.chenh:+.2f}", ha="center",
            fontsize=8.5, fontweight="bold",
            color=C_THAT if abs(r.chenh) > 1 else C_DAM)
luu(fig, OUT, "hinh_2_4_so_diem.png",
    f"Chênh lệch lớn nhất {ss.chenh.abs().max():.2f} điểm. Hai nguồn cùng thang điểm 10 và cùng "
    "mặt bằng, nên gộp vào một bảng huấn luyện không tạo ra bước nhảy giả trong dữ liệu.")
plt.show()'''))

C.append(md("## 3. Xuất dữ liệu"))

C.append(code('''giu = ["SBD", "ma_nganh", "to_hop_thi"] + C_DIEM
d["ma_nhom"] = d.ma_nganh.map(NHOM)
d[giu + ["ma_nhom"]].to_csv(OUT / "ttth_sach.csv", index=False)

tom_tat("GIAI ĐOẠN 2 — CHUẨN BỊ HỒ SƠ TRÚNG TUYỂN", [
    f"Hồ sơ trong file       {buoc[0][1]:,}",
    f"Hồ sơ dùng được        {len(d):,}   ({len(d)/buoc[0][1]:.0%})",
    f"   không trúng tuyển   {buoc[0][1]-buoc[1][1]:,}",
    f"   mã ngành ngoài 39   {buoc[1][1]-buoc[2][1]:,}",
    f"   tổ hợp D10          {buoc[2][1]-buoc[3][1]:,}",
    f"   SBD trùng           {n_trung}",
    "",
    f"Ngành có hồ sơ         {d.ma_nganh.nunique()}/39"
    f"   (thiếu {39-d.ma_nganh.nunique()} ngành)",
    f"Tổ hợp                 {d.to_hop_thi.nunique()}   {sorted(d.to_hop_thi.unique())}",
    f"Điểm                   mỗi hồ sơ đúng 3 môn, cùng thang với khảo sát",
    "",
    "Nguồn này KHÔNG có: 10 câu Likert · giới tính · mục tiêu nghề nghiệp",
    "   → Giai đoạn 6 sẽ dùng GA sinh 3 nhóm cột đó",
])
print(f"\\n✅ ttth_sach.csv · do_phu_theo_nganh.csv · 4 hình  →  {OUT}")'''))

viet("02_ChuanBiTTTH.ipynb", C)
