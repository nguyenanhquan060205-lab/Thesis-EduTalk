# Kế hoạch `research/` — hai hướng dựng dữ liệu huấn luyện, mô hình 2 tầng

> Trạng thái: **đã chốt**. Chưa viết dòng code nào.

Hai hướng khác nhau **đúng một biến**: sau khi dựng xong bảng huấn luyện hoàn chỉnh thì
gộp cả hai nguồn rồi mới chia, hay giữ chúng tách rời. Mọi thứ khác giữ y hệt.

**Luật xuyên suốt: chia train/test ở giai đoạn 07, SAU khi bảng train final đã dựng xong.**

```
01 → 02 → 03 → 04 → 05  ═══ CHUNG, chạy MỘT LẦN cho cả hai hướng ═══
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
  huong1/ 06 → 10        huong2/ 06 → 10
```

Giai đoạn 01–05 giống hệt nhau ở cả hai hướng, nên chạy chung đúng một lần. Vừa tiết
kiệm ~1 giờ GA, vừa **bảo đảm hai hướng nhận đầu vào giống nhau từng byte** — điều kiện
bắt buộc của một thí nghiệm có đối chứng.

---

## 0. Phần dùng chung

### 0.1 Hai nguồn dữ liệu

| | TTTH | Khảo sát |
|---|---|---|
| File | `data/raw/TTTH_THPT_raw.xlsx` | `data/raw/khao_sat_dinh_huong_nganh_hoc_raw.csv` |
| Dòng gốc | 18.024 | 766 |
| Sau lọc | **15.696** | **676** |
| Điểm thi · tổ hợp | ✅ thật | ✅ thật |
| Likert sở thích | ❌ **không có** → GA sinh | ✅ thật, 10 câu |
| Nhãn | ngành **trúng tuyển** | ngành **mong muốn** |

### 0.2 Chín nhóm ngành

Dùng lại `research3/…/01_LamSachKhaoSat/mapping.json`, đã chép sang
`chung/data/processed/01_LamSachKhaoSat/mapping.json`.

| Nhóm | Số ngành |
|---|---:|
| Thực phẩm, Sinh học & Môi trường | 7 |
| Du lịch, Khách sạn & Ẩm thực | 6 |
| CNTT & Máy tính | 4 |
| Kinh doanh & Marketing | 4 |
| Cơ khí - Điện - Tự động hoá | 4 |
| Hoá - Vật liệu - Dệt may | 4 |
| Luật & Ngôn ngữ | 4 |
| Tài chính & Kế toán | 3 |
| Logistics & Quản lý sản xuất | 3 |

**Vì sao 9 nhóm chứ không phải 14 khoa thật của HUIT:** đã dựng thử bảng 14 khoa theo
đúng thứ tự đề án tuyển sinh và đo hệ quả:

| | 9 nhóm (chọn) | 14 khoa thật |
|---|--:|--:|
| Đoán bừa Top-1 trong nhóm | **23,1%** | 35,9% |
| Đoán bừa Top-3 trong nhóm | **69,2%** | 87,2% |
| Ngành nằm ở nhóm ≤ 3 ngành | 6/39 = 15% | 25/39 = **64%** |

Với 14 khoa thì **64% số ngành nằm trong khoa có ≤3 ngành** → Top-3 tự đúng 100% không
cần mô hình, và đoán bừa vọt lên 87,2%. Chỉ số mất hết sức phân biệt. Chín nhóm giữ
đoán bừa ở 69,2%, và **so trực tiếp được với `research3/` (86,3%)**.

> Bảng 14 khoa đã dựng và kiểm chứng từ trang của từng khoa. Giữ lại làm phụ lục nếu
> hội đồng hỏi *"sao không dùng khoa thật"* — câu trả lời có số đỡ lưng.

### 0.3 Sáu mươi ba đặc trưng

