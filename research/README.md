# 🔬 Research — EduTalk HUIT

Pipeline nghiên cứu Machine Learning cho hệ thống gợi ý ngành học của EduTalk HUIT.

> **Tài liệu này được sinh tự động từ các file kết quả thật**
> (`08_model/metrics_summary.json`, `06_validation/ket_luan_kiem_dinh.json`, …)
> nên số liệu luôn khớp với lần chạy gần nhất.

## Tổng quan

| Thông số | Giá trị |
|---|---|
| **Mục tiêu** | Gợi ý ngành học phù hợp cho học sinh THPT dựa trên sở thích, tính cách và điểm thi |
| **Bài toán** | Phân loại đa lớp phân cấp — 7 khối ngành → 39 ngành |
| **Thuật toán** | XGBoost 2 tầng + Thuật toán di truyền (GA) tăng cường dữ liệu |
| **Dữ liệu thật** | 676 phiếu khảo sát sinh viên HUIT (sau lọc) + 15,888 hồ sơ trúng tuyển THPT |
| **Số đặc trưng** | 43 |
| **Cross-Validation** | 5 fold × 3 lần = 15 lần đo |

---

## ⚠️ Đọc số liệu cho đúng

Hệ thống có **hai chế độ**, và chúng **không so sánh ngang hàng được**:

| Chế độ | Người dùng nhập | Top-1 | Top-3 | Top-5 | Vai trò |
|---|---|---|---|---|---|
| **Tự động** | Chỉ Likert + điểm thi | **17.6%** | **39.2%** | **52.9%** | ✅ **Năng lực thật của hệ thống** |
| **Tư vấn** | + tự chọn khối ngành | 35.3% | 69.6% | 82.4% | ⚠️ Chỉ số **có điều kiện** |

Chế độ Tư vấn giả định người dùng **đã tự xác định đúng 1 trong 7 khối ngành** — tức đã giải xong
phần khó nhất của bài toán. **Không được lấy con số đó làm độ chính xác của hệ thống.**

---

## Kết quả trên tập test

*102 sinh viên thật, chưa từng được dùng ở bất kỳ giai đoạn nào trước đó.*

### Tầng 1 — Khối ngành (7 lớp)

| Chỉ số | Giá trị | Mốc so sánh |
|---|---|---|
| Top-1 | **54.9%** | đoán lớp đông nhất 25.4% · ngẫu nhiên 14.3% |
| Top-2 | 76.5% | |
| Top-3 | 86.3% | |
| macro-F1 | 0.456 | |
| Balanced accuracy | 0.455 | |

### Tầng 2 — Ngành (39 lớp), chế độ Tự động

| Chỉ số | Giá trị | Mốc so sánh | Gấp mấy lần ngẫu nhiên |
|---|---|---|---|
| Top-1 | **17.6%** | lớp đông nhất 7.0% · ngẫu nhiên 2.6% | 6.9× |
| Top-3 | **39.2%** | lớp đông nhất 17.4% · ngẫu nhiên 7.7% | 5.1× |
| Top-5 | **52.9%** | lớp đông nhất 25.8% · ngẫu nhiên 12.8% | 4.1× |
| macro-F1 | 0.145 | | |
| Balanced accuracy | 0.150 | | |

**Đối chứng — model phẳng 39 lớp** (không dùng cấu trúc khối ngành):
Top-1 = 19.6%, Top-3 = 38.2%, Top-5 = 55.9%, macro-F1 = 0.148.

---

## Pipeline

