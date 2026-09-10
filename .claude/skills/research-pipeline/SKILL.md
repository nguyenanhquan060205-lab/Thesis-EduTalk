---
name: research-pipeline
description: Quy trình nghiên cứu XGBoost trong research2/ và research3/ — sinh và chạy notebook 10 giai đoạn (g01→g10), sửa siêu tham số, đo Top-k kèm mốc đoán bừa, sinh dữ liệu bằng thuật toán di truyền, và các bẫy rò rỉ dữ liệu đã từng dính. Dùng khi làm việc với research2, research3, notebook, nbgen, train_final.csv, mô hình gợi ý ngành, độ chính xác Top-3, tăng cường dữ liệu, GA, hoặc khi cần chạy lại một giai đoạn của pipeline.
---

# Pipeline nghiên cứu — research2/ và research3/

Hai nhánh của **cùng một thí nghiệm có đối chứng**. Khác đúng một biến: cách gom 39
ngành thành nhóm.

| | Cách nhóm | Cỡ nhóm |
|---|---|---|
| `research2/` | 7 khối ngành gốc của HUIT | `[10, 8, 7, 6, 4, 2, 2]` |
| `research3/` | 9 nhóm ngành chia lại cho cân | `[7, 6, 4, 4, 4, 4, 4, 3, 3]` |

Mọi thứ khác giữ y hệt: cùng raw, cùng cách tách train/test, cùng đặc trưng, cùng thuật
toán, cùng `SEED = 42`. Nhờ vậy đặt cạnh nhau mới trả lời được: **cách chia nhóm ảnh
hưởng tới độ chính xác bao nhiêu?**

Hai thư mục **song song và độc lập**. Sửa một bên thì thường phải sửa bên kia — nếu
không, so sánh mất giá trị vì đã khác nhiều hơn một biến.

---

## Luật số 1 — notebook KHÔNG viết tay

Mọi `.ipynb` trong `notebooks/` được **sinh ra** từ `scripts/g0X.py`.

```
scripts/
├── nbgen.py     khung dựng: 3 khối mã nhúng (SETUP / DU_LIEU / MO_HINH) + hàm md(), code(), viet()
├── g01.py …     mỗi file sinh đúng một notebook
└── chay.py      chạy notebook và in output ra terminal ngay lập tức
```

**Sửa thẳng file `.ipynb` là mất trắng** ở lần sinh sau. Muốn đổi gì thì sửa `g0X.py`
hoặc `nbgen.py` rồi sinh lại.

Ba khối mã trong `nbgen.py` được **nhúng thẳng** vào notebook chứ không `import`, để
notebook tự chứa đủ — mở lên là chạy, không phụ thuộc file bên cạnh (quan trọng khi nộp
kèm khoá luận). Nguồn để sửa vẫn chỉ có một: chính `nbgen.py`.

| Khối | Nội dung | Có mặt từ |
|---|---|---|
| `SETUP` | import, bảng màu, `rcParams`, `thu_muc()`, hàm vẽ nhãn, `luu()`, `tom_tat()` | mọi notebook |
| `DU_LIEU` | `nap()`, `dac_trung()` dựng 63 đặc trưng, `nhom_dac_trung()` | giai đoạn 3 |
| `MO_HINH` | lớp `MoHinhNganh`, `top_k()`, các hàm mốc đoán bừa | giai đoạn 4 |

Khi sửa chuỗi bên trong `SETUP`/`DU_LIEU`/`MO_HINH`: đó là **string literal**, nên
`\n` trong code sinh ra phải viết `\\n`. Đã có lần `ngat_dong()` hỏng vì quên chuyện này.

---

## Chạy

```bash
conda activate Edutalk
cd research2/scripts          # hoặc research3/scripts

python g09.py                 # sinh ../notebooks/09_TinhChinh.ipynb
python chay.py 09             # chạy, output hiện ra NGAY trên terminal
python chay.py 09 10          # chạy tuần tự, dừng ngay khi lỗi
```

Dùng `chay.py`, **đừng dùng `jupyter nbconvert --execute`**: nbconvert nhét toàn bộ
output vào file `.ipynb` và chỉ đọc được sau khi chạy xong — với giai đoạn chạy hàng giờ
thì không theo dõi được gì. `chay.py` bám vào từng thông điệp của kernel nên
`print(..., flush=True)` hiện ra tức thì, và vẫn ghi kết quả vào `.ipynb` như nbconvert.

Sinh lại notebook sẽ **xoá hết kết quả đã chạy** trong file. Phải chạy lại mới có hình.

---

## Mười giai đoạn

Tên thư mục đầu ra **trùng khít** tên notebook — mở `data/processed/` là biết ngay do
notebook nào sinh ra.