| Nhóm | Số cột | Ghi chú |
|---|---:|---|
| Likert thô | 10 | thật (khảo sát) hoặc do GA sinh (TTTH) |
| Likert chuẩn hoá theo người `ips_*` | 10 | `giá trị − trung bình của chính người đó` |
| Thống kê Likert | 2 | `likert_tb`, `likert_dolech` |
| Điểm thi thô | 10 | |
| Điểm z theo từng môn | 10 | |
| Phái sinh từ điểm | 4 | `diem_tb`, `diem_lech`, `z_max`, `diem_to_hop` |
| Tổ hợp one-hot | 15 | |
| Giới tính · mục tiêu | 2 | |

**Bẫy đã dính một lần:** `ips_*` là **trừ trung bình, KHÔNG chia độ lệch**. `diem_lech`
tính trên **điểm thô**, không phải điểm z. Lệch một hằng số thì mô hình vẫn chạy, vẫn
trả kết quả trông hợp lý, và sai âm thầm.

### 0.4 Làm sạch khảo sát — quy trình phát hiện trả lời thiếu nỗ lực (IER)

Không dùng luật tự chế kiểu `std == 0`. Dùng quy trình chuẩn của đo lường khảo sát:
**ba chỉ số độc lập, loại khi vi phạm ít nhất hai.**

| Chỉ số | Định nghĩa | Ngưỡng | Bắt được gì |
|---|---|---|---|
| **Longstring** | chuỗi trả lời giống nhau **liên tiếp** dài nhất | `≥ 10` | bấm một nút từ đầu tới cuối |
| **IRV** | độ lệch chuẩn 10 câu của chính người đó | `≤ 0` | không phân biệt giữa các câu |
| **Mahalanobis D²** | khoảng cách đa biến tới vector trung bình | `> χ²(10, p<.001) = 29,59` | mẫu trả lời bất thường |

Luật `≥ 2 trên 3` để **giảm dương tính giả** — một chỉ số đơn lẻ luôn bắt nhầm người
trả lời thật nhưng khác thường.

#### Đã đo trên 766 phiếu thật

| | Số phiếu bị bắt |
|---|---:|
| Longstring ≥ 10 | 90 |
| IRV ≤ 0 | 90 |
| Mahalanobis D² > 29,59 | 11 |
| **Vi phạm ≥ 2 chỉ số → LOẠI** | **90** |
| Chỉ vi phạm 1 chỉ số → **giữ** | 11 |
| | **766 − 90 = 676** |

> ⚠️ **Đính chính, phải ghi đúng trong báo cáo.** Với thang 10 câu, `IRV = 0` ⟺ cả 10 câu
> giống hệt nhau ⟺ `longstring = 10`. Hai chỉ số đầu là **đồng nhất thức**, không phải hai
> phép đo độc lập cùng chỉ về một tập. Nói "ba chỉ số hội tụ" là overclaim.
>
> Luật ≥2 ở đây thực chất làm đúng một việc: **chặn Mahalanobis loại phiếu một mình**.
> Diễn đạt đúng: *"Loại phiếu điền trùng cả 10 câu. Phiếu chỉ bất thường về Mahalanobis
> thì giữ lại, vì bất thường đa biến không đồng nghĩa với thiếu nỗ lực."*
>
> Notebook có `assert` chứng minh hai tập trùng khít, và in cảnh báo ngay lúc chạy.
>
> Đổi lại, ngưỡng là **giá trị cực đại của thang đo** — không có tham số nào để tinh
> chỉnh, nên không ai cãi được là chọn ngưỡng cho ra kết quả đẹp. Nới ngưỡng cho ba chỉ
> số thật sự độc lập (`longstring ≥ 8`, `IRV ≤ 0,3`) thì loại 103 phiếu, và ngưỡng trở
> thành lựa chọn chủ quan.

11 phiếu chỉ vướng Mahalanobis là người trả lời thật nhưng mẫu khác thường (`IRV`
1,47–1,90) — luật ≥2 giữ họ lại:

```
2 1 5 5 5 1 1 1 5 1    IRV = 1.90   ← phân biệt rất rõ, giữ
1 3 1 1 1 1 4 4 5 2    IRV = 1.49
```

