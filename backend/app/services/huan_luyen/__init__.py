"""Vòng lặp phản hồi và huấn luyện lại định kỳ cho mô hình Hướng 1.

    phản hồi người dùng ──▶ nhãn "ngành đã chọn/đã đỗ" gắn vào lượt tư vấn đã lưu
            │  theo lịch (hoặc admin bấm chạy)
            ▼
    du_lieu.py     dữ liệu gốc của Giai đoạn 10 + phiếu phản hồi (tách phần giữ lại để đo)
    mo_hinh.py     huấn luyện lại ĐÚNG cấu hình đã chốt — chép nguyên logic MoHinhNganh
    tien_trinh.py  chấm ứng viên với mô hình đang phục vụ trên tập test khoá + phiếu giữ lại,
                   qua cổng kiểm định mới được đưa vào phục vụ
    phien_ban.py   lưu từng phiên bản vào MongoDB GridFS — Render xoá đĩa sau mỗi lần
                   deploy, lưu file cục bộ là mất

Không tinh chỉnh siêu tham số lại trong vòng lặp này: cấu hình do Giai đoạn 9 chọn trên
tập val với ràng buộc chống học vẹt. Tự động dò lại theo dữ liệu phản hồi ít ỏi là cách
nhanh nhất để học vẹt đúng mấy chục phiếu đó.
"""