```
data/raw/TTTH_THPT_Cleaned.xlsx          data/raw/khao_sat_...csv
        │                                          │
        ▼                                          ▼
┌───────────────────────┐              ┌──────────────────────────┐
│ GĐ1 · Tiền xử lý TTTH │              │ GĐ2 · Tách Train/Test    │
│ 18.024 → 15,888 hồ sơ  │              │ 766 → lọc → 574/102     │
│ điểm thi ↔ ngành THẬT │              │ + 15 fold CV           │
│ (34/39 ngành có mặt)  │              │ + bảng taxonomy chuẩn    │
└───────────┬───────────┘              └────────────┬─────────────┘
            │                                       │
            │                          ┌────────────▼─────────────┐
            │                          │ GĐ3 · Học phân phối      │
            │                          │ trung bình + HIỆP PHƯƠNG │
            │                          │ SAI 10×10 (chỉ đọc train)│
            │                          └────────────┬─────────────┘
            └──────────────┬────────────────────────┘
                           ▼
            ┌──────────────────────────────────┐
            │ GĐ4 · GA sinh dữ liệu            │
            │ • Cá thể = CẢ BỘ dữ liệu n×10    │
            │ • Giữ nguyên điểm thi THẬT       │
            │ • Sinh Likert/giới tính/mục tiêu │
            │ • Cân bằng lớp 98× → 4×          │
            │ → 13,796 dòng + bộ theo fold     │
            └────────────────┬─────────────────┘
                             ▼
            ┌──────────────────────────────────┐      ┌────────────────────────────┐
            │ GĐ5 · Gộp + trọng số 2 thành phần│      │ GĐ6 · Kiểm định GA         │
            │ w = w_nguồn × w_lớp              │─────▶│ so với dòng thật           │
            │ → 14,370 dòng huấn luyện      │      │ OUT-OF-FOLD                │
            └────────────────┬─────────────────┘      │ AUC thật/giả = 0.620      │
                             │                        └────────────────────────────┘
                             ▼
            ┌──────────────────────────────────┐
            │ GĐ7 · Xây dựng đặc trưng         │
            │ • 43 đặc trưng, KHÔNG rò rỉ nhãn │
            │ • Chuẩn hoá điểm z-score theo môn│
            └────────────────┬─────────────────┘
                             ▼
            ┌──────────────────────────────────┐
            │ GĐ8 · Huấn luyện & Đánh giá      │
            │ • CV 5×3, VAL chỉ dòng thật    │
            │ • Random search + early stopping │
            │ • Baseline + ablation            │
            │ • Test mở đúng 1 lần             │
            └──────────────────────────────────┘
```

---

## Chiến lược chia dữ liệu

```
676 phiếu khảo sát sạch
   │
   ├────────────────────► TEST: 102 phiếu — KHOÁ LẠI, mở đúng 1 lần ở Giai đoạn 8
   │
   └── TRAIN: 574 phiếu thật
         │
         └── RepeatedStratifiedKFold(5 × 3) = 15 lần đo
               VAL   = phiếu thật của fold           ← mọi chỉ số đo tại đây
               TRAIN = phiếu thật còn lại
                     + 13,796 dòng tổng hợp sinh RIÊNG cho fold đó
```

**Ba nguyên tắc bảo đảm tính trung thực:**

1. Dữ liệu tổng hợp **chỉ vào TRAIN**, không bao giờ vào VAL/TEST. Mọi chỉ số tính trên dòng thật.
2. Dữ liệu tổng hợp của mỗi fold sinh từ phân phối **chỉ học trên TRAIN của fold đó** — nếu không,
   dòng tổng hợp sẽ "biết" về dòng VAL và chỉ số CV bị lạc quan.
3. **Không đặc trưng nào suy ra được từ nhãn.** Khối ngành là hàm xác định của ngành nên tuyệt đối
   không đưa vào đặc trưng; cấu trúc phân cấp chỉ áp dụng lúc suy diễn qua phép nhân xác suất
   `P(ngành) ∝ P₂(ngành) × P₁(khối)^β` với β = 0.6000000000000001 chọn trên validation thật.

---

## Kiểm định chất lượng dữ liệu tổng hợp

So dữ liệu tổng hợp với **dòng thật out-of-fold** (chưa từng dùng để sinh ra nó), khớp tỷ lệ ngành.
Đối chứng với phương án sinh **10 phân phối độc lập** (cùng trung bình, cùng độ lệch chuẩn, chỉ bỏ tương quan):

| Phép kiểm định | Có hiệp phương sai *(đang dùng)* | 10 phân phối độc lập |
|---|---|---|
| KS-test đạt (p ≥ 0.05) | **10/10 câu** | — |
| Sai lệch ma trận tương quan | **0.0306** | 0.2306 |
| Energy distance | **0.0147** | 0.0449 |
| **AUC phân biệt thật/giả** (0.5 = lý tưởng) | **0.620** | 0.815 |

