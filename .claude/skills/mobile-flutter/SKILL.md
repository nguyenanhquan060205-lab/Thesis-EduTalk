---
name: mobile-flutter
description: App di động EduTalk viết bằng Flutter cho iOS và Android — màn hình, service gọi API, xác thực Firebase, thông báo đẩy, giao diện. Dùng khi sửa hoặc thêm màn hình, widget, service trong mobile/, khi đụng tới file .dart, pubspec, luồng đăng nhập trên app, hoặc trạng thái chờ kết quả dự đoán.
---

# Mobile — Flutter (iOS + Android)

```
mobile/lib/
├── main.dart            khởi động: Firebase → dotenv → AppCheck → Notification
├── screens/             54 file .dart, gồm cả screens/admin/
├── services/            api_client.dart + một file cho mỗi miền
├── models/              prediction_model, user_model, post_model, payment_model
├── provider/            Themenotifier.dart (ChangeNotifier)
└── widgets/
```

**Tên package trong pubspec là `ui_login_out`**, không phải `edutalk`. Import nội bộ phải
viết `package:ui_login_out/...`. Đây là di sản, đừng đổi — đổi tên package là sửa import
trong cả 54 file.

```bash
cd mobile && flutter run
```

---

## Trạng thái — hiện trạng thật, đừng refactor

- **Có `provider` 6.1.2**, dùng cho đúng một thứ: `ThemeNotifier`.
- Còn lại là **`setState` trong `StatefulWidget`**.
- **Không có BLoC, không có Riverpod.** Đừng đề xuất chuyển sang — đó là refactor toàn
  app, không phải việc kèm theo một sửa đổi nhỏ.

### `go_router` có trong pubspec nhưng KHÔNG dùng ở đâu cả

Điều hướng thực tế toàn bộ là `Navigator.push` / `Navigator.pop`. Đừng viết code
`context.go(...)` theo thói quen — nó sẽ nổ lúc chạy vì không có `GoRouter` nào được
dựng. Theo đúng lối `Navigator` đang có, trừ khi được yêu cầu rõ là chuyển sang go_router.

---

## Gọi API

`services/api_client.dart` là điểm vào duy nhất. Nó tự gắn Firebase ID Token:

```dart
static Future<Map<String, String>> _headers({bool withAuth = false}) async {
  final headers = {'Content-Type': 'application/json'};
  if (withAuth) { /* Bearer <Firebase ID token> */ }
  return headers;
}
```

**`baseUrl` đang trỏ thẳng vào production:**
```dart
static const String baseUrl = 'https://edutalk-7ndf.onrender.com';
```

Nghĩa là chạy app trên máy là gọi vào server thật, **không phải** `localhost:8000`. Muốn
thử với backend chạy máy mình thì phải sửa hằng số này (và nhớ trả lại). Trên Android
emulator, localhost của máy là `10.0.2.2`, không phải `127.0.0.1`.

Timeout 30 giây. Màn hình chờ kết quả dự đoán phải chịu được ngần đó — người dùng không
được nhìn màn hình trắng 30 giây.

Mỗi miền một file service: `auth`, `admin`, `ai_chat`, `post`, `support`, `payment`,
`notification`, `firestore`, `OTP`. Widget gọi service, **không tự dựng `http.post` và
header `Authorization`**.

---

## Khởi động — thứ tự bắt buộc

`main.dart` chạy trong `runZonedGuarded`, theo đúng thứ tự:

```
1. Firebase.initializeApp()
2. dotenv.load(".env")          ← thiếu file .env là chết ngay ở đây
3. FirebaseAppCheck.activate()  ← lỗi được nuốt có chủ ý, đừng biến thành lỗi chặn
4. NotificationService (chạy nền)
```

`debug` dùng `AndroidProvider.debug` / `AppleProvider.debug`; release dùng
`playIntegrity` / `appAttest`. Đừng đổi nhánh này.

Chèn bước khởi tạo mới thì đặt **sau** dotenv, và bọc `try/catch` nếu nó không thiết yếu
— một service phụ chết không được làm app không mở lên được.

---

## Giao diện

Có `flutter_animate`, `lottie`, `simple_gradient_text`. Chuẩn thẩm mỹ giống bên web:

- Không dùng thẻ phẳng không phản hồi chạm; không gradient loè loẹt
- Padding theo bội số 4/8, đừng chế số lẻ
- **Trạng thái chờ dùng skeleton**, không phải `CircularProgressIndicator` giữa màn hình
  trống — chờ mô hình trả về mất vài giây, spinner trần làm app trông như treo
- Có chế độ sáng/tối qua `ThemeNotifier`: màu mới phải lấy từ `Theme.of(context)`, đừng
  viết cứng `Colors.white` / `Color(0xFF...)` trong widget

---

## Trước khi coi là xong

- `flutter analyze` sạch
- Chạy thật trên máy ảo và **nhìn màn hình**, không chỉ đọc code
- Thử cả hai chế độ sáng/tối nếu có đụng vào màu
- Thử trạng thái mạng chậm hoặc lỗi — không được để màn hình trắng không lối thoát
