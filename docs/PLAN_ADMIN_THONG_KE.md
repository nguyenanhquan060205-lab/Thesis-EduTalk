# Kế hoạch: hoàn thiện khu vực quản trị và thống kê dữ liệu

**Ngày lập:** 03/09/2026 · **Phạm vi:** `backend/app/api/v1/admin.py`, `web/src/app/dashboard/`

---

## 1. Kiểm kê: admin hiện quản lý được gì

### 1.1 Có endpoint **và** có giao diện

| Chức năng | Endpoint | Trang |
|---|---|---|
| Tổng quan | `GET /admin/dashboard` | `/dashboard` |
| Duyệt tin tức | `GET/POST/DELETE /admin/news/*` | `/dashboard/news` |
| Duyệt bài cộng đồng | `GET /admin/posts/pending`, `PUT .../approve`, `.../reject` | `/dashboard/posts` |

### 1.2 Có endpoint nhưng **chưa có giao diện** — đây là phần lãng phí lớn nhất

| Chức năng | Endpoint |
|---|---|
| Danh sách người dùng | `GET /admin/users` |
| Cấp / gỡ Premium | `PUT /admin/users/{uid}/premium` |
| Xoá người dùng | `DELETE /admin/users/{uid}` |
| Xem **mọi** bài viết (cả đã ẩn) | `GET /admin/posts` |
| Xoá bài viết | `DELETE /admin/posts/{post_id}` |
| Bỏ cờ báo cáo cho bài an toàn | `PUT /admin/posts/{post_id}/dismiss-report` |
| Danh sách yêu cầu hỗ trợ | `GET /admin/support` |
| Xử lý yêu cầu hỗ trợ | `PUT /admin/support/{request_id}` |
| Hộp thông báo quản trị | `GET /admin/notifications` |
| Đánh dấu đã xử lý | `PUT /admin/notifications/{notif_id}/resolve` |

**10 endpoint đã viết xong nhưng không nút nào gọi tới.** → ✅ Đã nối hết, trừ
`GET /admin/posts` và `PUT /admin/posts/{id}/dismiss-report` (bài bị báo cáo hiện xử lý
qua trang duyệt bài).

### 1.3 Vấn đề ở trang tổng quan hiện tại

`GET /admin/dashboard` trả 6 con số, trong đó **3 con số vĩnh viễn bằng 0**:

```python
transactions = await db["transactions"].find({"status": "success"}).to_list(...)
```

Collection `transactions` **không tồn tại**, và `grep` toàn bộ backend cho thấy
**không có dòng code nào ghi vào nó** — chỉ có đúng một dòng đọc ra. Nghĩa là
`totalRevenue`, `todayRevenue`, `monthRevenue` luôn là `0.0`.

Ba con số còn lại (`totalUsers`, `premiumUsers`, `unreadNotifications`) đúng nhưng
quá sơ sài, và **không nói gì về phần lõi của khoá luận là hệ gợi ý ngành**.

---

## 2. Dữ liệu đang có để làm thống kê

| Collection | Bản ghi | Dùng được cho |
|---|---|---|
| `prediction_history` | 1 | **Mỏ vàng.** Có `mode`, `predicted_major`, `fields`, `majors`, `input{interests, subjectGroup, scores, goal, gender, fieldId}`, `createdAt` |
| `users` | 3 | Tăng trưởng, giới tính, tỉ lệ xác minh email, Premium |
| `posts` | 1 | Bài theo trạng thái, theo chủ đề, bị báo cáo |
| `comments` | 0 | Mức độ tương tác |
| `news` | 8 | Tin đã cào theo chuyên mục |
| `admin_notifications` | 1 | Việc tồn đọng |
| `transactions` | **không tồn tại** | — |

---

## 3. Đề xuất

### 3.1 Thống kê hệ gợi ý ngành — phần đáng giá nhất cho khoá luận

Từ `prediction_history`, endpoint mới `GET /admin/analytics`:

| Chỉ số | Ý nghĩa |
|---|---|
| Lượt tư vấn theo ngày (30 ngày) | Biểu đồ đường — mức độ sử dụng thật |
| **Top 10 ngành được gợi ý nhiều nhất** | Ngành nào mô hình hay đề xuất |
| Phân bố theo 7 nhóm ngành | Mô hình có thiên lệch về nhóm nào không |
| Tỉ lệ `explore` vs `guided` | Người dùng thích tự khám phá hay chọn sẵn nhóm |
| **Top tổ hợp thí sinh dùng** | Đối chiếu với phân bố tổ hợp trong dữ liệu huấn luyện |
| Phân bố tổng điểm (histogram) | Phổ điểm người dùng thật so với tập huấn luyện |
| Phân bố mục tiêu nghề nghiệp | Đi làm / Nghiên cứu / Kinh doanh / Chưa xác định |
| Tỉ lệ nam / nữ | Kiểm tra cân bằng |
| **Số lượt thiếu điểm thi** | Bao nhiêu % dùng ở chế độ kém chính xác |
| **Số lượt thiếu giới tính** | Đo tác động thật của việc hồ sơ chưa đủ |

