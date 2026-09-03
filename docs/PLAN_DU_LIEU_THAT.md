# Kế hoạch: thay toàn bộ dữ liệu gán cứng bằng dữ liệu thật

**Ngày lập:** 02/09/2026 · **Phạm vi:** toàn bộ `web/src` + các endpoint backend liên quan

**Nguyên tắc**
1. Có nguồn thật → nối vào.
2. Không có nguồn → **xóa**, không giữ số tự nghĩ.
3. Không đụng tới trợ lý chat RAG (`/chat`, `app/api/v1/chat.py`).

---

## 0. Tổng quan kết quả quét

| # | Chỗ | Vấn đề | Nguồn thật? | Hành động |
|---|---|---|---|---|
| 1 | `/news` + `/news/[id]` | 6 bài **bịa** | ✅ 8 bài thật đã crawl | ✅ Xong |
| 2 | `/` trang chủ | **7/7 khoảng điểm chuẩn sai**, "98% việc làm", "hàng chục tỷ học bổng", 3 ngành không tồn tại | ⚠️ một phần | ✅ Xong |
| 3 | `/community` | Bài viết bịa kèm **tên người thật giả** | ✅ API `posts` (đang 0 bài) | ✅ Xong |
| 4 | `/history` | 3 phiên **bịa** | ⚠️ API có, nhưng web **chưa hề ghi** | ✅ Xong |
| 5 | `/dashboard` | Doanh thu, số người dùng **bịa** | ✅ `/api/v1/admin/dashboard` | ✅ Xong |
| 6 | `/profile` | Tên, SĐT, trường, khu vực ưu tiên, ngành quan tâm **đều bịa**; "ID" sinh từ `Date.now()` | ⚠️ một phần | ✅ Xong |
| 7 | `/settings` | **Đổi mật khẩu là giả** — báo thành công mà không gọi API nào | ✅ Firebase + `PUT /users/{uid}` | ✅ Xong |
| 8 | `/result`, `/majors`, `/predict` | — | — | ✅ **đã xong** các lượt trước |

> ## ✅ ĐÃ HOÀN THÀNH TOÀN BỘ — 03/09/2026
>
> `npx tsc --noEmit` = 0 lỗi · 10/10 trang HTTP 200 · toàn bộ backend biên dịch sạch.
>
> **Phát sinh thêm ngoài kế hoạch ban đầu** (tìm ra trong lúc làm):
> - `/settings` — nút "Đổi mật khẩu" báo thành công mà **không gọi API nào**; đã nối
>   `POST /api/v1/auth/change-password` (có xác minh mật khẩu cũ) và hiện lỗi thật.
> - `/dashboard` — nút cào tin: khi crawl **thất bại**, khối `catch` vẫn hiện
>   "Đã kích hoạt đồng bộ thành công". Đã sửa để báo đúng lỗi.
> - `/dashboard` — panel "Trạng thái dịch vụ" gán cứng "Online (Latency ~85ms)",
>   "ChromaDB Active", luôn xanh kể cả khi dịch vụ chết. Đã thay bằng bảng nguồn dữ liệu.
> - `/community` — thích bài và đăng bài chỉ đổi state cục bộ, tải lại trang là mất.
>   Đã ghi thẳng lên máy chủ.
> - `docs/ARCHITECTURE.md` — lệch code thật 12 chỗ, đã sửa (xem mục 11).

---

## 1. Tin tức — 6 bài bịa → 8 bài thật

**Nguồn:** `crawler_service.py` cào từ `https://ts.huit.edu.vn/tin-tuyen-sinh`.
API `GET /api/v1/news` hiện có **8 bài thật**, đủ trường `title, excerpt, image, date,
category, sourceUrl, content_html, ai_summary`.

