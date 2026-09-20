# Báo cáo giai đoạn 01 → 05

> Chạy ngày 12/09/2026 · `conda activate Edutalk` · seed 42 · tổng thời gian ~25 giây
> Toàn bộ số trong tài liệu này đọc thẳng từ file kết quả, không con số nào gõ tay.

Cách chạy lại:

```bash
conda activate Edutalk
cd research/scripts
python g01.py && python g02.py && python g03.py && python g04.py && python g05.py
python chay.py 01 02 03 04 05
```

---

## 1. Tóm tắt

| Giai đoạn | Việc | Vào | Ra |
|---|---|---:|---:|
| **01** `LamSachKhaoSat` | lọc phiếu thiếu nỗ lực, dựng bảng ánh xạ | 766 phiếu | **676 phiếu** |
| **02** `ChuanBiTTTH` | lọc hồ sơ trúng tuyển, trải điểm ra 10 cột | 18.024 hồ sơ | **15.696 hồ sơ** |
| **03** `HocPhanPhoi` | học μ, Σ, P(Nam), P(mục tiêu) mỗi ngành | 676 phiếu | **39 phân phối** |
| **04** `GA_TangCuong` | sinh Likert cho toàn bộ hồ sơ TTTH | 15.696 + 5 ngành thiếu | **16.296 dòng × 2 bản** |
| **05** `KiemDinhGA` | chấm điểm hai bản, chọn bản dùng | 2 bản | **Gauss thắng** |

Sản phẩm: **17 hình · 9,3 MB** trong `research/data/processed/`.

---

## 2. Giai đoạn 01 — Làm sạch khảo sát

### Phễu lọc

```
Phiếu thu được                  766
Ngành khớp bảng chuẩn           766   (−0)
Bỏ phiếu thiếu nỗ lực (IER)     676   (−90)
Có ít nhất 1 môn điểm           676   (−0)
```

Còn **676 phiếu · 39/39 ngành · 9/9 nhóm**. Ngành ít phiếu nhất: 6. Nhiều nhất: 47.

### Cách lọc — quy trình IER ba chỉ số

| Chỉ số | Ngưỡng | Bắt được |
|---|---|---:|
| Longstring (chuỗi trả lời giống nhau liên tiếp dài nhất) | `≥ 10` | 90 |
| IRV (độ lệch chuẩn 10 câu của chính người đó) | `≤ 0` | 90 |
| Mahalanobis D² | `> χ²(10, p<.001) = 29,59` | 11 |

Loại khi vi phạm **≥ 2** chỉ số → **90 phiếu**. 90 phiếu đó bấm y hệt một nút cho cả 10
câu: 50 người toàn số 5, 24 người toàn số 3, 7 người toàn số 1.

### ⚠️ Điểm phải ghi đúng trong báo cáo

Với thang 10 câu, `IRV = 0` ⟺ cả 10 câu giống hệt nhau ⟺ `longstring = 10`. **Hai chỉ số
đầu là đồng nhất thức**, không phải hai phép đo độc lập cùng chỉ về một tập. Notebook có
`assert` chứng minh và in cảnh báo ngay lúc chạy.

Luật ≥2 ở đây làm đúng một việc: **chặn Mahalanobis loại phiếu một mình**. Diễn đạt đúng:

> Loại phiếu điền trùng cả 10 câu. Phiếu chỉ bất thường về Mahalanobis thì giữ lại, vì
> bất thường đa biến không đồng nghĩa với thiếu nỗ lực.

11 phiếu chỉ vướng Mahalanobis được giữ lại — họ trả lời rất phân biệt (`IRV` 1,47–1,90):

```
2 1 5 5 5 1 1 1 5 1    IRV = 1.90
1 3 1 1 1 1 4 4 5 2    IRV = 1.49
```

### Hai bằng chứng bảo vệ ngưỡng

**① Phân bố longstring gãy ở đúng giá trị tối đa** (hình 1.1):

```
 2 câu ████████████████████████████████ 239
 3 câu ██████████████████████████████   207
 4 câu █████████████                     83
 5 câu ███████                           47
 6 câu ████                              28
 7 câu ██                                15
 8 câu ███                               23
 9 câu █                                  7
10 câu ███████████████                   90   ← nhảy gấp 13 lần
```

**② Mô phỏng giả thuyết không, 200 lần.** Rút lại 10 câu của mỗi người độc lập theo phân
phối biên của từng câu:

| | Số phiếu có longstring = 10 |
|---|---:|
| Mô phỏng null | **0,0** (khoảng 0–1) |
| Quan sát thật | **90** |

Ngưỡng là **giá trị cực đại của thang đo** — không có tham số nào để tinh chỉnh, nên
không thể bị chất vấn là "chọn ngưỡng cho ra kết quả đẹp".

### Ra

`khaosat_sach.csv` · `bang_ier.csv` (cả 766 phiếu, tra ngược được từng trường hợp) ·
`mapping.json` (nguồn chuẩn cho 9 giai đoạn sau) · `bang_nganh.csv` · 2 hình.

---

