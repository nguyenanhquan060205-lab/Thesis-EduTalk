

## BƯỚC 2 — Setup EmailJS (gửi OTP thật, miễn phí)

### 2.1 Tạo tài khoản
1. Vào https://www.emailjs.com → **Sign Up** (miễn phí)
2. Xác nhận email

### 2.2 Tạo Email Service
1. Dashboard → **Email Services** → **Add New Service**
2. Chọn **Gmail** (hoặc Outlook/Yahoo)
3. **Connect Account** → đăng nhập Gmail của bạn → **Authorize**
4. Ghi lại **Service ID** (ví dụ: `service_abc123`)

### 2.3 Tạo Email Template
1. Dashboard → **Email Templates** → **Create New Template**
2. Điền thông tin:
   - **Subject:** `Mã OTP đặt lại mật khẩu EduTalk`
   - **Content (HTML hoặc text):**
     ```
     Xin chào,
     
     Mã OTP của bạn là: {{otp_code}}
     
     Mã có hiệu lực trong 10 phút.
     Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
     
     Trân trọng,
     EduTalk Team
     ```
   - **To Email:** `{{to_email}}`
3. **Save** → ghi lại **Template ID** (ví dụ: `template_xyz789`)

### 2.4 Lấy Public Key
1. Dashboard → **Account** → tab **API Keys**
2. Ghi lại **Public Key** (ví dụ: `user_AbCdEfGhIj`)

### 2.5 Điền vào otp_service.dart
Mở `lib/services/otp_service.dart`, thay 3 giá trị:
```dart
static const String _serviceId  = 'service_abc123';   // ← Service ID của bạn
static const String _templateId = 'template_xyz789';  // ← Template ID của bạn
static const String _publicKey  = 'user_AbCdEfGhIj';  // ← Public Key của bạn
```

> **Tip bảo mật:** Dùng `flutter_dotenv` và đặt vào `.env`:
> ```
> EMAILJS_SERVICE_ID=service_abc123
> EMAILJS_TEMPLATE_ID=template_xyz789
> EMAILJS_PUBLIC_KEY=user_AbCdEfGhIj
> ```
> Rồi đọc trong code: `dotenv.env['EMAILJS_SERVICE_ID'] ?? ''`

---

## BƯỚC 3 — Thêm Firestore collection `otp_codes`

Không cần tạo thủ công, code sẽ tự tạo. Chỉ cần thêm **Security Rules**:

```
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Cho phép app đọc/ghi OTP (không cần auth vì user chưa đăng nhập)
    match /otp_codes/{email} {
      allow read, write: if true;
    }

    // Thêm trường isDarkMode vào users (đã có collection users rồi)
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

> **Lưu ý bảo mật:** Rule `otp_codes` cho phép public vì cần ghi khi chưa đăng nhập.
> OTP chỉ hợp lệ 10 phút và bị xóa sau khi dùng nên an toàn.

---

## BƯỚC 4 — Thêm trường `isDarkMode` vào Firestore users

Không cần migration thủ công. Lần đầu user bật dark mode, `ThemeNotifier.toggleTheme()` sẽ tự `update` document thêm field `isDarkMode: true/false`.

Nếu muốn thêm thủ công trong Firebase Console:
```
users/{uid} → thêm field: isDarkMode (boolean) = false
```

---

## BƯỚC 5 — Tạo thư mục providers

```
lib/
  providers/          ← Tạo thư mục mới này
    theme_notifier.dart
  screens/
    Login.dart
    Setting.dart
    change_password_screen.dart  ← File mới
  services/
    auth_service.dart
    otp_service.dart             ← File mới
  main.dart
```

---

## Tóm tắt flow các tính năng

### 🔐 Quên mật khẩu (Login)
```
Nhấn "Quên mật khẩu?"
  → Dialog Bước 1: Nhập email
  → Sinh OTP 6 số → Lưu Firestore otp_codes/{email} (TTL 10 phút)
  → Gửi OTP qua EmailJS API
  → Dialog Bước 2: 6 ô nhập OTP (auto-focus từng ô)
  → Verify OTP khớp + chưa hết hạn
  → Dialog Bước 3: Nhập mật khẩu mới + xác nhận
  → Firebase sendPasswordResetEmail (link reset chính thức)
  → Xóa OTP khỏi Firestore
  → Dialog thành công → quay về Login
```

### 🔑 Đổi mật khẩu (Setting)
```
Setting → "Đổi mật khẩu"
  → Mở ChangePasswordScreen
  → Nhập mật khẩu hiện tại + mới + xác nhận
  → reauthenticateWithCredential() để verify mật khẩu cũ
  → user.updatePassword(newPass) lưu lên Firebase Auth
  → Dialog thành công → quay về Setting
```