**Nội dung bịa phải xóa:**
- "Quỹ học bổng *Chắp cánh tài năng* trị giá hơn **50 tỷ đồng**"
- "HUIT đầu tư hơn **100 tỷ đồng** nâng cấp phòng lab"
- "**Sinh viên HUIT đạt giải Nhất** cuộc thi khởi nghiệp toàn quốc" ← dựng thành tích không có thật
- Ngưỡng học bổng "từ **27.0 điểm** THPT hoặc **900 điểm** ĐGNL"
- Bài "Top 5 ngành công nghệ" nhắc ngành **Kỹ thuật Phần mềm** — HUIT không đào tạo

**Việc:**
- [x] `web/src/services/news.ts` — `NewsService.list()` / `.detail()`
- [x] `/news` — nối API, lọc theo chuyên mục lấy từ chính dữ liệu, có 3 trạng thái tải/lỗi/rỗng
- [x] `/news/[id]` — xóa `ARTICLES_STORE`, render `content_html`, hiện **link `sourceUrl`** về bài gốc

---

## 2. Trang chủ — sai nghiêm trọng nhất về mặt số liệu

### 2.1 Khoảng điểm chuẩn `FACULTIES_DATA.scoreAvg` — sai cả 7/7

| Nhóm ngành | Trang chủ ghi | Thật (2026) |
|---|---|---|
| CNTT & Máy tính | 22.5 – 24.5đ | **19.0 – 20.5đ** |
| Kinh doanh & Quản lý | 21.5 – 23.5đ | **18.0 – 22.5đ** |
| Du lịch, Khách sạn & Ẩm thực | 21.0 – 22.5đ | **19.5 – 21.8đ** |
| Kỹ thuật & Công nghệ | 20.5 – 23.0đ | **18.0 – 23.0đ** |
| Thực phẩm, Sinh học & Môi trường | 21.0 – 23.0đ | **16.0 – 22.0đ** |
| Luật | 22.5 – 23.5đ | **21.2 – 21.8đ** |
| Ngoại ngữ | 22.0 – 23.2đ | **22.5đ** (cả 2 ngành bằng nhau) |

Hầu hết bị **thổi lên**. Học sinh 20 điểm đọc xong tưởng mình không đủ điều kiện vào CNTT,
trong khi điểm chuẩn thật chỉ 19.0. Đây là loại sai gây hậu quả trực tiếp cho người dùng.

→ **Tính động từ `/api/v1/predict/catalog`**, không gõ tay nữa. (`count` của 7 nhóm hiện
đang **đúng** cả 7, nhưng vẫn nên lấy từ API cho khỏi lệch về sau.)

### 2.2 Ngành ví dụ không tồn tại
`highlight` của nhóm Kỹ thuật ghi **"Công nghệ ô tô"**, **"Tự động hóa"**; nhóm Thực phẩm ghi
**"Đảm bảo chất lượng ATTP"**; nhóm Ngoại ngữ ghi **"Ngôn ngữ Anh thương mại"** — không mã
ngành nào khớp. → Lấy tên ngành thật từ API.

### 2.3 Câu không có nguồn — xóa hẳn
- "tỷ lệ việc làm đạt **trên 98%**"
- "quỹ học bổng **hàng chục tỷ đồng** mỗi năm" (2 chỗ: mô tả + FAQ)
- `ADMISSION_METHODS.quota` — "50-60% chỉ tiêu", "30-35%"… `tuyen_sinh_huit_2026.json`
  **không có** dữ liệu tỷ lệ chỉ tiêu. Giữ tên 4 phương thức (có thật), **bỏ cột tỷ lệ**.

### 2.4 Giữ nguyên
`HERO_SLIDES`, `HIGHLIGHT_STRIPS` — chữ quảng bá chung, **không chứa con số** nào → không sao.

---

## 3. Cộng đồng — bài viết bịa kèm tên người

