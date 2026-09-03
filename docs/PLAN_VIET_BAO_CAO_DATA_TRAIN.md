# 📝 Kế Hoạch Viết Báo Cáo Khóa Luận — Phần Dữ Liệu → Huấn Luyện Mô Hình

> **Mục đích:** Hướng dẫn chi tiết cách viết các chương/mục trong báo cáo khóa luận tốt nghiệp liên quan đến pipeline xử lý dữ liệu và huấn luyện mô hình ML, dựa trên toàn bộ nội dung thực tế đã thực hiện qua 9 giai đoạn (9 notebooks + 32 hình + 16 file kết quả).

---

## 🗂️ Tổng quan: Bạn đã có gì sẵn?

| Loại tài nguyên | Số lượng | Chi tiết |
|---|:---:|---|
| Notebooks (toàn bộ logic) | **9** | `01_Flatten_TTTH` → `09_tinh_chinh_mo_rong` |
| Hình minh hoạ (220 DPI) | **32+2** | Lưu tại `data/processed/01_flatten/` → `09_tinh_chinh/` |
| File kết quả JSON/CSV | **16+** | `metrics_summary.json`, `ket_luan_kiem_dinh.json`, `ablation_*.csv`, v.v. |
| Báo cáo chi tiết (đã có sẵn) | **1** | `docs/BAOCAO_CHI_TIET_GD01_GD08.md` — 1.890 dòng, 45 bước |
| README tổng quan | **1** | `research/README.md` |

> [!IMPORTANT]
> File `BAOCAO_CHI_TIET_GD01_GD08.md` đã rất chi tiết (81KB, 1890 dòng) nhưng viết theo dạng **tài liệu kỹ thuật nội bộ** (markdown, emoji, bảng tra nhanh). Để đưa vào khóa luận cần **chuyển đổi sang văn phong học thuật** và **tổ chức lại theo cấu trúc chương/mục chuẩn**.

---

## 📖 Cấu Trúc Chương Đề Xuất Cho Báo Cáo

Dựa trên 9 giai đoạn pipeline, tổ chức thành **2 chương lớn**:

---

### 📗 CHƯƠNG 3: THU THẬP VÀ TIỀN XỬ LÝ DỮ LIỆU

> *Mục tiêu: Trình bày nguồn gốc, quy trình làm sạch, phương pháp chia dữ liệu, và chiến lược tăng cường dữ liệu.*

#### 3.1. Nguồn dữ liệu

**Nội dung cần viết:**
- Giới thiệu 2 nguồn dữ liệu:
  - **Nguồn 1 — Hồ sơ trúng tuyển THPT:** 18.024 hồ sơ xét tuyển thật từ hệ thống tuyển sinh HUIT, chứa điểm thi 3 môn theo tổ hợp + mã ngành trúng tuyển. **Thiếu** hoàn toàn phần sở thích, giới tính, mục tiêu.
  - **Nguồn 2 — Phiếu khảo sát sinh viên:** 766 phiếu khảo sát (trước lọc), có **đầy đủ** cả điểm thi, tên ngành, 10 câu sở thích Likert 1–5, giới tính, mục tiêu.
- Bảng so sánh hai nguồn (nguồn nào có gì, thiếu gì) — trích từ Bước 4 trong báo cáo chi tiết.
- Giải thích tại sao cần **cả hai**: nguồn 1 đông nhưng thiếu sở thích; nguồn 2 đủ nhưng ít.

**File tham chiếu:**
- `data/raw/TTTH_THPT_Cleaned.xlsx`
- `data/raw/khao_sat_dinh_huong_nganh_hoc_clean.csv`

---

#### 3.2. Tiền xử lý hồ sơ trúng tuyển (Giai đoạn 1)

**Nội dung cần viết:**
- **4 bước lọc tuần tự** (phễu): Giữ hồ sơ trúng tuyển → Loại tổ hợp D10 → Đổi 3 mã ngành cũ → Giữ 39 ngành.
  - Bảng phễu: 18.024 → 17.272 → 16.309 → 16.250 → **15.888** (giữ 88,1%).
