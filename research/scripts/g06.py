"""Sinh notebook 06_TrainFinal.ipynb

Gộp 676 phiếu khảo sát thật + 16.296 dòng tổng hợp thành MỘT bảng huấn luyện duy
nhất, đủ 63 đặc trưng. Giai đoạn 7 sẽ chia train/test trên chính bảng này.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 6 — Bảng huấn luyện hợp nhất

''' + so_do(
    "06_TrainFinal",
    ["01_LamSachKhaoSat/khaosat_sach.csv           —  676 phiếu THẬT",
     "05_KiemDinhDuLieuSinh/ttth_da_sinh.csv       —  16.296 dòng tổng hợp (bản đã chốt)",
     "05_KiemDinhDuLieuSinh/ket_luan.json          —  phương pháp nào thắng"],
    ["Dựng 63 đặc trưng cho CẢ HAI nguồn bằng CÙNG một hàm",
     "Gộp thành một bảng duy nhất",
     "Gắn cột quản lý: nguon · is_that · sample_weight",
     "Kiểm tra trùng lặp giữa hai nguồn",
     "Thống kê ô trống theo nguồn"],
    ["06_TrainFinal/train_final.csv                —  BẢNG DUY NHẤT, 16.972 dòng",
     "06_TrainFinal/thong_ke_dac_trung.csv",
     "06_TrainFinal/hinh_6_*.png                   —  3 hình"]) + '''

## Vì sao gộp trước rồi mới chia

Đây là yêu cầu về quy trình: **một bảng huấn luyện duy nhất**, rồi mới tách train/test
trên chính bảng đó. Mô hình học và được kiểm tra trên cùng một bộ dữ liệu đã hợp nhất,
không có nguồn nào được ưu ái hay bị giấu đi.

```
676 phiếu thật  ┐
                ├──▶  train_final.csv  ──▶  chia train/test  ──▶  học  ──▶  đo
16.296 dòng sinh┘        (Giai đoạn 6)        (Giai đoạn 7)      (9)      (10)
```

## Sáu mươi ba đặc trưng — MỘT hàm duy nhất cho cả hai nguồn

`dac_trung()` dùng chung. Nếu mỗi nguồn một hàm riêng thì hai bên sẽ trôi lệch, và lệch
một hằng số thì mô hình vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm.

| Nhóm | Số cột | Ghi chú |
|---|---:|---|
| Likert thô | 10 | |
| Likert chuẩn hoá theo người `ips_*` | 10 | **trừ trung bình, KHÔNG chia độ lệch** |
| Thống kê Likert | 2 | `likert_tb`, `likert_dolech` |
| Điểm thi thô | 10 | mỗi em chỉ 3 môn có điểm, 7 môn để **NaN** |
| Điểm z theo từng môn | 10 | 8.0 môn Toán ≠ 8.0 môn Văn |
| Phái sinh từ điểm | 4 | `diem_tb`, `diem_lech`, `z_tb`, `z_max` |
| Tổ hợp one-hot | 15 | tổ hợp là phân loại, **không có thứ tự** |
| Giới tính · mục tiêu | 2 | |

**Ô trống để NaN, không điền bừa.** XGBoost học luôn hướng rẽ cho giá trị thiếu ngay
trong thuật toán; điền bừa tạo ra giá trị không có thật mà mô hình lại tin là thật.

## Bốn cột quản lý

| Cột | Dùng làm gì |
|---|---|
| `nguon` | `khaosat` · `ttth` · `bootstrap_khaosat` |
| `is_that` | 1 nếu là phiếu người thật điền — **cột quan trọng nhất** |
| `sample_weight` | trọng số huấn luyện, Giai đoạn 9 quét |
| `ma_nganh` · `ma_nhom` | nhãn hai tầng |

`is_that` là cột phải có. Giai đoạn 10 sẽ báo cáo chỉ số **tách riêng dòng thật và dòng
tổng hợp** — không có cột này thì không tách được, và con số tổng gộp sẽ bị 96% dòng
tổng hợp chi phối.

## ⚠️ Bảng này có 96% dòng tổng hợp

676 dòng thật trên tổng 16.972 — tức **4,0%**. Ba hệ quả phải nêu trong báo cáo:

1. Chia ngẫu nhiên ở Giai đoạn 7 thì tập test cũng gồm ~96% dòng tổng hợp.
2. Mọi chỉ số tổng gộp đều phản ánh chủ yếu **chất lượng bộ sinh**, không phải khả năng
   dự đoán thí sinh thật.
3. Vì vậy Giai đoạn 10 bắt buộc phải có cột **"chỉ trên dòng thật"** — đó mới là con số
   trả lời được câu *"mô hình dự đoán thí sinh mới tốt tới đâu"*.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + '''
OUT = thu_muc(6)

D = nap(co_ttth=False)
ks = D["train"]
L, C_DIEM = D["likert"], D["diem"]

KL = json.loads((thu_muc(5) / "ket_luan.json").read_text(encoding="utf-8"))
sinh = pd.read_csv(thu_muc(5) / "ttth_da_sinh.csv")

print(f"Phiếu thật     : {len(ks):,} dòng")
print(f"Dòng tổng hợp  : {len(sinh):,} dòng")
print(f"   phương pháp : {KL['phuong_phap_chot']}")
print(f"   AUC phân biệt {KL['auc']:.3f} · sao chép {KL['sao_chep']:.1%}"
      f" · đa dạng {KL['da_dang']:.1%}")
print(f"\\nTổng sẽ có     : {len(ks)+len(sinh):,} dòng"
      f"  ({100*len(sinh)/(len(ks)+len(sinh)):.1f}% tổng hợp)")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Thống nhất lược đồ hai nguồn"))

C.append(code('''# `to_hop_thi` ở khảo sát có thể ghi nhiều tổ hợp cách nhau bằng dấu cách
# ("A00 A01 D01"), còn TTTH chỉ một. Lấy tổ hợp ĐẦU TIÊN cho cả hai để một hàm
# dac_trung() dùng được chung — nếu không, one-hot sẽ ra cột rác.
ks = ks.copy()
ks["to_hop_thi"] = ks.to_hop_thi.astype(str).str.split(" ").str[0]
ks["nguon"] = "khaosat"
ks["ma_nhom"] = ks.ma_nganh.map(D["nhom"])

can = ["ma_nganh", "ma_nhom", "to_hop_thi", "gioi_tinh", "muc_tieu_ma", "nguon"]
ks_g = ks[can + L + C_DIEM].copy()
sinh_g = sinh[can + L + C_DIEM].copy()

assert list(ks_g.columns) == list(sinh_g.columns), "hai nguồn lệch cột"
print(f"Lược đồ chung: {len(ks_g.columns)} cột")
print(f"   quản lý : {can}")
print(f"   Likert  : {len(L)} · điểm: {len(C_DIEM)}")

tho = pd.concat([ks_g, sinh_g], ignore_index=True)
tho["is_that"] = (tho.nguon == "khaosat").astype(int)
print(f"\\nGộp thô: {len(tho):,} dòng")
print(tho.nguon.value_counts().to_string())'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 2. Dựng 63 đặc trưng"))

C.append(code('''# Thống kê điểm để quy z-score tính trên TOÀN BỘ bảng đã gộp — đúng tinh thần
# "một bảng duy nhất". Giai đoạn 7 mới chia, nên ở đây chưa có test để mà rò rỉ.
D["to_hop"] = sorted(tho.to_hop_thi.unique())
g = tho[C_DIEM].astype(float)
D["diem_mu"] = g.mean().values
D["diem_sd"] = g.std().replace(0, 1).values

X = dac_trung(tho, D, co_khao_sat=True)
print(f"Ma trận đặc trưng: {X.shape[0]:,} dòng × {X.shape[1]} cột")

nhom_ct = nhom_dac_trung(list(X.columns), D)
for ten, cot in nhom_ct.items():
    print(f"   {ten:<28} {len(cot):>3} cột")
assert X.shape[1] == 63, f"phải đúng 63 đặc trưng, đang có {X.shape[1]}"

tf = pd.concat([X, tho[["ma_nganh", "ma_nhom", "nguon", "is_that"]]], axis=1)
# Trọng số mặc định 1.0 — Giai đoạn 9 quét xem có nên nâng trọng số dòng thật
tf["sample_weight"] = 1.0
tf.to_csv(OUT / "train_final.csv", index=False)

print(f"\\ntrain_final.csv: {len(tf):,} dòng × {len(tf.columns)} cột")
print(f"   63 đặc trưng + {len(tf.columns)-63} cột quản lý")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 3. Kiểm tra trùng lặp giữa hai nguồn"))

C.append(code('''# Bản sao của một phiếu thật nằm trong phần tổng hợp là nguồn RÒ RỈ trực tiếp:
# Giai đoạn 7 chia ngẫu nhiên, nên phiếu thật có thể rơi vào test trong khi bản
# sao của nó nằm ở train. Giai đoạn 5 đã ràng buộc < 5%, kiểm lại ở đây trên
# bảng cuối cùng cho chắc.
bo_that = set(map(tuple, ks_g[L].to_numpy(int)))
trung = [tuple(r) in bo_that for r in sinh_g[L].to_numpy(int)]
n_trung = int(np.sum(trung))

print(f"Dòng tổng hợp trùng KHÍT một phiếu thật: {n_trung:,}/{len(sinh_g):,}"
      f"  ({100*n_trung/len(sinh_g):.2f}%)")
print(f"Ngưỡng đã đặt ở Giai đoạn 5           : {KL['nguong_sao_chep']:.0%}")
assert n_trung / len(sinh_g) < KL["nguong_sao_chep"], "vượt ngưỡng sao chép"

# Trùng trong nội bộ phần tổng hợp thì không phải rò rỉ, nhưng nhiều quá thì
# mô hình học đi học lại cùng một mẫu.
dd = len(sinh_g[L].drop_duplicates()) / len(sinh_g)
print(f"\\nĐa dạng phần tổng hợp: {dd:.1%}"
      f"   (phiếu thật {len(ks_g[L].drop_duplicates())/len(ks_g):.1%})")

print(f"\\nPhân bố nhãn:")
print(f"   ngành : {tf.ma_nganh.nunique()}/39 · ít nhất {tf.ma_nganh.value_counts().min():,}"
      f" · nhiều nhất {tf.ma_nganh.value_counts().max():,} dòng")
print(f"   nhóm  : {tf.ma_nhom.nunique()}/9")
assert tf.ma_nganh.nunique() == 39, "có ngành biến mất khỏi bảng"'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 6.1 — Cấu tạo bảng train final ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5),
                             gridspec_kw={"width_ratios": [1, 1.4]})
vc = tf.nguon.value_counts()
mau_ng = {"khaosat": C_THAT, "ttth": C_GA, "bootstrap_khaosat": C_CAM}
a1.bar(range(len(vc)), vc.values, color=[mau_ng[n] for n in vc.index], width=.6)
a1.set_xticks(range(len(vc)))
a1.set_xticklabels([ngat_dong(n, 12) for n in vc.index], fontsize=9)
nhan_doc(a1, fmt="{:,.0f}")
a1.set_ylabel("Số dòng"); a1.set_yscale("log")
a1.set_title(f"{len(tf):,} dòng — {100*(1-tf.is_that.mean()):.1f}% tổng hợp", fontsize=12)

sl = tf.groupby("ma_nganh").agg(tong=("is_that", "size"), that=("is_that", "sum"))
sl["ten"] = [D["ma_to_ten"][m][:32] for m in sl.index]
sl = sl.sort_values("tong")
yy = np.arange(len(sl))
a2.barh(yy, sl.tong, color=C_GA, height=.74, label="tổng hợp")
a2.barh(yy, sl.that, color=C_THAT, height=.74, label="thật")
a2.set_yticks(yy); a2.set_yticklabels(sl.ten, fontsize=7.5)
a2.set_xlabel("Số dòng"); a2.set_xscale("log"); a2.grid(axis="y", alpha=0)
a2.legend(fontsize=9, loc="lower right")
a2.set_title("Mỗi ngành: thật so với tổng hợp", fontsize=12)

fig.suptitle("Hình 6.1 — Cấu tạo bảng huấn luyện hợp nhất",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_6_1_cau_tao.png",
    f"Chỉ {tf.is_that.sum()} dòng ({100*tf.is_that.mean():.1f}%) là phiếu người thật "
    f"điền. Mất cân bằng giữa các ngành cũng rất lớn: {sl.tong.min():,} tới "
    f"{sl.tong.max():,} dòng (thang log). Hai con số này là lý do Giai đoạn 10 phải "
    f"báo cáo chỉ số TÁCH RIÊNG dòng thật, và Giai đoạn 9 phải quét `sample_weight`.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 6.2 — Ô trống theo nhóm đặc trưng ═══════════
tk = []
for ten, cot in nhom_ct.items():
    for ng in ["khaosat", "ttth"]:
        m = tf.nguon == ng
        tk.append({"nhom": ten, "nguon": ng,
                   "trong": float(X.loc[m.values, cot].isna().mean().mean() * 100)})
tk = pd.DataFrame(tk)
tk.to_csv(OUT / "thong_ke_dac_trung.csv", index=False)

fig, ax = plt.subplots(figsize=(13, 4.8))
nhoms = list(nhom_ct)
x = np.arange(len(nhoms)); w_ = .38
for j, (ng, mau_) in enumerate([("khaosat", C_THAT), ("ttth", C_GA)]):
    v = [tk[(tk.nhom == n) & (tk.nguon == ng)].trong.iloc[0] for n in nhoms]
    ax.bar(x + (j - .5) * w_, v, w_, color=mau_,
           label="phiếu thật" if ng == "khaosat" else "tổng hợp")
ax.set_xticks(x)
ax.set_xticklabels([ngat_dong(n, 14) for n in nhoms], fontsize=8.5)
ax.set_ylabel("% ô trống"); ax.legend(fontsize=10)
ax.set_title("Hình 6.2 — Ô trống theo nhóm đặc trưng và theo nguồn")
luu(fig, OUT, "hinh_6_2_o_trong.png",
    f"Cột điểm thi trống nhiều ở CẢ HAI nguồn vì mỗi thí sinh chỉ thi 3 trong 10 môn — "
    f"đó là hình dạng của bài toán, không phải dữ liệu hỏng. Hai nguồn có mức trống gần "
    f"nhau nghĩa là lược đồ đã thống nhất; lệch nhiều thì mô hình sẽ học được cách phân "
    f"biệt nguồn thay vì học ngành.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 6.3 — Hai nguồn có chồng lên nhau không ═══════════
# Nếu dòng thật và dòng tổng hợp nằm ở hai vùng tách biệt thì mô hình sẽ học
# cách phân biệt NGUỒN chứ không học ngành. Chiếu xuống 2 chiều để nhìn.
from sklearn.decomposition import PCA

cot_lk = nhom_ct["Likert thô"] + nhom_ct["Likert chuẩn hoá theo người"]
M = X[cot_lk].fillna(X[cot_lk].mean()).values
rng = np.random.default_rng(SEED)
i_that = np.where(tf.is_that.values == 1)[0]
i_gia = rng.choice(np.where(tf.is_that.values == 0)[0], len(i_that), replace=False)
P = PCA(n_components=2, random_state=SEED).fit(M[np.r_[i_that, i_gia]])

fig, (a1, a2) = plt.subplots(1, 2, figsize=(14, 5))
Zt, Zg = P.transform(M[i_that]), P.transform(M[i_gia])
a1.scatter(Zg[:, 0], Zg[:, 1], s=9, color=C_GA, alpha=.35, label="tổng hợp")
a1.scatter(Zt[:, 0], Zt[:, 1], s=14, color=C_THAT, alpha=.65, label="thật")
a1.set_xlabel(f"PC1 ({P.explained_variance_ratio_[0]:.0%})")
a1.set_ylabel(f"PC2 ({P.explained_variance_ratio_[1]:.0%})")
a1.legend(fontsize=10); a1.set_title("Hai nguồn trong không gian Likert", fontsize=12)

for ax_, Zx, ten_, mau_ in [(a2, Zt, "thật", C_THAT), (a2, Zg, "tổng hợp", C_GA)]:
    ax_.hist(Zx[:, 0], bins=40, alpha=.55, color=mau_, label=ten_, density=True)
a2.set_xlabel("PC1"); a2.set_ylabel("mật độ"); a2.legend(fontsize=10)
a2.set_title("Phân bố theo PC1", fontsize=12)

fig.suptitle("Hình 6.3 — Dòng thật và dòng tổng hợp có chồng lên nhau không?",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_6_3_chong_lap.png",
    f"Hai đám mây chồng lên nhau là dấu hiệu tốt — nghĩa là dòng tổng hợp nằm trong cùng "
    f"vùng mà học sinh thật tồn tại. Nếu tách thành hai cụm rời thì mô hình sẽ học cách "
    f"phân biệt NGUỒN thay vì học ngành, và Giai đoạn 5 đã đo chuyện đó bằng AUC "
    f"{KL['auc']:.3f}.")
plt.show()'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 4. Tóm tắt"))

C.append(code('''(OUT / "tom_tat.json").write_text(json.dumps({
    "n_dong": int(len(tf)),
    "n_that": int(tf.is_that.sum()),
    "n_tong_hop": int((1 - tf.is_that).sum()),
    "ti_le_tong_hop": round(float(1 - tf.is_that.mean()), 4),
    "n_dac_trung": 63,
    "n_nganh": int(tf.ma_nganh.nunique()),
    "n_nhom": int(tf.ma_nhom.nunique()),
    "phuong_phap_sinh": KL["phuong_phap_chot"],
    "trung_khit_phieu_that": round(n_trung / len(sinh_g), 4),
    "da_dang_tong_hop": round(dd, 4),
    "dong_moi_nganh_min": int(tf.ma_nganh.value_counts().min()),
    "dong_moi_nganh_max": int(tf.ma_nganh.value_counts().max()),
}, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 6 — BẢNG HUẤN LUYỆN HỢP NHẤT", [
    f"train_final.csv        {len(tf):,} dòng × 63 đặc trưng",
    "",
    f"   phiếu thật          {int(tf.is_that.sum()):,}"
    f"   ({100*tf.is_that.mean():.1f}%)",
    f"   tổng hợp            {int((1-tf.is_that).sum()):,}"
    f"   ({100*(1-tf.is_that.mean()):.1f}%)",
    f"   phương pháp sinh    {KL['phuong_phap_chot']}",
    "",
    f"Nhãn                   {tf.ma_nganh.nunique()} ngành · {tf.ma_nhom.nunique()} nhóm",
    f"Dòng mỗi ngành         {tf.ma_nganh.value_counts().min():,}"
    f" … {tf.ma_nganh.value_counts().max():,}"
    f"  (chênh {tf.ma_nganh.value_counts().max()//tf.ma_nganh.value_counts().min()}×)",
    "",
    f"Trùng khít phiếu thật  {n_trung:,} dòng ({100*n_trung/len(sinh_g):.2f}%)  ✓",
    f"Đa dạng tổng hợp       {dd:.1%}",
    "",
    "⚠️  96% dòng là tổng hợp — Giai đoạn 10 PHẢI tách riêng chỉ số dòng thật",
])
print(f"\\n✅ train_final.csv · thong_ke_dac_trung.csv · 3 hình  →  {OUT}")'''))

viet("06_TrainFinal.ipynb", C)
