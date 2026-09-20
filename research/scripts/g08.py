"""Sinh notebook 08_MocChuan.ipynb

Bốn mốc đối chứng. Không có chúng thì con số Top-3 = 90% không nói lên điều gì.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, MO_HINH, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 8 — Bốn mốc đối chứng

''' + so_do(
    "08_MocChuan",
    ["07_TachTrainTest/train.csv   —  11.880 dòng",
     "07_TachTrainTest/val.csv     —  2.546 dòng"],
    ["Mốc 1 — đoán lớp đông nhất",
     "Mốc 2 — đoán bừa trong nhóm người dùng đã chọn",
     "Mốc 3 — chỉ dùng 15 cột tổ hợp, bỏ hết 48 cột còn lại",
     "Mốc 4 — chỉ nguồn khảo sát, chưa nạp hồ sơ trúng tuyển  ⭐",
     "Mô hình đối chiếu — đủ 63 đặc trưng, đủ nguồn dữ liệu",
     "Chỉ số phân loại chuẩn: F1 · precision · recall · AUC"],
    ["08_MocChuan/moc_chuan.json",
     "08_MocChuan/bang_moc.csv",
     "08_MocChuan/chi_so_lop.csv",
     "08_MocChuan/hinh_8_*.png     —  2 hình"]) + '''

## Mọi dòng ngang nhau

`train_final.csv` là **một** bảng 16.972 dòng, `sample_weight = 1.0` cho tất cả. Cột
`nguon` và `is_that` nằm ngoài tập đặc trưng — mô hình không nhìn thấy chúng, và không
có nhánh xử lý nào rẽ theo nguồn.

Điều đó có cơ sở dữ liệu chứ không phải quy ước cho tiện: 15.696 dòng TTTH là **hồ sơ
trúng tuyển của người thật** — điểm thật, tổ hợp thật, ngành trúng tuyển thật. Chỉ phần
Likert do copula điền. Gọi chúng là "dữ liệu giả" là mô tả sai dữ liệu.

Nên mọi chỉ số dưới đây đo trên **toàn bộ** tập val, một con số cho một phép đo.

## Vì sao phải có mốc

Chín nhóm ngành có cỡ `[7, 6, 4, 4, 4, 4, 4, 3, 3]`. Nhóm 3 ngành thì **Top-3 tự đúng
100%** mà không cần mô hình nào. Một con số 90% đứng trơ trọi có thể chỉ hơn đoán bừa vài
điểm — hoặc thậm chí thua.

Đó cũng là lý do tầng tư vấn chỉ hiện **2 gợi ý**. Mọi bảng dưới đây đo tầng tư vấn ở
**Top-2** (`K_TU_VAN`), tầng khám phá ở **Top-3** — chỉ số Giai đoạn 9 dùng để chọn cấu hình.

Mọi bảng chỉ số trong báo cáo phải đọc cột **hơn bừa**, không đọc cột độ chính xác trần
trụi.

## Bốn mốc, mỗi mốc trả lời một câu hỏi khác nhau

| Mốc | Trả lời câu | Nếu mô hình không hơn thì |
|---|---|---|
| **1 — lớp đông nhất** | *"có hơn việc luôn gợi ý ngành hot không?"* | vô dụng hoàn toàn |
| **2 — bừa trong nhóm** | *"có hơn việc bốc đại trong nhóm không?"* | chế độ tư vấn vô nghĩa |
| **3 — chỉ tổ hợp** | *"48 đặc trưng kia có đóng góp gì không?"* | chỉ cần hỏi tổ hợp là đủ |
| **4 — chỉ nguồn khảo sát** ⭐ | *"nạp 15.696 hồ sơ trúng tuyển vào có ích không?"* | cả giai đoạn 2–5 là công cốc |

## ⭐ Mốc 4 là mốc quan trọng nhất của cả pipeline

Đây là **ablation theo nguồn dữ liệu**, không phải phép tách thật/giả.

Giai đoạn 2 → 5 tốn công trải phẳng 18.024 hồ sơ trúng tuyển, học phân phối Likert theo
ngành, sinh phần Likert còn thiếu bằng copula, kiểm định bốn phép. Kết quả là nguồn TTTH
đóng góp **16.296 dòng**, chiếm 96% bảng huấn luyện.

Mốc 4 huấn luyện **chỉ bằng nguồn khảo sát** trong tập train, rồi đo trên cùng tập val.
So hai con số:

```
mô hình đầy đủ   (11.880 dòng — khảo sát + TTTH)   →  ?
mốc 4            (   437 dòng — chỉ khảo sát)      →  ?
```

Nếu mốc 4 **không thua kém**, kết luận thẳng: nguồn TTTH không đóng góp gì, và phần đó
của khoá luận là một hướng đã thử rồi loại — vẫn có giá trị báo cáo, nhưng không được
trình bày như một thành công.

## Đo trên `val.csv`, không đụng `test_KHOA.csv`

Ba tập làm ba việc khác nhau:

| Tập | n | Việc của nó |
|---|--:|---|
| `train` | 11.880 | mô hình học. Con số ở đây **không phải đánh giá** — nó đo mức nhớ vẹt |
| `val` | 2.546 | **mọi quyết định thiết kế** diễn ra ở đây: chọn mốc, chọn siêu tham số |
| `test_KHOA` | 2.546 | niêm phong SHA-256, mở **đúng một lần** ở Giai đoạn 10 |

Tập nào dùng để quyết định thì tập đó thành lạc quan. Đó là lý do phải có tập thứ ba
chưa từng tham gia quyết định nào — nếu tinh chỉnh trên test thì con số cuối cùng đã bị
test tham gia vào thiết kế, và nó sẽ lạc quan hơn thực tế.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + MO_HINH + '''
OUT = thu_muc(8)

D = nap(co_ttth=False)
train = pd.read_csv(thu_muc(7) / "train.csv")
val = pd.read_csv(thu_muc(7) / "val.csv")
QL = ["ma_nganh", "ma_nhom", "nguon", "is_that", "sample_weight"]
COT = [c for c in train.columns if c not in QL]

Xtr, ytr, gtr = train[COT].values, train.ma_nganh.values, train.ma_nhom.values
Xva, yva, gva = val[COT].values, val.ma_nganh.values, val.ma_nhom.values

assert set(train.sample_weight.unique()) == {1.0}, "trọng số phải bằng nhau"
assert not any(c in COT for c in ("nguon", "is_that")), "cột nguồn lọt vào đặc trưng"

print(f"train : {len(train):,} dòng")
print(f"val   : {len(val):,} dòng")
print(f"Đặc trưng: {len(COT)}   (nguon/is_that nằm ngoài — mô hình không thấy)")
print(f"Trọng số : {sorted(train.sample_weight.unique())}  → mọi dòng ngang nhau")
print(f"\\nĐoán bừa Top-{K_TU_VAN} trong nhóm (trên val): "
      f"{bua_trong_nhom(yva, D['nhom'])[K_TU_VAN]:.1%}")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Bốn mốc + mô hình đối chiếu"))

C.append(code('''MH = {}          # giữ lại mô hình để cell sau tính F1/AUC, khỏi huấn luyện lại


def chay_mo_hinh(X_tr, y_tr, ten, hp=None):
    """Huấn luyện rồi đo cả hai chế độ, trên train và trên val."""
    mh = MoHinhNganh(D, hp=hp or {}).fit(X_tr, y_tr)
    MH[ten] = mh
    S_tv, S_kp = mh.diem(Xva, gva), mh.diem(Xva)
    return {
        "moc": ten, "n_train": len(X_tr),
        "tv_val": top_k(S_tv, yva, D["nganh"])[K_TU_VAN],
        "kp_val": top_k(S_kp, yva, D["nganh"])[3],
        "tv_train": top_k(mh.diem(Xtr, gtr), ytr, D["nganh"])[K_TU_VAN],
        # Giai đoạn 9 ràng buộc chống nhớ vẹt trên chế độ KHÁM PHÁ, nên con số
        # train của chế độ đó phải đo ở đây chứ không được viết tay vào báo cáo.
        "kp_train": top_k(mh.diem(Xtr), ytr, D["nganh"])[3],
    }


t0 = time.time()
kq = []

# ── Mốc 1 — luôn gợi ý những ngành đông sinh viên nhất ───────────────────
# `bua_pho_bien` trả {k: độ chính xác} cho chế độ TƯ VẤN (K_TU_VAN ngành đông nhất
# TRONG nhóm). Chế độ khám phá thì mốc tương đương là 3 ngành đông nhất trên cả 39.
b1 = bua_pho_bien(ytr, yva, D["nhom"])
top3_chung = set(pd.Series(ytr).value_counts().head(3).index)
kq.append({"moc": "1 · ngành đông nhất", "n_train": 0,
           "tv_val": b1[K_TU_VAN], "kp_val": float(np.mean([v in top3_chung for v in yva])),
           "tv_train": np.nan, "kp_train": np.nan})
print(f"   mốc 1 xong [{time.time()-t0:.0f}s]", flush=True)

# ── Mốc 2 — bốc đại trong nhóm ───────────────────────────────────────────
kq.append({"moc": "2 · bừa trong nhóm", "n_train": 0,
           "tv_val": bua_trong_nhom(yva, D["nhom"])[K_TU_VAN],
           "kp_val": bua_toan_bo(len(D["nganh"]))[3],
           "tv_train": np.nan, "kp_train": np.nan})
print(f"   mốc 2 xong [{time.time()-t0:.0f}s]", flush=True)

# ── Mốc 3 — CHỈ 15 cột tổ hợp ────────────────────────────────────────────
i_th = [i for i, c in enumerate(COT) if c.startswith("th_")]
mh3 = MoHinhNganh(D, hp=dict(n_estimators=200)).fit(Xtr[:, i_th], ytr)
Xva3 = Xva[:, i_th]
kq.append({"moc": f"3 · chỉ {len(i_th)} cột tổ hợp", "n_train": len(Xtr),
           "tv_val": top_k(mh3.diem(Xva3, gva), yva, D["nganh"])[K_TU_VAN],
           "kp_val": top_k(mh3.diem(Xva3), yva, D["nganh"])[3],
           "tv_train": top_k(mh3.diem(Xtr[:, i_th], gtr), ytr, D["nganh"])[K_TU_VAN],
           "kp_train": top_k(mh3.diem(Xtr[:, i_th]), ytr, D["nganh"])[3]})
print(f"   mốc 3 xong [{time.time()-t0:.0f}s]", flush=True)

# ── Mốc 4 ⭐ — ABLATION NGUỒN: bỏ hẳn nguồn TTTH ─────────────────────────
# Không phải phép tách thật/giả. Đây là câu hỏi "nguồn hồ sơ trúng tuyển đóng
# góp bao nhiêu" — bỏ nguồn đó ra rồi đo lại, phần chênh chính là đóng góp.
i_ks = train.nguon.values == "khaosat"
kq.append({**chay_mo_hinh(Xtr[i_ks], ytr[i_ks],
                          f"4 · chỉ nguồn khảo sát ({int(i_ks.sum())} dòng)",
                          hp=dict(n_estimators=200))})
print(f"   mốc 4 xong [{time.time()-t0:.0f}s]", flush=True)

# ── Mô hình đối chiếu — đủ nguồn, đủ đặc trưng ───────────────────────────
kq.append({**chay_mo_hinh(Xtr, ytr, "MÔ HÌNH đủ dữ liệu")})
print(f"   mô hình đối chiếu xong [{time.time()-t0:.0f}s]", flush=True)

bang = pd.DataFrame(kq)
bang.to_csv(OUT / "bang_moc.csv", index=False)
print(f"\\nXong trong {time.time()-t0:.0f}s")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''print("=" * 96)
print(f"{'Mốc':<34}{'n train':>9}{'tư vấn@' + str(K_TU_VAN):>13}{'khám phá@3':>15}"
      f"{'tv train':>11}{'kp train':>11}")
print("-" * 96)
for r in bang.itertuples():
    f_ = lambda v: "—" if (v is None or (isinstance(v, float) and np.isnan(v))) else f"{v:.1%}"
    n_ = "—" if r.n_train == 0 else f"{r.n_train:,}"
    print(f"{r.moc:<34}{n_:>9}{f_(r.tv_val):>13}{f_(r.kp_val):>15}"
          f"{f_(r.tv_train):>11}{f_(r.kp_train):>11}")
print("=" * 96)

mh_r = bang.iloc[-1]
m4 = bang[bang.moc.str.startswith("4")].iloc[0]
m3 = bang[bang.moc.str.startswith("3")].iloc[0]
m2 = bang[bang.moc.str.startswith("2")].iloc[0]

print("\\n── ĐỌC BẢNG ──")
print(f"{'':34}{'tư vấn':>12}{'khám phá':>12}")
for ten_, a_, b_ in [
        ("Mô hình hơn đoán bừa trong nhóm", mh_r.tv_val - m2.tv_val, mh_r.kp_val - m2.kp_val),
        ("Mô hình hơn 'chỉ tổ hợp'", mh_r.tv_val - m3.tv_val, mh_r.kp_val - m3.kp_val),
        ("Mô hình hơn 'chỉ khảo sát' ⭐", mh_r.tv_val - m4.tv_val, mh_r.kp_val - m4.kp_val)]:
    print(f"{ten_:<34}{a_*100:>+11.1f}đ{b_*100:>+11.1f}đ")

print(f"\\nMốc 3 chỉ dùng {len(i_th)} cột tổ hợp — không Likert, không điểm:")
print(f"   tư vấn Top-{K_TU_VAN}  đạt {m3.tv_val:.1%}, kém mô hình đủ 63 đặc trưng"
      f" {(mh_r.tv_val-m3.tv_val)*100:.1f} điểm")
print(f"   khám phá Top-3 đạt {m3.kp_val:.1%}, kém mô hình đủ 63 đặc trưng"
      f" {(mh_r.kp_val-m3.kp_val)*100:.1f} điểm")
if (mh_r.kp_val - m3.kp_val) > (mh_r.tv_val - m3.tv_val):
    print("→ Khoảng cách rộng hơn ở khám phá: tiêu chí chọn cấu hình đặt ở cột khám phá.")
else:
    print("→ ⚠️ Khoảng cách ở tư vấn không hẹp hơn khám phá — xem lại lý do chọn tiêu chí.")

print(f"\\n⭐ ĐÓNG GÓP CỦA NGUỒN TTTH (16.296 dòng):")
print(f"   tư vấn   {m4.tv_val:.1%} → {mh_r.tv_val:.1%}"
      f"   ({(mh_r.tv_val-m4.tv_val)*100:+.1f} điểm)")
print(f"   khám phá {m4.kp_val:.1%} → {mh_r.kp_val:.1%}"
      f"   ({(mh_r.kp_val-m4.kp_val)*100:+.1f} điểm)")
if mh_r.kp_val - m4.kp_val <= 0.01:
    print("   ⚠️  Nguồn TTTH KHÔNG giúp gì — phải nêu thẳng trong báo cáo.")
else:
    print("   ✓  Giai đoạn 2–5 có đóng góp đo được.")

print(f"\\n⚠️  NHỚ VẸT — hai chế độ cho hai bức tranh khác hẳn nhau:")
print(f"   tư vấn   : train {mh_r.tv_train:.1%}  val {mh_r.tv_val:.1%}"
      f"   chênh {(mh_r.tv_train-mh_r.tv_val)*100:+.1f} điểm")
print(f"   khám phá : train {mh_r.kp_train:.1%}  val {mh_r.kp_val:.1%}"
      f"   chênh {(mh_r.kp_train-mh_r.kp_val)*100:+.1f} điểm  ← bài toán thật")
print(f"\\n   Ràng buộc chống nhớ vẹt ở Giai đoạn 9 vì vậy đặt trên chế độ KHÁM PHÁ —")
print(f"   nơi khoảng cách train−val lộ ra rõ nhất.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 2. Chỉ số phân loại chuẩn — F1, precision, recall, AUC

Top-k là chỉ tiêu chính (tầng tư vấn hiện 2 gợi ý, tầng khám phá hiện 5), nhưng nó
**không đủ để nộp báo cáo**.
Độ chính xác trên 39 ngành mất cân bằng bị ngành đông chi phối: mốc 1 cho thấy chỉ
cần luôn đoán ngành đông nhất trong nhóm đã đạt gần 90% ở chế độ tư vấn.

| Chỉ số | Nói lên điều gì |
|---|---|
| **Top-1 accuracy** | đoán đúng ngay ngành đầu tiên |
| **macro-F1** | mỗi ngành trọng số **bằng nhau** — ngành 6 hồ sơ nặng ngang ngành 900 |
| **weighted-F1** | trọng số theo cỡ ngành — luôn cao hơn macro |
| **chênh macro ↔ weighted** | chính là mức mô hình **thiên vị ngành đông** |
| **precision / recall macro** | tách bạch "gợi ý sai" và "bỏ sót" |
| **AUC OvR** | khả năng xếp hạng, không phụ thuộc ngưỡng cắt |

> ⚠️ **AUC ở đây KHÁC AUC Giai đoạn 5.** Giai đoạn 5 đo *bộ phân biệt* xem có tách
> được dòng sinh khỏi dòng khảo sát không, và **0,50 mới là lý tưởng** (không tách
> nổi = dữ liệu sinh đạt). AUC ở đây đo *phân loại ngành*, càng gần 1 càng tốt. Hai
> chỉ số trùng tên, ngược chiều nhau — trong báo cáo phải gọi đủ tên, đừng viết trống
> "AUC".

AUC chỉ tính ở **chế độ khám phá**. Chế độ tư vấn đã che bỏ ngành ngoài nhóm nên mỗi
hàng không còn tổng bằng 1 — không còn là phân phối xác suất, AUC mất ý nghĩa.
'''))

C.append(code('''ten_mh = "MÔ HÌNH đủ dữ liệu"
ten_m4 = next(t for t in MH if t.startswith("4"))

m_full, m_ks = MH[ten_mh], MH[ten_m4]

# Mốc 4 chỉ học 437 dòng nên đo nó trên 11.880 dòng train không phải phép đo nhớ
# vẹt — bỏ, chỉ giữ dòng VAL để so trực diện với mô hình đủ dữ liệu.
LAT = [
    ("đủ dữ liệu · tư vấn TRAIN", m_full.diem(Xtr, gtr), ytr, False),
    ("đủ dữ liệu · tư vấn VAL", m_full.diem(Xva, gva), yva, False),
    ("đủ dữ liệu · khám phá TRAIN", m_full.diem(Xtr), ytr, True),
    ("đủ dữ liệu · khám phá VAL", m_full.diem(Xva), yva, True),
    ("chỉ khảo sát · tư vấn VAL", m_ks.diem(Xva, gva), yva, False),
    ("chỉ khảo sát · khám phá VAL", m_ks.diem(Xva), yva, True),
]

hang, luu_cs, CS = [], [], {}
for nhan, S_, y_, auc_ in LAT:
    d_ = chi_so_lop(S_, y_, D["nganh"], co_auc=auc_)
    hang.append((nhan, d_, len(y_)))
    CS[nhan] = d_
    luu_cs.append({"lat_cat": nhan, "n": len(y_), **d_})

in_chi_so_lop(hang)
pd.DataFrame(luu_cs).to_csv(OUT / "chi_so_lop.csv", index=False)

cs = CS["đủ dữ liệu · khám phá VAL"]
cs_tr = CS["đủ dữ liệu · khám phá TRAIN"]
cs_ks = CS["chỉ khảo sát · khám phá VAL"]
print(f"\\n── ĐỌC BẢNG ──")
print(f"macro-F1 {cs['f1_macro']:.3f}  so với  weighted-F1 {cs['f1_weighted']:.3f}"
      f"   → chênh {cs['f1_weighted']-cs['f1_macro']:+.3f}")
if cs["f1_weighted"] - cs["f1_macro"] > 0.05:
    print("   Chênh đáng kể: mô hình làm tốt ở ngành đông, kém ở ngành ít hồ sơ.")
else:
    print("   Chênh nhỏ: mô hình đối xử khá đều giữa ngành đông và ngành ít hồ sơ.")
print(f"\\nAUC OvR khám phá: train {cs_tr['auc_ovr']:.3f} → val {cs['auc_ovr']:.3f}")
print(f"   (càng gần 1 càng tốt — KHÁC AUC Giai đoạn 5, nơi 0,50 là lý tưởng)")
print(f"\\n⭐ ABLATION NGUỒN, đo bằng macro-F1 khám phá:")
print(f"   chỉ khảo sát  {cs_ks['f1_macro']:.3f}  →  đủ nguồn  {cs['f1_macro']:.3f}"
      f"   ({cs['f1_macro']-cs_ks['f1_macro']:+.3f})")
print(f"   AUC OvR       {cs_ks['auc_ovr']:.3f}  →  {cs['auc_ovr']:.3f}"
      f"   ({cs['auc_ovr']-cs_ks['auc_ovr']:+.3f})")
print(f"\\nTop-1 {cs['acc_top1']:.1%} trong khi Top-3 đạt {mh_r.kp_val:.1%}"
      f" — chênh {(mh_r.kp_val-cs['acc_top1'])*100:.1f} điểm.")
print(f"   Ép hệ thống về 1 gợi ý thì mất chừng đó.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 8.1 — Bốn mốc so với mô hình ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 5.2))
yy = np.arange(len(bang))
mau = [C_XAM] * (len(bang) - 1) + [C_XANH]
mau[3] = C_CAM        # mốc 4 ⭐ tô riêng

for ax, cot, ten_, k_ in [(a1, "tv_val", "Chế độ TƯ VẤN (đã biết nhóm)", K_TU_VAN),
                          (a2, "kp_val", "Chế độ KHÁM PHÁ (cả 39 ngành)", 3)]:
    v = bang[cot].values * 100
    ax.barh(yy, v, color=mau, height=.62)
    ax.set_yticks(yy); ax.set_yticklabels([ngat_dong(m, 22) for m in bang.moc], fontsize=8.5)
    ax.set_xlabel(f"Top-{k_} trên val (%)"); ax.grid(axis="y", alpha=0)
    ax.set_title(ten_, fontsize=12)
    ax.invert_yaxis()
    for i, x_ in enumerate(v):
        ax.text(x_ + 1.2, i, f"{x_:.1f}%", va="center", fontsize=9, fontweight="bold")
    ax.set_xlim(0, max(v) * 1.18)

fig.suptitle("Hình 8.1 — Mô hình hơn các mốc đối chứng bao nhiêu?",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_8_1_bon_moc.png",
    f"Ở tư vấn (Top-{K_TU_VAN}), mốc 3 (chỉ 15 cột tổ hợp) đã đạt {m3.tv_val:.1%} — mô "
    f"hình đủ 63 đặc trưng hơn {(mh_r.tv_val-m3.tv_val)*100:.1f} điểm. Ở khám phá "
    f"(Top-3) khoảng cách đó là "
    f"{(mh_r.kp_val-m3.kp_val)*100:.1f} điểm. Cột cam là mốc chỉ học từ phiếu khảo sát, "
    f"bỏ phần hồ sơ trúng tuyển: khám phá tụt {(mh_r.kp_val-m4.kp_val)*100:.1f} điểm so với "
    f"mô hình đầy đủ.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 8.2 — Nhớ vẹt: train so với val ═══════════
co = bang.dropna(subset=["tv_train"])
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))
x = np.arange(len(co)); w_ = .38

for ax, c_tr, c_va, ten_, k_ in [(a1, "tv_train", "tv_val", "Chế độ TƯ VẤN", K_TU_VAN),
                                 (a2, "kp_train", "kp_val", "Chế độ KHÁM PHÁ", 3)]:
    ax.bar(x - w_/2, co[c_tr] * 100, w_, color=C_XAM, label="TRAIN")
    ax.bar(x + w_/2, co[c_va] * 100, w_, color=C_XANH, label="VAL")
    ax.set_xticks(x); ax.set_xticklabels([ngat_dong(m, 15) for m in co.moc], fontsize=8.5)
    ax.set_ylabel(f"Top-{k_} (%)"); ax.legend(fontsize=9); ax.set_ylim(0, 108)
    ax.set_title(ten_, fontsize=12)
    for i, (a_, b_) in enumerate(zip(co[c_tr] * 100, co[c_va] * 100)):
        ax.text(i - w_/2, a_ + 1, f"{a_:.0f}", ha="center", fontsize=8.5, fontweight="bold")
        ax.text(i + w_/2, b_ + 1, f"{b_:.0f}", ha="center", fontsize=8.5, fontweight="bold")
        ax.text(i, max(a_, b_) + 6, f"chênh {a_-b_:.0f}đ", ha="center", fontsize=8,
                color=C_THAT, fontweight="bold")

fig.suptitle("Hình 8.2 — Khoảng cách train − val lộ ra ở chế độ khám phá",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_8_2_nho_vet.png",
    f"Chế độ tư vấn (Top-{K_TU_VAN}) trông lành: mô hình đủ dữ liệu chênh train−val chỉ "
    f"{(mh_r.tv_train-mh_r.tv_val)*100:.1f} điểm, vì bài toán dễ — chọn {K_TU_VAN} "
    f"ngành trong một nhóm 3–7 ngành. Ở chế độ khám phá (Top-3), cùng mô hình đó chênh "
    f"{(mh_r.kp_train-mh_r.kp_val)*100:.1f} điểm. Đây là lý do ràng buộc chống nhớ vẹt ở "
    f"Giai đoạn 9 đặt trên chỉ số khám phá.")
plt.show()'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''(OUT / "moc_chuan.json").write_text(json.dumps({
    "n_train": int(len(train)), "n_val": int(len(val)),
    "ghi_chu": "sample_weight = 1.0 cho mọi dòng; nguon/is_that ngoài tập đặc trưng",
    "k": {"tu_van": K_TU_VAN, "kham_pha": 3},
    "moc": {r.moc: {k: (None if np.isnan(getattr(r, k)) else round(getattr(r, k), 4))
                    for k in ("tv_val", "kp_val", "tv_train", "kp_train")}
            for r in bang.itertuples()},
    "dong_gop_nguon_ttth": {"tv": round(float(mh_r.tv_val - m4.tv_val), 4),
                            "kp": round(float(mh_r.kp_val - m4.kp_val), 4)},
    "dong_gop_48_dac_trung": {"tv": round(float(mh_r.tv_val - m3.tv_val), 4),
                              "kp": round(float(mh_r.kp_val - m3.kp_val), 4)},
    "gap_train_val": {"tv": round(float(mh_r.tv_train - mh_r.tv_val), 4),
                      "kp": round(float(mh_r.kp_train - mh_r.kp_val), 4)},
    "chi_so_lop_khampha_val": {k: (None if np.isnan(v) else round(v, 4))
                               for k, v in cs.items()},
}, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 8 — BỐN MỐC ĐỐI CHỨNG", [
    f"Đo trên val            {len(val):,} dòng · mọi dòng trọng số 1.0",
    "",
    f"{'Mốc':<34}{'tv@' + str(K_TU_VAN):>10}{'kp@3':>11}",
] + [f"   {r.moc:<31}{r.tv_val:>10.1%}{r.kp_val:>11.1%}" for r in bang.itertuples()] + [
    "",
    f"Hơn bừa trong nhóm     tv {(mh_r.tv_val-m2.tv_val)*100:+.1f}đ"
    f"   kp {(mh_r.kp_val-m2.kp_val)*100:+.1f}đ",
    f"Hơn 'chỉ tổ hợp'       tv {(mh_r.tv_val-m3.tv_val)*100:+.1f}đ"
    f"   kp {(mh_r.kp_val-m3.kp_val)*100:+.1f}đ",
    f"Hơn 'chỉ khảo sát' ⭐   tv {(mh_r.tv_val-m4.tv_val)*100:+.1f}đ"
    f"   kp {(mh_r.kp_val-m4.kp_val)*100:+.1f}đ",
    "",
    "CHỈ SỐ PHÂN LOẠI (khám phá, val):",
    f"   Top-1               {cs['acc_top1']:.1%}",
    f"   macro-F1            {cs['f1_macro']:.3f}",
    f"   weighted-F1         {cs['f1_weighted']:.3f}",
    f"   AUC OvR             {cs['auc_ovr']:.3f}   (≠ AUC Giai đoạn 5)",
    "",
    f"Chênh train−val        tv {(mh_r.tv_train-mh_r.tv_val)*100:.1f}đ"
    f"   kp {(mh_r.kp_train-mh_r.kp_val)*100:.1f}đ",
    "→ Giai đoạn 9 ràng buộc trên chỉ số KHÁM PHÁ",
])
print(f"\\n✅ moc_chuan.json · bang_moc.csv · chi_so_lop.csv · 2 hình  →  {OUT}")'''))

viet("08_MocChuan.ipynb", C)
