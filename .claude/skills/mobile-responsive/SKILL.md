---
name: mobile-responsive
description: Bộ quy chuẩn và nguyên tắc thiết kế Mobile-First UI/UX Responsive cho EduTalk (Web & Mobile). Tổng hợp từ các dự án mã nguồn mở chuẩn mực (Apple HIG, Google Material Design 3, ui-ux-pro-max-skill). Dùng khi căn chỉnh bố cục, tỷ lệ lề, kích thước điểm chạm, biểu đồ Recharts và dải lọc trên điện thoại thông minh (360px - 428px).
---

# Quy Chuẩn Thiết Kế Mobile-First UI/UX Responsive — EduTalk

> **Nguồn gốc:** Đúc kết từ Apple Human Interface Guidelines, Google Material Design 3,
> Nielsen Norman Group và open-source `ui-ux-pro-max-skill`.
> Áp dụng chặt chẽ cho toàn bộ giao diện `web/` và `mobile/` của dự án EduTalk HUIT.

---

## 1. Ngân sách Lề Đệm (Padding Budget) & Chống "Bẫy Lồng Padding"

### Vấn đề thường gặp
Trên màn hình điện thoại có chiều rộng chỉ $360\text{ px} - 414\text{ px}$, diện tích hiển thị chiều ngang là tài nguyên quý giá nhất.
- Lỗi phổ biến: Container ngoài dùng `px-4` hoặc `px-6`, sau đó các Card con bên trong lại dùng `p-6`, `p-8` hoặc `p-10`.
- Hậu quả: Tổng lề đệm 2 bên lên tới $64\text{ px} - 80\text{ px}$ (chiếm 20–25% toàn bộ màn hình). Nội dung cốt lõi bị ép vào một khe hẹp chỉ còn hơn $200\text{ px}$, khiến chữ bị rớt dòng lắt nhắt, nút bấm vỡ vụn.

### Quy tắc chuẩn hoá
- **Container ngoài:** `px-4 sm:px-6 lg:px-8` (tuyệt đối không dùng `px-6` hay `px-8` trên mobile `< 640px`).
- **Thẻ Card con:** `p-4 sm:p-6 lg:p-8` (mobile luôn bắt đầu bằng `p-4`, tối đa `p-5` cho card chính).
- **Thẻ lồng bên trong thẻ con:** `p-3 sm:p-4`.
- **Khoảng cách hàng/cột:** `gap-3 sm:gap-4 lg:gap-6`.

```tsx
// ❌ SAI: Ép nghẹt nội dung trên điện thoại
<div className="max-w-7xl mx-auto px-6 py-12">
  <div className="bg-white rounded-3xl p-8 sm:p-12">
    <div className="p-6 bg-slate-50">...</div>
  </div>
</div>

// ✅ ĐÚNG: Tỉ lệ cân đối, thoáng đãng trên mọi kích thước màn hình
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
  <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl">...</div>
  </div>
</div>
```

---

## 2. Kích thước Điểm Chạm (Touch Target Ergonomics)

Theo chuẩn ngón tay người dùng (Apple HIG & Material Design 3):
- **Kích thước tối thiểu cho vùng bấm:** $44 \times 44\text{ px}$ (Apple) hoặc $48 \times 48\text{ px}$ (Google).
- **Khoảng cách an toàn giữa 2 nút cạnh nhau:** Tối thiểu $8\text{ px}$ (`gap-2`) để tránh chạm nhầm.
- **Thang đo Likert (1 - 5) trên form khảo sát:**
  - Nút phải co giãn đều `flex-1` trên hàng ngang điện thoại.
  - Chiều cao tối thiểu `h-10 sm:h-11` (40px–44px).
  - Có phản hồi xúc giác/hoạt ảnh: `active:scale-95 transition-all`.

---

## 3. Chuẩn Responsive cho Biểu Đồ Recharts trên Điện Thoại