#### Hai bằng chứng để phản biện

**① Phân bố longstring gãy ở đúng giá trị tối đa.**

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

Giảm đơn điệu từ 2 tới 9 rồi vọt lên ở đúng mức 10. Biến thể tự nhiên không tạo bậc
thang như vậy.

**② Mô phỏng giả thuyết không (200 lần).**

Rút lại 10 câu của mỗi người **độc lập** theo phân phối biên của từng câu:

| | Số phiếu có longstring = 10 |
|---|---:|
| Mô phỏng null (trung bình 200 lần) | **0,0** (khoảng 0–1) |
| **Quan sát thật** | **90** |

#### Vì sao phải loại — hệ quả kỹ thuật

`ips_x = likert_x − trung bình 10 câu của chính người đó`. Người điền toàn 5 và người
điền toàn 1 đều cho `ips_* = 0` ở **cả 10 cột** — hai người ngược hẳn nhau mà mô hình
nhìn thấy trùng nhau ở 10 trong 63 đặc trưng.

Quan trọng hơn: **90 phiếu = 11,8% khảo sát**, mà khảo sát là **nguồn duy nhất** GA học
để sinh Likert cho 15.696 dòng TTTH. Giữ lại thì sai lệch lan sang 95,9% dữ liệu huấn luyện.

#### Nguồn tham khảo

- Meade & Craig (2012), *Identifying careless responses in survey data*, **Psychological Methods** 17(3)
- Curran (2016), *Methods for the detection of carelessly invalid responses in survey data*, **JESP** 66
- Johnson (2005), **JRP** 39(1) — longstring
- Dunn và cộng sự (2018), **JBP** 33(1) — IRV

> Kiểm lại số trang trước khi trích dẫn chính thức.

### 0.5 Mô hình 2 tầng

```
                   63 đặc trưng
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
  TẦNG 1  XGBoost multi:softprob   TẦNG 2  mỗi nhóm một XGBoost
          9 lớp = 9 nhóm ngành             k lớp = số ngành trong nhóm
        │  P₁(nhóm g)                   │  P₂(ngành j | nhóm g)
        └───────────────┬───────────────┘
                        ▼
            P(ngành j) = P₁(g)^β × P₂(j | g)
```

`β` quét ở giai đoạn 09. `β = 1` là tích thường; `β < 1` làm nhẹ ảnh hưởng của tầng 1
khi nó đoán nhóm sai. Nhóm có 1 ngành thì bỏ tầng 2, gán `P₂ = 1`.

### 0.6 Hai chế độ phục vụ — báo cáo cả hai

| Chế độ | Tình huống | Cách tính | Đoán bừa Top-3 |
|---|---|---|---:|
| **Tư vấn** | thí sinh đã chọn nhóm | chỉ tầng 2 trong nhóm đó | **69,2%** |
| **Khám phá** | không biết nhóm | tích hai tầng trên đủ 39 ngành | **7,7%** |

Báo cáo Top-1/2/3/5 cho cả hai chế độ, **mỗi con số kèm cột đoán bừa**.

Mốc `research3/` để đối chiếu: **tư vấn Top-3 = 86,3%** · **khám phá Top-3 = 35,3%**.

### 0.7 Bố trí thư mục

```
research/
├── data/raw/                       2 file gốc, dùng chung
│     TTTH_THPT_raw.xlsx
│     khao_sat_dinh_huong_nganh_hoc_raw.csv
├── chung/                          ── GIAI ĐOẠN 01–05, CHẠY MỘT LẦN ──
│   ├── data/processed/01_LamSachKhaoSat/   ← mapping.json đã có sẵn
│   │                  02_ChuanBiTTTH/
│   │                  03_HocPhanPhoi/
│   │                  04_GA_TangCuong/
│   │                  05_KiemDinhGA/
│   ├── notebooks/   scripts/
├── huong1/                         ── GIAI ĐOẠN 06–10 ──
│   ├── data/processed/06_TrainFinal/  07_TachTrainTest/  08_MocChuan/
│   │                  09_TinhChinh/    10_ChotModel/
│   ├── notebooks/  scripts/  models/  docs/
├── huong2/                         (y hệt huong1)
└── so_sanh/                        bảng đối chiếu cuối cùng
```

