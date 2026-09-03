# Kế hoạch: Dashboard Quản trị & Hiệu suất Hệ thống

**Ngày lập:** 03/09/2026 · **Nguồn yêu cầu:** đề cương của giảng viên hướng dẫn

> **Yêu cầu:**
> 1. *Theo dõi lịch sử tư vấn:* quản lý và xem lại danh sách các phiên tư vấn đã thực hiện.
> 2. *Thống kê và so sánh hiệu suất:* trực quan hóa Accuracy, F1-score, AUC-ROC, so sánh
>    giữa **XGBoost** và **Random Forest baseline**, đồng thời hiển thị biến động hiệu
>    suất qua từng chu kỳ **huấn luyện lại (retrain)**.

---

## 1. Đối chiếu: cái gì đã có, cái gì chưa

Nguồn: `research/data/processed/08_model/metrics_summary.json` (chạy 02/09/2026, seed 42).

| Yêu cầu | Tình trạng | Bằng chứng |
|---|---|---|
| Lịch sử tư vấn | ✅ **Có đủ** | `prediction_history` — đã có endpoint `hoatDongGanDay` (10 gần nhất) |
| **Accuracy** | ✅ **Có đủ** | `test.*.top1 / top3 / top5`, `balanced_acc` cho cả 4 kiến trúc |
| **F1-score** | ✅ **Có đủ** | `macro_f1` trên cả CV lẫn tập kiểm tra |
| **AUC-ROC** | ✅ **Có đủ, khá chi tiết** | `auc_roc`: macro, weighted, **và từng khối ngành** |
| So sánh với baseline | ⚠️ **Có nhưng SAI loại** | Baseline hiện là *"Đoán lớp đông nhất"* và *"Model phẳng 39 lớp (XGBoost)"* |
| **Random Forest baseline** | ❌ **KHÔNG CÓ** | `grep "random\|forest"` trong `metrics_summary.json` → không có kết quả |
| **Chu kỳ retrain** | ❌ **KHÔNG CÓ** | Mô hình train **một lần duy nhất**. Không có pipeline retrain, không có lịch sử |

### Số liệu đang có (tập kiểm tra 102 sinh viên thật)

| Kiến trúc | Top-1 | Top-3 | Macro-F1 | AUC-ROC |
|---|---|---|---|---|
| Đoán lớp đông nhất | 6,97% | 17,42% | 0,003 | — |
| Model phẳng 39 lớp | 19,61% | 38,24% | 0,148 | 0,821 |
| **2 tầng — khám phá** | 17,65% | 39,22% | 0,145 | 0,844 |
| **2 tầng — tư vấn** | — | 69,6% | 0,266 (CV) | 0,950 |
| Tầng 1 (7 khối) | 54,90% | 86,27% | 0,456 | 0,832 |

Có sẵn cả **khoảng cách overfit**: `train_top1 = 0,946` vs `val_top1 = 0,169`.

---

## 2. Hai khoảng trống và cách lấp

### 2.1 Random Forest baseline — phải train thật

Không thể lấy con số từ đâu ra. Phải **train Random Forest thật** trên đúng bộ CV folds
đã dùng cho XGBoost (`02_split/cv_folds_real.json`), rồi tính cùng bộ chỉ số.

- Cùng feature (43 cột), cùng `sample_weight`, cùng 15 fold (5×3)
- `RandomForestClassifier` cho cả tầng 1 (7 lớp) và tầng 2 (39 lớp)
- Xuất ra `08_model/baseline_random_forest.json` cùng schema với XGBoost
- Ước lượng thời gian: **15–30 phút** (RF chậm hơn XGBoost trên 39 lớp)

> Kết quả có thể **không có lợi** cho XGBoost. Nếu RF thắng ở chỉ số nào thì ghi nhận
> trung thực chứ không giấu — đó mới là điều kiện để phần so sánh có giá trị.

### 2.2 Chu kỳ retrain — hiện chưa tồn tại

Mô hình mới train **một lần**. Không có gì để vẽ "biến động qua từng chu kỳ".

Ba hướng:

