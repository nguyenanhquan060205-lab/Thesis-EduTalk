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
    ["06_NiemPhongKhaoSat/train_ttth.csv     —  16.296 dòng × 63 đặc trưng",
     "06_NiemPhongKhaoSat/niem_phong_khaosat.json  —  676 phiếu đã niêm phong"],
    ["Chia 70 / 15 / 15 — train / val / test",
     "stratify theo NGÀNH để mọi ngành có mặt ở cả ba tập",
     "Niêm phong tập test bằng băm SHA-256",
     "Kiểm tra ba tập không chồng nhau, đủ 39 ngành"],
    ["07_TachTrainTest/train.csv             —  11.880 dòng",
     "07_TachTrainTest/val.csv               —  2.546 dòng, dùng ở Giai đoạn 9",
     "07_TachTrainTest/test_KHOA.csv         —  KHÔNG mở tới Giai đoạn 10",
     "07_TachTrainTest/niem_phong.json"]) + '''

## Chia CHỈ trên phần TTTH

Giai đoạn 6 đã niêm phong toàn bộ 676 phiếu khảo sát. Việc chia ba tập ở đây chỉ diễn
ra trên `train_ttth.csv` — không có phiếu người thật nào tham gia.

```
                     676 phiếu khảo sát  🔒 NIÊM PHONG (Giai đoạn 6)
                             │
                             └──────────────────────────────────┐
train_ttth.csv  16.296 dòng                                     │
        │  stratify theo ma_nganh, seed 42                      │
        ▼                                                        ▼
   ┌──────────┬──────────┬───────────────┐          ┌────────────────────┐
   │ train 70%│  val 15% │ test_KHOA 15% │          │ kiểm định NGƯỜI THẬT│
   └──────────┴──────────┴───────────────┘          └────────────────────┘
     11.407      2.444        2.445                       676 phiếu
        học      chọn siêu     đo nội bộ                   đo ngoại bộ
                 tham số                                   (Giai đoạn 10)
```

Mô hình chỉ nhìn thấy **63 đặc trưng**. Năm cột `ma_nganh`, `ma_nhom`, `nguon`,
`rui_ro_vong_tron`, `sample_weight` nằm ngoài tập đặc trưng, chỉ để ghi chép.
`sample_weight = 1.0` cho cả 16.296 dòng.

## Hai tập kiểm định, hai câu hỏi khác nhau

| Tập | n | Trả lời câu |
|---|--:|---|
| `test_KHOA.csv` | 2.445 | *"mô hình khớp với phân phối nó được học đến đâu?"* |
| `khaosat_NIEMPHONG.csv` | **676** | *"mô hình dự đoán học sinh thật đến đâu?"* ⭐ |

Đây là điểm mạnh của Hướng 2. Hướng 1 chỉ có tập test nội bộ, trong đó phần người thật
lẫn vào và chỉ còn 117 phiếu. Ở đây có hẳn **676 phiếu người thật, chưa mô hình nào
động tới** — gấp gần sáu lần, và không phải trích ra từ đâu cả.

Chênh lệch giữa hai con số chính là mức lạc quan mà dữ liệu sinh bơm vào. Hướng 1 không
đo được chuyện đó một cách sạch sẽ; Hướng 2 đo được.

## Vì sao vẫn 70/15/15

Giữ nguyên tỉ lệ của Hướng 1 để hai hướng so sánh được với nhau. Ở đây lý do "cần thêm
dòng thật trong test" không còn áp dụng — dòng thật đã nằm hết ở tập niêm phong — nhưng
đổi tỉ lệ thì mất khả năng đối chiếu, mà cái đó quý hơn.

## Niêm phong hai lần

`test_KHOA.csv` băm SHA-256 ở đây, `khaosat_NIEMPHONG.csv` đã băm ở Giai đoạn 6. Giai
đoạn 10 kiểm lại **cả hai** mã băm trước khi mở. Giai đoạn 8 và 9 không được mở file
nào trong hai file đó — chúng dùng `val.csv`.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + """
import hashlib
from sklearn.model_selection import train_test_split

OUT = thu_muc(7)
P_VAL = 0.15
P_TEST = 0.15

D = nap(co_ttth=False)
tf = pd.read_csv(thu_muc(6) / "train_ttth.csv")
NPK = json.loads((thu_muc(6) / "niem_phong_khaosat.json").read_text(encoding="utf-8"))
QL = ["ma_nganh", "ma_nhom", "nguon", "rui_ro_vong_tron", "sample_weight"]
COT_DT = [c for c in tf.columns if c not in QL]
y_all = tf.ma_nganh.values

print(f"Bảng train final: {len(tf):,} dòng")
print(f"   mô hình THẤY      : {len(COT_DT)} đặc trưng")
print(f"   chỉ để ghi chép   : {QL}")
print(f"   sample_weight     : {sorted(tf.sample_weight.unique())}  → mọi dòng ngang nhau")
print(f"\\n   ⚠️ KHÔNG có phiếu khảo sát nào ở đây — {NPK['n_dong']} phiếu đã niêm phong")
print(f"   rò rỉ vòng tròn   : {int(tf.rui_ro_vong_tron.sum()):,} dòng"
      f" ({100*tf.rui_ro_vong_tron.mean():.1f}%) thuộc {len(NPK['nganh_vong_tron'])} ngành")
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

print(f"{'tập':<8}{'dòng':>9}{'ngành':>8}{'vòng tròn':>12}")
print("-" * 40)
for ten, d in [("train", train), ("val", val), ("test", test)]:
    print(f"{ten:<8}{len(d):>9,}{d.ma_nganh.nunique():>8}"
          f"{int(d.rui_ro_vong_tron.sum()):>12,}")

assert len(set(i_tr) & set(i_va)) == 0, "train và val chồng nhau"
assert len(set(i_tr) & set(i_te)) == 0, "train và test chồng nhau"
assert len(set(i_va) & set(i_te)) == 0, "val và test chồng nhau"
assert len(i_tr) + len(i_va) + len(i_te) == len(tf), "mất dòng"
for ten, d in [("train", train), ("val", val), ("test", test)]:
    assert d.ma_nganh.nunique() == 39, f"{ten} thiếu ngành"
assert "is_that" not in tf.columns, "Hướng 2 không có cột is_that — khảo sát đã niêm phong"
print("\\n✓ ba tập rời nhau · đủ 39 ngành")
print("✓ không phiếu khảo sát nào lọt vào ba tập này")"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 2. Niêm phong tập test"))

C.append(code("""bam = hashlib.sha256((OUT / "test_KHOA.csv").read_bytes()).hexdigest()
# Khoảng tin cậy 95% cho một tỉ lệ ước lượng quanh 0,80
sai_so = 1.96 * np.sqrt(.8 * .2 / len(test)) * 100
sai_so_ks = 1.96 * np.sqrt(.8 * .2 / NPK["n_dong"]) * 100

(OUT / "niem_phong.json").write_text(json.dumps({
    "file": "test_KHOA.csv", "bam_sha256": bam,
    "n_dong": int(len(test)),
    "p_train": 1 - P_VAL - P_TEST, "p_val": P_VAL, "p_test": P_TEST, "seed": SEED,
    "sai_so_95": round(float(sai_so), 1),
    "sai_so_95_khaosat_niemphong": round(float(sai_so_ks), 1),
    "ghi_chu": "Giai đoạn 8 và 9 KHÔNG được mở — dùng val.csv. "
               "Giai đoạn 10 kiểm băm trước khi mở.",
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"🔒 test_KHOA.csv       {bam[:48]}…")
print(f"🔒 khaosat_NIEMPHONG   {NPK['bam_sha256'][:48]}…  (băm ở Giai đoạn 6)")
print(f"\\nHAI tập kiểm định, Giai đoạn 10 mở cả hai:")
print(f"   test_KHOA.csv          {len(test):>6,} dòng  ±{sai_so:.1f} điểm (95%)")
print(f"   khaosat_NIEMPHONG.csv  {NPK['n_dong']:>6,} phiếu ±{sai_so_ks:.1f} điểm (95%)"
      f"   ← người thật, chưa mô hình nào thấy")
print(f"\\nChênh lệch giữa hai con số chính là mức lạc quan do dữ liệu sinh bơm vào.")"""))

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

a3.bar(["test\\nnội bộ", "khảo sát\\nniêm phong"], [len(test), NPK["n_dong"]],
       color=[C_XAM, C_THAT], width=.6)
nhan_doc(a3, fmt="{:,.0f}")
a3.set_ylabel("số dòng")
a3.set_title("Hai tập kiểm định", fontsize=11.5)

fig.suptitle(f"Hình 7.1 — Chia {1-P_VAL-P_TEST:.0%} / {P_VAL:.0%} / {P_TEST:.0%}",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
lech = float((pt.train - pt.test).abs().max() * 100)
luu(fig, OUT, "hinh_7_1_ba_tap.png",
    f"Stratify giữ được phân bố ngành: lệch lớn nhất giữa train và test chỉ {lech:.2f} "
    f"điểm phần trăm. Khác Hướng 1, cả ba tập ở đây đều KHÔNG chứa phiếu người thật nào "
    f"— toàn bộ {NPK['n_dong']} phiếu đã niêm phong thành tập kiểm định riêng (cột phải), "
    f"gấp {NPK['n_dong']/117:.1f} lần số phiếu thật mà Hướng 1 có trong tập test của nó.")
plt.show()"""))

# ───────────────────────────────────────────────────────────────────────────
C.append(code("""tom_tat("GIAI ĐOẠN 7 — CHIA TRAIN / VAL / TEST", [
    f"Nguồn                  train_ttth.csv  {len(tf):,} dòng",
    f"Mô hình thấy           {len(COT_DT)} đặc trưng"
    f"  (5 cột quản lý nằm ngoài)",
    "Trọng số               1.0 cho MỌI dòng",
    "",
    f"train                  {len(train):>7,} dòng",
    f"val                    {len(val):>7,} dòng",
    f"test  (niêm phong)     {len(test):>7,} dòng",
    "",
    f"🔒 khaosat_NIEMPHONG   {NPK['n_dong']:>7,} phiếu NGƯỜI THẬT",
    f"   niêm phong ở Giai đoạn 6, mô hình chưa từng thấy",
    "",
    f"Stratify               theo ngành · seed {SEED}",
    f"Băm niêm phong         {bam[:16]}…",
    "",
    "⚠️  Giai đoạn 8 và 9 dùng val.csv, KHÔNG mở file niêm phong nào",
    f"⚠️  Giai đoạn 10 mở CẢ HAI: test (±{sai_so:.1f}đ) và khảo sát (±{sai_so_ks:.1f}đ)",
])
print(f"\\n✅ train.csv · val.csv · test_KHOA.csv · niem_phong.json · 1 hình  →  {OUT}")"""))

viet("07_TachTrainTest.ipynb", C)