`chung/scripts/chung.py` giữ **một bản duy nhất** hàm dựng đặc trưng và hàm đo, cả hai
hướng cùng gọi — pipeline cũ để mỗi nơi một bản rồi trôi lệch, README ghi một đằng code
chạy một nẻo.

---

## 1. GIAI ĐOẠN 01–05 — chung cho cả hai hướng

| # | Thư mục | Việc | Ra gì |
|---|---|---|---|
| 01 | `01_LamSachKhaoSat` | **766 → 676** bằng quy trình IER ba chỉ số (§0.4). Gắn nhãn nhóm từ `mapping.json` | `khaosat_sach.csv` · **`bang_ier.csv`** · 7 hình |
| 02 | `02_ChuanBiTTTH` | **18.024 → 15.696**: lọc `KQ=TT`, bỏ tổ hợp D10, remap mã ngành cũ, khử SBD trùng. Trải `M1/M2/M3` ra 10 cột `diem_*` cùng lược đồ với khảo sát | `ttth_phang.csv` · `do_phu_theo_nganh.csv` · 3 hình |
| 03 | `03_HocPhanPhoi` | Mỗi ngành: vector trung bình (10) + ma trận hiệp phương sai (10×10) của Likert, **co ngót Bayes** về mức nhóm (`K = 8`) vì ngành ít nhất chỉ 6 phiếu. Học trên **toàn bộ 676 phiếu** | `phan_phoi_theo_nganh.npz` · `suc_co_ngot.csv` · 3 hình |
| 04 | `04_GA_TangCuong` | GA sinh phần **Likert** cho cả 15.696 dòng. **Điểm thi và tổ hợp giữ nguyên** — đó mới là tín hiệu thật nguồn này đóng góp | `ttth_co_likert.csv` · 4 hình |
| 05 | `05_KiemDinhGA` | So dữ liệu GA với phiếu thật: KS từng câu · Wasserstein · khoảng cách năng lượng · **AUC bộ phân biệt thật/giả** (≈ 0,5 là đạt) | `bao_cao_kiem_dinh.csv` · `ket_luan.json` · 4 hình |

### Giai đoạn 04 — hai phiên bản toán tử GA

Sinh **hai bản** để so, đây là đóng góp phương pháp luận:

| | Bản 1 — Gauss | Bản 2 — trên phiếu thật |
|---|---|---|
| Khởi tạo | lấy mẫu `N(μ,Σ)` rồi làm tròn | lấy mẫu có hoàn lại từ phiếu thật của ngành |
| Lai ghép | trộn dòng giữa hai lô | cắt điểm: vài câu của A, còn lại của B |
| Đột biến | nhiễu Gauss | thay một câu bằng câu của bạn thật khác |

Lần chạy trước: bản 1 trượt phép kiểm định AUC (0,92); bản 2 đạt (0,52). **Bản 2 là
phương pháp chính**, bản 1 giữ làm đối chứng.

Năm ngành không có hồ sơ TTTH → bootstrap từ chính phiếu khảo sát của ngành đó, gắn cờ riêng.

---

## 2. HƯỚNG 1 — gộp hai nguồn vào bảng train final, rồi chia

```
chung/ 01–05
   │
   ▼
06 TRAIN FINAL   gộp 676 khảo sát + 15.696 TTTH = 16.372 dòng × 63 đặc trưng
   │
   ▼
07 TÁCH          chọn một tỉ lệ, chia train / test trên bảng đã gộp
   │
   ▼
08 → 09 → 10     mốc chuẩn · tinh chỉnh · chốt
```

