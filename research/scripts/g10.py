"""Sinh notebook 10_ChotModel.ipynb

Huấn luyện lại bằng cấu hình đã chốt, MỞ TẬP TEST ĐÚNG MỘT LẦN, báo cáo kèm mốc.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, MO_HINH, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 10 — Chốt mô hình

''' + so_do(
    "10_ChotModel",
    ["07_TachTrainTest/train.csv        —  11.880 dòng",
     "07_TachTrainTest/val.csv          —  2.546 dòng",
     "07_TachTrainTest/test_KHOA.csv    —  2.546 dòng ⚠️ MỞ LẦN ĐẦU",
     "09_TinhChinh/sieu_tham_so.json    —  cấu hình đã chốt",
     "08_MocChuan/moc_chuan.json        —  bốn mốc để so"],
    ["Kiểm băm SHA-256 của tập test trước khi mở",
     "Huấn luyện lại trên train + val bằng cấu hình đã chốt",
     "Mở test ĐÚNG MỘT LẦN",
     "Top-1/2/3/5 hai chế độ, kèm đoán bừa và kỹ năng",
     "Hit@k · MRR · NDCG@k ở điểm vận hành: tư vấn @2 · khám phá @5",
     "Chỉ số phân loại chuẩn: F1 · precision · recall · AUC",
     "Bảng TRAIN | TEST | chênh"],
    ["10_ChotModel/metrics.json",
     "10_ChotModel/model_nganh.json     —  mô hình để backend nạp",
     "10_ChotModel/bang_ket_qua.csv",
     "10_ChotModel/chi_so_lop.csv",
     "10_ChotModel/theo_nganh.csv",
     "10_ChotModel/hinh_10_*.png        —  3 hình"]) + '''

## Mọi dòng ngang nhau

`train_final.csv` là **một** bảng, `sample_weight = 1.0` cho cả 16.972 dòng. Cột `nguon`
và `is_that` nằm ngoài tập đặc trưng — mô hình không nhìn thấy chúng, không có nhánh nào
rẽ theo nguồn, và báo cáo không tách đôi theo nguồn.

15.696 dòng từ TTTH là **hồ sơ trúng tuyển của người thật**: điểm thật, tổ hợp thật,
ngành trúng tuyển thật. Chỉ phần Likert do copula điền vào chỗ trống. Đối xử với chúng
như "dữ liệu giả" là mô tả sai dữ liệu.

Câu hỏi "nguồn TTTH đóng góp bao nhiêu" đã được trả lời ở Giai đoạn 8 bằng **ablation
theo nguồn** (mốc 4) — đó là cách đúng để hỏi, và nó không đòi phải chia đôi tập test.

## Mở test đúng một lần

Từ Giai đoạn 7 tới giờ, `test_KHOA.csv` chưa từng được đọc. Mọi quyết định — tỉ lệ chia,
phương pháp sinh dữ liệu, siêu tham số, chọn tầng tư vấn — đều dựa trên `val.csv`.

Notebook này mở nó **một lần**, đo, rồi dừng. Không quay lại chỉnh gì dựa trên kết quả
test. Nếu chỉnh thì con số mất giá trị và phải chia lại từ đầu.

Băm SHA-256 được kiểm trước khi mở. Nếu tập test bị sửa giữa chừng thì `assert` nổ ngay,
thay vì âm thầm cho ra một con số sai.

## Huấn luyện lại trên train + val

Giai đoạn 9 đã dùng xong `val.csv` để chọn cấu hình. Từ đây nó không còn nhiệm vụ gì, nên
gộp vào train để mô hình cuối có nhiều dữ liệu nhất:

```
train 11.880 + val 2.546 = 14.426 dòng  →  mô hình cuối
test   2.546 dòng                        →  chỉ để đo
```

## Hai tầng, đúng cách web gọi

| Tầng | Web gửi | Cách tính | Bài toán |
|---|---|---|---|
| **Khám phá** | `fieldId = null` | xếp hạng cả 39 ngành, hiện 5 | khó — mốc bừa Top-5 12,8% |
| **Tư vấn** | `fieldId = k` | xếp hạng ngành trong nhóm k, hiện 2 | dễ — mốc bừa Top-2 47,6% |

Giai đoạn 8 cho thấy chỉ 15 cột one-hot tổ hợp đã đạt mức cao ở tầng tư vấn. Nên **con
số khám phá mới là con số nói lên mô hình có học được gì không**; con số tư vấn là con số
người dùng thật sự gặp.

## Chỉ số báo cáo

Điểm vận hành: tầng tư vấn hiện **2** gợi ý, tầng khám phá hiện **5**. Báo cáo phải có đủ:

- **Top-1/2/3/5** kèm **đoán bừa** và **kỹ năng** = phần lỗi của đoán bừa mà mô hình xoá được
- **macro-F1** — mỗi ngành trọng số bằng nhau, phơi ra chuyện bỏ rơi ngành ít hồ sơ
- **weighted-F1** — chênh với macro chính là mức thiên vị ngành đông
- **AUC OvR** — chỉ ở tầng khám phá (tầng tư vấn đã che bớt ngành, hàng không tổng bằng 1)
- **TRAIN | TEST | chênh** — khoảng cách là dấu hiệu nhớ vẹt

> ⚠️ **AUC ở đây KHÁC AUC Giai đoạn 5.** Giai đoạn 5 đo *bộ phân biệt dòng sinh với dòng
> khảo sát*, và **0,50 mới là lý tưởng**. AUC ở đây đo *phân loại ngành*, càng gần 1 càng
> tốt. Trong báo cáo phải gọi đủ tên, đừng viết trống "AUC".

## ⚠️ Hạn chế phải ghi trong báo cáo

1. **Bộ sinh copula đã thấy cả 676 phiếu khảo sát** trước khi chia tập, kể cả những phiếu
   sau này rơi vào test. Đó là hệ quả trực tiếp của yêu cầu "gộp thành một file train
   final rồi mới chia". Con số test vì vậy là **cận trên lạc quan** — phải nêu thẳng.
2. **Mất cân bằng theo ngành.** Ngành ít hồ sơ nhất chỉ vài chục dòng, ngành nhiều nhất
   gần một nghìn. Cách chữa thông thường (đánh trọng số theo ngành) đã bị loại vì thiết
   kế yêu cầu mọi dòng bình đẳng. Hình 10.3 đo hậu quả.
3. **Phần Likert của 15.696 hồ sơ TTTH là do copula sinh**, không phải các em đó tự điền.
   Điểm, tổ hợp và ngành trúng tuyển thì là thật.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + MO_HINH + '''
import hashlib

OUT = thu_muc(10)

D = nap(co_ttth=False)
train = pd.read_csv(thu_muc(7) / "train.csv")
val = pd.read_csv(thu_muc(7) / "val.csv")
STH = json.loads((thu_muc(9) / "sieu_tham_so.json").read_text(encoding="utf-8"))
MOC = json.loads((thu_muc(8) / "moc_chuan.json").read_text(encoding="utf-8"))
NP = json.loads((thu_muc(7) / "niem_phong.json").read_text(encoding="utf-8"))

# ── KIỂM NIÊM PHONG TRƯỚC KHI MỞ ─────────────────────────────────────────
p_test = thu_muc(7) / "test_KHOA.csv"
bam = hashlib.sha256(p_test.read_bytes()).hexdigest()
assert bam == NP["bam_sha256"], (
    "BĂM KHÔNG KHỚP — tập test đã bị sửa sau khi niêm phong. "
    "Mọi con số đo trên nó đều không dùng được.")
print(f"✓ Băm khớp: {bam[:32]}…")
print(f"  niêm phong lúc chia, {NP['n_dong']:,} dòng")

test = pd.read_csv(p_test)          # ⚠️ MỞ LẦN ĐẦU VÀ DUY NHẤT
QL = ["ma_nganh", "ma_nhom", "nguon", "is_that", "sample_weight"]
COT = [c for c in train.columns if c not in QL]

# Gộp train + val cho mô hình cuối
hoc = pd.concat([train, val], ignore_index=True)
Xh, yh, gh = hoc[COT].values, hoc.ma_nganh.values, hoc.ma_nhom.values
Xte, yte, gte = test[COT].values, test.ma_nganh.values, test.ma_nhom.values

assert set(hoc.sample_weight.unique()) == {1.0}, "trọng số phải bằng nhau"
assert not any(c in COT for c in ("nguon", "is_that")), "cột nguồn lọt vào đặc trưng"

RIENG_NHOM = bool(STH.get("rieng_nhom", False))
print(f"\\nHuấn luyện : {len(hoc):,} dòng  (train {len(train):,} + val {len(val):,})")
print(f"Test       : {len(test):,} dòng")
print(f"Trọng số   : {sorted(hoc.sample_weight.unique())}  → mọi dòng ngang nhau")
print(f"\\nCấu hình chốt từ Giai đoạn 9:")
for k, v in STH["hp"].items():
    print(f"   {k:<20} {v}")
print(f"   {'rieng_nhom':<20} {RIENG_NHOM}   (tầng tư vấn)")
print(f"\\nRàng buộc đã dùng để chọn: {STH['rang_buoc']['do_tren']}")
print(f"   hợp lệ {STH['n_hop_le']}/{STH['n_cau_hinh']} cấu hình")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Huấn luyện và mở test"))

C.append(code('''t0 = time.time()
mh = MoHinhNganh(D, hp=STH["hp"], rieng_nhom=RIENG_NHOM).fit(Xh, yh)
print(f"Huấn luyện xong {time.time()-t0:.0f}s")

S_tv, S_kp = mh.diem(Xte, gte), mh.diem(Xte)          # test
S_tv_h, S_kp_h = mh.diem(Xh, gh), mh.diem(Xh)         # train+val


def bang_topk(S, y, ten):
    return {"tap": ten, **{f"top{k}": v for k, v in top_k(S, y, D["nganh"]).items()}}


kq = pd.DataFrame([
    bang_topk(S_tv_h, yh, "TRAIN+VAL · tư vấn"),
    bang_topk(S_tv, yte, "TEST · tư vấn"),
    bang_topk(S_kp_h, yh, "TRAIN+VAL · khám phá"),
    bang_topk(S_kp, yte, "TEST · khám phá"),
])
kq.to_csv(OUT / "bang_ket_qua.csv", index=False)


def ci(p, n):
    """Khoảng tin cậy 95% cho một tỉ lệ."""
    return 1.96 * np.sqrt(max(p * (1 - p), 1e-9) / n) * 100


print("\\n" + "=" * 88)
print(f"{'Tập':<28}{'Top-1':>10}{'Top-2':>10}{'Top-3':>10}{'Top-5':>10}{'n':>10}")
print("-" * 88)
for r in kq.itertuples():
    n_ = len(test) if r.tap.startswith("TEST") else len(hoc)
    print(f"{r.tap:<28}{r.top1:>9.1%}{r.top2:>10.1%}{r.top3:>10.1%}"
          f"{r.top5:>10.1%}{n_:>10,}")
print("=" * 88)

# Tư vấn đo ở điểm vận hành (K_TU_VAN gợi ý). Khám phá giữ Top-3 vì ràng buộc chống
# nhớ vẹt ở Giai đoạn 9 đặt trên đúng chỉ số đó — đo lại trên test phải cùng thước.
tv_te = float(kq[kq.tap == "TEST · tư vấn"][f"top{K_TU_VAN}"].iloc[0])
kp_te = float(kq[kq.tap == "TEST · khám phá"].top3.iloc[0])
tv_h = float(kq[kq.tap == "TRAIN+VAL · tư vấn"][f"top{K_TU_VAN}"].iloc[0])
kp_h = float(kq[kq.tap == "TRAIN+VAL · khám phá"].top3.iloc[0])

print(f"\\nKhoảng tin cậy 95% trên test ({len(test):,} dòng):")
print(f"   tư vấn Top-{K_TU_VAN}   {tv_te:.1%} ± {ci(tv_te, len(test)):.1f} điểm")
print(f"   khám phá Top-3 {kp_te:.1%} ± {ci(kp_te, len(test)):.1f} điểm")
print(f"\\nChênh train − test:")
print(f"   tư vấn Top-{K_TU_VAN}   {(tv_h-tv_te)*100:+.1f} điểm")
print(f"   khám phá Top-3 {(kp_h-kp_te)*100:+.1f} điểm")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ BẢNG CHÍNH — kèm mốc đoán bừa ═══════════
bua_tv = bua_trong_nhom(yte, D["nhom"])
bua_kp = bua_toan_bo(len(D["nganh"]))
bua_pb = bua_pho_bien(yh, yte, D["nhom"])

print("=" * 100)
print(" BẢNG CHÍNH — mọi con số kèm mốc đoán bừa")
print("=" * 100)
for ten, S, bua in [("TƯ VẤN  (đã biết nhóm)", S_tv, bua_tv),
                    ("KHÁM PHÁ  (cả 39 ngành)", S_kp, bua_kp)]:
    d = top_k(S, yte, D["nganh"])
    print(f"\\n {ten}   (n = {len(test):,})")
    print(f"   {'':8}{'mô hình':>10}{'đoán bừa':>11}{'hơn bừa':>10}{'kỹ năng':>10}")
    for k in TOP_K:
        print(f"   Top-{k:<4}{d[k]:>10.1%}{bua[k]:>11.1%}"
              f"{(d[k]-bua[k])*100:>+9.1f}đ{ky_nang(d[k], bua[k]):>10.1%}")
print("\\n" + "=" * 100)
print("kỹ năng = (mô hình − bừa) / (1 − bừa)  — so sánh được giữa các cách chia nhóm")

# Mốc khó nhất: luôn gợi ý ngành ĐÔNG NHẤT trong nhóm. Không cần khảo sát, không
# cần điểm, không cần mô hình — vài dòng code là ra. Vượt được mốc NÀY mới có nghĩa.
print(f"\\n── MỐC KHÓ NHẤT: luôn gợi ý ngành đông nhất trong nhóm ──")
print(f"   {'':8}{'mô hình':>10}{'mốc này':>11}{'hơn':>10}{'kỹ năng':>10}")
d_tv = top_k(S_tv, yte, D["nganh"])
for k in TOP_K:
    print(f"   Top-{k:<4}{d_tv[k]:>10.1%}{bua_pb[k]:>11.1%}"
          f"{(d_tv[k]-bua_pb[k])*100:>+9.1f}đ{ky_nang_vs(d_tv[k], bua_pb[k]):>10.1%}")
if d_tv[K_TU_VAN] <= bua_pb[K_TU_VAN]:
    print(f"\\n   ⚠️  Mô hình KHÔNG vượt được mốc này ở Top-{K_TU_VAN}. Phải nêu thẳng.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 2. Chỉ số ở ĐÚNG điểm vận hành — Hit@k, MRR, NDCG@k ⭐

Sản phẩm hiện **2 gợi ý** ở tầng tư vấn và **5 gợi ý** ở tầng khám phá. Đây là bảng
đo tại đúng hai điểm đó — bảng chỉ tiêu chính của khoá luận.

| Chỉ số | Trả lời câu |
|---|---|
| **Hit@k** | *"ngành đúng có nằm trong k gợi ý không?"* — chính là Top-k |
| **macro Hit@k** | như trên nhưng **mỗi ngành trọng số bằng nhau** → bản Top-k của macro-F1 |
| **MRR** | *"ngành đúng nằm ở hạng mấy?"* — giữ thông tin thứ tự mà Hit@k làm mờ |
| **NDCG@k** | chấm theo vị trí rồi cắt ở k: hạng 1 trọn điểm, hạng 2 được ≈0,63 |
| **Hạng trung vị** | câu dễ hiểu nhất: *"quá nửa số em, ngành đúng nằm ở hạng mấy?"* |

### ⚠️ Vì sao KHÔNG có precision@k và recall@k

Mỗi em chỉ có **đúng một** ngành đúng. Khi đó hai chỉ số kia suy biến:

```
recall@k     = hit@k           →  trùng khít cột Top-k, không phải chỉ số mới
precision@k  = hit@k / k       →  tư vấn chia cứng cho 2, khám phá chia cứng cho 5
```

`precision@k` chỉ phản ánh việc giao diện hiện 2 hay 5 thẻ, không nói gì về mô hình.
Đưa vào bảng làm con số trông tệ đi mà không thêm thông tin, và người chấm sẽ hỏi ngay
*"sao recall@3 trùng khít cột Top-3?"*.

### ⚠️ Vì sao KHÔNG có "AUC@2" hay "AUC@5"

AUC theo định nghĩa **không có ngưỡng cắt** — nó xét toàn bộ thứ hạng, nên không tồn
tại khái niệm AUC@k. Chỉ số đóng đúng vai trò đó khi cần cắt ở k là **NDCG@k**.
'''))

C.append(code('''xh, luu_xh = [], []
for ten_, S_, k_, mb in [
        ("TƯ VẤN (biết nhóm)", S_tv, K_TU_VAN, mrr_doan_bua(yte, nhom=D["nhom"])),
        ("KHÁM PHÁ (cả 39)", S_kp, K_KHAM_PHA, mrr_doan_bua(yte, n_lop=len(D["nganh"])))]:
    d_ = chi_so_xep_hang(S_, yte, D["nganh"], k_)
    xh.append((ten_, d_, mb))
    luu_xh.append({"tang": ten_, **d_, "mrr_doan_bua": mb})

in_chi_so_xep_hang(xh)
pd.DataFrame(luu_xh).to_csv(OUT / "chi_so_xep_hang.csv", index=False)

dtv, dkp = xh[0][1], xh[1][1]
print(f"\\n── ĐỌC BẢNG ──")
print(f"Hạng trung vị tầng tư vấn = {dtv['hang_trung_vi']:.0f}"
      f"  → quá nửa số em, ngành đúng là gợi ý ĐẦU TIÊN.")
print(f"Hạng trung vị tầng khám phá = {dkp['hang_trung_vi']:.0f} trên 39 ngành.")

print(f"\\nmacro Hit@k so với Hit@k — khoảng cách là mức bỏ rơi ngành nhỏ:")
print(f"   tư vấn @{K_TU_VAN}   {dtv['hit_k']:.1%} → macro {dtv['macro_hit_k']:.1%}"
      f"   (−{(dtv['hit_k']-dtv['macro_hit_k'])*100:.1f} điểm,"
      f" {dtv['n_nganh_duoi_50']}/{dtv['n_nganh']} ngành dưới 50%)")
print(f"   khám phá @{K_KHAM_PHA} {dkp['hit_k']:.1%} → macro {dkp['macro_hit_k']:.1%}"
      f"   (−{(dkp['hit_k']-dkp['macro_hit_k'])*100:.1f} điểm,"
      f" {dkp['n_nganh_duoi_50']}/{dkp['n_nganh']} ngành dưới 50%)")
print(f"\\n   Đây là con số phải đưa kèm, không được đưa mình Hit@k.")

print(f"\\nMRR so với đoán bừa:")
print(f"   tư vấn   {dtv['mrr']:.3f}  vs bừa {xh[0][2]:.3f}"
      f"   ({dtv['mrr']-xh[0][2]:+.3f})")
print(f"   khám phá {dkp['mrr']:.3f}  vs bừa {xh[1][2]:.3f}"
      f"   ({dkp['mrr']-xh[1][2]:+.3f})")'''))

C.append(md('''## 3. Chỉ số phân loại Top-1 — để đối chiếu

Nhóm chỉ số này giả định hệ thống trả về **một** nhãn duy nhất. Sản phẩm trả 2 gợi ý ở
tầng tư vấn và 5 ở tầng khám phá, nên chúng đo tại một điểm vận hành **không tồn tại**
trong sản phẩm — vì vậy chúng thấp hơn hẳn bảng mục 2.

Vẫn báo cáo, để đối chiếu được với các nghiên cứu phân loại đơn nhãn. Nhưng chỉ tiêu
đánh giá chính là Hit@k và MRR ở mục 2.
'''))

C.append(code('''hang, luu_cs, CS = [], [], {}
for nhan, S_, y_, n_, auc_ in [
        ("tư vấn · TRAIN+VAL", S_tv_h, yh, len(yh), False),
        ("tư vấn · TEST", S_tv, yte, len(yte), False),
        ("khám phá · TRAIN+VAL", S_kp_h, yh, len(yh), True),
        ("khám phá · TEST", S_kp, yte, len(yte), True)]:
    d_ = chi_so_lop(S_, y_, D["nganh"], co_auc=auc_)
    hang.append((nhan, d_, n_))
    CS[nhan] = d_
    luu_cs.append({"lat_cat": nhan, "n": n_, **d_})

in_chi_so_lop(hang)
pd.DataFrame(luu_cs).to_csv(OUT / "chi_so_lop.csv", index=False)

cs = CS["khám phá · TEST"]
cs_h = CS["khám phá · TRAIN+VAL"]
cs_tv = CS["tư vấn · TEST"]

print(f"\\n── ĐỌC BẢNG ──")
print(f"macro-F1 {cs['f1_macro']:.3f}  vs  weighted-F1 {cs['f1_weighted']:.3f}"
      f"   → chênh {cs['f1_weighted']-cs['f1_macro']:+.3f}")
if cs["f1_weighted"] - cs["f1_macro"] > 0.05:
    print(f"   Chênh đáng kể — mô hình làm tốt ở ngành đông, kém ở ngành ít hồ sơ.")
    print(f"   Hình 10.3 chỉ rõ ngành nào.")
else:
    print(f"   Chênh nhỏ — mô hình đối xử khá đều giữa ngành đông và ngành ít hồ sơ.")

print(f"\\nprecision macro {cs['precision_macro']:.3f} · recall macro {cs['recall_macro']:.3f}")
if cs["precision_macro"] > cs["recall_macro"] + 0.05:
    print(f"   precision > recall: gợi ý ra thì khá đúng, nhưng BỎ SÓT nhiều ngành.")
elif cs["recall_macro"] > cs["precision_macro"] + 0.05:
    print(f"   recall > precision: quét rộng, bắt được nhiều nhưng gợi ý sai cũng nhiều.")

print(f"\\nAUC OvR khám phá: train+val {cs_h['auc_ovr']:.3f} → test {cs['auc_ovr']:.3f}"
      f"   (chênh {(cs_h['auc_ovr']-cs['auc_ovr']):+.3f})")
print(f"   Càng gần 1 càng tốt. KHÁC AUC Giai đoạn 5, nơi 0,50 mới là lý tưởng.")
print(f"\\nTop-1 khám phá {cs['acc_top1']:.1%} · Top-1 tư vấn {cs_tv['acc_top1']:.1%}")
print(f"   Top-3 khám phá {kp_te:.1%} — hơn Top-1 {(kp_te-cs['acc_top1'])*100:.1f} điểm.")
print(f"   Ép hệ thống về 1 gợi ý thì mất chừng đó.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ BẢNG TRAIN | TEST | chênh ═══════════
bang_train_test([
    ("TƯ VẤN (đã biết nhóm)", top_k(S_tv_h, yh, D["nganh"]),
     top_k(S_tv, yte, D["nganh"]), bua_tv),
    ("KHÁM PHÁ (cả 39 ngành)", top_k(S_kp_h, yh, D["nganh"]),
     top_k(S_kp, yte, D["nganh"]), bua_kp),
])

gap_kp = kp_h - kp_te
rb = STH["rang_buoc"]
print(f"\\nRàng buộc Giai đoạn 9 (đo trên val): khám phá chênh ≤ {rb['kp_gap_toi_da']:.0%}")
print(f"Thực tế trên test                  : khám phá chênh {gap_kp*100:+.1f} điểm")
if gap_kp <= rb["kp_gap_toi_da"]:
    print(f"   ✓ Ràng buộc giữ được khi sang tập test — mô hình không nhớ vẹt.")
else:
    print(f"   ⚠️ Chênh trên test VƯỢT ngưỡng đã đặt ở val. Phải nêu trong báo cáo:")
    print(f"      cấu hình chọn trên val không tổng quát hoá được sang test.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 10.1 — Kết quả chính ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 5.2))
for ax, (ten_, S, bua) in zip([a1, a2], [
        ("Tầng TƯ VẤN (đã biết nhóm)", S_tv, bua_tv),
        ("Tầng KHÁM PHÁ (cả 39 ngành)", S_kp, bua_kp)]):
    d = top_k(S, yte, D["nganh"])
    x = np.arange(len(TOP_K)); w_ = .36
    mh_v = [d[k] * 100 for k in TOP_K]
    bu_v = [bua[k] * 100 for k in TOP_K]
    er = [ci(d[k], len(test)) for k in TOP_K]
    ax.bar(x - w_/2, mh_v, w_, color=C_XANH, label="mô hình", yerr=er,
           error_kw=dict(ecolor=C_DAM, lw=1.3, capsize=4))
    ax.bar(x + w_/2, bu_v, w_, color=C_XAM, label="đoán bừa")
    ax.set_xticks(x); ax.set_xticklabels([f"Top-{k}" for k in TOP_K], fontsize=11)
    ax.set_ylabel("%"); ax.set_ylim(0, 108); ax.legend(fontsize=10)
    ax.set_title(ten_, fontsize=12)
    for i, (m_, b_) in enumerate(zip(mh_v, bu_v)):
        ax.text(i - w_/2, m_ + er[i] + 2, f"{m_:.1f}", ha="center", fontsize=9,
                fontweight="bold")
        ax.text(i + w_/2, b_ + 3, f"{b_:.1f}", ha="center", fontsize=9, color="#5A6672")

fig.suptitle(f"Hình 10.1 — Kết quả trên tập test ({len(test):,} dòng)",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_10_1_ket_qua.png",
    f"Cột xám là thứ phải đọc cùng: ở tầng tư vấn, nhóm 3 ngành thì Top-3 tự đúng 100% "
    f"nên đoán bừa Top-3 đã đạt {bua_tv[3]:.1%} — vì vậy tầng này chỉ hiện {K_TU_VAN} "
    f"gợi ý. Ở Top-{K_TU_VAN} đoán bừa {bua_tv[K_TU_VAN]:.1%}, mô hình {tv_te:.1%}, hơn "
    f"{(tv_te-bua_tv[K_TU_VAN])*100:.1f} điểm. Ở tầng khám phá đoán bừa chỉ {bua_kp[3]:.1%} "
    f"trong khi mô hình đạt {kp_te:.1%}, hơn {(kp_te-bua_kp[3])*100:.1f} điểm — đó mới "
    f"là chỗ mô hình chứng minh nó học được gì. Thanh sai số là khoảng tin cậy 95%.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.2 — TRAIN+VAL so với TEST ═══════════
fig, ax = plt.subplots(figsize=(12, 5))
nhom_ = [f"TƯ VẤN · Top-{K_TU_VAN}", "KHÁM PHÁ · Top-3"]
tr_ = [tv_h * 100, kp_h * 100]
te_ = [tv_te * 100, kp_te * 100]
x = np.arange(2); w_ = .36
ax.bar(x - w_/2, tr_, w_, color=C_XAM, label=f"TRAIN+VAL ({len(hoc):,} dòng)")
ax.bar(x + w_/2, te_, w_, color=C_XANH, label=f"TEST ({len(test):,} dòng)",
       yerr=[ci(tv_te, len(test)), ci(kp_te, len(test))],
       error_kw=dict(ecolor=C_DAM, lw=1.3, capsize=5))
ax.set_xticks(x); ax.set_xticklabels(nhom_, fontsize=12)
ax.set_ylabel("Top-k (%)"); ax.legend(fontsize=10); ax.set_ylim(0, 112)
for i, (a_, b_) in enumerate(zip(tr_, te_)):
    ax.text(i - w_/2, a_ + 2, f"{a_:.1f}", ha="center", fontsize=10, fontweight="bold")
    ax.text(i + w_/2, b_ + 4, f"{b_:.1f}", ha="center", fontsize=10, fontweight="bold")
    ax.text(i, max(a_, b_) + 8, f"chênh {a_-b_:.1f}đ", ha="center", fontsize=10,
            color=C_THAT, fontweight="bold")
ax.axhline(bua_tv[K_TU_VAN] * 100, xmin=.05, xmax=.45, color=C_CAM, ls="--", lw=1.6)
ax.axhline(bua_kp[3] * 100, xmin=.55, xmax=.95, color=C_CAM, ls="--", lw=1.6)
ax.text(0, bua_tv[K_TU_VAN] * 100 - 6, f"đoán bừa {bua_tv[K_TU_VAN]:.1%}", ha="center",
        fontsize=8.5, color=C_CAM)
ax.text(1, bua_kp[3] * 100 + 2, f"đoán bừa {bua_kp[3]:.1%}", ha="center",
        fontsize=8.5, color=C_CAM)
ax.set_title("Hình 10.2 — Khoảng cách train − test")
luu(fig, OUT, "hinh_10_2_train_test.png",
    f"Chênh train−test ở tầng tư vấn {(tv_h-tv_te)*100:.1f} điểm, ở tầng khám phá "
    f"{gap_kp*100:.1f} điểm. Ràng buộc cứng ở Giai đoạn 9 đặt ngưỡng "
    f"{rb['kp_gap_toi_da']*100:.0f} điểm cho tầng khám phá đo trên val; con số trên test cho biết "
    f"ràng buộc đó có tổng quát hoá được không. Đường đứt cam là mốc đoán bừa — ở tầng "
    f"tư vấn nó cao tới {bua_tv[K_TU_VAN]:.1%}, nên đừng đọc con số {tv_te:.1%} mà không đọc nó.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.3 — Ngành nào mô hình chịu thua ═══════════
# Đo ở điểm vận hành của tầng khám phá (K_KHAM_PHA gợi ý), cùng thước với bảng chính.
COT_NG = f"top{K_KHAM_PHA}_kham_pha"
o = np.argsort(-S_kp, 1)[:, :K_KHAM_PHA]
dung = np.array([yte[i] in D["nganh"][o[i]] for i in range(len(yte))])
co_hoc = pd.Series(yh).value_counts()
# 5 ngành không có hồ sơ trúng tuyển: dòng huấn luyện lấy mẫu lại từ khảo sát nên dễ
# trùng dòng test, kết quả dễ bị thổi phồng — đánh dấu * để không đọc thành bằng chứng.
khong_ttth = set(hoc.loc[hoc.nguon == "bootstrap_khaosat", "ma_nganh"])
ra = []
for ma in D["nganh"]:
    s = yte == ma
    if s.sum():
        ra.append({"ma": int(ma), "ten": D["ma_to_ten"][ma],
                   "nhom": int(D["nhom"][ma]),
                   "khong_ttth": int(ma in khong_ttth),
                   "n_hoc": int(co_hoc.get(ma, 0)), "n_test": int(s.sum()),
                   COT_NG: float(dung[s].mean())})
rd = pd.DataFrame(ra).sort_values("n_hoc")
rd.to_csv(OUT / "theo_nganh.csv", index=False)

fig, ax, al = hinh_theo_nganh(rd, COT_NG, f"Hit@{K_KHAM_PHA} khám phá (%)",
                              "số dòng test của ngành", sao="khong_ttth",
                              ghi_chu_sao="không có hồ sơ trúng tuyển")
fig.suptitle(f"Hình 10.3 — Ngành nào mô hình chịu thua (tập test, {K_KHAM_PHA} gợi ý)",
             fontsize=14, fontweight="bold", y=1.02)
nho = rd.head(10)[COT_NG].mean() * 100
lon = rd.tail(10)[COT_NG].mean() * 100
luu(fig, OUT, "hinh_10_3_theo_nganh.png",
    f"10 ngành ít dữ liệu nhất đạt Hit@{K_KHAM_PHA} khám phá trung bình {nho:.1f}%, 10 "
    f"ngành nhiều nhất đạt {lon:.1f}% — chênh {lon-nho:.1f} điểm. Đây chính là thứ "
    f"macro-F1 ({cs['f1_macro']:.3f}) đo được mà độ chính xác trần trụi giấu đi. Số cạnh "
    f"chấm tra tên ở bảng bên phải. Cách chữa thông thường là đánh trọng số theo ngành, "
    f"nhưng thiết kế yêu cầu mọi dòng bình đẳng nên hướng đó bị loại có chủ đích.")
plt.show()'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 3. Lưu mô hình và số liệu"))

C.append(code('''mh.m.save_model(str(OUT / "model_nganh.json"))
if getattr(mh, "m_nhom", None):
    for g, (m_, _) in mh.m_nhom.items():
        m_.save_model(str(OUT / f"model_nhom{g}.json"))
    print(f"Đã lưu 1 mô hình chung + {len(mh.m_nhom)} mô hình nhóm")
else:
    print("Đã lưu 1 mô hình chung (tầng tư vấn dùng chính nó, che bớt ngành)")

(OUT / "lop_va_dac_trung.json").write_text(json.dumps({
    "cot_dac_trung": COT,
    "rieng_nhom": RIENG_NHOM,
    "nganh": [int(m) for m in D["nganh"]],
    "ma_to_ten": {str(k): v for k, v in D["ma_to_ten"].items()},
    "nganh_to_nhom": {str(k): int(v) for k, v in D["nhom"].items()},
    "ten_nhom": {str(k): v for k, v in D["ten_nhom"].items()},
}, ensure_ascii=False, indent=2), encoding="utf-8")

lam_tron = lambda d: {k: (None if (isinstance(v, float) and np.isnan(v)) else
                          (round(v, 4) if isinstance(v, float) else v))
                      for k, v in d.items()}

metrics = {
    "n_hoc": int(len(hoc)), "n_test": int(len(test)),
    "binh_dang": "sample_weight = 1.0 cho mọi dòng; nguon/is_that ngoài tập đặc trưng",
    "hp": STH["hp"], "rieng_nhom": RIENG_NHOM,
    "rang_buoc_gd9": STH["rang_buoc"],
    "test": {
        "tu_van": {f"top{k}": round(top_k(S_tv, yte, D["nganh"])[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp, yte, D["nganh"])[k], 4) for k in TOP_K}},
    "train_val": {
        "tu_van": {f"top{k}": round(top_k(S_tv_h, yh, D["nganh"])[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp_h, yh, D["nganh"])[k], 4) for k in TOP_K}},
    "diem_van_hanh": {"tu_van": K_TU_VAN, "kham_pha": K_KHAM_PHA},
    "gap_train_test": {"tu_van": round(float(tv_h - tv_te), 4),
                       "kham_pha": round(float(gap_kp), 4),
                       "k": {"tu_van": K_TU_VAN, "kham_pha": 3}},
    "doan_bua": {
        "tu_van_trong_nhom": {f"top{k}": round(bua_tv[k], 4) for k in TOP_K},
        "tu_van_nganh_dong_nhat": {f"top{k}": round(bua_pb[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(bua_kp[k], 4) for k in TOP_K}},
    "ky_nang": {f"tu_van_top{K_TU_VAN}": round(ky_nang(tv_te, bua_tv[K_TU_VAN]), 4),
                "kham_pha_top3": round(ky_nang(kp_te, bua_kp[3]), 4)},
    "chi_so_xep_hang": {t_: {**lam_tron(d_), "mrr_doan_bua": round(mb, 4)}
                        for t_, d_, mb in xh},
    "chi_so_lop": {n_: lam_tron(d_) for n_, d_, _ in hang},
    "sai_so_95": {f"tu_van_top{K_TU_VAN}": round(float(ci(tv_te, len(test))), 1),
                  "kham_pha_top3": round(float(ci(kp_te, len(test))), 1)},
    "han_che": [
        "Bộ sinh copula đã thấy cả 676 phiếu khảo sát trước khi chia tập, kể cả "
        "phiếu rơi vào test — hệ quả của yêu cầu gộp thành một file train final rồi "
        "mới chia. Con số test là cận trên lạc quan.",
        f"Mất cân bằng theo ngành: 10 ngành ít dữ liệu nhất đạt Hit@{K_KHAM_PHA} khám phá "
        f"{nho:.1f}%, 10 ngành nhiều nhất {lon:.1f}%. macro-F1 {cs['f1_macro']:.3f} "
        f"so với weighted-F1 {cs['f1_weighted']:.3f} đo cùng hiện tượng đó.",
        "Phần Likert của 15.696 hồ sơ TTTH do copula sinh, không phải các em tự điền; "
        "điểm, tổ hợp và ngành trúng tuyển là thật.",
    ],
}
(OUT / "metrics.json").write_text(
    json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 10 — CHỐT MÔ HÌNH", [
    f"Huấn luyện             {len(hoc):,} dòng (train + val) · trọng số bằng nhau",
    f"Test                   {len(test):,} dòng · mở đúng một lần, băm khớp",
    "",
    f"{'':22}{'TRAIN+VAL':>12}{'TEST':>9}{'chênh':>9}{'bừa':>9}",
    f"   {'tư vấn Top-' + str(K_TU_VAN):<19}{tv_h:>12.1%}{tv_te:>9.1%}"
    f"{(tv_h-tv_te)*100:>+8.1f}đ{bua_tv[K_TU_VAN]:>9.1%}",
    f"   {'khám phá Top-3':<19}{kp_h:>12.1%}{kp_te:>9.1%}"
    f"{gap_kp*100:>+8.1f}đ{bua_kp[3]:>9.1%}",
    "",
    f"⭐ ĐIỂM VẬN HÀNH THẬT ({K_TU_VAN} gợi ý / {K_KHAM_PHA} gợi ý):",
    f"   {'':12}{'tư vấn @' + str(K_TU_VAN):>12}{'kh.phá @' + str(K_KHAM_PHA):>12}",
    f"   {'Hit@k':<12}{dtv['hit_k']:>12.1%}{dkp['hit_k']:>12.1%}",
    f"   {'macro Hit@k':<12}{dtv['macro_hit_k']:>12.1%}{dkp['macro_hit_k']:>12.1%}",
    f"   {'MRR':<12}{dtv['mrr']:>12.3f}{dkp['mrr']:>12.3f}",
    f"   {'NDCG@k':<12}{dtv['ndcg_k']:>12.3f}{dkp['ndcg_k']:>12.3f}",
    f"   {'hạng t.vị':<12}{dtv['hang_trung_vi']:>12.0f}{dkp['hang_trung_vi']:>12.0f}",
    "",
    "Chỉ số Top-1 (đối chiếu — hệ thống KHÔNG chạy ở Top-1):",
    f"   macro-F1            tư vấn {cs_tv['f1_macro']:.3f}"
    f" · khám phá {cs['f1_macro']:.3f}",
    "",
    f"Kỹ năng                tư vấn Top-{K_TU_VAN} {ky_nang(tv_te, bua_tv[K_TU_VAN]):.1%}"
    f" · khám phá Top-3 {ky_nang(kp_te, bua_kp[3]):.1%}",
    "",
    "⚠️  Ba hạn chế đã ghi trong metrics.json — đưa vào báo cáo",
])
print(f"\\n✅ metrics.json · model_nganh.json · bang_ket_qua.csv · chi_so_lop.csv"
      f" · theo_nganh.csv · 3 hình  →  {OUT}")'''))

viet("10_ChotModel.ipynb", C)