- **Làm phẳng điểm thi:** Biến cột `M1/M2/M3` thành 10 cột `diem_<Môn>` theo bảng tra 15 tổ hợp. **Quyết định quan trọng:** để trống ô không thi (không điền 0), vì XGBoost xử lý missing values riêng.
- **Thống kê mô tả:** Bảng điểm trung bình, ĐLC, tỷ lệ thiếu 10 môn (Toán 1,7% → Tin 100%). Nhận xét: mặt bằng chênh > 1 điểm (Sử 7,45 vs Địa 6,09) → căn cứ cho chuẩn hoá ở GĐ7.
- **Phân bố theo ngành:** Mất cân bằng 98 lần (CNTT 1.866 vs CN vật liệu 19). 5/39 ngành **không có dữ liệu**.
- **Đối chiếu tổ hợp hai nguồn:** TTTH 7 tổ hợp, khảo sát 15 → 8 tổ hợp chỉ ở khảo sát (122/766 = 15,9%).
- **Kiểm tra tự động:** 4 assert.

**Hình sử dụng:**

| Hình | Tên file | Ý nghĩa |
|---|---|---|
| Hình 3.1 | `hinh_1_1_pheu_lam_sach.png` | Phễu lọc 4 bước, ghi rõ số hồ sơ còn lại từng bước |
| Hình 3.2 | `hinh_1_2_thieu_diem_theo_mon.png` | Tỷ lệ thiếu điểm từng môn, thanh ngang tô màu mức nghiêm trọng |
| Hình 3.3 | `hinh_1_3_phan_bo_diem.png` | Hộp phân bố điểm từng môn + biểu đồ tần suất điểm TB |
| Hình 3.4 | `hinh_1_4_ho_so_theo_39_nganh.png` | 39 ngành, 5 ngành trống gạch chéo kèm "KHÔNG CÓ DỮ LIỆU" |
| Hình 3.5 | `hinh_1_5_khoi_nganh_va_diem.png` | Phân bố 7 khối + mặt bằng điểm theo khối |
| Hình 3.6 | `hinh_1_6_lech_phan_phoi_to_hop.png` | Cột kép so tỷ lệ tổ hợp hai nguồn, nền vàng 8 tổ hợp chỉ ở khảo sát |

---

#### 3.3. Tiền xử lý dữ liệu khảo sát và chia tập (Giai đoạn 2)

**Nội dung cần viết:**
- **Bảng taxonomy 39 ngành → 7 khối ngành** (lưu `nganh_khoi_mapping.json`).
- **Lọc phiếu straight-lining:** 90/766 phiếu bị loại (11,7%). Tiêu chí: cả 10 câu cùng giá trị HOẶC ĐLC ≤ 0,3. Còn **676 phiếu sạch, đủ 39 ngành**.
  - Lọc trước khi tách vì phép lọc xét từng dòng riêng lẻ → không gây rò rỉ.
- **Thống kê khảo sát:** 10 câu Likert (TB, ĐLC), giới tính (Nữ 55,6%), mục tiêu (Đi làm 67,3%).
- **Chia 85/15 phân tầng:** 574 train + 102 test, đủ 39 ngành cả hai tập, 0 trùng.
- **Cross-Validation:** RepeatedStratifiedKFold(5 × 3) = 15 lần đo. Fold lưu file.

**Hình sử dụng:**

| Hình | Tên file | Ý nghĩa |
|---|---|---|
| Hình 3.7 | `hinh_2_1_loc_phieu_dien_dai.png` | So 6 phiếu loại (đường đỏ phẳng) vs 6 phiếu tốt (đường xanh) |
| Hình 3.8 | `hinh_2_2_phan_bo_likert.png` | Cột chồng 5 mức từng câu + trung bình có thanh sai số |
| Hình 3.9 | `hinh_2_3_nhan_khau_hoc.png` | Giới tính, mục tiêu, phân bố 15 tổ hợp |
| Hình 3.10 | `hinh_2_4_phan_bo_train_test.png` | So train/test theo 7 khối + 39 ngành |
| Hình 3.11 | `hinh_2_5_thiet_ke_cross_validation.png` | Sơ đồ 5 fold, 3 vùng: tổng hợp (lá), train thật (xanh), val thật (cam) |

---

#### 3.4. Tăng cường dữ liệu bằng thuật toán di truyền (GĐ 3 + 4)

