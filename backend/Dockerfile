# Sử dụng Python 3.10 mỏng nhẹ
FROM python:3.10-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file requirements và cài đặt thư viện
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Đảm bảo có gunicorn để chạy production
RUN pip install gunicorn uvicorn

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở port 8000
EXPOSE 8000

# Lệnh khởi chạy Production với Gunicorn + Uvicorn
#
# CỐ Ý KHÔNG GHI `-w`: thiếu cờ này thì gunicorn đọc biến môi trường
# WEB_CONCURRENCY, mặc định 1. Đặt số worker trên trang cấu hình Render là đổi
# được ngay, KHÔNG phải build lại image.
#
# Chọn bao nhiêu — RAM một tiến trình đã đo thật, tổng 320 MB:
#
#     Python + thư viện nền        21 MB
#     google-generativeai        + 78 MB
#     chromadb (import)          + 63 MB
#     kho vector 39 chunk        + 27 MB
#     mô hình XGBoost           + 130 MB
#                               ─────────
#                                 320 MB
#
#     huấn luyện lại (chỉ lúc đang chạy, 1 lượt/lần)  + ~95 MB  → đỉnh ≈ 415 MB
#     (đo 17/09/2026: nạp mô hình 176 MB → đọc dữ liệu + huấn luyện 269 MB)
#
#     Render free 512 MB     →  WEB_CONCURRENCY=1   (2 worker ≈ 640 MB, OOM)
#     Render Standard 2 GB   →  WEB_CONCURRENCY=4
#
# Worker vượt RAM thì bị SIGKILL và Render tự khởi động lại, nên nhìn từ ngoài
# chỉ thấy "thỉnh thoảng lỗi 502" chứ không thấy nguyên nhân.
#
# `--preload` nạp app TRƯỚC khi fork. Phần nặng nhất (mảng của XGBoost và đồ thị
# HNSW của Chroma) nằm ở vùng nhớ C nên được chia sẻ qua copy-on-write; phần đối
# tượng Python thì không, vì mỗi lần chạm vào là ghi lại bộ đếm tham chiếu.
CMD ["gunicorn", "app.main:app", "--preload", \
     "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
