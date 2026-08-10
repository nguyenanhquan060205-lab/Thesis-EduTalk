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

# Lệnh khởi chạy Production với Gunicorn + Uvicorn (4 Workers)
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