> Hai chỉ số cuối trực tiếp phục vụ phần đánh giá của khoá luận: trước đó đã đo
> được thiếu giới tính làm Top-3 tụt từ 41,2% xuống 37,3%. Giờ biết được **thực tế
> có bao nhiêu người rơi vào tình huống đó**.

### 3.2 Sửa trang tổng quan

- Bỏ 3 ô doanh thu, **hoặc** ghi rõ "chưa có dữ liệu giao dịch" thay vì hiện `0đ` như thật
- Thêm: tổng lượt tư vấn · bài chờ duyệt · yêu cầu hỗ trợ chưa xử lý · tỉ lệ đã xác minh email
- Mỗi ô là một liên kết tới trang quản lý tương ứng

### 3.3 Ba trang quản trị còn thiếu

| Trang | Nội dung |
|---|---|
| `/dashboard/users` | Bảng người dùng (**email/SĐT đã che**), lọc theo vai trò / trạng thái xác minh / Premium, cấp-gỡ Premium, xoá tài khoản |
| `/dashboard/support` | Danh sách yêu cầu hỗ trợ, đánh dấu đã xử lý |
| `/dashboard/analytics` | Các biểu đồ ở §3.1 |

Hộp thông báo quản trị (`/admin/notifications`) gắn vào thanh bên dạng huy hiệu đếm số.

---

## 4. Việc phải cân nhắc

| Vấn đề | Hướng |
|---|---|
| **Dữ liệu quá ít** (1 lượt tư vấn, 3 người dùng) | Biểu đồ sẽ trống trơn. Phải thiết kế trạng thái rỗng tử tế, **không** độn dữ liệu mẫu |
| Doanh thu | Chưa có luồng thanh toán nào ở backend. Đề xuất **bỏ hẳn** khỏi tổng quan thay vì hiện `0đ` gây hiểu nhầm là "chưa ai mua" |
| Admin không xem được email đầy đủ | Sau khi che, admin hỗ trợ người dùng sẽ khó. **Cần bạn quyết**: thêm nút "Hiện đầy đủ" có ghi log ai xem hồ sơ ai, hay cứ để che? |
| Xoá người dùng | `DELETE /admin/users/{uid}` xoá thẳng, không hỏi lại, không hoàn tác. Nên thêm bước xác nhận gõ tên |
| Hiệu năng | Thống kê nên gộp bằng aggregation pipeline của MongoDB, không kéo hết về Python rồi đếm như code doanh thu hiện tại |

---

## 5. Thứ tự đề xuất

| | Việc | Trạng thái |
|---|---|---|
| 1 | `GET /admin/analytics` — gộp bằng aggregation pipeline | ✅ **Xong** |
| 2 | Sửa `GET /admin/dashboard`: bỏ doanh thu | ⏸ **Hoãn** — Premium sắp bỏ, sẽ dọn cùng lúc |
| 3 | `/dashboard/analytics` — biểu đồ | ✅ **Xong** |
| 4 | `/dashboard/users` — quản lý người dùng | ✅ **Xong** |
| 5 | `/dashboard/support` — hỗ trợ + thông báo hệ thống | ✅ **Xong** |
| 6 | Liên kết trên thanh bên | ✅ **Xong** |

### Phát sinh khi làm mục 1

Chỉ số **"số lượt thiếu giới tính"** ghi trong §3.1 hoá ra **không tính được** từ dữ liệu
cũ: `survey.py` thay giá trị thiếu bằng `"Nu"` **rồi mới lưu**, nên bản ghi trông y hệt
một nữ thật.

Đã sửa `survey.py` ghi thêm cờ `input.genderMissing`. Từ nay đếm được; bản ghi cũ báo
riêng ở cột **"Bản ghi cũ chưa xác định"** thay vì gộp bừa vào — không suy đoán ngược
dữ liệu không có.

---

## 6. Kiểm chứng

- Mọi endpoint admin từ chối token thường bằng **403**, không token bằng **422**
- `GET /admin/analytics` với DB rỗng → trả mảng rỗng, không nổ
- Số liệu trên giao diện khớp với đếm trực tiếp trong MongoDB
- Email / SĐT trên trang người dùng **đã che**, kiểm tra cả trong tab Network
- `tsc --noEmit` = 0 lỗi, backend biên dịch sạch, mọi trang HTTP 200

---

## 7. Cần bạn chốt

1. Làm hết §5 (6 mục) hay ưu tiên phần thống kê trước?
2. Doanh thu: **bỏ hẳn** hay giữ và ghi "chưa có dữ liệu"?
3. Admin có cần nút xem email đầy đủ (kèm ghi log) không?
