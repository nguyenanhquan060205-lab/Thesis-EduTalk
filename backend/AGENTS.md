# Luật cho `backend/`

**Đọc trước khi sửa:** `../.claude/skills/backend-api/SKILL.md`

Chú thích code viết **tiếng Việt**. Môi trường: `conda activate Edutalk`.

## Năm điều không được vi phạm

1. **Nạp mô hình một lần.** Luôn đi qua `get_predictor()` (đã có `@lru_cache(maxsize=1)`).
   **Không bao giờ** gọi `MajorPredictor()` / `MajorPredictorR3()` trực tiếp trong hàm xử
   lý request — mỗi lần gọi sẽ đọc lại mô hình từ đĩa và dựng lại Booster.

2. **Đặc trưng phải khớp lúc huấn luyện.** Hằng số được chép nguyên từ notebook. Lệch một
   chi tiết thì mô hình **vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm** —
   không có exception nào báo. Cách kiểm duy nhất đáng tin: chạy lại 102 em trong
   `khaosat_test_KHOA.csv` qua `recommend()` và đối chiếu với `metrics.json`.

3. **Router mỏng, service dày.** `api/v1/*.py` chỉ điều phối; nghiệp vụ nằm trong
   `services/`.

4. **XAI phải đưa số SHAP vào prompt.** Tuyệt đối không hỏi mô hình ngôn ngữ kiểu "đoán
   xem vì sao ngành này được chọn" — lời giải thích nghe thuyết phục nhưng không liên quan
   gì tới mô hình thật, tệ hơn là không giải thích.

5. **CSDL là MongoDB qua `motor`, lấy handle bằng `get_db()`.** `docker-compose.yml` còn
   khai Postgres và `DATABASE_URL` nhưng **code không dùng** — đó là tàn dư. Đừng viết
   code SQL.

## Mô hình nào đang chạy

Mặc định là **`research3/` — 9 nhóm ngành, 63 đặc trưng**, nạp bởi
`services/major_predictor_r3.py`. Pipeline cũ (`research/`, 2 tầng, 43 đặc trưng) vẫn còn
nguyên trong `services/major_predictor.py`, bật lại bằng `EDUTALK_PIPELINE=legacy`.

Hai lớp có **cùng bề mặt công khai** nên router không cần biết đang chạy bản nào. Thêm
thuộc tính mới cho lớp này thì phải thêm cho cả lớp kia, nếu không đổi biến môi trường là
vỡ.

Số liệu trên 102 em test: tư vấn Top-3 **86,3%**, khám phá Top-3 **35,3%**. Backend tái
tạo đúng cả sáu con số của notebook — nếu sửa gì mà lệch đi thì là đã sai.

Nhóm **4** và **7** dùng **phân tầng** (`P(lĩnh vực con) × P(ngành | lĩnh vực con)`), nạp
từ `model_tang{g}_sub.json` + `model_tang{g}_{k}.json`. Bỏ qua chúng thì Top-3 tụt còn
83,3% mà không có lỗi nào báo.

## Lưu ý

`app/models/` là **schema Pydantic**, không phải mô hình học máy.

`fieldId` trong `predict_models.py` giới hạn `0..8` theo số nhóm của research3. Đổi cách
nhóm thì phải sửa chặn trên này, nếu không nhóm cuối bị trả 422 khó hiểu.

Thiếu `MONGO_URI` thì app **vẫn khởi động**, chỉ in cảnh báo — truy vấn trả `None` khó
hiểu thì kiểm tra `.env` trước.

## Xong nghĩa là

`/docs` mở được, endpoint mới hiện đúng schema, và đã gọi thử bằng `curl` **đọc body trả
về** — không chỉ xem status 200.
