# Kế hoạch Triển khai (Implementation Plan) - EduTalkTVTS

Dựa trên quá trình thống nhất và phản biện vô cùng chi tiết, em đã cập nhật lại toàn bộ Kế hoạch triển khai cho phần Mô phỏng (Mockup Dashboard) và Kiến trúc Hệ thống AI. 

Kế hoạch này đảm bảo hệ thống vận hành sát thực tế nhất đối với trường HUIT, đồng thời che lấp mọi khuyết điểm thường gặp của AI.

---

## 1. Kiến trúc Hệ thống AI & Dữ liệu (Đã chốt)

### A. Mô hình Học Máy (XGBoost)
- **Thuật toán:** XGBoost (Cây quyết định siêu tốc, xử lý tốt dữ liệu khuyết - NaN).
- **Bộ Đặc trưng Đầu vào (Input Features - X): Tổng cộng 23 Features.**
  - 10 cột Sở thích / Tính cách (từ Năng động đến Nghệ thuật).
  - 10 cột Điểm thi các môn thực tế tại HUIT (Toán, Văn, Anh, Lý, Hóa, Sinh, Sử, Địa, GDKTPL, Tin học).
  - 1 cột Mã Tổ hợp xét tuyển (A00, A01, D01...).
  - 1 cột Giới tính (0: Nam, 1: Nữ).
  - 1 cột Mục tiêu sau tốt nghiệp (1: Đi làm, 2: Nghiên cứu, 3: Kinh doanh, 4: Chưa xác định - *Tùy chọn 4 giúp AI chống nhiễu dữ liệu đối với học sinh đang mất phương hướng*).
- **Nhãn Dự đoán (Output - Y):** Tên Ngành Học (trong số 37 ngành).

### B. Luật Nghiệp Vụ Backend (Business Rules - Post-processing)
AI không chịu trách nhiệm toàn bộ. Code Backend sẽ kiểm soát tính hợp lệ:
- **Luật 1 (Khối thi):** Dò bảng JSON, loại bỏ các ngành không xét tuyển khối thi mà học sinh đã chọn.
- **Luật 2 (Điểm chuẩn):** So sánh `Tổng điểm 3 môn` với `Điểm chuẩn năm ngoái` trong Database. Nếu thấp hơn, hiển thị dòng Cảnh báo màu đỏ để tư vấn học sinh cố gắng hơn.

---

## 2. Kế hoạch Xây dựng Bản Mô Phỏng (UI/UX Mockup)

Anh đã chọn thư mục `dashboard-mockup` với công nghệ Web thuần (HTML/CSS/JS). Em sẽ thiết kế giao diện cực kỳ hiện đại, bắt mắt (Glassmorphism, Gradient) gồm các phần sau:

### Phân hệ 1: Form Tư vấn AI (Cho thí sinh)
- Giao diện nhập thông tin siêu mượt.
- **Tính năng động:** Khi chọn khối (VD: A00), giao diện tự động khóa các môn không liên quan (Văn, Anh...) và chỉ mở Toán, Lý, Hóa. Có dropdown chọn Mục tiêu & Giới tính.
- Hiển thị kết quả kèm % Phù hợp.

### Phân hệ 2: Bảng Điều Khiển Admin (Dashboard)
- **AI & XAI Panel:**
  - Hiển thị **Biểu đồ SHAP** (Mô phỏng bằng Chart.js) để giải thích tại sao AI lại khuyên thí sinh học ngành đó (VD: Yêu công nghệ +2.5, Điểm Toán +1.0).
  - Hiển thị dòng cảnh báo Điểm chuẩn từ Backend.
- **RAG Knowledge Base Panel:**
  - Giao diện Admin quản lý tài liệu (Thêm/Sửa mô tả ngành học, chương trình đào tạo) để nạp vào Vector Database cho Chatbot.

---

## User Review Required

> [!IMPORTANT]
> Em chuẩn bị bắt tay vào code các file HTML/CSS/JS trong thư mục `dashboard-mockup`. 
> Anh xem qua cấu trúc 2 phân hệ UI/UX này đã đáp ứng đủ tầm nhìn của anh chưa? 

## Lộ Trình Code

1. Tạo bộ thẻ (Task list) theo dõi tiến độ.
2. Code bộ khung HTML/CSS.
3. Viết Javascript để làm form nhập liệu động (chọn khối nào mở môn đó).
4. Viết Javascript giả lập (Mock) quá trình AI trả kết quả + Vẽ biểu đồ SHAP bằng Chart.js.
5. Cập nhật lại file `train_xgboost.py` để chứa danh sách 23 biến này (dưới dạng array mẫu) làm tài liệu tham khảo cho anh.