`FALLBACK_POSTS` dựng sẵn các nhân vật **"Nguyễn Hoàng Minh — Sinh viên K14 Khoa CNTT"**,
**"Trần Mai Phương — THPT Trấn Biên"**, kèm lượt thích/bình luận và cả bài review ngành
**Kỹ thuật Phần mềm** (ngành không có thật). Đây là nội dung người dùng giả mạo.

API `GET /api/v1/posts` là **thật và đầy đủ** (đăng bài, bình luận, upvote, báo cáo),
hiện **0 bài**.

**Việc:**
- [x] `web/src/services/posts.ts`
- [x] Xóa `FALLBACK_POSTS`, nối API
- [x] Trạng thái rỗng tử tế: "Chưa có thảo luận nào — hãy là người đầu tiên"
- [x] `TOPICS` gõ tay: chỉ hiện chủ đề **thật sự có bài**

---

## 4. Lịch sử tư vấn — phải sửa luồng ghi trước

### Lỗi gốc
`/predict` gọi `POST /api/v1/predict/recommend` — endpoint này **không ghi gì**.
Endpoint có ghi lịch sử là `POST /api/v1/survey/submit` (cùng mô hình, cùng kết quả,
thêm lưu `prediction_history` + tăng `usageCount`).
→ `/history` dù nối API thật vẫn **luôn rỗng**.

### Dữ liệu bịa hiện tại
3 phiên cứng: "Hôm nay 14:30 · CNTT · 24.50đ · **89.4% phù hợp**", "**Cần cải thiện điểm
môn Toán**", khoa "**Khoa CNTT**" (tên khoa không có trong 7 nhóm ngành thật).
Nút "Xóa lịch sử" chỉ `setState([])`, không gọi API.

### Việc
- [x] `/predict`: đã đăng nhập → gọi `/survey/submit`; chưa đăng nhập → vẫn dùng
      `/predict/recommend` (xem được kết quả, chỉ không lưu)
- [x] `web/src/services/history.ts` — `HistoryService.list(uid)`
- [x] `/history`: xóa `DEFAULT_HISTORY`, hiển thị đúng những gì đã lưu — ngày giờ thật,
      ngành dự đoán, tổ hợp, chế độ explore/guided
- [x] **Bỏ** các trường không có trong dữ liệu lưu: `match %`, `statusText`, `faculty`
- [x] Nút xóa: nối API xóa thật, hoặc bỏ nút

---

## 5. Dashboard quản trị

`FALLBACK_STATS` = 1.420 người dùng, 380 premium, **doanh thu 28.500.000đ**. Khi API lỗi,
màn hình vẫn hiện các số này như thật — quản trị viên không phân biệt được.

- [x] Bỏ số dự phòng, API lỗi thì hiện đúng thông báo lỗi
- [x] Trạng thái tải dùng skeleton, không dùng số giả

---

## 6. Hồ sơ cá nhân — hiện thông tin bịa cho chính người dùng thật

### Backend thật sự lưu gì (`users` collection)
`_id · name · email · phone · gender · role · createdAt · isPremium · usageCount ·
isNotificationEnabled`, và `PUT /api/v1/users/{uid}` cho phép cập nhật thêm
`dob · school · avatar`.

### Bịa — phải xóa vì backend không có trường tương ứng
| Đang hiện | Vấn đề |
|---|---|
| **"Khu vực ưu tiên: TP. Hồ Chí Minh (Khu vực 3)"** | Không có trường nào lưu. Khu vực ưu tiên **cộng điểm thật** khi xét tuyển — hiện bừa là sai nghiêm trọng |
| **"Trường THPT: THPT Tây Thạnh — TP.HCM"** | Giá trị mặc định cứng, hiện cho **mọi** người dùng chưa nhập |
| **"Số điện thoại: 0912 345 678"** | Như trên — người dùng thật thấy số lạ tưởng là số mình |
| **"Ngành quan tâm nhất: Công nghệ Thông tin (7480201)"** | Gán cứng, không đọc từ đâu cả |
| **"Tổ hợp môn thế mạnh: A00, A01, D01, X26"** | Không có trường nào lưu |
| **`ID: #HUIT-{Date.now().slice(-5)}`** | Không phải mã hồ sơ — nó **đổi mỗi lần render lại trang** |
| Huy hiệu **"Tài khoản đã xác thực"** | Hiện vô điều kiện, không kiểm tra `email_verified` |