**3.4.1. Học phân phối sở thích theo ngành (GĐ3)**

**Nội dung:**
- Mục tiêu: *"SV ngành X thường trả lời 10 câu sở thích thế nào?"*
- **Bayesian Shrinkage:** μ_ngành = (n·x̄_ngành + K·μ_khối)/(n + K), K=10. Ngành 5 mẫu → mượn 66,7%; ngành 40 mẫu → 20%.
- Giữ ma trận hiệp phương sai 10×10. Hệ số tương quan cao: Thí nghiệm ↔ Môi trường = 0,615. Sai lệch: 0,033.
- Học riêng 15 bộ theo fold (chống rò rỉ). 39/39 ma trận xác định dương.

**3.4.2. Thuật toán di truyền sinh dữ liệu (GĐ4)**

**Nội dung:**
- Ghép 10 câu sở thích (GA sinh) vào 15.888 hồ sơ TTTH có điểm thật.
- Thiết kế GA: **cá thể = CẢ BỘ dữ liệu n×10**, quần thể 10, đấu loại 3, lai ghép theo dòng, đột biến thay 6% dòng mới.
- **GA vs lấy mẫu thường:** Giảm sai lệch 55,2% (chọn lọc 22,5% + tiến hoá 42,2%).
- **Đối chứng đột biến:** Sửa ô ±1 → tiến hoá = 0% (phá quan hệ); Thay dòng mới → 42,2%.
- **Cân bằng lớp:** Trần 600, sàn 150 → 98× → 4×. 5 ngành trống mượn điểm cùng khối.
- **Kết quả:** 13.796 dòng. Điểm thi giữ nguyên 100%.

**Hình sử dụng:**

| Hình | Tên file | Ý nghĩa |
|---|---|---|
| Hình 3.12 | `hinh_3_1_bayesian_shrinkage.png` | Quan hệ số mẫu ↔ mức mượn + ví dụ trước/sau co ngót |
| Hình 3.13 | `hinh_3_2_ma_tran_tuong_quan.png` | Ba ma trận: thật · đã học · nếu làm sai |
| Hình 3.14 | `hinh_3_3_ho_so_khoi_nganh.png` | Bản đồ nhiệt 7 khối + radar 4 khối tiêu biểu |
| Hình 3.15 | `hinh_4_1_ga_hoi_tu.png` | Đường hội tụ GA + tách đóng góp "chọn lọc" vs "tiến hoá" |
| Hình 3.16 | `hinh_4_2_can_bang_lop.png` | 39 ngành trước/sau cân bằng, vạch trần 600 / sàn 150 |
| Hình 3.17 | `hinh_4_3_tong_hop_vs_that.png` | Trung bình từng câu (thật vs GA) + ma trận quan hệ |
| Hình 3.18 | `hinh_4_4_giu_nguyen_diem_va_ty_le.png` | Phân bố điểm thi trùng khít tổng hợp vs TTTH gốc |

---

#### 3.5. Gộp dữ liệu, trọng số và kiểm định (GĐ 5 + 6)

**3.5.1. Gộp + trọng số (GĐ5)**
- 574 thật + 13.796 tổng hợp = **14.370 dòng**.
- w_thật = 24,03 → tổng ảnh hưởng 50/50.
- w_lớp dùng căn bậc hai → chênh lệch 5,8× → 2,4×.
- w_cuối = w_nguồn × w_lớp → min 0,361, max 20,86.

**3.5.2. Kiểm định dữ liệu tổng hợp (GĐ6)**
- So với dòng thật **out-of-fold**, khớp tỷ lệ ngành.
- 4 phép kiểm định + đối chứng:

| Phép | Đang dùng | Đối chứng | Ngưỡng |
|---|---|---|---|
| KS-test | **10/10** | 10/10 | ≥ 7/10 |
| Sai lệch tương quan | **0,0306** | 0,2306 | < 0,10 |
| Energy distance | **0,0147** | 0,0449 | < 0,05 |
| AUC thật/giả | **0,620** | 0,815 | < 0,65 |

**→ ĐẠT CHUẨN cả 4.** Lưu ý: KS-test không đủ sức phân biệt → cần phép 2,3,4.

**Hình sử dụng:**

