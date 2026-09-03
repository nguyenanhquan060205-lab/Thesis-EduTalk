# Kế hoạch: Che email phía người dùng + đổi email xác minh 2 chặng

**Ngày lập:** 03/09/2026 · **Nguồn yêu cầu:** yêu cầu trực tiếp của người dùng

---

## 1. Yêu cầu

1. Ở màn hình người dùng (hồ sơ, cài đặt…) email hiện dạng che một phần `co**********@gmail.com`.
   **Riêng dashboard quản trị thì hiện đầy đủ.**
2. Muốn đổi email, người dùng phải qua **hai chặng OTP**:

```
Chặng 0  Gõ đúng email HIỆN TẠI (đối chiếu với phần đã che)
   ↓
Chặng 1  OTP 6 số gửi về email CŨ · 90 giây · sai tối đa 3 lần
   ↓     hết 90s → bật nút gửi lại mã
   ↓     sai 3 lần → huỷ phiên, làm lại từ đầu
   ↓
Chặng 2  Nhập email MỚI → OTP gửi về email MỚI · 90 giây · sai tối đa 3 lần
   ↓     sai 3 lần → GIỮ NGUYÊN email cũ, huỷ phiên, làm lại từ đầu
   ↓
Cập nhật email (Firebase Auth + MongoDB)
```

---

## 2. Hiện trạng

### 2.1 Luồng đổi email hiện tại chỉ có **một** chặng

