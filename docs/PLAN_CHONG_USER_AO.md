# Kế hoạch: hạn chế tài khoản ảo và spam

**Ngày lập:** 03/09/2026 · **Bối cảnh:** đã có xác minh email bằng OTP, nhưng OTP một
mình không ngăn được tài khoản ảo — chỉ chứng minh "có ai đó đọc được hộp thư đó".

---

## 1. Hiện trạng — 6 lỗ tìm được

| # | Lỗ | Mức độ | Bằng chứng |
|---|---|---|---|
| 1 | **Không có rate-limit theo IP** ở bất kỳ endpoint nào | 🔴 Cao | `grep slowapi\|Limiter\|request.client` → không có kết quả |
| 2 | **`allow_origins=["*"]`** kèm `allow_credentials=True` | 🔴 Cao | `app/main.py:60` — bất kỳ trang nào cũng gọi API được |
| 3 | **Không chặn email dùng một lần** | 🟠 Vừa | `10minutemail`, `guerrillamail`… đăng ký và nhận OTP bình thường |
| 4 | **Tài khoản chưa xác minh không bao giờ bị dọn** | 🟠 Vừa | Chỉ xoá khi sai OTP 3 lần; đóng popup là để lại tài khoản treo vĩnh viễn |
| 5 | **Không giới hạn số bài / bình luận mỗi người** | 🟠 Vừa | Bài có kiểm duyệt nên đỡ, **bình luận thì không** — spam thẳng |
| 6 | **Google sign-in không ghi `emailVerified`** | 🟡 Thấp | `auth_service.py:186` — doc thiếu field, guard coi như đã xác minh. Đúng về mặt kết quả (Google đã xác minh email) nhưng dựa vào việc *thiếu field* là mong manh |

> **Lỗ 1 mới là cái nặng nhất**, không phải email. Có OTP nhưng không có rate-limit thì
> một script vẫn tạo được hàng trăm tài khoản, và mỗi lần gọi `/auth/otp/send` là một
> email thật bị gửi đi — đốt quota EmailJS và có nguy cơ bị nhà cung cấp khoá.
>
> Rate-limit gửi OTP hiện có **chỉ tính theo email đích**. Script đổi email mỗi lần gọi
> là đi vòng qua được ngay.

---

## 2. Đề xuất, xếp theo tỉ lệ hiệu quả / công sức

### Nhóm A — nên làm, rẻ và chặn được phần lớn (~2 giờ)

| Việc | Chi tiết |
|---|---|
| **A1. Rate-limit theo IP** | `slowapi`: `/auth/register` 5 lần/giờ · `/auth/otp/send` 3 lần/giờ · `/posts` POST 10 lần/giờ · comments 30 lần/giờ |
| **A2. Sửa CORS** | Thay `["*"]` bằng danh sách domain thật, đọc từ `.env` (`ALLOWED_ORIGINS`) |
| **A3. Chặn email dùng một lần** | Danh sách ~200 domain phổ biến, chặn ngay ở `/register`, trả lỗi rõ ràng |
| **A4. Dọn tài khoản treo** | Xoá tài khoản `emailVerified: false` quá **24 giờ** — chạy nền khi khởi động + mỗi 6 giờ |
| **A5. Google ghi rõ `emailVerified: True`** | Tường minh thay vì dựa vào việc thiếu field |

### Nhóm B — cân nhắc (~1–2 giờ)

| Việc | Đánh đổi |
|---|---|
| **B1. Giới hạn số tài khoản / IP** | Chặn được đăng ký hàng loạt, nhưng **cả phòng máy trường dùng chung 1 IP** sẽ bị chặn nhầm. Nếu làm thì ngưỡng phải rộng (10–15/ngày) |
| **B2. Cloudflare Turnstile** ở form đăng ký | Miễn phí, không cần người dùng bấm gì. Nhưng thêm phụ thuộc bên thứ ba và cần cấu hình khoá |

### Nhóm C — không nên làm

| | Lý do |
|---|---|
| Bắt xác thực SĐT | **Đã chốt bỏ** — không có nhà cung cấp SMS, tốn phí, chờ duyệt brandname |
| Duyệt thủ công từng tài khoản | Không khả thi với khoá luận, và chặn cả người dùng thật |
| Chặn theo dải IP / VPN | Sai nhiều hơn đúng, chặn oan người dùng thật |

---

## 3. Nói thẳng về giới hạn

Không có cách nào chặn triệt để tài khoản ảo. Người có chủ đích vẫn dùng được email
thật, IP khác nhau, và làm thủ công. **Mục tiêu thực tế là nâng chi phí tấn công** cho
tới mức spam hàng loạt không còn đáng, chứ không phải chặn 100%.

Với một khoá luận, **Nhóm A là đủ và tương xứng**. Nhóm B nên để phần "hướng phát triển".

---

## 4. Cần bạn quyết

1. Làm **Nhóm A** (5 việc) hay chỉ một phần?
2. Có làm **B1** (giới hạn tài khoản/IP) không — chấp nhận rủi ro chặn nhầm phòng máy chung?
3. Có cắm **B2** (Turnstile) không — bạn có tài khoản Cloudflare chưa?
4. Tài khoản treo dọn sau bao lâu: **24 giờ** như tôi đề xuất, hay dài/ngắn hơn?

---

## 5. Kiểm chứng khi làm xong

- Gọi `/auth/register` quá ngưỡng → HTTP **429**, kèm câu báo bằng tiếng Việt
- Đăng ký bằng `test@10minutemail.com` → bị từ chối, nêu rõ lý do
- Tạo tài khoản rồi đóng popup, chỉnh `createdAt` lùi 25 giờ → tác vụ dọn xoá nó khỏi
  **cả Firebase lẫn MongoDB**
- Gọi API từ domain lạ → bị CORS chặn
- Đăng nhập Google lần đầu → `emailVerified: true` trong MongoDB
- `tsc --noEmit` = 0 lỗi, backend biên dịch sạch, mọi trang HTTP 200