| Hình | Tên file | Ý nghĩa |
|---|---|---|
| Hình 3.19 | `hinh_5_1_trong_so_nguon.png` | Hai biểu đồ tròn: số dòng vs ảnh hưởng |
| Hình 3.20 | `hinh_5_2_trong_so_lop.png` | Tổng ảnh hưởng 39 ngành trước/sau; chênh lệch thu hẹp |
| Hình 3.21 | `hinh_5_3_co_cau_tap_huan_luyen.png` | Phân bố khối, trọng số, tỷ lệ thật/ngành |
| Hình 3.22 | `hinh_6_1_bon_phep_kiem_dinh.png` | 4 panel, 1 phép/panel, có thanh đối chứng |
| Hình 3.23 | `hinh_6_2_pca_that_vs_tong_hop.png` | PCA 10 chiều → 2 chiều |

---

### 📘 CHƯƠNG 4: HUẤN LUYỆN VÀ ĐÁNH GIÁ MÔ HÌNH

#### 4.1. Xây dựng đặc trưng (GĐ7)

**Nội dung:**
- **z-score:** Tính từ train, áp test → không rò rỉ.
- **43 đặc trưng:**
  - 10 Likert (giữ nguyên) + 10 điểm thô (giữ trống) + 3 z-score (TB, max, min)
  - 2 nhân khẩu + 15 one-hot tổ hợp + 3 nhóm tổ hợp
- **Mã hoá nhãn:** Bảng cố định 39 → 0–38, ma trận 39×7.
- **Kiểm tra rò rỉ:** 3 tầng → đặc trưng mạnh nhất chỉ 32,9% (mốc 27,4%) → **0 rò rỉ**.

**Hình:** `hinh_7_1_chuan_hoa_diem.png` + `hinh_7_2_chat_luong_dac_trung.png`

---

#### 4.2. Kiến trúc XGBoost 2 tầng

**Nội dung:**
- Input → Tầng 1 (7 khối, P₁) + Tầng 2 (39 ngành, P₂) → `P(ngành) ∝ P₂(ngành) × P₁(khối)^β`, β=0,6.
- 2 chế độ: Khám phá (dùng P₁ dự đoán) vs Tư vấn (người dùng chọn khối, P₁=1).

---

#### 4.3. Quy trình huấn luyện

**Nội dung:**
- CV 15 fold, VAL chỉ thật, tổng hợp chỉ TRAIN (sinh riêng/fold).
- Baseline: phổ biến nhất (Top-3 = 17,4%), đoán bừa (7,7%).
- Random search 14 cấu hình/tầng + early stopping.
- So sánh kiến trúc: 2 tầng (β=0,6) thắng phẳng ở mọi chỉ số.
- Overfitting: train 94,6% vs val 16,9% → khoảng cách 77,7%.

**Hình:** `hinh_8_1_tim_sieu_tham_so.png` + `hinh_8_2_so_sanh_kien_truc.png`

---

#### 4.4. Thí nghiệm ablation

**4.4.1. Dữ liệu tổng hợp có ích không?**

| Chỉ số | Chỉ thật | + Tổng hợp | Thay đổi |
|---|---|---|---|
| Ngành Top-1 | 17,4% | 18,6% | **+7,0%** |
| **macro-F1** | 0,122 | 0,144 | **+17,7%** |

→ Giúp nhiều nhất cho **ngành hiếm**.

**4.4.2. Đóng góp nhóm đặc trưng**

> [!WARNING]
> Đây là THÍ NGHIỆM phòng lab. Ứng dụng thật **luôn dùng cả 43 đặc trưng** (10 câu sở thích BẮT BUỘC).

**Đóng góp riêng của 10 câu sở thích:**

| Chỉ số | Bỏ sở thích | Đủ 43 | Mức tăng |
|---|---|---|---|
| Top-3 | 25,6% | **36,1%** | **+10,4 điểm** |
| macro-F1 | 0,079 | 0,134 | **+71%** |

→ Trả lời câu hỏi *"10 câu hỏi có bõ công?"* → **CÓ, tăng 1/3 chất lượng gợi ý.**

**Hình:** `hinh_8_3_ablation.png` + `hinh_8_4_dong_gop_dac_trung.png`

---