`auth_service.change_email()` ([auth_service.py:534](../backend/app/services/auth_service.py#L534))
chỉ kiểm OTP gửi tới **địa chỉ mới**:

```python
kt = await self.verify_otp(target=new_email, input_otp=otp)
```

Không có bất kỳ bước nào xác minh người đang thao tác thật sự làm chủ hộp thư **cũ**.

### 2.2 Chính sách che đang **ngược** với yêu cầu

| Ai xem | Hiện tại | Yêu cầu mới |
|---|---|---|
| Người dùng xem hồ sơ của chính mình | **đầy đủ** | **che** |
| Admin xem người dùng trong dashboard | **che** (`che_ho_so`) | **đầy đủ** |

Chỗ phải sửa: [users.py:64](../backend/app/api/v1/users.py#L64) và
[admin.py:465](../backend/app/api/v1/admin.py#L465).

### 2.3 Phần dùng lại được

- `verify_otp()` đã có sẵn: 90 giây (`OTP_SONG_GIAY`), tối đa 3 lần (`OTP_TOI_DA_SAI`),
  trả `reset=True` khi hết lượt → **không phải viết lại**.
- `OtpDialog.tsx` đã có 6 ô, đếm ngược 90 giây, tự bật nút gửi lại, xử lý `onReset`
  → **dùng lại nguyên vẹn cho cả hai chặng**.

---

## 3. Quyết định thiết kế

### 3.1 Hai chặng phải được ép ở **backend**, không phải chỉ ở giao diện

Nếu chỉ làm ở React, người có phiên đăng nhập vẫn gọi thẳng
`POST /auth/change-email` là bỏ qua được chặng 1. Vì vậy cần một **phiên đổi email**
lưu ở server:

```
Collection: email_change_sessions
  _id          uid người dùng (mỗi người tối đa 1 phiên đang mở)
  emailCu      email tại thời điểm mở phiên
  buoc         "cho_xac_minh_cu" | "da_xac_minh_cu"
  cuXongLuc    thời điểm xác minh xong chặng 1
  emailMoi     điền ở chặng 2
  taoLuc       để dọn phiên quá hạn
```

`change-email` chỉ chấp nhận khi phiên tồn tại, `buoc == "da_xac_minh_cu"`, và
`emailCu` vẫn khớp email hiện tại trong DB.

**Phiên sống 15 phút.** Đủ cho hai chặng 90 giây cộng thời gian mở hộp thư, nhưng
không để một phiên đã xác minh nằm mở vô hạn.

### 3.2 Chặng 0 cũng phải giới hạn số lần

Bắt gõ lại email hiện tại mà không giới hạn thì chính nó thành công cụ dò ngược
phần đã che: gõ thử tới khi server trả "đúng". Cho **3 lần**, hết thì huỷ phiên.

### 3.3 Chỉ che `email`, **không** che `phone` và `dob`

Đây là chỗ dễ hỏng dữ liệu nhất.

`UpdateProfileRequest` ([user_models.py:6](../backend/app/models/user_models.py#L6))
cho ghi `phone`, `dob`, `school`… còn form sửa hồ sơ thì nạp thẳng giá trị từ
`GET /users/{uid}` vào ô nhập. Nếu che `phone` cho chính chủ thì form hiện
`090****311`, người dùng chỉ sửa mỗi tên rồi bấm lưu → **ghi đè chuỗi sao vào DB,
mất số điện thoại thật**.

`email` không nằm trong `UpdateProfileRequest` nên che nó là an toàn tuyệt đối.
Yêu cầu cũng chỉ nói tới gmail → **giữ nguyên phạm vi đó**, không che thêm.

### 3.4 "Trả về gmail cũ" không cần thao tác hoàn tác

Email chỉ được ghi ở bước cuối cùng. Chặng 2 hỏng thì chưa có gì bị đổi — chỉ cần
xoá phiên. Không cần lưu bản sao để khôi phục.

---

## 4. Việc cần làm

### 4.1 Backend

| # | Việc | Tệp |
|---|---|---|
| 1 | `che_email()` — giữ nguyên, đã có | `core/privacy.py` |
| 2 | Trả email đã che cho **chính chủ**; thêm cờ `emailDaChe` | `api/v1/users.py` |
| 3 | Bỏ `che_ho_so` ở danh sách admin → hiện đầy đủ | `api/v1/admin.py` |
| 4 | `POST /auth/email-change/start` — nhận email hiện tại người dùng gõ, đối chiếu, đếm sai 3 lần, tạo phiên, gửi OTP về email cũ | `api/v1/auth.py` + `auth_service.py` |
| 5 | `POST /auth/email-change/verify-old` — kiểm OTP email cũ, chuyển `buoc` sang `da_xac_minh_cu` | nt |
| 6 | `POST /auth/email-change/set-new` — nhận email mới, kiểm trùng, gửi OTP về email mới | nt |
| 7 | Sửa `change_email()` — bắt buộc có phiên hợp lệ ở bước `da_xac_minh_cu`, xong thì xoá phiên | `auth_service.py` |
| 8 | `POST /auth/email-change/cancel` — huỷ phiên khi người dùng đóng giữa chừng | nt |

### 4.2 Frontend

| # | Việc | Tệp |
|---|---|---|
| 9 | Hiện email đã che, kèm ghi chú "đã ẩn bớt để bảo mật" | `(main)/profile/page.tsx` |
| 10 | Dựng máy trạng thái 4 bước: `nhap_cu` → `otp_cu` → `nhap_moi` → `otp_moi` | nt |
| 11 | Dùng lại `OtpDialog` cho cả hai chặng, đổi `title` và `target` theo bước | `components/ui/OtpDialog.tsx` (không sửa) |
| 12 | `onReset` ở bất kỳ chặng nào → gọi `cancel`, quay về bước đầu, báo lý do | `(main)/profile/page.tsx` |
| 13 | Bổ sung 4 hàm gọi API mới | `services/profile.ts` |
| 14 | Dashboard admin: giữ nguyên, email tự hiện đầy đủ sau mục 3 | `dashboard/users/page.tsx` |

---

## 5. Kiểm chứng khi xong

- Gõ sai email hiện tại 3 lần → phiên bị huỷ, phải bắt đầu lại
- Nhập đúng email cũ → mã về **hộp thư cũ**, không phải hộp thư mới
- Để quá 90 giây → ô nhập khoá, nút gửi lại bật
- Sai mã 3 lần ở chặng 1 → huỷ phiên; kiểm DB thấy email **không đổi**
- Sai mã 3 lần ở chặng 2 → huỷ phiên; kiểm DB thấy email **vẫn là email cũ**
- Gọi thẳng `POST /auth/change-email` bằng `curl` mà không qua chặng 1 → **bị từ chối**
- Sửa hồ sơ (đổi tên) rồi lưu → `phone` và `dob` trong DB **giữ nguyên giá trị thật**
- Người dùng xem hồ sơ mình → email che; admin xem cùng người đó → email đầy đủ
- `tsc --noEmit` = 0 lỗi, `eslint` sạch, các trang HTTP 200
