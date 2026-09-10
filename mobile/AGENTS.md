# Luật cho `mobile/`

**Đọc trước khi sửa:** `../.claude/skills/mobile-flutter/SKILL.md`

Chú thích code viết **tiếng Việt**.

## Hiện trạng thật — đừng refactor theo thói quen

1. **Tên package là `ui_login_out`**, không phải `edutalk`. Import nội bộ viết
   `package:ui_login_out/...`. Đây là di sản, đừng đổi — đổi là sửa import trong cả 54 file.

2. **`go_router` có trong `pubspec.yaml` nhưng KHÔNG dùng ở đâu cả.** Điều hướng thực tế
   toàn bộ là `Navigator.push` / `Navigator.pop`. Viết `context.go(...)` sẽ **nổ lúc chạy**
   vì không có `GoRouter` nào được dựng.

3. **Không có BLoC, không có Riverpod.** Trạng thái là `setState` + một `ChangeNotifier`
   (`ThemeNotifier`) qua `provider`. Đừng đề xuất chuyển sang BLoC — đó là refactor toàn
   app, không phải việc kèm theo một sửa đổi nhỏ.

4. **`baseUrl` trong `lib/services/api_client.dart` trỏ thẳng production:**
   `https://edutalk-7ndf.onrender.com`. Chạy app trên máy là gọi vào server thật, **không
   phải** `localhost:8000`. Muốn thử với backend máy mình thì sửa hằng số này và nhớ trả
   lại. Trên Android emulator, localhost của máy là `10.0.2.2`.

5. **Gọi API qua `services/`**, không tự dựng `http.post` và header `Authorization` trong
   widget — `api_client.dart` đã tự gắn Firebase ID Token.

## Khởi động — thứ tự bắt buộc trong `main.dart`

```
Firebase.initializeApp()  →  dotenv.load(".env")  →  AppCheck  →  NotificationService
```

Bước AppCheck **nuốt lỗi có chủ ý**, đừng biến thành lỗi chặn. Chèn bước mới thì đặt
**sau** dotenv và bọc `try/catch` nếu không thiết yếu — một service phụ chết không được
làm app không mở lên được.

## Giao diện

Trạng thái chờ dùng **skeleton**, không dùng `CircularProgressIndicator` giữa màn hình
trống — chờ mô hình trả kết quả mất vài giây, spinner trần làm app trông như treo.

Màu lấy từ `Theme.of(context)`, đừng viết cứng `Colors.white` / `Color(0xFF...)` — app có
chế độ sáng/tối qua `ThemeNotifier`.

## Xong nghĩa là

`flutter analyze` sạch, và **đã chạy thật trên máy ảo nhìn màn hình**, không chỉ đọc code.