## 3. Giai đoạn 02 — Chuẩn bị hồ sơ trúng tuyển

```
Hồ sơ trong file        18.024
   không trúng tuyển      −752
   mã ngành ngoài 39      −373
   tổ hợp D10             −963
   SBD trùng              −240
Hồ sơ dùng được        15.696   (87%)
```

**34/39 ngành có hồ sơ** — thiếu 5 ngành. Bảy tổ hợp: A00, A01, B00, D01, D07, D09, D15.
Mỗi hồ sơ đúng 3 môn có điểm, 7 môn để trống, cùng lược đồ 10 cột với khảo sát.

### So điểm hai nguồn

| Môn | TTTH (n) | TTTH (TB) | Khảo sát (n) | Khảo sát (TB) | Chênh |
|---|---:|---:|---:|---:|---:|
| Địa | 265 | 6,09 | 45 | 7,55 | −1,46 |
| Văn | 6.349 | 6,93 | 213 | 7,47 | −0,54 |
| Toán | 15.431 | 7,37 | 623 | 7,24 | +0,13 |
| Anh | 9.245 | 7,37 | 328 | 6,96 | +0,41 |

Chênh lớn nhất 1,46 điểm, cùng thang 10 — gộp chung vào một bảng huấn luyện là hợp lệ.

### Nguồn này thiếu gì

TTTH **không có** 10 câu Likert, giới tính, mục tiêu nghề nghiệp. Ba nhóm cột đó do
giai đoạn 04 sinh.

---

## 4. Giai đoạn 03 — Học phân phối từng ngành

Mỗi ngành học được: **μ(10) · Σ(10×10) · P(Nam) · P(mục tiêu × 4)**.

### Co ngót Bayes, K = 8

```
        n_ngành
w = ─────────────        μ_dùng = w·μ_ngành + (1−w)·μ_nhóm
     n_ngành + 8         Σ_dùng = w·Σ_ngành + (1−w)·Σ_nhóm
```

| | Ngành | Phiếu | Tin dữ liệu ngành |
|---|---|---:|---:|
| Ít nhất | Công nghệ kỹ thuật môi trường | 6 | **43%** |
| Nhiều nhất | Công nghệ thông tin | 47 | **85%** |

**0/39 ma trận Σ suy biến** — mọi Σ xác định dương, lấy mẫu được ở giai đoạn sau.

### ⚠️ Hạn chế

Chia train/test diễn ra ở Giai đoạn 7, nên ở đây chưa có fold để học riêng. Phân phối
học một lần từ **toàn bộ 676 phiếu**, trong đó có những phiếu sau này rơi vào tập test.

> Bộ sinh thấy toàn bộ khảo sát. Con số đo trên tập test ở Giai đoạn 10 vì vậy là trên
> dữ liệu mà bộ sinh đã thấy gián tiếp.

Đây là hệ quả trực tiếp của thiết kế "chia sau khi dựng xong bảng train final".

---

## 5. Giai đoạn 04 — Sinh dữ liệu

### Sinh cái gì, giữ nguyên cái gì

| Cột | Ở TTTH | Xử lý |
|---|---|---|
| Ngành trúng tuyển · tổ hợp · điểm 3 môn | ✅ thật | **giữ nguyên** |
| 10 câu Likert · giới tính · mục tiêu | ❌ không có | **sinh** |

### Kết quả

```
Dòng sinh ra           16.296
   từ hồ sơ TTTH thật  15.696
   bootstrap khảo sát     600   (5 ngành không có hồ sơ TTTH, 120 dòng/ngành)

Mỗi ngành: ít nhất 18 dòng · nhiều nhất 1.832 · trung vị 345
Nam: 43,9%  (khảo sát thật 44,4%)
```

Sinh **hai bản** để giai đoạn 05 chấm điểm:
- **Bản GA** — khởi tạo từ phiếu thật, lai ghép một điểm cắt, đột biến thay một câu
- **Bản Gauss** — lấy mẫu thẳng từ `N(μ, Σ)` rồi làm tròn về 1..5

Hàm thích nghi của GA bám **tập điển hình** chứ không bám đỉnh:

```
E[log p(x)] = −½ (d·log(2π) + log|Σ| + d)
fitness(x)  = −| log p(x) − E[log p(x)] |
```

Nếu dùng `log p(x)` thuần thì quần thể hội tụ về đúng vector trung bình.

### Một lỗi ngầm đã tránh

Cách viết ngây thơ `cap = ... if n_can % 2 == 0 else None` khiến ngành có **số dòng lẻ
không bao giờ lai ghép** — cả một toán tử bị tắt âm thầm, không báo lỗi. Ở đây ghép trên
phần chẵn, dòng lẻ cuối giữ nguyên.

---

## 6. Giai đoạn 05 — Kiểm định  ⭐ kết quả đáng chú ý nhất

### Bảng chấm điểm

| Phiên bản | KS đạt | Wasserstein | Năng lượng | **AUC** | |
|---|---:|---:|---:|---:|:--:|
| **Bản 1 — lấy mẫu Gauss** | **94%** | **0,110** | **0,024** | **0,636** | ⚠️ |
| Bản 2 — toán tử GA | 46% | 0,218 | 0,094 | 0,942 | ❌ |