| | Hướng | Đánh giá |
|---|---|---|
| **A** | **Ghi nhật ký huấn luyện.** Mỗi lần chạy NB08 ghi thêm một dòng vào `lich_su_huan_luyen.json` (ngày, seed, số mẫu, mọi chỉ số). Biểu đồ vẽ từ file này | Đúng bản chất, làm được ngay. Ban đầu chỉ có **1 điểm**, các lần train sau mới thành đường |
| **B** | **Retrain thật với dữ liệu người dùng.** Gom `prediction_history` làm dữ liệu mới rồi train lại theo chu kỳ | Đúng tinh thần "vòng lặp phản hồi" nhất, nhưng hiện mới có **2 lượt tư vấn** — chưa đủ để retrain có nghĩa |
| **C** | Coi NB08 và NB09 là 2 chu kỳ | ❌ **Sai bản chất.** NB09 là tìm siêu tham số, không phải huấn luyện lại trên dữ liệu mới |

**Đề xuất: làm A ngay, chuẩn bị đường cho B.** Ghi nhật ký từ giờ, và khi đủ dữ liệu
người dùng thì mỗi lần retrain sẽ tự thêm một điểm vào biểu đồ. Trong khóa luận trình bày
là *"cơ chế theo dõi đã sẵn sàng, dữ liệu tích lũy theo thời gian sử dụng"* — trung thực
hơn là bịa ra 5 mốc retrain không có thật.

---

## 3. Việc cần làm

### 3.1 Backend
- [x] `GET /admin/model-metrics` — đọc `metrics_summary.json` + `baseline_random_forest.json`
      + `lich_su_huan_luyen.json`, trả về gộp
- [x] `GET /admin/consultations` — lịch sử tư vấn đầy đủ, có phân trang và bộ lọc
      (theo ngày, chế độ, tổ hợp, ngành) — hiện mới có 10 bản ghi gần nhất

### 3.2 Nghiên cứu (`research/notebooks/`)
- [ ] Thêm cell Random Forest baseline vào `08_train_xgboost.ipynb`, chạy trên cùng CV folds
- [ ] Xuất `08_model/baseline_random_forest.json`
- [ ] Thêm cơ chế ghi `08_model/lich_su_huan_luyen.json` (nối thêm dòng mỗi lần chạy)

### 3.3 Giao diện
- [x] `/dashboard/model` — trang hiệu suất mô hình:
  - Thẻ chỉ số chính: Accuracy · Macro-F1 · AUC-ROC (theo từng chế độ)
  - **Biểu đồ cột nhóm**: XGBoost vs Random Forest vs Đoán lớp đông nhất, trên Top-1 / Top-3 / F1 / AUC
  - **Biểu đồ đường AUC-ROC theo từng khối ngành** (7 khối, dữ liệu đã có)
  - **Biểu đồ đường biến động qua các lần train** (từ nhật ký huấn luyện)
  - Bảng siêu tham số + khoảng cách overfit + ngày chạy + seed
- [x] `/dashboard/consultations` — bảng lịch sử tư vấn có phân trang, lọc, xem chi tiết từng phiên

---

## 4. Trạng thái (cập nhật 03/09/2026)

✅ **Đã xong phần có dữ liệu:** `/dashboard/model` và `/dashboard/consultations`,
kèm 2 endpoint. Accuracy · F1-score · AUC-ROC · so sánh 4 kiến trúc · AUC theo từng
nhóm ngành · khoảng cách overfit · siêu tham số — tất cả lấy nguyên từ
`metrics_summary.json`.

⏸ **Hoãn theo yêu cầu:** Random Forest baseline (chưa train). Giao diện đã chừa sẵn
khối, hiện *"Chưa train Random Forest…"* thay vì vẽ số giả. Khi có
`baseline_random_forest.json` là hiện ngay, không cần sửa code.

⬜ **Chưa làm:** nhật ký huấn luyện (`lich_su_huan_luyen.json`) cho biểu đồ retrain —
cùng cơ chế, cùng chỗ chờ sẵn.

---

## 5. Kiểm chứng khi xong

- Số trên giao diện khớp **từng chữ số** với `metrics_summary.json`
- Random Forest và XGBoost so trên **cùng bộ CV folds**, cùng feature, cùng trọng số mẫu
- Nhật ký huấn luyện chỉ có 1 điểm → biểu đồ hiện đúng 1 điểm kèm ghi chú, **không nội suy**
- Lịch sử tư vấn phân trang đúng, bộ lọc khớp với đếm trực tiếp trong MongoDB
- `tsc --noEmit` = 0 lỗi, backend biên dịch sạch, mọi trang HTTP 200
