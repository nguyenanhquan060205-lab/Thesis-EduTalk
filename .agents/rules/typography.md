---
trigger: always_on
description: Quy chuẩn bắt buộc về Typography - Chỉ dùng duy nhất 1 font chữ Plus Jakarta Sans trên toàn bộ website EduTalk
---

# Quy Chuẩn Bắt Buộc Về Typography

1. **Chỉ dùng duy nhất 1 font chữ**:
   - Font duy nhất được phép sử dụng cho toàn bộ dự án (từ giao diện người dùng `/(main)/*` đến trang quản trị `/dashboard/*`): **`Plus Jakarta Sans`** (CSS variable `--font-sans`).
   - Mọi thành phần giao diện (`html`, `body`, `heading`, `input`, `button`, `select`, `textarea`, `table`, `code`, `pre`, `badge`, `modal`, `toast`) đều bắt buộc dùng chung font này.

2. **Quy định cấm**:
   - Nghiêm cấm import hoặc cài đặt thêm bất kỳ font chữ nào khác (`Inter`, `Roboto`, `Geist`, `Fira Code`, monospace, serif...).
   - Không sử dụng font monospace hay font khác làm phá vỡ sự đồng bộ thị giác.

3. **Cấu hình chuẩn**:
   - `web/src/app/layout.tsx`: nạp font `Plus_Jakarta_Sans` từ `next/font/google` với subsets `['latin', 'vietnamese']` và gán variable `--font-sans`.
   - `web/src/app/globals.css`: biến `--font-sans` áp dụng toàn cục `* { font-family: var(--font-sans) !important; }`.
