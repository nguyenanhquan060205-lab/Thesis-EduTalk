# `scripts/` — bộ sinh notebook

Các notebook trong `../notebooks/` **được sinh ra từ đây**, không viết tay.

```
nbgen.py          khung dựng notebook: khối thiết lập chung (bảng màu,
                  rcParams, hàm nhan_ngang/nhan_doc/chu_thich/luu) + hàm
                  md() / code() / viet()

g01.py … g11.py   mỗi file sinh một notebook tương ứng
```

## Vì sao sinh bằng script thay vì viết tay trong Jupyter

1. **Khối thiết lập chung chỉ tồn tại một bản** (trong `nbgen.SETUP`). Viết tay thì
   11 notebook có 11 bản bảng màu, sửa một chỗ là lệch mười chỗ còn lại.
2. **Sửa hàng loạt được.** Đổi tên một thư mục đầu ra hay thêm một cột vào bảng
   thống kê chỉ cần sửa script rồi chạy lại, thay vì mở 11 file `.ipynb`.
3. **Diff đọc được.** File `.ipynb` là JSON có nhúng ảnh base64 — `git diff` vô
   dụng. Diff trên `g0X.py` thì đọc được từng dòng.
4. **Tránh IDE làm hỏng.** Trong phiên trước, một notebook bị format lại lúc mở
   trong IDE và hỏng phần thụt lề; dựng lại từ script là xong trong 2 giây.

## Cách dùng

```bash
conda activate Edutalk
cd research2/scripts

python g01.py                    # sinh ../notebooks/01_LamSachKhaoSat.ipynb
cd ../notebooks
jupyter nbconvert --to notebook --execute --inplace 01_LamSachKhaoSat.ipynb
```

Hoặc mở notebook trong Jupyter và Restart & Run All như bình thường — notebook sinh
ra là notebook đầy đủ, chạy độc lập được, không phụ thuộc gì vào `scripts/`.

## Lưu ý

- `../notebooks/chung.py` **không** do script sinh — nó là mã nguồn viết tay, chứa
  hàm dùng chung cho mọi giai đoạn. Sửa trực tiếp file đó.
- Sinh lại notebook sẽ **xoá hết kết quả đã chạy** trong file `.ipynb`. Chạy lại
  bằng `nbconvert --execute` hoặc Restart & Run All để có lại hình và bảng.