**Bốn phép kiểm định cùng chỉ về một bản: Gauss thắng ở cả bốn.**

AUC 0,50 nghĩa là bộ phân biệt không tách nổi thật/giả. Bản GA đạt **0,942** — Random
Forest nhận ra dữ liệu giả gần như hoàn hảo.

### Vì sao GA thua

Không phải GA sai, mà là **GA sai quy mô**:

| Ngành | Phiếu thật làm kho gen | Dòng phải sinh | Tỉ lệ |
|---|---:|---:|---:|
| Kinh doanh quốc tế | 14 | 854 | **61×** |
| An toàn thông tin | 12 | 612 | **51×** |
| Quản trị kinh doanh | 22 | 991 | **45×** |

Trung vị **18,9×**, cao nhất **61×**. Quần thể GA lên tới 1.832 cá thể nhưng kho gen chỉ
có ≤47 bộ câu trả lời thật. Qua 40 thế hệ lai ghép một điểm cắt, cấu trúc liên hệ giữa
các câu bị xé nát — giữ 3 cá thể tinh hoa trên quần thể 1.832 là không đáng kể.

Gauss lấy mẫu **thẳng từ Σ** nên tương quan được bảo toàn theo định nghĩa. Đo trên 45 cặp
câu (hình 4.4 và 5.3): sai khác tuyệt đối trung bình so với ma trận tương quan thật —
**Gauss 0,020 · GA 0,130**.

### Kết luận ghi vào `ket_luan.json`

```json
{ "ban_thang": "Bản 1 — lấy mẫu Gauss",
  "file_dung": "ttth_co_likert_gauss.csv",
  "auc": 0.636, "ks_dat": 0.94,
  "dat_nguong_auc_060": false }
```

Giai đoạn 06 phải đọc file này và dùng `ttth_co_likert_gauss.csv`.

### ⚠️ AUC 0,636 vẫn chưa đạt ngưỡng 0,60

Bản thắng **vẫn bị tách được**. Dữ liệu sinh ra còn dấu vết nhân tạo. Ba hệ quả:

1. Phải nêu con số 0,636 trong báo cáo, không được bỏ qua.
2. Giai đoạn 09 bắt buộc phải có mốc đối chứng **"chỉ 676 phiếu thật, không dùng dữ liệu
   sinh"** — nếu mốc đó không thua kém thì dữ liệu sinh không đóng góp gì.
3. Con số 0,636 này còn là **cận trên lạc quan** — xem dưới.

### ⚠️ Cận trên lạc quan

Cách chấm chặt nhất là so với dòng thật mà bộ sinh **chưa từng thấy**. Ở đây bộ sinh
(Giai đoạn 03) đã thấy cả 676 phiếu đang dùng để chấm.

Nghĩa là: AUC cao thì chắc chắn tệ, nhưng **AUC thấp không chứng minh bản đó tốt trên dữ
liệu mới**.

---

## 7. Ba điều mang sang mục "Hạn chế của nghiên cứu"

1. **Hai chỉ số IER đầu là đồng nhất thức** ở ngưỡng cực đại, không phải hai phép đo độc
   lập. Luật ≥2 chỉ có tác dụng chặn Mahalanobis.
2. **Bộ sinh thấy toàn bộ 676 phiếu khảo sát.** Hệ quả trực tiếp của việc chia train/test
   sau khi dựng xong bảng train final.
3. **Dữ liệu sinh vẫn bị phát hiện được** (AUC 0,636 > 0,60), và con số đó còn lạc quan
   hơn thực tế.

---

## 8. Còn lại

| # | Giai đoạn | Việc |
|---|---|---|
| 06 | `TrainFinal` | gộp 676 phiếu thật + 16.296 dòng sinh → **16.972 dòng × 63 đặc trưng** (96,0% tổng hợp) |
| 07 | `TachTrainTest` | quét 4 tỉ lệ (70/30 · 80/20 · 85/15 · 90/10), chốt một tỉ lệ, CV 5×3 trên phần train |
| 08 | `MocChuan` | bốn mốc đối chứng — trong đó mốc **"chỉ dữ liệu thật"** là quan trọng nhất |
| 09 | `TinhChinh` | quét siêu tham số × β × `sample_weight`, ép khoảng cách train−val < 10 điểm |
| 10 | `ChotModel` | mô hình 2 tầng, mở tập test đúng một lần |

Mô hình 2 tầng: `P(ngành j) = P₁(nhóm g)^β × P₂(ngành j | nhóm g)`, tầng 1 có 9 lớp,
tầng 2 mỗi nhóm một mô hình.

Hai chỉ số phải theo dõi ở giai đoạn 09–10:
- **Đoán bừa Top-3 trong nhóm = 69,2%** — mọi con số Top-3 phải so với mốc này
- **Mất cân bằng 102× giữa các ngành** (18 dòng so với 1.832) — cần `sample_weight`