### Có thể lấy dữ liệu thật
- `name · email · phone · gender · school · dob` → từ `GET /api/v1/users/{uid}`
- **"Ngày tham gia"** → `createdAt` (đang có, chưa hiện)
- **"Số lần tư vấn"** → `usageCount` (đang có, chưa hiện)
- **"Ngành quan tâm nhất"** → suy từ `prediction_history`: ngành xuất hiện nhiều nhất
  trong các lần dự đoán của chính người dùng đó — **đây mới là dữ liệu thật**
- **"Tổ hợp thường dùng"** → `input.subjectGroup` trong `prediction_history`

### Việc
- [x] Trường chưa nhập → hiện **"Chưa cập nhật"** kèm link sang `/settings`, không độn giá trị mẫu
- [x] Xóa "Khu vực ưu tiên", xóa mã hồ sơ giả, huy hiệu xác thực chỉ hiện khi thật sự đã xác thực
- [x] Thêm "Ngày tham gia" + "Số lần tư vấn" (đã có sẵn trong DB)
- [x] "Ngành quan tâm nhất" + "Tổ hợp thường dùng" tính từ `prediction_history`

---

## 7. Cài đặt — đổi mật khẩu là chức năng giả

```js
const handleUpdatePassword = (e) => {
  e.preventDefault();
  if (!newPass || newPass !== confirmPass) { alert(...); return; }
  setSavedSuccess(true);          // ← báo "đã lưu"
  setCurrentPass(""); ...          // ← xóa ô nhập
};                                 // ← KHÔNG gọi API nào
```

Người dùng nhập mật khẩu mới, thấy thông báo thành công, ô nhập được xóa sạch —
**mật khẩu không hề đổi**. Lần sau đăng nhập vẫn phải dùng mật khẩu cũ. Toàn bộ trang
`/settings` **không có một lệnh gọi API nào** (`grep` = 0).

Các phần giả khác trong trang:
- 4 công tắc thông báo — bật/tắt không lưu đi đâu (backend **có** `isNotificationEnabled`)
- "Tổ hợp môn quan tâm hàng đầu", "Phương thức dự kiến đăng ký" — chọn xong mất luôn,
  backend cũng **không có** trường tương ứng

### Việc
- [x] Đổi mật khẩu: nối Firebase `updatePassword` (có xác thực lại), hoặc **bỏ hẳn form**
      thay bằng nút "Gửi email đặt lại mật khẩu" — tuyệt đối không để báo thành công giả
- [x] Công tắc thông báo → `PUT /users/{uid}` với `isNotificationEnabled`
- [x] Thêm tab **"Thông tin hồ sơ"** với form sửa thật: `name · phone · school · dob · gender`,
      gọi `PUT /api/v1/users/{uid}`, có báo thành công/lỗi riêng
- [x] Backend: bổ sung `phone` vào `UpdateProfileRequest` — trường này được lưu lúc
      đăng ký nhưng **không có trong model cập nhật**, nên người dùng không thể tự sửa
      số điện thoại của mình
- [x] Bỏ 2 mục chọn không có nơi lưu

---

## 8. Thứ tự thực hiện

1. ~~Tin tức `/news`~~ ✅ → còn `/news/[id]`
2. Trang chủ — nối `scoreAvg`/`count`/tên ngành từ catalog, xóa câu không nguồn
3. Cộng đồng — nối API, trạng thái rỗng
4. **Cài đặt — đổi mật khẩu giả** (ưu tiên cao: liên quan bảo mật, người dùng đang bị lừa)
5. Hồ sơ cá nhân — nối trường thật, xóa trường bịa
6. Dashboard — bỏ số giả
7. Lịch sử — sửa luồng ghi rồi nối API (phức tạp nhất, để cuối)