#### 4.5. Kết quả trên tập test (102 SV thật)

> [!CAUTION]
> Tập test mở đúng **1 lần**, 102 SV chưa từng xuất hiện trước đó.

**Tầng 1 — Khối ngành:** Top-1 = **54,9%** | Top-3 = **86,3%** | macro-F1 = 0,456

**Tầng 2 — Tự động (⭐ năng lực thật):**

| Chỉ số | Giá trị | Gấp đoán bừa |
|---|---|---|
| Top-1 | **17,6%** | 6,9× |
| **Top-3** | **39,2%** | **5,1×** |
| Top-5 | **52,9%** | 4,1× |
| AUC-ROC | **0,844** | |

**Cách diễn giải:** *"Hiển thị 3 gợi ý → ~4/10 HS thấy đúng ngành. Gấp 5,1 lần đoán bừa."*

> [!IMPORTANT]
> **KHÔNG ĐƯỢC dùng 69,6% (chế độ tư vấn) làm độ chính xác hệ thống** — nó giả định người dùng đã tự chọn đúng khối.

**3 điều AUC lộ ra:**
1. Ngành đúng nằm trung vị **thứ 5/39** → xếp hạng tốt hơn vẻ ngoài Top-1.
2. 2 tầng (AUC 0,844) > phẳng (0,821) dù Top-1 thua.
3. Nhưng 25/39 ngành F1=0 — phải nêu song song.

**Hình:** `hinh_8_5_ket_qua_test.png` + `hinh_8_6_duong_roc_va_auc.png` + `hinh_8_7_tong_hop_chi_so.png`

---

#### 4.6. Tinh chỉnh mở rộng (GĐ9)

- Mở rộng 200 cấu hình (so 28 ở GĐ8).
- Quét trọng số nguồn 1×–96×, tốt nhất = 48×.
- **Kết quả:** Cải thiện rất nhỏ: Tầng 1 +0,34%, Tầng 2 +0,83%.
- **Kết luận:** Giới hạn ở **dữ liệu**, không phải siêu tham số.

**Hình:** `hinh_9_1_do_rong.png` + `hinh_9_2_trong_so_nguon.png`

---

## 📕 PHẦN THẢO LUẬN

### 5 điểm mạnh

1. **Chống rò rỉ triệt để:** Test tách đầu, mở 1 lần; tổng hợp chỉ vào train; sinh riêng 15 bộ/fold; đặc trưng không chứa nhãn.
2. **Mọi khẳng định đều đo:** 2 kiểu đột biến, 2 cách sinh, 6 nhóm đặc trưng — tất cả có bảng đối chứng.
3. **30 lệnh `assert`** dừng ngay khi sai.
4. **Bộ chỉ số đầy đủ:** Accuracy + macro-F1 + balanced accuracy + AUC-ROC.
5. **Báo cáo trung thực:** Tách bạch 2 chế độ; nêu 25/39 ngành F1=0.

### 10 hạn chế

| # | Hạn chế | Mức |
|:---:|---|:---:|
| 1 | Mẫu khảo sát là **SV đang học**, không phải HS THPT đang chọn ngành | 🔴 |
| 2 | Chỉ 574 phiếu thật cho 39 ngành (~15/ngành) | 🔴 |
| 3 | 25/39 ngành F1 = 0 | 🔴 |
| 4 | 5/39 ngành không có hồ sơ điểm thật | 🟠 |
| 5 | Khoảng cách train/val 77,7% (overfitting) | 🟠 |
| 6 | Ngành hiếm chỉ 1 phiếu test | 🟠 |
| 7 | Loại 11,7% phiếu khảo sát | 🟠 |
| 8 | AUC phân biệt 0,620 chưa lý tưởng (0,50) | 🟡 |
| 9 | Lệch tổ hợp giữa hai nguồn | 🟡 |
| 10 | Nhiều tham số chọn theo kinh nghiệm | 🟡 |

---

## 📋 Checklist Khi Viết

