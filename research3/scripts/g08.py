"""Sinh notebook 08_TrainFinal.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, DU_LIEU, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 8 — File CSV huấn luyện tổng hợp

''' + so_do(
    "08_TrainFinal",
    ["03_TachTrainTest/khaosat_train.csv   —  574 phiếu thật",
     "06_GA_TangCuong/khung_ho_so.csv      —  2.613 hồ sơ nền",
     "06_GA_TangCuong/sinh_theo_fold.npz   —  Likert · giới tính · mục tiêu",
     "07_KiemDinhGA/ket_luan.json          —  bản GA nào thắng"],
    ["Ghép dòng thật và dòng tăng cường thành MỘT bảng duy nhất",
     "Dựng đủ 63 cột đặc trưng cho cả hai nguồn bằng CÙNG một hàm",
     "Thêm cột quản lý: nguồn · is_that · sample_weight",
     "Kiểm tra: không ô trống bất thường, nhãn hợp lệ, đủ 39 ngành"],
    ["08_TrainFinal/train_final.csv        ⭐  FILE HUẤN LUYỆN CHÍNH THỨC",
     "08_TrainFinal/thong_ke_dac_trung.csv",
     "08_TrainFinal/hinh_8_*.png           —  3 hình"]) + '''

## Đây là file bạn yêu cầu

Một bảng duy nhất, đã làm sạch và tiền xử lý xong, sẵn sàng đưa vào mô hình:

```
   574 dòng  phiếu khảo sát thật
+ 4.680 dòng  tăng cường (hồ sơ trúng tuyển thật + phần khảo sát do GA sinh)
────────────
 5.254 dòng × 70 cột  =  63 đặc trưng + 7 cột quản lý
```

## 63 đặc trưng đến từ 5 thứ học sinh khai

Không phải 63 thông tin khác nhau — chỉ là 5 thứ được bung ra thành các góc nhìn khác nhau:

```
10 câu Likert  ──┬──►  10 cột  likert_*        giữ nguyên
                 ├──►  10 cột  ips_likert_*    trừ trung bình của chính người đó
                 └──►   2 cột  likert_tb, likert_dolech

điểm 3 môn     ──┬──►  10 cột  diem_*          10 ô, chỉ 3 ô có số
                 ├──►  10 cột  z_diem_*        cùng điểm, đổi sang z-score
                 └──►   4 cột  diem_tb, diem_lech, z_tb, z_max

tổ hợp         ─────►  15 cột  th_*            one-hot, đúng 1 ô bằng 1

giới tính      ─────►   1 cột  gioi_tinh_nam
mục tiêu       ─────►   1 cột  muc_tieu
```

**`ips_likert_*` không phải bản sao thừa.** Có bạn chấm câu nào cũng 4–5, có bạn chấm câu nào cũng
2–3. Để số thô thì mô hình học nhầm "thói quen chấm điểm rộng rãi" thành "thích ngành này". Trừ đi
trung bình của chính bạn đó thì chỉ còn lại **bạn thích câu nào HƠN câu nào** — thứ ta cần.

**`z_diem_*` cũng vậy.** 8 điểm Toán và 8 điểm Văn không cùng ý nghĩa vì độ khó đề khác nhau;
z-score quy về "so với mặt bằng chung thì bạn này đứng đâu".

## Ô trống là bình thường, không phải dữ liệu hỏng

Mỗi học sinh chỉ thi **3 môn**, nên 7 trong 10 cột điểm chắc chắn trống. Đó là hình dạng của bài
toán. XGBoost học sẵn hướng rẽ cho ô trống ngay trong thuật toán, nên **không điền bừa** — điền bừa
tạo ra giá trị không có thật.

## Cột `sample_weight`

Mỗi dòng thật được đánh trọng số bằng bao nhiêu dòng tăng cường. Giai đoạn 9 sẽ dò giá trị tốt
nhất; ở đây để `1.0` cho mọi dòng, tức chưa ưu tiên bên nào.
'''))

C.append(code(SETUP + DU_LIEU + '''
OUT = thu_muc(8)

D = nap(co_ttth=True)
ks = D["train"]
L, C_DIEM = D["likert"], D["diem"]
NG = D["nganh"]

khung = pd.read_csv(thu_muc(6) / "khung_ho_so.csv")
Zs = np.load(thu_muc(6) / "sinh_theo_fold.npz")
KL = json.loads((thu_muc(7) / "ket_luan.json").read_text(encoding="utf-8"))
KEY = KL["key_thang"] + "_full"          # bản thắng, học từ toàn bộ train

print(f"Bản GA được Giai đoạn 7 chọn : {KL['ban_thang']}")
print(f"   AUC bộ phân biệt          : {KL['ban1_gauss' if 'gauss' in KEY else 'ban2_phieu_that']['auc']:.3f}")
print(f"   dùng khoá                 : {KEY}")
print(f"\\nDòng thật     : {len(ks):,}")
print(f"Dòng tăng cường: {len(khung):,}")'''))

C.append(md("## 1. Dựng bảng tăng cường"))

C.append(code('''tc = khung.copy()
for c, col in enumerate(L):
    tc[col] = Zs[KEY][:, c]
tc["gioi_tinh"] = np.where(Zs["gioi_tinh_full"] == 1, "Nam", "Nữ")
tc["muc_tieu_ma"] = Zs["muc_tieu_full"]

print(f"Bảng tăng cường: {len(tc):,} dòng")
print(f"   Likert  : {int(tc[L].values.min())}…{int(tc[L].values.max())}")
print(f"   Nam     : {(tc.gioi_tinh=='Nam').mean():.1%}"
      f"   (khảo sát thật {(ks.gioi_tinh=='Nam').mean():.1%})")
print(f"   Mục tiêu: {sorted(tc.muc_tieu_ma.unique())}")
assert tc[L].notna().all().all(), "còn ô Likert trống"
assert tc.gioi_tinh.notna().all(), "còn ô giới tính trống"'''))

C.append(md("## 2. Ghép thành một bảng"))

C.append(code('''# Dùng CÙNG một hàm dựng đặc trưng cho cả hai nguồn — đây là điểm mấu chốt.
# Nếu mỗi nguồn dựng đặc trưng theo một cách, mô hình sẽ học được cách phân biệt
# "dòng này từ đâu ra" thay vì học về ngành học.
ks_ = ks.copy()
ks_["to_hop_thi"] = ks_.to_hop_thi.astype(str).str.split(" ").str[0]

F_ks = dac_trung(ks_, D)
F_tc = dac_trung(tc, D)
assert list(F_ks.columns) == list(F_tc.columns), "hai nguồn ra khác cột"
print(f"Đặc trưng: {F_ks.shape[1]} cột, giống nhau ở cả hai nguồn ✓\\n")

QL = ["ma_nganh", "ma_nhom", "nganh_hoc", "to_hop_thi", "nguon", "is_that",
      "sample_weight"]

a = pd.concat([ks_[["ma_nganh"]].assign(
        ma_nhom=[D["nhom"][m] for m in ks_.ma_nganh],
        nganh_hoc=[D["ma_to_ten"][m] for m in ks_.ma_nganh],
        to_hop_thi=ks_.to_hop_thi.values, nguon="khaosat", is_that=1,
        sample_weight=1.0).reset_index(drop=True), F_ks], axis=1)

b = pd.concat([tc[["ma_nganh"]].assign(
        ma_nhom=[D["nhom"][m] for m in tc.ma_nganh],
        nganh_hoc=[D["ma_to_ten"][m] for m in tc.ma_nganh],
        to_hop_thi=tc.to_hop_thi.values, nguon=tc.nguon.values, is_that=0,
        sample_weight=1.0).reset_index(drop=True), F_tc], axis=1)

final = pd.concat([a[QL + list(F_ks.columns)], b[QL + list(F_tc.columns)]],
                  ignore_index=True)

print(f"train_final.csv: {len(final):,} dòng × {final.shape[1]} cột")
print(f"   {len(QL)} cột quản lý + {F_ks.shape[1]} cột đặc trưng\\n")
print(final.nguon.value_counts().to_string())

# ── Kiểm tra ─────────────────────────────────────────────────────────────
assert len(final) == len(ks) + len(khung)
assert final.ma_nganh.nunique() == 39, "thiếu ngành"
assert final.is_that.eq(final.nguon.eq("khaosat")).all(), "is_that lệch với nguon"
assert final[L].notna().all().all(), "còn ô Likert trống"
assert (final[C_DIEM].notna().sum(axis=1) >= 3).all(), "có dòng dưới 3 môn điểm"
th_cols = [c for c in final.columns if c.startswith("th_")]
assert final[th_cols].sum(axis=1).eq(1).all(), "one-hot tổ hợp không đúng 1"
print("\\n✓ mọi phép kiểm tra đạt")'''))

C.append(md("## 3. Thống kê đặc trưng"))

C.append(code('''nhom_ct = nhom_dac_trung(list(F_ks.columns), D)
tk = []
for ten, cols in nhom_ct.items():
    if not cols:
        continue
    tk.append({
        "nhom_dac_trung": ten, "so_cot": len(cols),
        "o_trong_%": round(final[cols].isna().mean().mean() * 100, 1),
        "trong_khaosat_%": round(
            final.loc[final.is_that == 1, cols].isna().mean().mean() * 100, 1),
        "trong_tangcuong_%": round(
            final.loc[final.is_that == 0, cols].isna().mean().mean() * 100, 1),
    })
tk = pd.DataFrame(tk)
tk.to_csv(OUT / "thong_ke_dac_trung.csv", index=False)
print(tk.to_string(index=False))
print(f"\\nTổng {tk.so_cot.sum()} cột đặc trưng")
print("\\nÔ trống ở nhóm điểm là ĐÚNG: mỗi học sinh chỉ thi 3/10 môn.")
print("Các nhóm khác phải gần 0% — nếu không thì có lỗi ở bước ghép.")'''))

C.append(code('''# ═══════════ HÌNH 8.1 — Cấu tạo bảng ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))
t = tk.sort_values("so_cot")
a1.barh(range(len(t)), t.so_cot, color=C_XANH, height=.66)
a1.set_yticks(range(len(t)))
a1.set_yticklabels([n[:32] for n in t.nhom_dac_trung], fontsize=9)
a1.set_xlabel("Số cột"); a1.set_title("63 đặc trưng chia theo nhóm", fontsize=12)
a1.grid(axis="y", alpha=0)
nhan_ngang(a1, t.so_cot, "{:.0f}")

ng_ = final.nguon.value_counts()
a2.pie(ng_.values, labels=[f"{k}\\n{v:,} dòng" for k, v in ng_.items()],
       colors=[C_GA, C_THAT, C_TIM][:len(ng_)], autopct="%1.0f%%", startangle=90,
       textprops={"fontsize": 9.5})
a2.set_title(f"{len(final):,} dòng theo nguồn", fontsize=12)

fig.suptitle("Hình 8.1 — Cấu tạo train_final.csv", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_8_1_cau_tao.png",
    f"{len(final):,} dòng × {final.shape[1]} cột. Dòng khảo sát thật chiếm "
    f"{final.is_that.mean():.0%}, nhưng chúng là nguồn duy nhất có nhãn ngành do chính học sinh "
    "khai — nên Giai đoạn 9 sẽ dò xem có nên đánh trọng số cao hơn cho chúng không.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 8.2 — Ô trống ═══════════
fig, ax = plt.subplots(figsize=(15, 6))
tr_ = final[list(F_ks.columns)].isna().mean() * 100
mau = [C_THAT if v > 50 else (C_CAM if v > 5 else C_GA) for v in tr_]
ax.bar(range(len(tr_)), tr_.values, color=mau)
ax.set_xticks(range(len(tr_)))
ax.set_xticklabels(tr_.index, rotation=90, fontsize=7)
ax.set_ylabel("% ô trống"); ax.set_ylim(0, 105)
ax.set_title("Hình 8.2 — Ô trống theo từng cột")
ax.axhline(50, color=C_XAM, ls="--", lw=1.4)
n_cao = int((tr_ > 50).sum())
luu(fig, OUT, "hinh_8_2_o_trong.png",
    f"{n_cao} cột trống trên 50% — toàn bộ là cột điểm môn, vì mỗi học sinh chỉ thi 3/10 môn. "
    f"Các cột còn lại trống dưới {tr_[tr_ <= 50].max():.0f}%. Không có cột nào trống bất thường "
    "sau khi GA điền giới tính và mục tiêu cho mọi dòng.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 8.3 — Cân bằng nhãn ═══════════
cn = final.groupby(["ma_nganh", "is_that"]).size().unstack(fill_value=0)
cn["ten"] = [D["ma_to_ten"][m] for m in cn.index]
cn = cn.sort_values(1)
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, cao_theo_dong(len(cn))),
                             gridspec_kw={"width_ratios": [1.5, 1]})
yy = np.arange(len(cn))
a1.barh(yy, cn[1], color=C_THAT, height=.72, label="Khảo sát thật")
a1.barh(yy, cn[0], left=cn[1], color=C_GA, height=.72, label="Tăng cường")
a1.set_yticks(yy); a1.set_yticklabels(list(cn.ten), fontsize=8.5)
a1.set_xlabel("Số dòng"); a1.set_title("Mỗi ngành có bao nhiêu dòng", fontsize=12)
cho_chu_giai(a1, phan=.24)
a1.legend(loc="lower right", fontsize=9, framealpha=.95)
a1.grid(axis="y", alpha=0)

# Cột NGANG cho nhóm: tên nhóm dài, xoay chữ thì luôn chồng nhau
ck = final.ma_nhom.value_counts().sort_values()
a2.barh(range(len(ck)), ck.values, color=C_CAM, height=.7)
a2.set_yticks(range(len(ck)))
a2.set_yticklabels([D["ten_nhom"][i] for i in ck.index], fontsize=9)
a2.set_xlabel("Số dòng"); a2.set_title("Theo nhóm ngành", fontsize=12)
a2.grid(axis="y", alpha=0)
cho_chu_giai(a2, phan=.18)
nhan_ngang(a2, ck.values, "{:,.0f}")

fig.suptitle("Hình 8.3 — Cân bằng nhãn sau tăng cường",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
tong_ng = cn[0] + cn[1]
truoc = cn[1].max() / cn[1].min()
sau = tong_ng.max() / tong_ng.min()
luu(fig, OUT, "hinh_8_3_can_bang.png",
    f"Trước tăng cường, ngành nhiều dòng nhất gấp {truoc:.1f} lần ngành ít nhất. Sau tăng cường "
    f"chỉ còn {sau:.1f} lần. Cân bằng hơn nghĩa là mô hình không bỏ rơi ngành nhỏ.")
plt.show()'''))

C.append(md("## 4. Xuất file"))

C.append(code('''final.to_csv(OUT / "train_final.csv", index=False)
kb = (OUT / "train_final.csv").stat().st_size / 1e6

(OUT / "tom_tat.json").write_text(json.dumps({
    "n_dong": len(final), "n_cot": int(final.shape[1]),
    "n_dac_trung": int(F_ks.shape[1]), "n_cot_quan_ly": len(QL),
    "n_that": int(final.is_that.sum()),
    "n_tang_cuong": int((1 - final.is_that).sum()),
    "theo_nguon": final.nguon.value_counts().to_dict(),
    "ban_ga": KL["ban_thang"], "khoa_npz": KEY,
    "n_nganh": int(final.ma_nganh.nunique()),
    "n_nhom": int(final.ma_nhom.nunique()),
    "mb": round(kb, 1),
}, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 8 — FILE HUẤN LUYỆN TỔNG HỢP", [
    f"train_final.csv        {len(final):,} dòng × {final.shape[1]} cột"
    f"   ({kb:.1f} MB)",
    f"   {'✅ vượt mục tiêu 5.000 dòng' if len(final) > 5000 else '❌ chưa đủ 5.000'}",
    "",
    f"   khảo sát thật       {int(final.is_that.sum()):,}",
    f"   tăng cường          {int((1-final.is_that).sum()):,}"
    f"   (bản GA: {KL['ban_thang']})",
    "",
    f"Đặc trưng              {F_ks.shape[1]} cột",
] + [f"   {r.nhom_dac_trung:<32} {r.so_cot:>2} cột"
     f"   trống {r['o_trong_%']:>4.1f}%" for _, r in tk.iterrows()] + [
    "",
    f"Cột quản lý            {', '.join(QL)}",
    f"Nhãn                   {final.ma_nganh.nunique()} ngành"
    f" → {final.ma_nhom.nunique()} khối",
    f"Cân bằng ngành         chênh {sau:.1f} lần (trước tăng cường {truoc:.1f} lần)",
])
print(f"\\n⭐ train_final.csv  →  {OUT}")
print(f"   Đây là file huấn luyện chính thức. Giai đoạn 9 và 10 đọc từ đây.")'''))

viet("08_TrainFinal.ipynb", C)