Kết luận: **ĐẠT CHUẨN**.
Phương án 10 phân phối độc lập bị mô hình phát hiện dễ dàng (AUC 0.815) vì mất hoàn toàn cấu trúc
tương quan giữa các câu hỏi — đây là lý do Giai đoạn 3 phải dùng ma trận hiệp phương sai.

**Ablation (Giai đoạn 8):** dữ liệu tổng hợp **CÓ** cải thiện
chỉ số so với chỉ dùng dòng thật.

---

## Tài liệu chi tiết

📄 **[`docs/BAOCAO_CHI_TIET_GD01_GD08.md`](docs/BAOCAO_CHI_TIET_GD01_GD08.md)** — báo cáo đầy đủ
45 bước xử lý của cả 8 giai đoạn. Mỗi bước trình bày theo khung:
**① Xử lý thế nào → ② Kết quả số liệu → ③ Hình minh hoạ → ④ Nhận xét**, kèm đánh giá hiệu quả
từng giai đoạn và bảng hạn chế xếp theo mức nghiêm trọng.

## Mục lục hình cho báo cáo

Tổng cộng **32 hình**, đã lưu sẵn ở độ phân giải 220 DPI.

| Đường dẫn | Giai đoạn |
|---|---|
| `01_flatten/hinh_1_1_pheu_lam_sach.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `01_flatten/hinh_1_2_thieu_diem_theo_mon.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `01_flatten/hinh_1_3_phan_bo_diem.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `01_flatten/hinh_1_4_ho_so_theo_39_nganh.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `01_flatten/hinh_1_5_khoi_nganh_va_diem.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `01_flatten/hinh_1_6_lech_phan_phoi_to_hop.png` | Giai đoạn 1 — Tiền xử lý TTTH |
| `02_split/hinh_2_1_loc_phieu_dien_dai.png` | Giai đoạn 2 — Tách Train/Test |
| `02_split/hinh_2_2_phan_bo_likert.png` | Giai đoạn 2 — Tách Train/Test |
| `02_split/hinh_2_3_nhan_khau_hoc.png` | Giai đoạn 2 — Tách Train/Test |
| `02_split/hinh_2_4_phan_bo_train_test.png` | Giai đoạn 2 — Tách Train/Test |
| `02_split/hinh_2_5_thiet_ke_cross_validation.png` | Giai đoạn 2 — Tách Train/Test |
| `03_distribution/hinh_3_1_bayesian_shrinkage.png` | Giai đoạn 3 — Học phân phối |
| `03_distribution/hinh_3_2_ma_tran_tuong_quan.png` | Giai đoạn 3 — Học phân phối |
| `03_distribution/hinh_3_3_ho_so_khoi_nganh.png` | Giai đoạn 3 — Học phân phối |
| `04_synthetic/hinh_4_1_ga_hoi_tu.png` | Giai đoạn 4 — GA sinh dữ liệu |
| `04_synthetic/hinh_4_2_can_bang_lop.png` | Giai đoạn 4 — GA sinh dữ liệu |
| `04_synthetic/hinh_4_3_tong_hop_vs_that.png` | Giai đoạn 4 — GA sinh dữ liệu |
| `04_synthetic/hinh_4_4_giu_nguyen_diem_va_ty_le.png` | Giai đoạn 4 — GA sinh dữ liệu |
| `05_final/hinh_5_1_trong_so_nguon.png` | Giai đoạn 5 — Gộp & trọng số |
| `05_final/hinh_5_2_trong_so_lop.png` | Giai đoạn 5 — Gộp & trọng số |
| `05_final/hinh_5_3_co_cau_tap_huan_luyen.png` | Giai đoạn 5 — Gộp & trọng số |
| `06_validation/hinh_6_1_bon_phep_kiem_dinh.png` | Giai đoạn 6 — Kiểm định GA |
| `06_validation/hinh_6_2_pca_that_vs_tong_hop.png` | Giai đoạn 6 — Kiểm định GA |
| `07_model_ready/hinh_7_1_chuan_hoa_diem.png` | Giai đoạn 7 — Đặc trưng |
| `07_model_ready/hinh_7_2_chat_luong_dac_trung.png` | Giai đoạn 7 — Đặc trưng |
| `08_model/hinh_8_1_tim_sieu_tham_so.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_2_so_sanh_kien_truc.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_3_ablation.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_4_dong_gop_dac_trung.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_5_ket_qua_test.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_6_duong_roc_va_auc.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |
| `08_model/hinh_8_7_tong_hop_chi_so.png` | Giai đoạn 8 — Huấn luyện & Đánh giá |