- [ ] Đánh số hình liên tục trong khóa luận (Hình 3.1, 3.2, ..., 4.1, ...)
- [ ] Mỗi hình có **caption** mô tả rõ
- [ ] Bảng quan trọng đặt số hiệu
- [ ] Mọi con số lấy từ `metrics_summary.json` — **không gõ tay**
- [ ] Công thức toán viết LaTeX
- [ ] Trích nguồn dữ liệu (HUIT, Phòng Tuyển sinh)
- [ ] Phân biệt: "chế độ tự động" vs "chế độ tư vấn" vs "thí nghiệm ablation"
- [ ] Nêu đầy đủ 10 hạn chế trong Thảo luận
- [ ] Đề xuất: Thu thập thêm dữ liệu, cải thiện Tầng 1, thêm SHAP

---

## 🗺️ Bản Đồ 34 Hình → Vị Trí Trong Báo Cáo

| Chương | Mục | Số hình |
|---|---|:---:|
| 3.2 Tiền xử lý TTTH | GĐ1 | 6 |
| 3.3 Chia tập | GĐ2 | 5 |
| 3.4 Tăng cường dữ liệu | GĐ3 + GĐ4 | 7 |
| 3.5 Gộp + Kiểm định | GĐ5 + GĐ6 | 5 |
| 4.1 Đặc trưng | GĐ7 | 2 |
| 4.3–4.4 Huấn luyện + Ablation | GĐ8 (đầu) | 4 |
| 4.5 Kết quả test | GĐ8 (cuối) | 3 |
| 4.6 Tinh chỉnh | GĐ9 | 2 |
| **Tổng** | | **34** |

---

## 📂 Ý Nghĩa File Output Quan Trọng

| File | Nằm ở | Ý nghĩa |
|---|---|---|
| `TTTH_processed_flatten.csv` | `processed/` | 15.888 hồ sơ đã làm phẳng, 12 cột |
| `nganh_khoi_mapping.json` | `02_split/` | Bảng taxonomy 39 ngành → 7 khối, TOÀN pipeline dùng |
| `cv_folds_real.json` | `02_split/` | Chỉ số fold cho 15 lần CV, giữ cố định cho mọi thí nghiệm |
| `khaosat_train.csv` | `02_split/` | 574 phiếu train sạch |
| `khaosat_test_KHONG_DUNG_TOI.csv` | `02_split/` | 102 phiếu test — KHOÁ, mở đúng 1 lần ở GĐ8 |
| `phan_phoi_theo_nganh.json` | `03_distribution/` | 39 phân phối (μ, Σ) đã co ngót |
| `phan_phoi_theo_fold.json` | `03_distribution/` | 15 bộ phân phối riêng theo fold |
| `synthetic_GA_data.csv` | `04_synthetic/` | 13.796 dòng tổng hợp (bản chính) |
| `synthetic_per_fold.npz` | `04_synthetic/` | 15 bộ tổng hợp theo fold (742 KB nén) |
| `train_final.csv` | `05_final/` | 14.370 dòng đã gộp + trọng số |
| `bao_cao_kiem_dinh_GA.csv` | `06_validation/` | Chi tiết 4 phép kiểm định |
| `ket_luan_kiem_dinh.json` | `06_validation/` | Kết luận: ĐẠT / KHÔNG ĐẠT |
| `X_train.csv` / `X_test.csv` | `07_model_ready/` | Ma trận đặc trưng 43 cột |
| `label_encoder_mapping.json` | `07_model_ready/` | Bảng mã nhãn 39 ngành → số |
| `model_stage1_khoinganh.json` | `08_model/` | Mô hình XGBoost Tầng 1 (~1,9 MB) |
| `model_stage2_nganh.json` | `08_model/` | Mô hình XGBoost Tầng 2 (~9,7 MB) |
| `metrics_summary.json` | `08_model/` | **Toàn bộ** số liệu kết quả (nguồn chính cho báo cáo) |
| `cv_results.csv` | `08_model/` | Kết quả CV 15 fold |
| `ablation_du_lieu_tong_hop.csv` | `08_model/` | So sánh có/không tổng hợp |
| `ablation_nhom_dac_trung.csv` | `08_model/` | So sánh 6 nhóm đặc trưng |
| `topk_kich_ban_trien_khai.json` | `08_model/` | Top-K cho 2 chế độ triển khai |
| `ket_luan_tinh_chinh.json` | `09_tinh_chinh/` | Kết luận GĐ9: cải thiện nhỏ, bottleneck ở dữ liệu |
