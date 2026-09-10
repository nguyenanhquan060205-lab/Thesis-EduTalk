# Tài liệu tham chiếu Mobile Responsive — web/

> Đọc kèm [../SKILL.md](../SKILL.md) và [nang-cap-uiux.md](nang-cap-uiux.md).
> Căn cứ theo chuẩn mở Apple Human Interface Guidelines, Google Material Design 3 và ui-ux-pro-max-skill.

---

## Danh mục kiểm tra nhanh khi làm việc trên giao diện Web (Mobile Checklist)

| Mục | Lỗi thường gặp | Giải pháp chuẩn |
|---|---|---|
| **Lề ngoài & Đệm thẻ** | `p-8 sm:p-12` trên mobile làm mất $60-80\text{px}$ ngang | Dùng `p-4 sm:p-6 lg:p-8`. Container ngoài `px-4 sm:px-6 lg:px-8`. |
| **Biểu đồ Recharts** | `margin={{ left: 160 }}` và `width={150}` bóp nghẹt cột thanh | Mobile: `left: 85 - 90`, `YAxis width={80 - 90}`, phông `10px`. |
| **Dải lọc nhóm ngành** | `flex-wrap` tạo 6 dòng nút choán hết màn hình | Cuộn ngang: `flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap`. |
| **Nút bấm & Điểm chạm** | Nút nhỏ khó chạm, xếp quá sát nhau | Tối thiểu $44 \times 44\text{px}$, `gap-2` ($\ge 8\text{px}$), `active:scale-95`. |
| **Tiêu đề Hero** | `text-4xl` hoặc `text-5xl` làm gãy chữ vụn 5 dòng | Tiêu đề: `text-2xl sm:text-5xl lg:text-7xl font-black tracking-tight`. |
| **Sidebar Quản trị** | Cố định `w-64` làm đè nát nội dung admin trên mobile | Ẩn trên mobile: `hidden lg:flex w-64`. |
| **Bảng màu** | Thêm màu lạ hoặc dùng emerald/amber/rose trang trí | **Khoá cứng:** Slate + Blue HUIT. Semantic colors chỉ cho điểm trúng tuyển. |
