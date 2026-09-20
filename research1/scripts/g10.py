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
    ["07_TachTrainTest/train.csv        —  11.407 dòng",
     "07_TachTrainTest/val.csv          —  2.444 dòng",
     "07_TachTrainTest/test_KHOA.csv    —  2.445 dòng ⚠️ MỞ LẦN ĐẦU",
     "06_NiemPhongKhaoSat/khaosat_NIEMPHONG.csv  —  676 phiếu ⚠️ MỞ LẦN ĐẦU ⭐",
     "09_TinhChinh/sieu_tham_so.json    —  cấu hình đã chốt",
     "08_MocChuan/moc_chuan.json        —  bốn mốc để so"],
    ["Kiểm CẢ HAI mã băm SHA-256 trước khi mở",
     "Huấn luyện lại trên train + val bằng cấu hình đã chốt",
     "Mở CẢ HAI tập kiểm định ĐÚNG MỘT LẦN",
     "Đo mức lạc quan: test nội bộ so với người thật  ⭐",
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

## ⭐ Hướng 2 — hai tập kiểm định, mở cùng lúc

Đây là notebook duy nhất trong cả pipeline được phép đọc hai file niêm phong:

| Tập | n | Nguồn | Trả lời câu |
|---|--:|---|---|
| `test_KHOA.csv` | 2.445 | hồ sơ trúng tuyển | *mô hình khớp phân phối nó học đến đâu?* |
| `khaosat_NIEMPHONG.csv` | **676** | **người thật điền** | *mô hình dự đoán học sinh thật đến đâu?* ⭐ |

**Chênh lệch giữa hai con số chính là kết quả quan trọng nhất của Hướng 2.** Nó đo mức
lạc quan mà toàn bộ quy trình sinh dữ liệu bơm vào. Hướng 1 gộp hai nguồn từ Giai đoạn 6
nên không có cách nào tách ra để đo con số này.

Cả hai mã băm SHA-256 được kiểm trước khi mở. Sai một mã thì `assert` nổ ngay.

## ⚠️ Cột thứ ba — loại 5 ngành rò rỉ vòng tròn

Năm ngành (Luật, Trí tuệ nhân tạo, Quản lý Công nghiệp, Logistics, Du lịch) không có hồ
sơ trúng tuyển nào. Dòng huấn luyện của chúng sinh ra từ chính 52 phiếu khảo sát bị niêm
phong — tức dữ liệu huấn luyện đi ra từ tập kiểm định.

Vì vậy bảng kết quả có **ba cột**: test nội bộ · 676 phiếu người thật · 624 phiếu thuộc
34 ngành có hồ sơ thật. Cột cuối là con số sạch nhất.

## Phát biểu đúng về tính độc lập

> Mô hình phân loại **chưa từng thấy** phiếu nào trong 676 phiếu niêm phong.
> Bộ sinh copula ở Giai đoạn 3 **thì có**.

Không viết "hoàn toàn độc lập" — sẽ bị bắt lỗi. Lý do không tránh được đã ghi ở Giai
đoạn 6: ngành ít phiếu nhất chỉ có 6 phiếu, chia đôi thì không ước lượng nổi ma trận
hiệp phương sai 10×10.

## Huấn luyện lại trên train + val

Giai đoạn 9 đã dùng xong `val.csv` để chọn cấu hình. Từ đây nó không còn nhiệm vụ gì, nên
gộp vào train để mô hình cuối có nhiều dữ liệu nhất:

```
train 11.407 + val 2.444 = 13.851 dòng  →  mô hình cuối
test   2.445 dòng + 676 phiếu người thật →  chỉ để đo
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

1. **Bộ sinh copula có học từ 676 phiếu niêm phong** ở Giai đoạn 3, dù mô hình phân loại
   thì không. Không tránh được — lý do ở Giai đoạn 6.
2. **5 ngành rò rỉ vòng tròn** — xem cột thứ ba của bảng kết quả.
3. **Mất cân bằng theo ngành.** Cách chữa thông thường (đánh trọng số theo ngành) bị loại
   vì thiết kế yêu cầu mọi dòng bình đẳng. Hình 10.3 đo hậu quả.
4. **Cỡ mẫu tập người thật là 676** — sai số rộng hơn tập test 2.445 dòng, nhưng đây là
   phiếu người thật tự điền.
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
NPK = json.loads((thu_muc(6) / "niem_phong_khaosat.json").read_text(encoding="utf-8"))

# ── KIỂM CẢ HAI NIÊM PHONG TRƯỚC KHI MỞ ──────────────────────────────────
p_test = thu_muc(7) / "test_KHOA.csv"
p_ks = thu_muc(6) / "khaosat_NIEMPHONG.csv"
for ten_, p_, mong in [("test_KHOA.csv", p_test, NP["bam_sha256"]),
                       ("khaosat_NIEMPHONG.csv", p_ks, NPK["bam_sha256"])]:
    b_ = hashlib.sha256(p_.read_bytes()).hexdigest()
    assert b_ == mong, (f"BĂM KHÔNG KHỚP — {ten_} đã bị sửa sau khi niêm phong. "
                        f"Mọi con số đo trên nó đều không dùng được.")
    print(f"✓ {ten_:<24} {b_[:32]}…")

test = pd.read_csv(p_test)          # ⚠️ MỞ LẦN ĐẦU VÀ DUY NHẤT
ksn = pd.read_csv(p_ks)             # ⚠️ MỞ LẦN ĐẦU VÀ DUY NHẤT — 676 người thật
QL = ["ma_nganh", "ma_nhom", "nguon", "rui_ro_vong_tron", "sample_weight"]
COT = [c for c in train.columns if c not in QL]

# Gộp train + val cho mô hình cuối
hoc = pd.concat([train, val], ignore_index=True)
Xh, yh, gh = hoc[COT].values, hoc.ma_nganh.values, hoc.ma_nhom.values
Xte, yte, gte = test[COT].values, test.ma_nganh.values, test.ma_nhom.values
Xks, yks, gks = ksn[COT].values, ksn.ma_nganh.values, ksn.ma_nhom.values
# 5 ngành rò rỉ vòng tròn — mặt nạ để báo cáo riêng cột 34 ngành có hồ sơ thật
m_sach = ksn.rui_ro_vong_tron.values == 0

assert set(hoc.sample_weight.unique()) == {1.0}, "trọng số phải bằng nhau"
assert not any(c in COT for c in ("nguon", "rui_ro_vong_tron")), "cột quản lý lọt vào đặc trưng"

RIENG_NHOM = bool(STH.get("rieng_nhom", False))
print(f"\\nHuấn luyện       : {len(hoc):,} dòng  (train {len(train):,} + val {len(val):,})")
print(f"Test nội bộ      : {len(test):,} dòng  (từ hồ sơ trúng tuyển)")
print(f"Khảo sát n.phong : {len(ksn):,} phiếu NGƯỜI THẬT  ⭐")
print(f"   trong đó {int(m_sach.sum())} phiếu thuộc 34 ngành có hồ sơ trúng tuyển thật")
print(f"           {int((~m_sach).sum())} phiếu thuộc 5 ngành rò rỉ vòng tròn")
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

S_tv, S_kp = mh.diem(Xte, gte), mh.diem(Xte)          # test nội bộ
S_tv_h, S_kp_h = mh.diem(Xh, gh), mh.diem(Xh)         # train+val
S_tv_k, S_kp_k = mh.diem(Xks, gks), mh.diem(Xks)      # ⭐ 676 phiếu NGƯỜI THẬT


def bang_topk(S, y, ten):
    return {"tap": ten, **{f"top{k}": v for k, v in top_k(S, y, D["nganh"]).items()}}


kq = pd.DataFrame([
    bang_topk(S_tv_h, yh, "TRAIN+VAL · tư vấn"),
    bang_topk(S_tv, yte, "TEST nội bộ · tư vấn"),
    bang_topk(S_tv_k, yks, "KHẢO SÁT · tư vấn"),
    bang_topk(S_tv_k[m_sach], yks[m_sach], "KHẢO SÁT 34 ngành · tư vấn"),
    bang_topk(S_kp_h, yh, "TRAIN+VAL · khám phá"),
    bang_topk(S_kp, yte, "TEST nội bộ · khám phá"),
    bang_topk(S_kp_k, yks, "KHẢO SÁT · khám phá"),
    bang_topk(S_kp_k[m_sach], yks[m_sach], "KHẢO SÁT 34 ngành · khám phá"),
])
kq.to_csv(OUT / "bang_ket_qua.csv", index=False)


def ci(p, n):
    """Khoảng tin cậy 95% cho một tỉ lệ."""
    return 1.96 * np.sqrt(max(p * (1 - p), 1e-9) / n) * 100


N_TAP = {"TRAIN+VAL": len(hoc), "TEST nội bộ": len(test),
         "KHẢO SÁT": len(ksn), "KHẢO SÁT 34 ngành": int(m_sach.sum())}
n_cua = lambda t: N_TAP[t.split(" · ")[0]]

print("\\n" + "=" * 94)
print(f"{'Tập':<32}{'Top-1':>10}{'Top-2':>10}{'Top-3':>10}{'Top-5':>10}{'n':>10}")
print("-" * 94)
for r in kq.itertuples():
    if r.tap.startswith("TRAIN+VAL · khám"):
        print("-" * 94)
    print(f"{r.tap:<32}{r.top1:>9.1%}{r.top2:>10.1%}{r.top3:>10.1%}"
          f"{r.top5:>10.1%}{n_cua(r.tap):>10,}")
print("=" * 94)
print("KHẢO SÁT = 676 phiếu người thật, mô hình CHƯA TỪNG THẤY")
print("KHẢO SÁT 34 ngành = bỏ 5 ngành rò rỉ vòng tròn")

# Tư vấn đo ở điểm vận hành (K_TU_VAN gợi ý). Khám phá giữ Top-3 vì ràng buộc chống
# nhớ vẹt ở Giai đoạn 9 đặt trên đúng chỉ số đó — đo lại phải cùng thước.
g_ = lambda t, k=3: float(kq[kq.tap == t][f"top{k}"].iloc[0])
tv_h, kp_h = g_("TRAIN+VAL · tư vấn", K_TU_VAN), g_("TRAIN+VAL · khám phá")
tv_te, kp_te = g_("TEST nội bộ · tư vấn", K_TU_VAN), g_("TEST nội bộ · khám phá")
tv_ks, kp_ks = g_("KHẢO SÁT · tư vấn", K_TU_VAN), g_("KHẢO SÁT · khám phá")
tv_s, kp_s = g_("KHẢO SÁT 34 ngành · tư vấn", K_TU_VAN), g_("KHẢO SÁT 34 ngành · khám phá")

print(f"\\n⭐ BA CON SỐ, BA CÂU HỎI KHÁC NHAU (tư vấn Top-{K_TU_VAN} · khám phá Top-3):")
print(f"   {'':26}{'tư vấn':>10}{'khám phá':>11}")
print(f"   {'TEST nội bộ':<26}{tv_te:>10.1%}{kp_te:>11.1%}"
      f"   ← khớp phân phối đã học?")
print(f"   {'KHẢO SÁT (676 người)':<26}{tv_ks:>10.1%}{kp_ks:>11.1%}"
      f"   ← dự đoán người thật?")
print(f"   {'KHẢO SÁT 34 ngành':<26}{tv_s:>10.1%}{kp_s:>11.1%}"
      f"   ← bỏ rò rỉ vòng tròn")
print(f"\\n   Chênh TEST → KHẢO SÁT: tư vấn {(tv_te-tv_ks)*100:+.1f}đ"
      f" · khám phá {(kp_te-kp_ks)*100:+.1f}đ")
print(f"   Đó là mức lạc quan mà dữ liệu sinh bơm vào — Hướng 1 KHÔNG đo được.")
print(f"\\n   Chênh 39 ngành → 34 ngành: tư vấn {(tv_ks-tv_s)*100:+.1f}đ"
      f" · khám phá {(kp_ks-kp_s)*100:+.1f}đ")
print(f"   Đó là phần do 5 ngành rò rỉ vòng tròn đóng góp.")

print(f"\\nKhoảng tin cậy 95%:")
print(f"   TEST nội bộ ({len(test):,} dòng)  khám phá ±{ci(kp_te, len(test)):.1f} điểm")
print(f"   KHẢO SÁT ({len(ksn)} phiếu)     khám phá ±{ci(kp_ks, len(ksn)):.1f} điểm")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ BẢNG CHÍNH — kèm mốc đoán bừa ═══════════
bua_tv = bua_trong_nhom(yte, D["nhom"])
bua_kp = bua_toan_bo(len(D["nganh"]))
bua_pb = bua_pho_bien(yh, yte, D["nhom"])
# Mốc trên tập khảo sát phải tính lại theo phân bố ngành CỦA NÓ
bua_tv_k = bua_trong_nhom(yks, D["nhom"])
bua_pb_k = bua_pho_bien(yh, yks, D["nhom"])

print("=" * 100)
print(" BẢNG CHÍNH — mọi con số kèm mốc đoán bừa")
print("=" * 100)
for ten, S, y_, bua, n_ in [
        ("TƯ VẤN · test nội bộ", S_tv, yte, bua_tv, len(test)),
        ("TƯ VẤN · 676 phiếu NGƯỜI THẬT ⭐", S_tv_k, yks, bua_tv_k, len(ksn)),
        ("KHÁM PHÁ · test nội bộ", S_kp, yte, bua_kp, len(test)),
        ("KHÁM PHÁ · 676 phiếu NGƯỜI THẬT ⭐", S_kp_k, yks, bua_kp, len(ksn))]:
    d = top_k(S, y_, D["nganh"])
    print(f"\\n {ten}   (n = {n_:,})")
    print(f"   {'':8}{'mô hình':>10}{'đoán bừa':>11}{'hơn bừa':>10}{'kỹ năng':>10}")
    for k in TOP_K:
        print(f"   Top-{k:<4}{d[k]:>10.1%}{bua[k]:>11.1%}"
              f"{(d[k]-bua[k])*100:>+9.1f}đ{ky_nang(d[k], bua[k]):>10.1%}")
print("\\n" + "=" * 100)
print("kỹ năng = (mô hình − bừa) / (1 − bừa)  — so sánh được giữa các cách chia nhóm")

# Mốc khó nhất: luôn gợi ý ngành ĐÔNG NHẤT trong nhóm. Không cần khảo sát, không
# cần điểm, không cần mô hình — vài dòng code là ra. Vượt được mốc NÀY mới có nghĩa.
print(f"\\n── MỐC KHÓ NHẤT: luôn gợi ý ngành đông nhất trong nhóm ──")
print(f"   đo trên 676 phiếu NGƯỜI THẬT")
print(f"   {'':8}{'mô hình':>10}{'mốc này':>11}{'hơn':>10}{'kỹ năng':>10}")
d_tv = top_k(S_tv_k, yks, D["nganh"])
for k in TOP_K:
    print(f"   Top-{k:<4}{d_tv[k]:>10.1%}{bua_pb_k[k]:>11.1%}"
          f"{(d_tv[k]-bua_pb_k[k])*100:>+9.1f}đ{ky_nang_vs(d_tv[k], bua_pb_k[k]):>10.1%}")
if d_tv[K_TU_VAN] <= bua_pb_k[K_TU_VAN]:
    print(f"\\n   ⚠️  Mô hình KHÔNG vượt được mốc này ở Top-{K_TU_VAN} trên người thật.")
    print(f"       Phải nêu thẳng — đây là kết quả quan trọng nhất của Hướng 2.")'''))

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
for ten_, S_, y_, k_, mb in [
        ("TƯ VẤN · test", S_tv, yte, K_TU_VAN, mrr_doan_bua(yte, nhom=D["nhom"])),
        ("TƯ VẤN · NGƯỜI THẬT ⭐", S_tv_k, yks, K_TU_VAN, mrr_doan_bua(yks, nhom=D["nhom"])),
        ("KHÁM PHÁ · test", S_kp, yte, K_KHAM_PHA, mrr_doan_bua(yte, n_lop=len(D["nganh"]))),
        ("KHÁM PHÁ · NGƯỜI THẬT ⭐", S_kp_k, yks, K_KHAM_PHA,
         mrr_doan_bua(yks, n_lop=len(D["nganh"])))]:
    d_ = chi_so_xep_hang(S_, y_, D["nganh"], k_)
    xh.append((ten_, d_, mb))
    luu_xh.append({"tang": ten_, **d_, "mrr_doan_bua": mb})

in_chi_so_xep_hang(xh)
pd.DataFrame(luu_xh).to_csv(OUT / "chi_so_xep_hang.csv", index=False)

dtv, dkp = xh[1][1], xh[3][1]      # cột NGƯỜI THẬT là cột của kết luận
dtvt, dkpt = xh[0][1], xh[2][1]    # cột test nội bộ để đối chiếu
print(f"\\n── ĐỌC BẢNG ──")
print(f"Trên 676 phiếu NGƯỜI THẬT:")
print(f"   hạng trung vị tầng tư vấn   = {dtv['hang_trung_vi']:.0f}")
print(f"   hạng trung vị tầng khám phá = {dkp['hang_trung_vi']:.0f} trên 39 ngành")
print(f"\\nSo với test nội bộ (hạng trung vị {dtvt['hang_trung_vi']:.0f}"
      f" và {dkpt['hang_trung_vi']:.0f}):")
print(f"   MRR tư vấn   {dtvt['mrr']:.3f} → {dtv['mrr']:.3f}"
      f"   ({dtv['mrr']-dtvt['mrr']:+.3f})")
print(f"   MRR khám phá {dkpt['mrr']:.3f} → {dkp['mrr']:.3f}"
      f"   ({dkp['mrr']-dkpt['mrr']:+.3f})")

print(f"\\nmacro Hit@k so với Hit@k — khoảng cách là mức bỏ rơi ngành nhỏ:")
print(f"   tư vấn @{K_TU_VAN}   {dtv['hit_k']:.1%} → macro {dtv['macro_hit_k']:.1%}"
      f"   (−{(dtv['hit_k']-dtv['macro_hit_k'])*100:.1f} điểm,"
      f" {dtv['n_nganh_duoi_50']}/{dtv['n_nganh']} ngành dưới 50%)")
print(f"   khám phá @{K_KHAM_PHA} {dkp['hit_k']:.1%} → macro {dkp['macro_hit_k']:.1%}"
      f"   (−{(dkp['hit_k']-dkp['macro_hit_k'])*100:.1f} điểm,"
      f" {dkp['n_nganh_duoi_50']}/{dkp['n_nganh']} ngành dưới 50%)")
print(f"\\n   Đây là con số phải đưa kèm, không được đưa mình Hit@k.")

print(f"\\nMRR so với đoán bừa (người thật):")
print(f"   tư vấn   {dtv['mrr']:.3f}  vs bừa {xh[1][2]:.3f}"
      f"   ({dtv['mrr']-xh[1][2]:+.3f})")
print(f"   khám phá {dkp['mrr']:.3f}  vs bừa {xh[3][2]:.3f}"
      f"   ({dkp['mrr']-xh[3][2]:+.3f})")'''))

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
        ("tư vấn · NGƯỜI THẬT", S_tv_k, yks, len(yks), False),
        ("khám phá · TRAIN+VAL", S_kp_h, yh, len(yh), True),
        ("khám phá · TEST", S_kp, yte, len(yte), True),
        ("khám phá · NGƯỜI THẬT", S_kp_k, yks, len(yks), True)]:
    d_ = chi_so_lop(S_, y_, D["nganh"], co_auc=auc_)
    hang.append((nhan, d_, n_))
    CS[nhan] = d_
    luu_cs.append({"lat_cat": nhan, "n": n_, **d_})

in_chi_so_lop(hang)
pd.DataFrame(luu_cs).to_csv(OUT / "chi_so_lop.csv", index=False)

cs = CS["khám phá · NGƯỜI THẬT"]      # cột của kết luận
cs_h = CS["khám phá · TRAIN+VAL"]
cs_te = CS["khám phá · TEST"]
cs_tv = CS["tư vấn · NGƯỜI THẬT"]

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

print(f"\\nAUC OvR khám phá: train+val {cs_h['auc_ovr']:.3f}"
      f" → test {cs_te['auc_ovr']:.3f} → NGƯỜI THẬT {cs['auc_ovr']:.3f}")
print(f"   Càng gần 1 càng tốt. KHÁC AUC Giai đoạn 5, nơi 0,50 mới là lý tưởng.")
print(f"\\nTop-1 khám phá {cs['acc_top1']:.1%} · Top-1 tư vấn {cs_tv['acc_top1']:.1%}")
print(f"   Top-3 khám phá {kp_te:.1%} — hơn Top-1 {(kp_te-cs['acc_top1'])*100:.1f} điểm.")
print(f"   Ép hệ thống về 1 gợi ý thì mất chừng đó.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ BẢNG TRAIN | TEST | chênh ═══════════
bang_train_test([
    ("TƯ VẤN — cột TEST là 676 phiếu NGƯỜI THẬT", top_k(S_tv_h, yh, D["nganh"]),
     top_k(S_tv_k, yks, D["nganh"]), bua_tv_k),
    ("KHÁM PHÁ — cột TEST là 676 phiếu NGƯỜI THẬT", top_k(S_kp_h, yh, D["nganh"]),
     top_k(S_kp_k, yks, D["nganh"]), bua_kp),
])

gap_kp = kp_h - kp_te
gap_kp_ks = kp_h - kp_ks
rb = STH["rang_buoc"]
print(f"\\nRàng buộc Giai đoạn 9 (đo trên val)  : khám phá chênh ≤ {rb['kp_gap_toi_da']:.0%}")
print(f"Thực tế trên test nội bộ            : {gap_kp*100:+.1f} điểm")
print(f"Thực tế trên 676 phiếu NGƯỜI THẬT   : {gap_kp_ks*100:+.1f} điểm  ⭐")
if gap_kp <= rb["kp_gap_toi_da"]:
    print(f"\\n   ✓ Ràng buộc giữ được trên test nội bộ.")
else:
    print(f"\\n   ⚠️ Vượt ngưỡng ngay ở test nội bộ.")
print(f"   Khoảng cách tới người thật ({gap_kp_ks*100:.1f} điểm) là con số PHẢI nêu:")
print(f"   nó đo mức lạc quan của toàn bộ quy trình sinh dữ liệu, không chỉ của mô hình.")
print(f"   Hướng 1 không có cách nào đo được con số này.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 10.1 — Kết quả chính ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 5.2))
for ax, (ten_, S, bua) in zip([a1, a2], [
        ("Tầng TƯ VẤN (đã biết nhóm)", S_tv_k, bua_tv_k),
        ("Tầng KHÁM PHÁ (cả 39 ngành)", S_kp_k, bua_kp)]):
    d = top_k(S, yks, D["nganh"])
    x = np.arange(len(TOP_K)); w_ = .36
    mh_v = [d[k] * 100 for k in TOP_K]
    bu_v = [bua[k] * 100 for k in TOP_K]
    er = [ci(d[k], len(ksn)) for k in TOP_K]
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

fig.suptitle(f"Hình 10.1 — Kết quả trên {len(ksn)} phiếu NGƯỜI THẬT niêm phong",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_10_1_ket_qua.png",
    f"Đây là con số của Hướng 2: đo trên {len(ksn)} phiếu người thật mà mô hình chưa "
    f"từng thấy. Cột xám là mốc bốc ngẫu nhiên, phải đọc cùng — ở tầng tư vấn "
    f"(Top-{K_TU_VAN}) nó đạt {bua_tv_k[K_TU_VAN]:.1%} và mô hình {tv_ks:.1%}, hơn "
    f"{(tv_ks-bua_tv_k[K_TU_VAN])*100:.1f} điểm. Ở tầng khám phá (Top-3) mốc chỉ "
    f"{bua_kp[3]:.1%} trong khi mô hình đạt {kp_ks:.1%}, "
    f"hơn {(kp_ks-bua_kp[3])*100:.1f} điểm. Thanh sai số rộng hơn Hướng 1 vì cỡ mẫu "
    f"{len(ksn)} thay vì 2.546, nhưng đây là phiếu người thật tự điền.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.2 — TRAIN+VAL so với TEST ═══════════
fig, ax = plt.subplots(figsize=(12, 5))
nhom_ = [f"TƯ VẤN · Top-{K_TU_VAN}", "KHÁM PHÁ · Top-3"]
# Không dùng emoji trong chữ của hình: DejaVu Sans không có glyph, ra ô vuông.
bo3 = [("TRAIN+VAL", [tv_h*100, kp_h*100], C_XAM),
       ("TEST nội bộ", [tv_te*100, kp_te*100], C_GA),
       ("NGƯỜI THẬT", [tv_ks*100, kp_ks*100], C_THAT)]
x = np.arange(2); w_ = .26
for j, (ten_, v_, mau_) in enumerate(bo3):
    er = [ci(tv_ks, len(ksn)), ci(kp_ks, len(ksn))] if j == 2 else None
    ax.bar(x + (j-1)*w_, v_, w_, color=mau_, label=ten_, yerr=er,
           error_kw=dict(ecolor=C_DAM, lw=1.3, capsize=4))
    for i, a_ in enumerate(v_):
        # số đặt trên đầu thanh sai số, không để thanh sai số gạch qua chữ
        ax.text(i + (j-1)*w_, a_ + (er[i] if er else 0) + 2, f"{a_:.1f}",
                ha="center", fontsize=9, fontweight="bold")
for i, (a_, b_) in enumerate(zip(bo3[1][1], bo3[2][1])):
    ax.text(i + w_/2, max(a_, b_) + 9, f"lạc quan {a_-b_:.1f}đ", ha="center",
            fontsize=9.5, color=C_THAT, fontweight="bold")
ax.set_xticks(x); ax.set_xticklabels(nhom_, fontsize=12)
ax.set_ylabel("Top-k (%)"); ax.legend(fontsize=9.5); ax.set_ylim(0, 118)
ax.axhline(bua_tv_k[K_TU_VAN] * 100, xmin=.05, xmax=.45, color=C_CAM, ls="--", lw=1.6)
ax.axhline(bua_kp[3] * 100, xmin=.55, xmax=.95, color=C_CAM, ls="--", lw=1.6)
ax.text(0, bua_tv_k[K_TU_VAN] * 100 - 6, f"đoán bừa {bua_tv_k[K_TU_VAN]:.1%}", ha="center",
        fontsize=8.5, color=C_CAM)
ax.text(1, bua_kp[3] * 100 + 2, f"đoán bừa {bua_kp[3]:.1%}", ha="center",
        fontsize=8.5, color=C_CAM)
ax.set_title("Hình 10.2 — Ba cách đo, ba câu hỏi khác nhau")
luu(fig, OUT, "hinh_10_2_ba_cach_do.png",
    f"Đây là hình quan trọng nhất của Hướng 2. Cột xanh lá là test nội bộ — cùng phân "
    f"phối với dữ liệu huấn luyện; cột đỏ là {len(ksn)} phiếu người thật mà mô hình chưa "
    f"từng thấy. Khoảng cách giữa hai cột ({(kp_te-kp_ks)*100:.1f} điểm ở tầng khám phá) "
    f"là mức chênh giữa kết quả nội bộ và học sinh thật — Hướng 1 gộp hai nguồn nên không "
    f"đo được con số này. Đường đứt cam là mốc bốc ngẫu "
    f"nhiên, ở tầng tư vấn cao tới {bua_tv_k[K_TU_VAN]:.1%}.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.3 — Ngành nào mô hình chịu thua ═══════════
# Đo ở điểm vận hành của tầng khám phá (K_KHAM_PHA gợi ý), trên 676 phiếu người thật.
COT_NG = f"top{K_KHAM_PHA}_kham_pha"
o = np.argsort(-S_kp_k, 1)[:, :K_KHAM_PHA]
dung = np.array([yks[i] in D["nganh"][o[i]] for i in range(len(yks))])
co_hoc = pd.Series(yh).value_counts()
ra = []
for ma in D["nganh"]:
    s = yks == ma
    if s.sum():
        ra.append({"ma": int(ma), "ten": D["ma_to_ten"][ma],
                   "nhom": int(D["nhom"][ma]),
                   "vong_tron": int(ma in NPK["nganh_vong_tron"]),
                   "n_hoc": int(co_hoc.get(ma, 0)), "n_test": int(s.sum()),
                   COT_NG: float(dung[s].mean())})
rd = pd.DataFrame(ra).sort_values("n_hoc")
rd.to_csv(OUT / "theo_nganh.csv", index=False)

fig, ax, al = hinh_theo_nganh(rd, COT_NG, f"Hit@{K_KHAM_PHA} khám phá (%)",
                              "số phiếu người thật của ngành", sao="vong_tron",
                              ghi_chu_sao="ngành rò rỉ vòng tròn")
fig.suptitle(f"Hình 10.3 — Ngành nào mô hình chịu thua (người thật, {K_KHAM_PHA} gợi ý)",
             fontsize=14, fontweight="bold", y=1.02)
nho = rd.head(10)[COT_NG].mean() * 100
lon = rd.tail(10)[COT_NG].mean() * 100
luu(fig, OUT, "hinh_10_3_theo_nganh.png",
    f"10 ngành ít dữ liệu nhất đạt Hit@{K_KHAM_PHA} khám phá trung bình {nho:.1f}%, 10 "
    f"ngành nhiều nhất đạt {lon:.1f}% — chênh {lon-nho:.1f} điểm. Đây chính là thứ "
    f"macro-F1 ({cs['f1_macro']:.3f}) đo được mà độ chính xác trần trụi giấu đi. Số cạnh "
    f"chấm tra tên ở bảng bên phải; dấu * là ngành rò rỉ vòng tròn. Cách chữa thông "
    f"thường là đánh trọng số theo ngành, nhưng thiết kế yêu cầu mọi dòng bình đẳng nên "
    f"hướng đó bị loại có chủ đích.")
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
    "huong": 2,
    "n_hoc": int(len(hoc)), "n_test": int(len(test)),
    "n_khaosat_niemphong": int(len(ksn)),
    "n_khaosat_34_nganh": int(m_sach.sum()),
    "thiet_ke": "HƯỚNG 2 — 676 phiếu khảo sát niêm phong từ Giai đoạn 6, mô hình "
                "phân loại chưa từng thấy. Bộ sinh copula ở Giai đoạn 3 thì có.",
    "hp": STH["hp"], "rieng_nhom": RIENG_NHOM,
    "rang_buoc_gd9": STH["rang_buoc"],
    "test_noi_bo": {
        "tu_van": {f"top{k}": round(top_k(S_tv, yte, D["nganh"])[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp, yte, D["nganh"])[k], 4) for k in TOP_K}},
    "khaosat_niemphong": {
        "tu_van": {f"top{k}": round(top_k(S_tv_k, yks, D["nganh"])[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp_k, yks, D["nganh"])[k], 4) for k in TOP_K}},
    "khaosat_34_nganh": {
        "tu_van": {f"top{k}": round(top_k(S_tv_k[m_sach], yks[m_sach], D["nganh"])[k], 4)
                   for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp_k[m_sach], yks[m_sach], D["nganh"])[k], 4)
                     for k in TOP_K}},
    "lac_quan_test_vs_nguoi_that": {
        f"tu_van_top{K_TU_VAN}": round(float(tv_te - tv_ks), 4),
        "kham_pha_top3": round(float(kp_te - kp_ks), 4)},
    "phan_do_5_nganh_vong_tron": {
        f"tu_van_top{K_TU_VAN}": round(float(tv_ks - tv_s), 4),
        "kham_pha_top3": round(float(kp_ks - kp_s), 4)},
    "train_val": {
        "tu_van": {f"top{k}": round(top_k(S_tv_h, yh, D["nganh"])[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(top_k(S_kp_h, yh, D["nganh"])[k], 4) for k in TOP_K}},
    "diem_van_hanh": {"tu_van": K_TU_VAN, "kham_pha": K_KHAM_PHA},
    "gap_train_test": {"tu_van": round(float(tv_h - tv_te), 4),
                       "kham_pha": round(float(gap_kp), 4),
                       "k": {"tu_van": K_TU_VAN, "kham_pha": 3}},
    "gap_train_nguoi_that": {"tu_van": round(float(tv_h - tv_ks), 4),
                             "kham_pha": round(float(gap_kp_ks), 4)},
    "doan_bua": {
        "tu_van_trong_nhom": {f"top{k}": round(bua_tv_k[k], 4) for k in TOP_K},
        "tu_van_nganh_dong_nhat": {f"top{k}": round(bua_pb_k[k], 4) for k in TOP_K},
        "kham_pha": {f"top{k}": round(bua_kp[k], 4) for k in TOP_K}},
    "ky_nang_nguoi_that": {
        f"tu_van_top{K_TU_VAN}": round(ky_nang(tv_ks, bua_tv_k[K_TU_VAN]), 4),
        "kham_pha_top3": round(ky_nang(kp_ks, bua_kp[3]), 4),
        f"kham_pha_top{K_KHAM_PHA}": round(ky_nang(
            top_k(S_kp_k, yks, D["nganh"])[K_KHAM_PHA], bua_kp[K_KHAM_PHA]), 4)},
    "chi_so_xep_hang": {t_: {**lam_tron(d_), "mrr_doan_bua": round(mb, 4)}
                        for t_, d_, mb in xh},
    "chi_so_lop": {n_: lam_tron(d_) for n_, d_, _ in hang},
    "sai_so_95_nguoi_that": {f"tu_van_top{K_TU_VAN}": round(float(ci(tv_ks, len(ksn))), 1),
                             "kham_pha_top3": round(float(ci(kp_ks, len(ksn))), 1)},
    "han_che": [
        "Mô hình phân loại chưa từng thấy phiếu nào trong 676 phiếu niêm phong, "
        "nhưng bộ sinh copula ở Giai đoạn 3 CÓ học từ chúng. Không tránh được: "
        "ngành ít phiếu nhất chỉ có 6 phiếu, chia đôi thì không ước lượng nổi ma "
        "trận hiệp phương sai. Đừng viết 'hoàn toàn độc lập'.",
        f"5 ngành (Luật, Trí tuệ nhân tạo, Quản lý Công nghiệp, Logistics, Du lịch) "
        f"không có hồ sơ trúng tuyển nào; dòng huấn luyện của chúng sinh từ chính "
        f"{int((~m_sach).sum())} phiếu bị niêm phong — rò rỉ vòng tròn. Cột "
        f"'khaosat_34_nganh' loại bỏ chúng.",
        f"Mất cân bằng theo ngành: 10 ngành ít dữ liệu nhất đạt Hit@{K_KHAM_PHA} khám phá "
        f"{nho:.1f}%, 10 ngành nhiều nhất {lon:.1f}%. macro-F1 {cs['f1_macro']:.3f} "
        f"so với weighted-F1 {cs['f1_weighted']:.3f} đo cùng hiện tượng đó.",
        "Phần Likert của 15.696 hồ sơ TTTH do copula sinh, không phải các em tự điền; "
        "điểm, tổ hợp và ngành trúng tuyển là thật.",
    ],
}
(OUT / "metrics.json").write_text(
    json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 10 — CHỐT MÔ HÌNH (HƯỚNG 2)", [
    f"Huấn luyện        {len(hoc):,} dòng · 100% từ hồ sơ trúng tuyển",
    f"Test nội bộ       {len(test):,} dòng · băm khớp",
    f"NGƯỜI THẬT        {len(ksn):,} phiếu · niêm phong từ GĐ 6, băm khớp  ⭐",
    "",
    f"BA CÁCH ĐO (tư vấn Top-{K_TU_VAN} · khám phá Top-3):",
    f"   {'':20}{'tư vấn':>10}{'khám phá':>11}",
    f"   {'TRAIN+VAL':<20}{tv_h:>10.1%}{kp_h:>11.1%}",
    f"   {'TEST nội bộ':<20}{tv_te:>10.1%}{kp_te:>11.1%}",
    f"   {'NGƯỜI THẬT ⭐':<20}{tv_ks:>10.1%}{kp_ks:>11.1%}",
    f"   {'NGƯỜI THẬT 34 ngành':<20}{tv_s:>10.1%}{kp_s:>11.1%}",
    f"   {'đoán bừa':<20}{bua_tv_k[K_TU_VAN]:>10.1%}{bua_kp[3]:>11.1%}",
    "",
    f"Lạc quan do d.liệu sinh  tư vấn {(tv_te-tv_ks)*100:+.1f}đ"
    f" · khám phá {(kp_te-kp_ks)*100:+.1f}đ",
    f"Phần do 5 ngành v.tròn   tư vấn {(tv_ks-tv_s)*100:+.1f}đ"
    f" · khám phá {(kp_ks-kp_s)*100:+.1f}đ",
    "",
    f"⭐ ĐIỂM VẬN HÀNH, đo trên NGƯỜI THẬT ({K_TU_VAN} gợi ý / {K_KHAM_PHA} gợi ý):",
    f"   {'':12}{'tư vấn @' + str(K_TU_VAN):>12}{'kh.phá @' + str(K_KHAM_PHA):>12}",
    f"   {'Hit@k':<12}{dtv['hit_k']:>12.1%}{dkp['hit_k']:>12.1%}",
    f"   {'macro Hit@k':<12}{dtv['macro_hit_k']:>12.1%}{dkp['macro_hit_k']:>12.1%}",
    f"   {'MRR':<12}{dtv['mrr']:>12.3f}{dkp['mrr']:>12.3f}",
    f"   {'NDCG@k':<12}{dtv['ndcg_k']:>12.3f}{dkp['ndcg_k']:>12.3f}",
    f"   {'hạng t.vị':<12}{dtv['hang_trung_vi']:>12.0f}{dkp['hang_trung_vi']:>12.0f}",
    "",
    f"macro-F1 (Top-1)  tư vấn {cs_tv['f1_macro']:.3f}"
    f" · khám phá {cs['f1_macro']:.3f}",
    f"Kỹ năng           tư vấn Top-{K_TU_VAN} {ky_nang(tv_ks, bua_tv_k[K_TU_VAN]):.1%}"
    f" · khám phá Top-3 {ky_nang(kp_ks, bua_kp[3]):.1%}",
    "",
    "⚠️  Hạn chế đã ghi trong metrics.json — đưa vào báo cáo",
])
print(f"\\n✅ metrics.json · model_nganh.json · bang_ket_qua.csv · chi_so_lop.csv"
      f" · theo_nganh.csv · 3 hình  →  {OUT}")'''))

viet("10_ChotModel.ipynb", C)