| # | Thư mục | Việc | Ra gì |
|---|---|---|---|
| 06 | `06_TrainFinal` | Gộp **676 + 15.696 = 16.372** dòng, đủ 63 đặc trưng. Thêm cột quản lý `nguon` (`khaosat` / `ttth_ga`), `is_that`, `sample_weight` | **`train_final.csv`** · `thong_ke_dac_trung.csv` · 3 hình |
| 07 | `07_TachTrainTest` | **Chọn tỉ lệ.** Quét 70/30 · 80/20 · 85/15 · 90/10, `stratify=ma_nganh`, `seed=42`. `RepeatedStratifiedKFold(5×3)` trên phần train | `train.csv` · `test_KHOA.csv` · `bang_ti_le.csv` · 2 hình |
| 08 | `08_MocChuan` | Bốn mốc đối chứng (§4) | `moc_chuan.json` · 3 hình |
| 09 | `09_TinhChinh` | Quét siêu tham số × `β` × `sample_weight` của dòng thật. **Mục tiêu kép:** tối đa Top-3 tư vấn *và* ép khoảng cách train − val < 10 điểm | `sieu_tham_so.json` · `ket_qua_quet.csv` · 3 hình |
| 10 | `10_ChotModel` | Huấn luyện lại trên toàn bộ train → **mở tập test đúng một lần** | `model_tang1.json` · `model_tang2_*.json` · `metrics.json` · `bang_ket_qua.csv` · 5 hình |

### Giai đoạn 07 — chọn tỉ lệ thế nào

Quét bốn tỉ lệ, mỗi tỉ lệ chạy CV `5×3` **trên phần train**, chốt theo Top-3 chế độ tư
vấn trên val. Ghi cả bốn vào `bang_ti_le.csv`.

> Chọn tỉ lệ bằng cách nhìn điểm trên **tập test** là để tập test tham gia vào quyết
> định thiết kế, và con số cuối cùng sẽ lạc quan hơn thực tế. Chốt bằng val của CV thì
> tránh được chuyện đó.

### Giai đoạn 10 — `metrics.json` phải tách cột

Bảng gộp có **15.696 / 16.372 = 95,9%** dòng tổng hợp, nên tập test cũng gồm ~95,9%
dòng tổng hợp. Bắt buộc tách:

| Cột | Nội dung |
|---|---|
| `test_toan_bo` | trên cả tập test |
| `test_chi_dong_that` | chỉ các dòng `is_that = 1` (~101 dòng ở tỉ lệ 85/15) |

Cột thứ hai là con số **so được với `research3/`**. Không có nó thì hai folder không
đối chiếu được.

### Ghi chú cho mục "Hạn chế của nghiên cứu"

1. **Dòng test tổng hợp có Likert do GA sinh ra từ nhãn của chính dòng đó.** Mô hình học
   ánh xạ `Likert → ngành`, mà GA dựng theo chiều ngược `ngành → Likert`. Phần điểm đo
   trên những dòng này phản ánh mức tất định của bộ sinh.
2. **Bộ sinh ở giai đoạn 03 học từ cả 676 phiếu**, trong đó có những phiếu sau này rơi
   vào tập test.

---

## 3. HƯỚNG 2 — không gộp, niêm phong khảo sát, chia trên TTTH

```
chung/ 01–05
   │
   ▼
06 TRAIN FINAL   TTTH 15.696 dòng đã đủ 63 trường  ─┐
                 khảo sát 676 → NIÊM PHONG          │ hai nguồn tách rời
   │                                                ┘
   ▼
07 TÁCH          chia 85/15 CHỈ trên TTTH → 13.341 / 2.355
   │
   ▼
08 → 09 → 10     mốc chuẩn · tinh chỉnh · chốt (mở HAI tập test)
```