| # | Notebook | Việc chính | Ra |
|---:|---|---|---|
| 01 | `LamSachKhaoSat` | 766 phiếu → lọc phiếu điền đại (`std(10 Likert)=0`) → 676; dựng bảng ánh xạ ngành→nhóm | `khaosat_sach.csv`, `mapping.json` |
| 02 | `ChuanBiTTTH` | 18.024 hồ sơ → lọc `KQ=TT`, bỏ D10, khử SBD trùng → 15.696; trải `M1/M2/M3` ra 10 cột điểm | `ttth_flatten.csv` |
| 03 | `TachTrainTest` | tách 85/15 → **574 / 102**; `RepeatedStratifiedKFold(5×3)` = 15 fold | `khaosat_train.csv`, `khaosat_test_KHOA.csv`, `cv_folds.json` |
| 04 | `MocChuan` | train **chỉ trên 574 phiếu thật** → mốc **M₀** để mọi bước sau so lại | `moc_chuan.json` |
| 05 | `HocPhanPhoi` | μ (10) + Σ (10×10) Likert mỗi ngành, **co ngót Bayes** về mức nhóm | `phan_phoi_theo_fold.npz` |
| 06 | `GA_TangCuong` | GA sinh phần Likert cho hồ sơ TTTH; **điểm thi và tổ hợp giữ nguyên** | `pool_theo_fold.npz` |
| 07 | `KiemDinhGA` | KS · Wasserstein · năng lượng · **AUC bộ phân biệt thật/giả** | `bao_cao_kiem_dinh.csv` |
| 08 | `TrainFinal` | gộp dòng thật + tổng hợp thành một bảng 63 đặc trưng | **`train_final.csv`** |
| 09 | `TinhChinh` | quét siêu tham số, chọn cấu hình, quyết định **có dùng dữ liệu tăng cường hay không** | `sieu_tham_so.json` |
| 10 | `ChotModel` | train lại → **mở tập test đúng một lần** | `metrics.json`, `model_*.json` |

Giai đoạn 04–09 **không được mở** `khaosat_test_KHOA.csv`.

---

## Đặc trưng — 63 cột

| Nhóm | Số cột |
|---|---:|
| Likert thô | 10 |
| Likert chuẩn hoá theo người (`ips_*`) | 10 |
| Thống kê Likert (`likert_tb`, `likert_dolech`) | 2 |
| Điểm thi thô | 10 |
| Điểm z-score từng môn | 10 |
| Phái sinh từ điểm | 4 |
| Tổ hợp one-hot | 15 |
| Giới tính · mục tiêu | 2 |

Cộng cột quản lý: `ma_nganh`, `ma_khoi`, `nguon` (`khaosat`/`ttth_ga`/`bootstrap`),
`is_that`, `sample_weight`.

**Không dùng cột `DUT`** (điểm ưu tiên khu vực) — không phải vì web không khai được, mà
vì file khảo sát không có cột đó (thêm vào sẽ tạo ra một cột phân biệt hoàn hảo
thật/giả = rò rỉ trá hình), và nó chỉ mang **0,6%** thông tin về ngành so với 10,7% của
tổ hợp thi.

---

## Luật số 2 — mọi bảng chỉ số phải có cột "đoán bừa"

Nhóm chỉ có 2 ngành thì **Top-3 tự đúng 100%** mà không cần mô hình. Một con số 85% đứng
trơ trọi có thể chỉ hơn đoán bừa 2 điểm. Các hàm mốc đối chứng nằm trong khối `MO_HINH`:

| Hàm | Ý nghĩa |
|---|---|
| `bua_toan_bo(n_lop)` | đoán bừa trong toàn bộ 39 ngành |
| `bua_trong_nhom(y, nhom)` | đoán bừa trong nhóm đã biết (chế độ tư vấn) |
| `bua_pho_bien(y_hoc, y_do, nhom)` | **luôn gợi ý k ngành đông sinh viên nhất** — mốc thực tế nhất |
| `ky_nang(acc, bua)` | `(acc − bừa) / (1 − bừa)` — so sánh được giữa các cách chia nhóm |

Hai chế độ báo cáo song song: **tư vấn** (đã biết nhóm, chọn ngành trong nhóm) và
**khám phá** (chọn trong cả 39 ngành).

---

## Bốn cái bẫy đã dính — kiểm lại mỗi khi sửa pipeline

### 1. Đo CV trên `train_final.csv` đầy đủ
Các dòng tăng cường **sinh ra từ** dòng thật. Cho cả bảng vào cross-validation thì bản
sao của một dòng train nằm luôn trong val → **79,8% giả, sự thật 69,3%**.
→ Mỗi fold phải có bộ dữ liệu tăng cường **của riêng fold đó**.