## 9. Kiểm chứng khi xong

- `npx tsc --noEmit` = 0 lỗi, `eslint` không thêm lỗi mới
- Mọi trang trả HTTP 200
- `grep -rn "FALLBACK_\|DEFAULT_HISTORY\|ARTICLES_STORE\|98%\|tỷ đồng\|triệu/tháng\|0912 345 678\|Tây Thạnh\|Khu vực 3" web/src`
  → **không còn kết quả nào**
- Mỗi trang nối API có đủ 3 trạng thái: đang tải / lỗi / rỗng
- Đăng nhập → làm 1 bài khảo sát → phải thấy đúng bài đó trong `/history`
- Điểm chuẩn hiện trên trang chủ khớp với `/majors` và với `tuyen_sinh_huit_2026.json`

## 10. Sau khi xong — bảng nguồn cho khóa luận

| Dữ liệu hiển thị | Nguồn |
|---|---|
| 39 ngành · 7 nhóm · 15 tổ hợp | `research/data/processed/tuyen_sinh_huit_2026.json` |
| Điểm chuẩn 2024 · 2025 · 2026 | Đề án tuyển sinh HUIT (file trên) |
| Gợi ý ngành | XGBoost 2 tầng — `research/notebooks/08_train_xgboost.ipynb` |
| Tin tuyển sinh | Crawl `ts.huit.edu.vn`, mỗi bài kèm `sourceUrl` đối chiếu |
| Lịch sử tư vấn | MongoDB `prediction_history` |
| Bài cộng đồng | MongoDB `posts`, do người dùng đăng |
| Thống kê quản trị | MongoDB, qua `/api/v1/admin/dashboard` |
| Hồ sơ cá nhân | MongoDB `users` + suy từ `prediction_history` |


---

## 11. Sửa thêm: `docs/ARCHITECTURE.md`

Tài liệu kiến trúc lệch với code thật **12 chỗ**, đã sửa hết:

| Tài liệu ghi | Thực tế |
|---|---|
| "XGBoost + **Cosine Similarity**" (3 lần) | Không có dòng code cosine nào — chỉ là 1 chú thích sót ở `predict_service.py` |
| Bảng services **thiếu** `major_predictor.py` | Đây mới là mô hình đang chạy |
| `predict_service.py` = "thuật toán dự đoán ngành" | Bảng tra gõ tay đã ngưng dùng, sai 9/39 mã ngành |
| `UpdateProfileRequest(name, phone, avatar)` | Thật: `name, dob, school, avatar, gender, isNotificationEnabled, fcmToken` — **không có** `phone` |
| `PredictRequest(scores: dict)` | Thật: `RecommendRequest(interests, subjectGroup, scores, goal, fieldId, limit)` |
| Collection `predictions` | Thật: `prediction_history` |
| Collection `surveys` | **Không tồn tại** |
| Collection `support_tickets` | Thật: `support_requests` |
| — | Thiếu `notifications` (có thật) |
| `/history` = "Lịch sử chat" | Là lịch sử **tư vấn ngành** |
| `components/ui/` "Tạo sẵn" | Thư mục **không tồn tại** |
| Firebase App Check đang dùng | **Chưa triển khai** |
| MoMo ở backend | Chỉ có ở **mobile** (`payment_service.dart`) |

Thêm mới vào mục 4.2 — cái bẫy kiến trúc gây ra lỗi `/history` rỗng:

> | Endpoint | Chạy mô hình | Ghi lịch sử | Tăng `usageCount` | Cần đăng nhập |
> |---|---|---|---|---|
> | `POST /predict/recommend` | ✅ | ❌ | ❌ | Không |
> | `POST /survey/submit` | ✅ | ✅ | ✅ | Có |