| # | Thư mục | Việc | Ra gì |
|---|---|---|---|
| 06 | `06_TrainFinal` | Dựng bảng TTTH **15.696 dòng × 63 đặc trưng**. Đóng gói 676 phiếu thành `khaosat_NIEM_PHONG.csv`, ghi **băm SHA-256** vào `niem_phong.json`. Giai đoạn 07–09 **không được mở** | **`train_final.csv`** · `khaosat_NIEM_PHONG.csv` · `niem_phong.json` |
| 07 | `07_TachTrainTest` | Chia **chỉ trên TTTH**: 85/15, `stratify=ma_nganh`, `seed=42` → **13.341 / 2.355**. CV `5×3` trên phần train | `train.csv` · `test_KHOA.csv` · `cv_folds.json` |
| 08 | `08_MocChuan` | Bốn mốc đối chứng (§4) | `moc_chuan.json` |
| 09 | `09_TinhChinh` | y hệt hướng 1 | `sieu_tham_so.json` |
| 10 | `10_ChotModel` | Mở `test_KHOA.csv` **và** phá niêm phong khảo sát, đo **hai tập test riêng biệt** | `metrics.json` · `bang_ket_qua.csv` |

### Giai đoạn 10 — hai tập test, báo cáo tách bạch

| Tập test | Cỡ | Likert | Nhãn | Trả lời câu hỏi gì |
|---|---:|---|---|---|
| `test_KHOA` | 2.355 | GA sinh | ngành trúng tuyển thật | mô hình tái tạo ánh xạ của bộ sinh tới đâu |
| `khaosat_NIEM_PHONG` | 676 | **người thật điền** | ngành mong muốn | mô hình dự đoán được người thật tới đâu |

Cột thứ hai là con số **so được với `research3/`**.

**Kiểm niêm phong bằng máy** — assert trong cell của giai đoạn 10:

```python
assert bam_sha256(khaosat_niem_phong) == niem_phong["bam"], \
    "Tệp niêm phong đã bị sửa giữa chừng"
```

### Ghi chú cho mục "Hạn chế của nghiên cứu"

1. **`test_KHOA` có Likert do GA sinh.** Điểm thi, tổ hợp và nhãn là thật; riêng 22 cột
   Likert (`likert_*`, `ips_*`, `likert_tb`, `likert_dolech`) do bộ sinh tạo từ nhãn.
2. **Bộ sinh ở giai đoạn 03 học từ cả 676 phiếu**, tức là từ toàn bộ tệp sẽ phá niêm
   phong ở giai đoạn 10. Con số trên `khaosat_NIEM_PHONG` là **trên dữ liệu bộ sinh đã
   thấy**, không phải dữ liệu hoàn toàn mới.

---

## 4. Bốn mốc đối chứng — bắt buộc ở cả hai hướng

Luật của kho: **mọi bảng chỉ số phải có cột đoán bừa**.

| Mốc | Cách tính | Cho biết điều gì |
|---|---|---|
| **Đoán lớp đông nhất** | luôn trả ngành nhiều dòng nhất | sàn tuyệt đối |
| **Đoán bừa trong nhóm** | chọn ngẫu nhiên trong nhóm đúng | Top-3 = 69,2% ở cấu hình 9 nhóm |
| **Chỉ dùng tổ hợp** | một cây quyết định trên 15 cột one-hot tổ hợp | tổ hợp gần như quyết định nhóm; thiếu cột này không biết 63 đặc trưng thêm được gì |
| **Chỉ 676 khảo sát, không GA** | mô hình 2 tầng trên mỗi dữ liệu thật | **GA đóng góp bao nhiêu điểm thật** |

Mốc cuối quan trọng nhất — cả hai hướng đều dựng quanh GA.

---

## 5. Quy ước trình bày

- **Mở đầu mỗi notebook**: cell markdown có **sơ đồ luồng ASCII** + bảng đầu vào/đầu ra.
- **Kết thúc**: cell in **bảng tóm tắt**, kèm `assert` kiểm số dòng.
- **Mỗi hình**: gọi `luu(fig, OUT, ten, chu_thich)` — chú thích nêu **kết luận rút ra**,
  không mô tả lại hình.
