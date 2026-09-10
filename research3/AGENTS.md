# Luật cho `research2/` và `research3/`

**Đọc trước khi sửa:** `../.claude/skills/research-pipeline/SKILL.md`

Chú thích code và notebook viết **tiếng Việt**. Môi trường: `conda activate Edutalk`.

`research2/` (7 khối HUIT) và `research3/` (9 nhóm chia lại) là **hai nhánh của cùng một
thí nghiệm có đối chứng**, khác đúng một biến là cách gom ngành. Sửa một bên thường phải
sửa bên kia — nếu không, so sánh mất giá trị vì đã khác nhiều hơn một biến.

## Năm điều không được vi phạm

1. **Notebook KHÔNG viết tay.** Mọi `.ipynb` trong `notebooks/` được sinh từ
   `scripts/g0X.py`. **Sửa thẳng file `.ipynb` là mất trắng** ở lần sinh sau. Muốn đổi gì
   thì sửa `g0X.py` hoặc `nbgen.py` rồi sinh lại.

2. **Chạy bằng `python chay.py 09`, không dùng `jupyter nbconvert --execute`.** nbconvert
   nhét toàn bộ output vào file và chỉ đọc được sau khi chạy xong — giai đoạn chạy hàng
   giờ thì không theo dõi được gì.

3. **Mọi bảng chỉ số phải có cột "đoán bừa".** Nhóm 2 ngành thì Top-3 tự đúng 100% mà
   không cần mô hình; thiếu cột đối chứng thì con số 85% có thể chỉ hơn đoán bừa 2 điểm.

4. **Giai đoạn 04–09 không được mở `khaosat_test_KHOA.csv`.** Test chỉ mở đúng một lần ở
   giai đoạn 10.

5. **Sửa chuỗi trong `SETUP`/`DU_LIEU`/`MO_HINH` của `nbgen.py`:** đó là string literal,
   nên `\n` trong code sinh ra phải viết `\\n`.

## Bốn bẫy rò rỉ đã dính — kiểm lại mỗi khi sửa

| Bẫy | Hậu quả |
|---|---|
| Đo CV trên `train_final.csv` đầy đủ | 79,8% giả · thật 69,3% |
| Tái dùng bộ tăng cường giữa các fold (`TC[i % len(TC)]`) | 76,1% giả · thật 70,5% |
| Giai đoạn 10 phớt lờ cờ `dung_tang_cuong` của giai đoạn 9 | train 99,9% / test 83,3%, chênh 16,5đ |
| Đo TRAIN in-sample trên bảng tăng cường | ra ~100% vô nghĩa |

Dòng tăng cường **sinh ra từ** dòng thật, nên mỗi fold phải có bộ tăng cường **của riêng
fold đó**. TRAIN phải đo bằng cross-validation theo fold.

## Đừng làm lại 10 hướng đã thất bại

Đặc trưng tương tác −0,7đ · ensemble −1,4đ · nhân đôi dữ liệu nhóm yếu −0,8đ · Confident
Learning +0,2đ · ENN −2,1đ · Isolation Forest −0,9đ · warm-start 0đ · one-vs-one −2,0đ.
Chỉ **phân tầng** có tác dụng: +4,8đ.

**Trần dữ liệu:** trong khối Kinh doanh (10 ngành), tỉ lệ hai láng giềng gần nhất trùng
Top-3 chỉ 32,2% so với 30% ngẫu nhiên. Đó là giới hạn của dữ liệu, không phải của mô hình
— tinh chỉnh siêu tham số không vá được.

## Không đụng `research/`

Đó là pipeline cũ (2 tầng, 43 đặc trưng) mà backend đang chạy thật.
