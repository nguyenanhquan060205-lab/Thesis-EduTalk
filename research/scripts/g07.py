"""Sinh notebook 07_TachTrainTest.ipynb

Chia bảng train final thành ba tập 70/15/15, rồi NIÊM PHONG tập test tới Giai
đoạn 10.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, MO_HINH, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 7 — Chia train / test

''' + so_do(
    "07_TachTrainTest",
    ["06_TrainFinal/train_final.csv          —  16.972 dòng × 63 đặc trưng"],
    ["Chia 70 / 15 / 15 — train / val / test",
     "stratify theo NGÀNH để mọi ngành có mặt ở cả ba tập",
     "Niêm phong tập test bằng băm SHA-256",
     "Kiểm tra ba tập không chồng nhau, đủ 39 ngành"],
    ["07_TachTrainTest/train.csv             —  11.880 dòng",
     "07_TachTrainTest/val.csv               —  2.546 dòng, dùng ở Giai đoạn 9",
     "07_TachTrainTest/test_KHOA.csv         —  KHÔNG mở tới Giai đoạn 10",
     "07_TachTrainTest/niem_phong.json"]) + '''

## Mọi dòng bình đẳng

Bảng `train_final.csv` là **một khối duy nhất**. Mô hình chỉ nhìn thấy **63 đặc trưng** —
nó không biết dòng nào từ phiếu khảo sát, dòng nào do máy sinh. Năm cột `ma_nganh`,
`ma_nhom`, `nguon`, `is_that`, `sample_weight` nằm ngoài tập đặc trưng, chỉ để ghi chép.

`sample_weight = 1.0` cho cả 16.972 dòng. Không ai được ưu tiên.

```
train_final.csv  16.972 dòng
        │  stratify theo ma_nganh, seed 42
        ▼
   ┌──────────┬──────────┬───────────────┐
   │ train 70%│  val 15% │ test_KHOA 15% │ ← niêm phong SHA-256
   └──────────┴──────────┴───────────────┘
     11.880      2.546        2.546
```

## Vì sao 70/15/15

Đã đo: tăng dữ liệu huấn luyện từ 11.880 lên 15.274 dòng chỉ đổi được **0,5 điểm**
Top-3. Đường cong đã bão hoà — 16.972 dòng với 63 đặc trưng là quá đủ cho XGBoost.

Thứ **khan hiếm** không phải dữ liệu để học, mà là **dữ liệu thật để đo**. Toàn bộ dự án
chỉ có 676 phiếu người thật.

| | 80/10/10 | **70/15/15** |
|---|--:|--:|
| dòng THẬT ở test | 68 | **~117** |
| sai số Top-3 (95%) | ±9,5đ | **±7,8đ** |

Đổi 0,5 điểm trên một con số vốn đã bị thổi phồng, lấy thêm dòng thật cho con số thật sự
quan trọng.

Tập val 2.546 dòng cũng làm việc chọn siêu tham số ở Giai đoạn 9 ổn định hơn — quét mấy
chục cấu hình trên val nhỏ thì dễ chọn trúng cấu hình may mắn.

## ⚠️ Tập test cũng gồm ~96% dòng tổng hợp

Đây là hệ quả trực tiếp của việc gộp trước rồi chia. Hai điều phải làm ở Giai đoạn 10:

1. Báo cáo chỉ số **tách riêng** `is_that = 1` và `is_that = 0`.
2. Nêu rõ số dòng thật trong tập test — đó là cỡ mẫu thực sự của con số đáng tin, và
   phải kèm khoảng tin cậy vì n chỉ khoảng 117.

Hai cột đó chỉ để **đọc**, không can thiệp vào việc huấn luyện.

## Niêm phong

`test_KHOA.csv` được băm SHA-256 ngay sau khi ghi, băm lưu vào `niem_phong.json`. Giai
đoạn 10 kiểm lại băm trước khi mở. Nếu ai đó lỡ sửa tập test giữa chừng thì `assert` sẽ
nổ, thay vì âm thầm cho ra một con số sai.

Giai đoạn 8 và 9 **không được mở** `test_KHOA.csv` — chúng dùng `val.csv`.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + """
import hashlib
from sklearn.model_selection import train_test_split

OUT = thu_muc(7)
P_VAL = 0.15
P_TEST = 0.15

