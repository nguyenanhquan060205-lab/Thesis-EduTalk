# Kế hoạch: xác thực OTP cho đăng ký và đổi email / số điện thoại

**Ngày lập:** 03/09/2026 · **Phạm vi:** `backend/app/services/auth_service.py`,
`backend/app/api/v1/auth.py`, `web/src/app/(main)/auth/register`, `web/src/app/(main)/profile`

---

## 0. Quyết định đã chốt (03/09/2026)

| Câu hỏi | Chốt |
|---|---|
| Xác thực số điện thoại | **Bỏ.** SĐT sửa trực tiếp như tên / trường / ngày sinh. Lý do: dự án không có nhà cung cấp SMS (`.env` chỉ có `EMAILJS_*`), cắm eSMS thì tốn phí và chờ duyệt brandname |
| Làm gì trước | **Chỉ làm email.** |
| Đóng popup giữa chừng | **Cho vào ứng dụng**, chặn riêng các thao tác cần email đã xác minh. Chặn đăng nhập hẳn thì người dùng mất tài khoản chỉ vì lỡ đóng tab |

**Thao tác bị chặn khi `emailVerified = false`:** đăng bài cộng đồng, bình luận.
Tra cứu ngành, làm khảo sát gợi ý ngành, xem tin tức… **vẫn dùng bình thường** —
đó là phần giá trị chính, chặn lại là phản tác dụng.

## 1. Quy tắc OTP dùng chung cho mọi luồng

| Thuộc tính | Giá trị |
|---|---|
| Độ dài | 6 chữ số |
| Hiệu lực | **90 giây** |
| Số lần nhập sai tối đa | **3** |
| Gửi lại | Chỉ bật **sau khi hết 90 giây**; mã cũ mất hiệu lực ngay khi gửi mã mới |
| Sai đủ 3 lần | Xoá mã, trả `reset: true` → giao diện **reset về bước đầu** |
| Lưu ở đâu | MongoDB `otp_codes`, `_id` = email hoặc số điện thoại |

Bản ghi: `{ _id, otp, target, channel, expiresAt, createdAt, verified, attempts }`

---

## 2. Ba luồng cụ thể

### 2.1 Đăng ký — xác thực email **một lần**
```
Nhập form đăng ký → tạo tài khoản → gửi OTP tới email
   → popup nhập mã (90s)
        ├─ đúng           → emailVerified = true → vào ứng dụng
        ├─ hết 90s        → bật nút "Gửi lại mã", mã cũ vô hiệu
        └─ sai 3 lần      → XOÁ tài khoản (Firebase + MongoDB)
                            → đóng popup, xoá form, quay lại trang đăng ký trống
```
**Không** xác thực số điện thoại ở bước đăng ký (theo yêu cầu).

### 2.2 Hồ sơ — đổi email
Nút **"Đổi"** riêng cạnh ô Email → nhập email mới → gửi OTP tới **địa chỉ mới** →
popup nhập mã → đúng thì đổi cả Firebase Auth lẫn MongoDB.
Sai 3 lần → **chỉ huỷ phiên đổi email**, không đụng gì tới tài khoản.

### 2.3 Hồ sơ — đổi số điện thoại
**Không xác thực.** SĐT nằm trong form sửa chung, lưu thẳng qua `PUT /users/{uid}`.

---

## 3. Backend

### 3.1 Đã làm
- [x] `send_otp(target, channel)` — TTL **90s**, ghi đè mã cũ khi gửi lại
- [x] `verify_otp(target, otp)` — đếm `attempts`, trả `attemptsLeft` / `expired` / `reset`
- [x] `_gui_otp_email()` qua EmailJS · `_gui_otp_sms()` là điểm cắm, chưa cấu hình thì báo lỗi
- [x] `change_email(uid, newEmail, otp)`
- [x] `verify_registration(uid, otp)` — sai 3 lần thì gọi `delete_account(uid)`

### 3.2 Còn phải làm
- [x] `OtpSendRequest` nhận thêm `channel: "email" | "sms"` (đang chỉ có `email: EmailStr`)
- [x] `POST /auth/registration/verify` — body `{ otp }`, cần token
- [x] Sửa `POST /auth/otp/verify` đang gọi `verify_otp(email=…)` — tham số đã đổi tên thành `target`
- [x] Gỡ `change_phone()` khỏi service (viết ra rồi nhưng không dùng nữa)
- [x] Chặn đổi sang email **đã có người khác dùng**
- [x] `emailVerified: False` khi tạo tài khoản; chặn đăng bài / bình luận nếu chưa xác minh
- [x] Giới hạn tần suất gửi: tối thiểu 60s giữa 2 lần gửi tới cùng một đích

---

## 4. Frontend