### Vấn đề
Biểu đồ nằm ngang (`layout="vertical"`) thường khai báo `margin={{ left: 160 }}` và `YAxis width={150}` cho màn hình máy tính. Khi xem trên điện thoại $360\text{ px}$, trục nhãn chiếm hơn 50% màn hình, các thanh bar giá trị bị bóp méo thành mẩu ngắn cũn cỡn.

### Quy tắc thiết kế
1. **Co dãn lề linh hoạt theo thiết bị:**
   - Desktop: `left: 150 - 160`, `YAxis width={140 - 150}`, phông chữ `11px - 12px`.
   - Mobile: `left: 80 - 90`, `YAxis width={80 - 90}`, phông chữ `10px` gọn gàng.
   - Thanh bar phải chiếm tối thiểu **65%–70%** bề ngang khả dụng của biểu đồ.
2. **Luôn bọc trong `ResponsiveContainer`** với thẻ cha có `h-64` hoặc `h-72`.
3. **Mốc đối chứng (ReferenceLine):** Nhãn mốc đối chứng (như mốc đoán ngẫu nhiên $11.1\%$) phải gọn gàng, tránh che khuất các thanh biểu đồ.

---

## 4. Dải Lọc Nhiều Mục: Thanh Cuộn Ngang (Horizontal Chip Strip)

### Vấn đề
Khi có danh sách 8–10 danh mục (như 9 nhóm ngành đào tạo HUIT), nếu dùng `flex-wrap` thì trên điện thoại sẽ rớt thành 5–6 hàng nút, đẩy toàn bộ nội dung chính xuống dưới nếp gấp màn hình (below the fold).

### Quy tắc thiết kế
- Chuyển thành dải cuộn ngang không lộ thanh cuộn:
  `flex overflow-x-auto no-scrollbar gap-2 pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap`
- Thêm thuộc tính `shrink-0` cho từng nút chip con.
- Người dùng điện thoại có thể vuốt ngón tay nhẹ nhàng qua lại trên 1 dòng duy nhất, tiết kiệm ngay $200\text{ px}$ chiều cao màn hình.

---

## 5. Thang Co Giãn Cỡ Chữ (Typography Scaling & Clamp)

- **Tiêu đề trang (H1):** `text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight`.
  - Tuyệt đối không dùng `text-5xl` hay `text-4xl` cố định trên mobile cho tiêu đề dài tiếng Việt.
- **Tiêu đề phần (H2):** `text-lg sm:text-2xl font-black`.
- **Chữ thân bài (Body text):** `text-xs sm:text-sm font-medium leading-relaxed`.
- **Nhãn phụ / Badge / Caption:** `text-[10px] sm:text-xs font-bold`. Tuyệt đối không để chữ rớt xuống dưới $9\text{ px}$.

---

## 6. Bố Cục Quản Trị & Sidebar trên Điện Thoại

- Sidebar cố định `w-64` bắt buộc phải ẩn trên màn hình nhỏ: `hidden lg:flex`.
- Hỗ trợ menu trượt hoặc thanh điều hướng rút gọn trên mobile, không để sidebar chiếm trọn màn hình và bóp nghẹt các bảng dữ liệu.
- Mọi bảng biểu (Data Table) phải có `overflow-x-auto` để cuộn ngang mượt mà.

---

## 7. Bảng Màu Khoá Cứng (Bắt buộc tuân thủ)

Dù căn chỉnh responsive thế nào, **tuyệt đối giữ đúng bảng màu khoá cứng của dự án**:
- Nền / chữ: `slate-50` $\rightarrow$ `slate-950`.
- Nhấn chính HUIT: `#0054A6` · `bg-blue-50` · `border-blue-200`.
- Semantic colors `emerald` (an toàn) / `amber` (có khả năng) / `rose` (rủi ro) **chỉ dành riêng cho mức độ trúng tuyển tuyển sinh**, không dùng trang trí chip lung tung.