D = nap(co_ttth=False)
tf = pd.read_csv(thu_muc(6) / "train_final.csv")
QL = ["ma_nganh", "ma_nhom", "nguon", "is_that", "sample_weight"]
COT_DT = [c for c in tf.columns if c not in QL]
y_all = tf.ma_nganh.values

print(f"Bảng train final: {len(tf):,} dòng")
print(f"   mô hình THẤY      : {len(COT_DT)} đặc trưng")
print(f"   chỉ để ghi chép   : {QL}")
print(f"   sample_weight     : {sorted(tf.sample_weight.unique())}  → mọi dòng ngang nhau")
print(f"\\n   dòng thật         : {int(tf.is_that.sum()):,}  ({100*tf.is_that.mean():.1f}%)")
print(f"   ngành             : {tf.ma_nganh.nunique()}/39"
      f" · ít nhất {tf.ma_nganh.value_counts().min():,} dòng")
print(f"\\nChia {1-P_VAL-P_TEST:.0%} / {P_VAL:.0%} / {P_TEST:.0%}  (train / val / test)")"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Chia ba tập"))

C.append(code("""# Chia hai bước: tách test+val ra trước, rồi chia đôi. stratify theo NGÀNH ở cả
# hai bước để mọi ngành có mặt ở cả ba tập — ngành ít nhất chỉ 36 dòng, chia
# ngẫu nhiên không stratify thì có ngành biến mất khỏi test.
i_tr, i_tmp = train_test_split(
    np.arange(len(tf)), test_size=P_VAL + P_TEST, stratify=y_all, random_state=SEED)
i_va, i_te = train_test_split(
    i_tmp, test_size=P_TEST / (P_VAL + P_TEST), stratify=y_all[i_tmp],
    random_state=SEED)

train = tf.iloc[i_tr].reset_index(drop=True)
val = tf.iloc[i_va].reset_index(drop=True)
test = tf.iloc[i_te].reset_index(drop=True)

train.to_csv(OUT / "train.csv", index=False)
val.to_csv(OUT / "val.csv", index=False)
test.to_csv(OUT / "test_KHOA.csv", index=False)

print(f"{'tập':<8}{'dòng':>9}{'thật':>8}{'% thật':>9}{'ngành':>8}")
print("-" * 44)
for ten, d in [("train", train), ("val", val), ("test", test)]:
    print(f"{ten:<8}{len(d):>9,}{int(d.is_that.sum()):>8}"
          f"{100*d.is_that.mean():>8.1f}%{d.ma_nganh.nunique():>8}")

assert len(set(i_tr) & set(i_va)) == 0, "train và val chồng nhau"
assert len(set(i_tr) & set(i_te)) == 0, "train và test chồng nhau"
assert len(set(i_va) & set(i_te)) == 0, "val và test chồng nhau"
assert len(i_tr) + len(i_va) + len(i_te) == len(tf), "mất dòng"
for ten, d in [("train", train), ("val", val), ("test", test)]:
    assert d.ma_nganh.nunique() == 39, f"{ten} thiếu ngành"
    assert d.is_that.sum() > 0, f"{ten} không có dòng thật nào"
print("\\n✓ ba tập rời nhau · đủ 39 ngành · tập nào cũng có dòng thật")"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 2. Niêm phong tập test"))

C.append(code("""bam = hashlib.sha256((OUT / "test_KHOA.csv").read_bytes()).hexdigest()
n_that_te = int(test.is_that.sum())
# Khoảng tin cậy 95% cho một tỉ lệ ước lượng quanh 0,80 với n dòng thật
sai_so = 1.96 * np.sqrt(.8 * .2 / n_that_te) * 100

(OUT / "niem_phong.json").write_text(json.dumps({
    "file": "test_KHOA.csv", "bam_sha256": bam,
    "n_dong": int(len(test)), "n_that": n_that_te,
    "p_train": 1 - P_VAL - P_TEST, "p_val": P_VAL, "p_test": P_TEST, "seed": SEED,
    "sai_so_95_tren_dong_that": round(float(sai_so), 1),
    "ghi_chu": "Giai đoạn 8 và 9 KHÔNG được mở — dùng val.csv. "
               "Giai đoạn 10 kiểm băm trước khi mở.",
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Băm SHA-256: {bam[:48]}…")
print(f"\\nTập test có {n_that_te} dòng THẬT trên {len(test):,} dòng.")
print(f"Với cỡ mẫu đó, Top-3 đo được sẽ có khoảng tin cậy 95% khoảng ±{sai_so:.1f} điểm.")
print("Đó là cỡ mẫu thật của kết luận cuối cùng — phải nêu trong báo cáo.")"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(code("""# ═══════════ HÌNH 7.1 — Ba tập sau khi chia ═══════════
fig, (a1, a2, a3) = plt.subplots(1, 3, figsize=(17, cao_theo_dong(39)),
                                 gridspec_kw={"width_ratios": [1.6, .8, .8]})
pt = pd.DataFrame({
    "train": train.ma_nganh.value_counts(normalize=True),
    "val": val.ma_nganh.value_counts(normalize=True),
    "test": test.ma_nganh.value_counts(normalize=True)}).fillna(0).sort_values("train")
pt["ten"] = [D["ma_to_ten"][m][:30] for m in pt.index]
yy = np.arange(len(pt))
for j, (c, mau_) in enumerate([("train", C_XANH), ("val", C_CAM), ("test", C_XAM)]):
    a1.barh(yy + (j - 1) * .27, pt[c] * 100, .26, color=mau_, label=c)
a1.set_yticks(yy); a1.set_yticklabels(pt.ten, fontsize=7.5)
a1.set_xlabel("% trong tập"); a1.legend(fontsize=9); a1.grid(axis="y", alpha=0)
a1.set_title("Phân bố ngành — stratify có giữ được không?", fontsize=11.5)

ten3 = ["train", "val", "test"]
sl3 = [len(train), len(val), len(test)]
a2.bar(ten3, sl3, color=[C_XANH, C_CAM, C_XAM], width=.6)
nhan_doc(a2, fmt="{:,.0f}")
a2.set_ylabel("số dòng"); a2.set_title("Cỡ ba tập", fontsize=11.5)

th3 = [int(train.is_that.sum()), int(val.is_that.sum()), n_that_te]
a3.bar(ten3, th3, color=C_THAT, width=.6)
nhan_doc(a3, fmt="{:,.0f}")
a3.set_ylabel("số dòng THẬT")
a3.set_title("Dòng người thật điền", fontsize=11.5)

fig.suptitle(f"Hình 7.1 — Chia {1-P_VAL-P_TEST:.0%} / {P_VAL:.0%} / {P_TEST:.0%}",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
lech = float((pt.train - pt.test).abs().max() * 100)
luu(fig, OUT, "hinh_7_1_ba_tap.png",
    f"Stratify giữ được phân bố ngành: lệch lớn nhất giữa train và test chỉ {lech:.2f} "
    f"điểm phần trăm. Nhưng tập test cũng gồm {100*(1-test.is_that.mean()):.1f}% dòng "
    f"tổng hợp — chỉ {n_that_te} dòng là người thật điền (cột phải), và đó mới là cỡ mẫu "
    f"của con số đáng tin ở Giai đoạn 10 (±{sai_so:.1f} điểm).")
plt.show()"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(code("""tom_tat("GIAI ĐOẠN 7 — CHIA TRAIN / VAL / TEST", [
    f"Nguồn                  train_final.csv  {len(tf):,} dòng",
    f"Mô hình thấy           {len(COT_DT)} đặc trưng"
    f"  (5 cột quản lý nằm ngoài)",
    "Trọng số               1.0 cho MỌI dòng — không phân biệt nguồn",
    "",
    f"train                  {len(train):>7,} dòng  ({int(train.is_that.sum()):>3} thật)",
    f"val                    {len(val):>7,} dòng  ({int(val.is_that.sum()):>3} thật)",
    f"test  (niêm phong)     {len(test):>7,} dòng  ({n_that_te:>3} thật)",
    "",
    f"Stratify               theo ngành · seed {SEED}",
    f"Băm niêm phong         {bam[:16]}…",
    "",
    "⚠️  Giai đoạn 8 và 9 dùng val.csv, KHÔNG mở test_KHOA.csv",
    f"⚠️  Tập test chỉ có {n_that_te} dòng THẬT → sai số ±{sai_so:.1f} điểm",
])
print(f"\\n✅ train.csv · val.csv · test_KHOA.csv · niem_phong.json · 1 hình  →  {OUT}")"""))

viet("07_TachTrainTest.ipynb", C)