---

## Cấu trúc thư mục

```
research/
├── data/
│   ├── raw/                     # Dữ liệu gốc (KHÔNG chỉnh sửa)
│   └── processed/
│       ├── TTTH_processed_flatten.csv
│       ├── 01_flatten/          # hình Giai đoạn 1
│       ├── 02_split/            # train/test + fold CV + taxonomy
│       ├── 03_distribution/     # trung bình + hiệp phương sai theo ngành
│       ├── 04_synthetic/        # dữ liệu GA (bản sản xuất + bản theo fold)
│       ├── 05_final/            # tập train đã gộp + trọng số
│       ├── 06_validation/       # báo cáo kiểm định GA
│       ├── 07_model_ready/      # X/y/w + mapping nhãn
│       └── 08_model/            # model, metrics, biểu đồ kết quả
└── notebooks/                   # ⭐ TOÀN BỘ LOGIC NẰM Ở ĐÂY
    ├── 01_Flatten_TTTH.ipynb
    ├── 02_tachtest.ipynb
    ├── 03_hocphanphoi.ipynb
    ├── 04_GA_sinhdata.ipynb
    ├── 05_gop_data.ipynb
    ├── 06_kiemdinhGA.ipynb
    ├── 07_chuan_bi_train.ipynb
    └── 08_train_xgboost.ipynb
```

---

## Cách chạy

```bash
conda activate Edutalk
pip install jupyter scikit-learn xgboost pandas numpy matplotlib scipy openpyxl
jupyter notebook
```

Chạy **Restart & Run All** lần lượt từ Giai đoạn 1 → 8. Mỗi notebook có sẵn lệnh `assert` kiểm tra
số dòng, tính hợp lệ của nhãn và **chặn rò rỉ dữ liệu** — nếu có gì sai, notebook dừng ngay tại đó.

Thời gian chạy tham khảo: Giai đoạn 4 ≈ 1 phút, Giai đoạn 8 ≈ 15 phút, các giai đoạn còn lại vài giây.

---

## Giới hạn cần nêu trong báo cáo

1. **Chỉ 574 phiếu khảo sát thật cho 39 ngành** (~15 phiếu/ngành). Đây là trần thật
   của bài toán, không kỹ thuật mô hình nào bù được. Hệ thống nên trình bày dạng **gợi ý Top-3/Top-5**
   thay vì khẳng định một ngành duy nhất.
2. **5 ngành** (Trí tuệ nhân tạo, Quản lý Công nghiệp, Logistics, Luật, Du lịch) **không có** trong
   15,888 hồ sơ trúng tuyển, phải mượn hồ sơ điểm của cùng khối ngành ⇒ độ tin cậy thấp hơn.
3. Chế độ Tự động bị **chặn trên bởi độ chính xác Tầng 1** (54.9%). Cải thiện Tầng 1 là
   hướng ưu tiên nếu muốn nâng chất lượng gợi ý.
4. **Khoảng cách train–validation lớn** (train 94.6% so với
   validation 16.9%) là hệ quả tất yếu khi chỉ có ~460 phiếu thật mang
   trọng số cao trong tập huấn luyện. Chỉ số báo cáo vẫn lấy trên VAL/TEST nên trung thực.
5. Dữ liệu tổng hợp chỉ bù **phần Likert/giới tính/mục tiêu** cho hồ sơ điểm thật — **không thay thế
   được** một cuộc khảo sát thật quy mô lớn.

## Việc còn lại

- `09_xai_shap.ipynb` — giải thích dự đoán bằng TreeSHAP (chưa làm).
- Nối model vào `backend/app/services/predict_service.py` (hiện trả điểm giả cứng, và bảng mã ngành
  còn lệch với `label_encoder_mapping.json`).