### 4.1 Component dùng chung `OtpDialog`
Một popup duy nhất cho cả 3 luồng, đặt ở `web/src/components/ui/OtpDialog.tsx`,
render qua `Modal` (đã có portal):

- 6 ô nhập, tự nhảy ô, dán được cả chuỗi 6 số
- Đồng hồ đếm ngược **90 giây**
- Hết giờ → khoá ô nhập, bật nút **"Gửi lại mã"**
- Hiện **"Còn N lần thử"** sau mỗi lần sai
- Sai lần thứ 3 → gọi `onReset()` do trang cha truyền vào

Props: `open · target · channel · onVerify(otp) · onResend() · onReset() · onSuccess()`

### 4.2 Trang đăng ký
- [x] Sau khi đăng ký thành công → mở `OtpDialog`
- [x] `onReset` → gọi `POST /auth/registration/abandon`, xoá toàn bộ form, đăng xuất, về trạng thái trống

### 4.3 Trang hồ sơ
- [x] Nút **"Đổi"** riêng cạnh ô Email, không phải bấm "Chỉnh sửa" mới thấy
- [x] Ô `phone` giữ trong form sửa chung như hiện tại
- [x] Băng-rôn nhắc xác minh khi `emailVerified = false`, kèm nút gửi lại mã

---

## 5. Việc phải xử lý cho chắc

| Tình huống | Cách xử lý |
|---|---|
| Đóng popup giữa chừng lúc đăng ký | Vào được ứng dụng, `emailVerified = false`, băng-rôn nhắc ở hồ sơ, chặn đăng bài / bình luận |
| Người dùng mở 2 tab cùng đổi email | `_id` là email đích nên tab sau ghi đè mã của tab trước — chấp nhận được |
| Đồng hồ chạy tiếp khi máy ngủ | Đếm ngược theo `Date.now()` chứ không cộng dồn `setInterval` |
| Email mới trùng email hiện tại | Chặn ngay ở client, không tốn lượt gửi |
| Xoá tài khoản giữa chừng thất bại | `delete_account` đã xoá cả Firebase + MongoDB + `prediction_history`; nếu lỗi thì báo và giữ nguyên |

---

## 6. Kiểm chứng

- Nhập đúng mã → đổi thành công, đọc lại DB thấy giá trị mới
- Nhập sai 1, 2 lần → hiện "Còn 2 / 1 lần thử"
- Nhập sai lần 3 → đăng ký: tài khoản **biến mất khỏi cả Firebase và MongoDB**; đổi email/SĐT: chỉ huỷ phiên
- Chờ quá 90 giây → ô nhập khoá, nút gửi lại bật, mã cũ nhập vào bị từ chối
- Bấm gửi lại → mã cũ **không còn dùng được**, chỉ mã mới hợp lệ
- `tsc --noEmit` = 0 lỗi, `eslint` không thêm lỗi mới, mọi trang HTTP 200

---

## 7. Kết quả

**✅ Hoàn thành 03/09/2026.** `tsc --noEmit` = 0 lỗi, `eslint` 0 cảnh báo trên các file
đã đụng, mọi trang HTTP 200.

Đã kiểm chứng bằng gọi API thật:

```
gửi mã            → {"status":"success","expiresIn":90}
gửi lại ngay      → "Mã trước còn hiệu lực, thử lại sau 87 giây."
sai lần 1         → {"message":"Mã không đúng. Còn 2 lần thử.", "attemptsLeft":2}
sai lần 2         → {"message":"Mã không đúng. Còn 1 lần thử.", "attemptsLeft":1}
sai lần 3         → {"message":"...Phiên xác thực bị huỷ...", "reset":true}
sai lần 4         → "Mã không tồn tại hoặc đã hết hiệu lực."   (mã đã bị xoá)
```

**Ghi chú thiết kế phát sinh:** ban đầu backend trả `detail` là chuỗi, client phải đoán
tình huống qua nội dung câu chữ — đổi một dấu chấm là hỏng. Đã đổi sang `detail` có cấu
trúc `{ message, expired, reset, deleted, attemptsLeft }` để giao diện biết chính xác
phải bật nút gửi lại, hay đóng popup và reset.

**Tài khoản cũ** (`emailVerified` chưa tồn tại) được coi là đã xác minh, không bị khoá
nhầm — chỉ tài khoản đăng ký từ nay mới mang cờ `emailVerified: false`.

---

## 8. Thứ tự thực hiện

1. Hoàn thiện backend §3.2 (models, endpoints, chuẩn hoá SĐT, chặn trùng, giới hạn tần suất)
2. Dựng `OtpDialog`
3. Nối luồng đăng ký
4. Nối luồng đổi email
6. Chặn đăng bài / bình luận khi chưa xác minh
7. Kiểm chứng theo §6