### 2. Tái dùng bộ tăng cường giữa các fold
`TC[i % len(TC)]` với 5 bộ cho 15 fold → **76,1% giả, sự thật 70,5%**. Chốt chặn:
```python
assert len(TC) == len(FOLDS), "phải có đúng 1 bản cho MỖI fold, nếu không sẽ rò rỉ"
```

### 3. Giai đoạn 10 phớt lờ kết luận của giai đoạn 9
`sieu_tham_so.json` có cờ `dung_tang_cuong`. Nếu giai đoạn 9 kết luận dữ liệu tăng cường
**không giúp gì**, giai đoạn 10 phải bỏ nó đi:
```python
DUNG_TC = bool(STH.get("dung_tang_cuong", True))
if not DUNG_TC:
    tf = tf[tf.is_that == 1].reset_index(drop=True)
```
Bỏ qua bước này thì research3 ra **train 99,9% / test 83,3%, chênh 16,5đ**. Sửa xong:
**87,2% / 86,3%, chênh 0,9đ**.

### 4. Đo TRAIN trên chính bảng tăng cường
Ra ~100% vì mô hình đã thấy bản sao của mọi dòng. TRAIN phải đo bằng **cross-validation
theo fold**, không phải in-sample.

---

## Hai chốt chặn trong giai đoạn 09

```python
GAP_TOI_DA   = 0.35   # chênh train−val Top-3 vượt mức này → ca bệnh lý, loại
TRAIN_TOI_DA = 0.95   # RÀNG BUỘC CỨNG: train vượt mức này là nhớ vẹt, loại thẳng
```

Đừng siết `GAP_TOI_DA` quá tay. Có lần ép xuống 0,12 làm **mọi** cấu hình đều rơi về
đúng mức của mốc đoán bừa phổ biến — kết quả "đẹp" nhưng mô hình đã suy biến thành cái
máy đoán ngành đông nhất.

---

## Thuật toán di truyền — dùng bản nào

Có hai bộ toán tử. Bản chạy trên **phiếu thật** là bản chính:

| | Bản Gauss | **Bản trên phiếu thật** |
|---|---|---|
| Khởi tạo | lấy mẫu `N(μ,Σ)` rồi làm tròn | lấy mẫu có hoàn lại từ phiếu thật của ngành |
| Lai ghép | trộn dòng giữa hai lô | cắt điểm: vài câu của A, còn lại của B |
| Đột biến | nhiễu Gauss | thay một câu bằng câu của bạn thật khác |
| AUC phân biệt | 0,92 ❌ | **0,52 ✅** |

**Hàm thích nghi phải là "tập điển hình", không phải log-likelihood.** Tối đa hoá
log-likelihood làm cả quần thể sụp về đúng vector trung bình → dữ liệu sinh ra quá đều,
KS 8%, AUC 0,788. Công thức đúng:

```
E[log p(x)] = −½ (d·log(2π) + log|Σ| + d)
fitness(x)  = −| log p(x) − E[log p(x)] |
```

Sửa xong: KS 64%, AUC 0,573.

---

## Mười hướng đã thử và thất bại — đừng làm lại

| Hướng | Kết quả |
|---|---|
| Đặc trưng tương tác | −0,7đ |
| Ensemble nhiều mô hình | −1,4đ |
| Nhân đôi dữ liệu nhóm yếu | −0,8đ |
| Confident Learning (Northcutt 2021) | +0,2đ, không đáng |
| Edited Nearest Neighbours | −2,1đ, phải xoá 63% dữ liệu |
| Isolation Forest lọc nhiễu | −0,9đ |
| Warm-start train tiếp từ mốc trước | 0đ |
| One-vs-one | −2,0đ |
| **Phân tầng cho nhóm nghẽn cổ chai** | **+4,8đ ✅** |

**Trần dữ liệu:** trong khối Kinh doanh (10 ngành), tỉ lệ hai láng giềng gần nhất trùng
Top-3 chỉ **32,2%** so với 30% của ngẫu nhiên. Đặc trưng gần như không mang tín hiệu tách
được 10 ngành kinh doanh. Đừng kỳ vọng tinh chỉnh siêu tham số vá được chuyện đó — nó là
giới hạn của dữ liệu, không phải của mô hình.

---

## Nối sang backend

```bash
EDUTALK_MODEL_DIR=<tuyệt đối>/research2/data/processed/10_ChotModel
```

Cách dựng đặc trưng ở `backend/app/services/major_predictor.py` phải **giống hệt**
notebook. Lệch thì mô hình vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm.

**Đừng đụng `research/`** — đó là pipeline cũ (2 tầng, 43 đặc trưng) mà backend đang chạy
thật.
