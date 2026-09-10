---
name: backend-api
description: Backend FastAPI của EduTalk — router /api/v1, MongoDB qua motor, xác thực Firebase, serve mô hình XGBoost, giải thích SHAP và gọi Gemini. Dùng khi thêm hoặc sửa endpoint, model Pydantic, service, kết nối CSDL, luồng đăng nhập, hoặc khi đụng tới major_predictor, xai_service, gemini_service, predict_service.
---

# Backend — FastAPI

```
backend/app/
├── main.py              tạo app, startup/shutdown, CORS, gắn router
├── core/
│   ├── mongodb.py               kết nối motor, get_db()
│   ├── firebase_admin_config.py get_firebase_app()
│   └── privacy.py
├── models/              Pydantic — *_models.py, KHÔNG phải model học máy
├── services/            toàn bộ nghiệp vụ
└── api/v1/              router mỏng, chỉ điều phối
```

**Đừng nhầm tên:** `app/models/` là **schema Pydantic**. Mô hình học máy nằm ở
`services/major_predictor.py` và file `.json` bên `research/`.

```bash
conda activate Edutalk
cd backend && uvicorn app.main:app --reload     # Swagger: localhost:8000/docs
```

---

## Kiến trúc phải giữ

**Router mỏng, service dày.** `api/v1/*.py` chỉ nhận request, gọi service, trả response.
Nghiệp vụ nằm hết trong `services/`. Đừng viết logic dự đoán hay truy vấn Mongo phức tạp
thẳng trong router.

**Mọi endpoint mới phải:**
- gắn vào `main.py` với `prefix="/api/v1/<tên>"` và `tags=[...]` — Swagger tự sinh
- khai báo `response_model` là một lớp Pydantic trong `app/models/`
- validate đầu vào bằng Pydantic **trước khi** đưa vào mô hình

---

## Nạp mô hình — nạp một lần, đừng nạp lại

`services/major_predictor.py` dùng `@lru_cache(maxsize=1)` trên `get_predictor()`:

```python
@lru_cache(maxsize=1)
def get_predictor() -> MajorPredictor: ...
```

**Tuyệt đối không khởi tạo `MajorPredictor()` trực tiếp trong hàm xử lý request** — mỗi
lần gọi sẽ đọc lại 2 file mô hình từ đĩa và dựng lại Booster. Luôn đi qua
`get_predictor()`.

Đường dẫn mô hình:
```python
os.getenv("EDUTALK_MODEL_DIR") or <repo>/research/data/processed
```

Mặc định là pipeline **cũ** (`research/`), 2 tầng, 43 đặc trưng:
```
Tầng 1: 43 đặc trưng → 7 khối ngành
Tầng 2: 43 đặc trưng → 39 ngành
Ghép  : P(ngành) ∝ P₂(ngành) × P₁(khối)^β        β = 0,6
```

Đổi sang pipeline mới bằng biến môi trường, không sửa code:
```bash
EDUTALK_MODEL_DIR=<tuyệt đối>/research2/data/processed/10_ChotModel
```

### Bẫy chí mạng — đặc trưng phải khớp lúc huấn luyện

`TO_HOP_MAP`, `MON`, `MUC_TIEU_MA`, `NHOM_TO_HOP`, `BETA`, `TRONG_SO_NGOAI_TO_HOP` đều
được **chép nguyên** từ notebook. Sửa một bên mà quên bên kia thì mô hình **vẫn chạy, vẫn
trả kết quả trông hợp lý, nhưng sai âm thầm** — không có exception nào báo. Mỗi lần đụng
vào phần dựng đặc trưng, mở notebook tương ứng ra đối chiếu.

`TRONG_SO_NGOAI_TO_HOP = 0.5` là **lọc mềm**, cố ý. HUIT còn xét học bạ và ĐGNL nên thí
sinh có thể đỗ ngành không khớp tổ hợp đã khai. Lọc cứng làm mất ngành đúng của 8/102 em.

---

## MongoDB

Kết nối qua `motor` (async), mở ở `startup_event`, đóng ở `shutdown_event`. Lấy handle
bằng `get_db()`, không tạo `AsyncIOMotorClient` mới ở nơi khác.

```python
from app.core.mongodb import get_db
doc = await get_db()["users"].find_one({"_id": uid})
```

Luôn `await` — quên `await` thì nhận về coroutine và lỗi xuất hiện ở chỗ khác hẳn.

`MONGO_URI` đọc từ `.env`. Thiếu thì app **vẫn khởi động** và chỉ in cảnh báo — nên nếu
truy vấn trả `None` một cách khó hiểu, kiểm tra `.env` trước.

**`docker-compose.yml` khai Postgres và `DATABASE_URL` nhưng code không dùng.** Đó là tàn
dư. Đừng lấy file compose làm nguồn tin về CSDL, và đừng viết code SQL.

---

## Xác thực

Firebase Admin SDK. Token đi trong header `Authorization: Bearer <token>`:

```python
decoded = await auth_service.verify_token(authorization.replace("Bearer ", ""))
uid = decoded["uid"]          # cũng là _id trong collection users
```

Quy ước đã áp dụng ở `predict.py`: **thiếu thông tin phụ thì đừng chặn request.** Ví dụ
giới tính lấy theo thứ tự hồ sơ → body → mặc định, và trả kèm `warnings` thay vì ném lỗi
— mô hình vẫn chạy được, chỉ kém chính xác đi chút. Giữ tinh thần đó cho các trường
không bắt buộc.

---

## XAI — luật sống còn

`services/xai_service.py` diễn giải kết quả SHAP thành lời. Giá trị SHAP được tính bằng
TreeSHAP ở `major_predictor.giai_thich()`.

**Bắt buộc đưa số SHAP vào prompt.** Tuyệt đối không hỏi mô hình ngôn ngữ kiểu "đoán xem
vì sao ngành này được chọn". Cách đó sinh ra lời giải thích nghe rất thuyết phục nhưng
không liên quan gì tới mô hình thật — tệ hơn là không giải thích, vì nó nguỵ trang thành
XAI và mượn uy tín của biểu đồ số nằm ngay bên cạnh.

Ngưỡng `NGUONG_DANG_KE_PCT = 3.0`: bỏ qua mục đóng góp dưới 3%. Đưa cả 14 dòng vào prompt
thì phần lớn là nhiễu (nhiều mục chỉ ±0,01) và làm loãng 2–3 yếu tố thật sự quyết định.

---

## Nền chạy sẵn

APScheduler khởi động cùng app, cào tin tức lúc **08:00 và 20:00** mỗi ngày
(`crawler_service.scrape_news`), lưu ở `app.state.scheduler` và tắt ở shutdown. Thêm job
mới thì đăng ký cùng chỗ đó và nhớ đường tắt.

---

## Trước khi coi là xong

- `/docs` mở được, endpoint mới hiện đúng schema
- gọi thử bằng `curl`, đọc body trả về — không chỉ xem status 200
- endpoint dự đoán: kiểm tra Top-3 trả về có `nganh`, xác suất, và phần giải thích SHAP
- không có `MajorPredictor()` nào được gọi ngoài `get_predictor()`
