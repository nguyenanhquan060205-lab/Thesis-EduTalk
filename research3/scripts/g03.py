"""Sinh notebook 03_TachTrainTest.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 3 — Tách train / test và dựng fold

''' + so_do(
    "03_TachTrainTest",
    ["01_LamSachKhaoSat/khaosat_sach.csv  —  676 phiếu sạch"],
    ["Tách 85 / 15 phân tầng theo NGÀNH (không phải theo khối)",
     "Kiểm tra đủ 39 ngành có mặt ở cả hai phía",
     "Dựng RepeatedStratifiedKFold 5×3 = 15 fold trên phần train",
     "KHOÁ tập test lại — không giai đoạn nào từ 4 đến 9 được mở"],
    ["03_TachTrainTest/khaosat_train.csv",
     "03_TachTrainTest/khaosat_test_KHOA.csv   ← chỉ mở ở Giai đoạn 10",
     "03_TachTrainTest/cv_folds.json",
     "03_TachTrainTest/hinh_3_*.png            —  2 hình"]) + '''

## Vì sao tách TRƯỚC khi làm bất cứ việc gì khác

Đây là bước quyết định tính trung thực của toàn bộ con số cuối cùng.

Mọi thứ về sau — học phân phối Likert, sinh dữ liệu bằng GA, tinh chỉnh siêu tham số — đều **chỉ
được nhìn 574 phiếu train**. Nếu GA học phân phối từ cả 676 phiếu rồi mô hình được chấm điểm trên
102 phiếu test, thì test đã gián tiếp tham gia huấn luyện và con số báo cáo sẽ cao giả.

## Vì sao phân tầng theo NGÀNH

Ngành ít nhất chỉ có 6 phiếu. Tách ngẫu nhiên thuần thì rất dễ có ngành rơi hết vào một phía — lúc
đó hoặc mô hình không bao giờ học được ngành đó, hoặc không bao giờ được kiểm tra trên nó.

Phân tầng theo ngành đảm bảo **mỗi ngành đều xuất hiện ở cả hai phía** theo đúng tỉ lệ 85/15.

## Vì sao 15 fold thay vì 5

574 dòng là ít. Với 5 fold, mỗi lần đo chỉ dựa trên ~115 dòng validation, nên con số dao động mạnh
giữa các lần chạy — chênh 2-3 điểm là chuyện thường, và ta không phân biệt được đâu là cải tiến
thật đâu là may rủi.

`RepeatedStratifiedKFold(5, n_repeats=3)` lặp lại việc chia 5 fold ba lần với ba cách xáo khác nhau
→ **15 lần đo**, gộp lại cho con số ổn định hơn hẳn.
'''))

C.append(code(SETUP + '''
from sklearn.model_selection import train_test_split, RepeatedStratifiedKFold

OUT = thu_muc(3)
TI_LE_TEST = 0.15
N_SPLITS, N_REPEATS = 5, 3

M = json.loads((thu_muc(1) / "mapping.json").read_text(encoding="utf-8"))
MA_TO_TEN = {int(k): v for k, v in M["ma_to_ten"].items()}
NHOM = {int(k): v for k, v in M["nganh_to_nhom"].items()}
TEN_NHOM = {int(k): v for k, v in M["ten_nhom"].items()}

d = pd.read_csv(thu_muc(1) / "khaosat_sach.csv")
print(f"Đọc {len(d)} phiếu sạch · {d.ma_nganh.nunique()} ngành")
print(f"Ngành ít phiếu nhất: {d.ma_nganh.value_counts().min()} phiếu")'''))

C.append(md("## 1. Tách 85 / 15"))

C.append(code('''tr, te = train_test_split(d, test_size=TI_LE_TEST, random_state=SEED,
                          stratify=d.ma_nganh)
tr = tr.sort_index().reset_index(drop=True)
te = te.sort_index().reset_index(drop=True)

assert len(tr) + len(te) == len(d)
assert tr.ma_nganh.nunique() == 39, "train thiếu ngành"
assert te.ma_nganh.nunique() == 39, "test thiếu ngành"

print(f"TRAIN : {len(tr):3d} phiếu  ({len(tr)/len(d):.1%})  ·"
      f" {tr.ma_nganh.nunique()}/39 ngành")
print(f"TEST  : {len(te):3d} phiếu  ({len(te)/len(d):.1%})  ·"
      f" {te.ma_nganh.nunique()}/39 ngành   ← KHOÁ LẠI\\n")

kt = pd.DataFrame({"train": tr.ma_nganh.value_counts(),
                   "test": te.ma_nganh.value_counts()}).fillna(0).astype(int)
kt["nganh"] = [MA_TO_TEN[m] for m in kt.index]
kt["ti_le_test"] = kt.test / (kt.train + kt.test)
print("Ngành có ít phiếu test nhất:")
print(kt.nsmallest(5, "test")[["nganh", "train", "test"]].to_string(index=False))
print(f"\\nTỉ lệ test theo ngành: {kt.ti_le_test.min():.0%} … {kt.ti_le_test.max():.0%}"
      f"  (mục tiêu {TI_LE_TEST:.0%})")'''))

C.append(md('''## 2. Dựng 15 fold trên phần TRAIN

Chỉ số fold lưu theo vị trí dòng trong `khaosat_train.csv`, để mọi notebook sau dùng **đúng cùng
một cách chia** — nếu mỗi nơi tự chia lại thì các con số không so được với nhau.'''))

C.append(code('''rskf = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPEATS,
                               random_state=SEED)
folds = [{"lan_lap": i // N_SPLITS, "fold": i % N_SPLITS,
          "train_idx": tr_i.tolist(), "val_idx": va_i.tolist()}
         for i, (tr_i, va_i) in enumerate(rskf.split(tr, tr.ma_nganh))]

# Kiểm tra: trong MỘT lần lặp, các fold phải phủ kín và không chồng nhau
for lap in range(N_REPEATS):
    cua_lap = [f for f in folds if f["lan_lap"] == lap]
    phu = sorted(i for f in cua_lap for i in f["val_idx"])
    assert phu == list(range(len(tr))), f"lần lặp {lap} không phủ kín"
print(f"✓ mỗi lần lặp phủ đúng {len(tr)} dòng, không chồng lấn")

kich_co = [len(f["val_idx"]) for f in folds]
print(f"✓ {len(folds)} fold · validation {min(kich_co)}–{max(kich_co)} dòng/fold")

(OUT / "cv_folds.json").write_text(json.dumps({
    "n_splits": N_SPLITS, "n_repeats": N_REPEATS, "seed": SEED,
    "n_train": len(tr), "folds": folds,
    "ghi_chu": "Chỉ số theo VỊ TRÍ DÒNG trong khaosat_train.csv",
}, ensure_ascii=False), encoding="utf-8")'''))

C.append(code('''# ═══════════ HÌNH 3.1 — Tách theo ngành ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, cao_theo_dong(len(kt))),
                             gridspec_kw={"width_ratios": [1.6, 1]})
k = kt.sort_values("train")
yy = np.arange(len(k))
a1.barh(yy, k.train, color=C_XANH, height=.72, label=f"Train ({len(tr)})")
a1.barh(yy, k.test, left=k.train, color=C_CAM, height=.72, label=f"Test ({len(te)})")
a1.set_yticks(yy); a1.set_yticklabels(list(k.nganh), fontsize=8.5)
a1.set_xlabel("Số phiếu"); a1.set_title("Mỗi ngành đều có mặt ở cả hai phía", fontsize=12)
cho_chu_giai(a1, phan=.24)
a1.legend(loc="lower right", framealpha=.95)
a1.grid(axis="y", alpha=0)

kn = pd.DataFrame({"train": tr.ma_khoi.value_counts(),
                   "test": te.ma_khoi.value_counts()}).fillna(0).astype(int).sort_index()
# Cột NGANG: tên nhóm dài, xoay chữ thì luôn chồng nhau
kn = kn.sort_values("train")
yy2 = np.arange(len(kn))
a2.barh(yy2, kn.train, color=C_XANH, height=.66, label="Train")
a2.barh(yy2, kn.test, left=kn.train, color=C_CAM, height=.66, label="Test")
a2.set_yticks(yy2)
a2.set_yticklabels([TEN_NHOM[i] for i in kn.index], fontsize=9)
a2.set_xlabel("Số phiếu"); a2.set_title("Theo nhóm ngành", fontsize=12)
a2.grid(axis="y", alpha=0)
cho_chu_giai(a2, phan=.20)
a2.legend(loc="lower right", fontsize=9, framealpha=.95)

fig.suptitle(f"Hình 3.1 — Tách {100-TI_LE_TEST*100:.0f}/{TI_LE_TEST*100:.0f}"
             " phân tầng theo ngành", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_3_1_tach.png",
    f"Cả {kt.shape[0]}/39 ngành đều có phiếu ở cả train lẫn test. Ngành ít nhất chỉ được "
    f"{int(kt.test.min())} phiếu test — con số cho riêng ngành đó sẽ rất nhiễu, nên báo cáo phải "
    "đọc ở mức khối chứ không phải mức từng ngành.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 3.2 — Cấu trúc 15 fold ═══════════
fig, ax = plt.subplots(figsize=(13, 4.6))
M_ = np.zeros((len(folds), len(tr)))
for i, f in enumerate(folds):
    M_[i, f["val_idx"]] = 1
ax.imshow(M_, aspect="auto", cmap="Blues", interpolation="nearest")
ax.set_xlabel(f"Vị trí dòng trong tập train ({len(tr)} dòng)")
ax.set_ylabel("Fold")
ax.set_yticks(range(0, len(folds), N_SPLITS))
ax.set_yticklabels([f"lần lặp {i+1}" for i in range(N_REPEATS)])
for i in range(1, N_REPEATS):
    ax.axhline(i * N_SPLITS - .5, color=C_THAT, lw=2)
ax.set_title(f"Hình 3.2 — {N_SPLITS} fold × {N_REPEATS} lần lặp = {len(folds)} lần đo")
ax.grid(alpha=0)
luu(fig, OUT, "hinh_3_2_folds.png",
    f"Ô xanh là phần validation của mỗi fold. Trong một lần lặp, {N_SPLITS} fold phủ kín "
    f"{len(tr)} dòng mà không chồng nhau. Ba lần lặp dùng ba cách xáo khác nhau, nên mỗi dòng "
    f"được dùng làm validation đúng {N_REPEATS} lần — đó là cách lấy con số ổn định từ dữ liệu nhỏ.")
plt.show()'''))

C.append(md("## 3. Xuất và khoá tập test"))

C.append(code('''tr.to_csv(OUT / "khaosat_train.csv", index=False)
te.to_csv(OUT / "khaosat_test_KHOA.csv", index=False)
kt.to_csv(OUT / "phan_bo_train_test.csv")

tom_tat("GIAI ĐOẠN 3 — TÁCH TRAIN / TEST", [
    f"Phiếu sạch             {len(d)}",
    f"   → TRAIN             {len(tr)}   ({len(tr)/len(d):.0%})   dùng cho Giai đoạn 4–9",
    f"   → TEST              {len(te)}   ({len(te)/len(d):.0%})   KHOÁ tới Giai đoạn 10",
    "",
    f"Phân tầng theo         ngành (39 lớp)",
    f"Ngành ở cả hai phía    {kt.shape[0]}/39",
    f"Phiếu test ít nhất     {int(kt.test.min())} phiếu/ngành",
    "",
    f"Cross-validation       {N_SPLITS} fold × {N_REPEATS} lần lặp = {len(folds)} lần đo",
    f"Mỗi fold validation    {min(kich_co)}–{max(kich_co)} dòng",
])
print(f"\\n⚠️  khaosat_test_KHOA.csv KHÔNG được đọc ở Giai đoạn 4–9.")
print(f"    Chỉ Giai đoạn 10 mở nó, đúng MỘT lần.")
print(f"\\n✅ khaosat_train.csv · khaosat_test_KHOA.csv · cv_folds.json · 2 hình  →  {OUT}")'''))

viet("03_TachTrainTest.ipynb", C)