- **Notebook không viết tay.** Mọi `.ipynb` sinh từ `scripts/g0X.py`.
- **Tên thư mục output trùng tên notebook.**

---

## 6. Kiểm chứng

Chạy `chung/` 01 → 05 một lần, rồi mỗi hướng 06 → 10 (`conda activate Edutalk`),
Restart & Run All từng cái.

| Assert | chung | H1 | H2 |
|---|:--:|:--:|:--:|
| IER loại đúng 90 phiếu → còn 676 | ✅ | | |
| Ba chỉ số IER hội tụ cùng một tập | ✅ | | |
| TTTH sau lọc đúng 15.696 dòng | ✅ | | |
| Đủ 39 ngành, 9 nhóm | ✅ | | |
| Mọi ma trận hiệp phương sai (gđ 03) xác định dương | ✅ | | |
| AUC thật/giả của bản GA chính trong `[0,45 ; 0,55]` | ✅ | | |
| `train_final.csv` đúng 16.372 dòng × 63 đặc trưng | | ✅ | |
| `is_that` khớp cột `nguon` | | ✅ | |
| `train_final.csv` đúng 15.696 dòng × 63 đặc trưng | | | ✅ |
| Chia đúng 13.341 / 2.355 | | | ✅ |
| Băm tệp niêm phong không đổi từ gđ 06 tới gđ 10 | | | ✅ |
| Giai đoạn 08–09 không mở `*_KHOA*` / `*NIEM_PHONG*` | | ✅ | ✅ |

**Kiểm tra kết quả:** khoảng cách train − test dưới 10 điểm · bảng cuối nêu rõ Top-k nào
chạm 80–90% và **hơn đoán bừa bao nhiêu** · `metrics.json` đủ cột tách.

---

## 7. Bảng so sánh cuối cùng — `research/so_sanh/`

Kết quả có giá trị nhất của cả hai lần chạy.

| Chỉ tiêu | Hướng 1 | Hướng 2 | `research3/` | Đoán bừa |
|---|---|---|---|---|
| Top-3 tư vấn — trên dòng thật | | | **86,3%** | 69,2% |
| Top-3 khám phá — trên dòng thật | | | **35,3%** | 7,7% |
| Top-1 tư vấn — trên dòng thật | | | | 23,1% |
| Top-3 tư vấn — trên dòng tổng hợp | | | — | |
| Top-1 nhóm ngành (tầng 1) | | | | 11,1% |
| Khoảng cách train − test | | | | |
| AUC thật/giả (gđ 05) | dùng chung | dùng chung | ≈ 0,5 | 0,5 |
| Tỉ lệ dòng tổng hợp trong tập test | ~95,9% | 100% | **0%** | |

Dòng cuối là chỗ ba cột khác nhau rõ nhất — và là chỗ phải giải thích khi so ba con số.

---

## 8. Ngân sách chạy

| Giai đoạn | Thời gian |
|---|---:|
| `chung/` 01–02 làm sạch | ~10 phút |
| `chung/` 03 học phân phối | ~10 phút |
| `chung/` 04 GA sinh 15.696 dòng (2 bản toán tử) | **~60 phút** |
| `chung/` 05 kiểm định | ~15 phút |
| **Cộng phần chung — chạy MỘT lần** | **~1,5 giờ** |
| Mỗi hướng: 06–07 dựng bảng và chia | ~10 phút |
| Mỗi hướng: 08 mốc chuẩn | ~20 phút |
| Mỗi hướng: **09 tinh chỉnh** | **~2–3 giờ** |
| Mỗi hướng: 10 chốt | ~15 phút |
| **Cộng mỗi hướng** | **~3 giờ** |
| **TỔNG** | **~7,5 giờ** |

Đo trên CPU (Apple M5, XGBoost không có CUDA). Giai đoạn 09 quét bằng **3 fold** trước,
xác nhận lại bằng đủ 15 fold quanh cấu hình tốt nhất. Chạy chung 01–05 một lần tiết kiệm
~1,5 giờ so với chạy tách đôi.
