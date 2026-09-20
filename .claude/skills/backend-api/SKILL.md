---
name: backend-api
description: Backend FastAPI của EduTalk — router /api/v1, api/deps.py, MongoDB qua motor, xác thực Firebase, serve mô hình XGBoost, giải thích SHAP và gọi Gemini. Dùng khi thêm hoặc sửa endpoint, model Pydantic, service, kết nối CSDL, luồng đăng nhập, hoặc khi đụng tới major_predictor, xai_service, gemini_service, rag, huan_luyen.
---

# Backend — FastAPI

```
backend/app/
├── main.py              create_app() + lifespan + BẢNG ROUTER
├── api/
│   ├── deps.py          ⭐ xác thực · phân quyền · handle Mongo — đường DUY NHẤT
│   └── v1/              router mỏng, chỉ điều phối (admin/ là package 8 file)
├── core/                hạ tầng, không chứa nghiệp vụ
│   ├── config.py                Settings (pydantic-settings) — mọi biến môi trường
│   ├── paths.py                 mốc neo đường dẫn tới data/
│   ├── errors.py                handler lỗi tập trung
│   ├── mongodb.py               kết nối motor, get_db()
│   ├── firebase_admin_config.py get_firebase_app()
│   └── privacy.py
├── models/              Pydantic — *_models.py, KHÔNG phải model học máy
└── services/            toàn bộ nghiệp vụ (auth/ · rag/ · huan_luyen/ là package)
```

**Đừng nhầm tên:** `app/models/` là **schema Pydantic**. Mô hình học máy nằm ở
`services/major_predictor*.py` và gói file `.json` ở `backend/data/mo_hinh/huong1/`.

```bash
conda activate Edutalk
cd backend && uvicorn app.main:app --reload     # Swagger: localhost:8000/docs
pytest -q                                       # 169 test, ~2 giây
python -m ruff check app tests --select F       # bắt tên chưa định nghĩa
```

---

## Quy ước đặt tên

Định danh (file, hàm, biến, class) **tiếng Anh**; chú thích và docstring **tiếng Việt**;
chuỗi hiển thị cho người dùng **tiếng Việt**. `services/rag/`, `services/huan_luyen/`,
`api/v1/phan_hoi.py` đặt tên tiếng Việt từ trước — giữ nguyên, đừng đổi ngược.

## Kiến trúc phải giữ

**Router mỏng, service dày.** `api/v1/*.py` chỉ nhận request, gọi service, trả response.
Nghiệp vụ nằm hết trong `services/`. Đừng viết logic dự đoán hay truy vấn Mongo phức tạp
thẳng trong router. Service **không ném `HTTPException`** — ném lỗi miền nghiệp vụ, router
dịch sang HTTP (mẫu: `TokenExpired` → `deps.py` → 401 kèm `expired`).

**Xác thực đi qua `api/deps.py`, không có đường nào khác:**

```python
from app.api.deps import get_current_uid, get_database, require_admin

@router.get("/vi-du")
async def vi_du(uid: str = Depends(get_current_uid), db=Depends(get_database)):
    ...

router = APIRouter(dependencies=[Depends(require_admin)])   # router toàn endpoint admin
```

Tuyệt đối không tự khai `authorization: str = Header(...)` rồi cắt chuỗi `"Bearer "` —
đó chính là thứ vừa dọn: 69 endpoint làm tay, 5 bản `get_current_uid` chép đi chép lại
với hai thông điệp lỗi khác nhau, 4 router phải import lẫn nhau để mượn `require_admin`.

**Mọi endpoint mới phải:**
- thêm một dòng vào `ROUTERS` trong `main.py` (prefix + tag) — Swagger tự sinh
- khai báo `response_model` là một lớp Pydantic trong `app/models/`
- validate đầu vào bằng Pydantic **trước khi** đưa vào mô hình
- chạy `pytest` — `tests/test_api_contract.py` sẽ báo "THÊM endpoint ngoài dự kiến";
  cố ý thì `EDUTALK_CAP_NHAT_ANH_CHUP=1 pytest tests/test_api_contract.py` rồi đọc diff

---

## Nạp mô hình — nạp một lần, đừng nạp lại

`services/major_predictor.py` giữ predictor trong biến toàn cục + khoá: `get_predictor()`
nạp một lần, `nap_lai_predictor()` dựng bản mới xong mới tráo vào (đổi phiên bản nóng, không
cần khởi động lại).

**Tuyệt đối không khởi tạo `MajorPredictorH1()` / `MajorPredictor()` trực tiếp trong hàm xử lý
request** — mỗi lần gọi sẽ đọc lại 10 file mô hình từ đĩa và dựng lại Booster. Luôn đi qua
`get_predictor()`.

### Vòng lặp phản hồi và huấn luyện lại — `services/huan_luyen/`

```
người dùng gắn "ngành đã chọn/đã đỗ" vào lượt tư vấn đã lưu   (POST/PUT /api/v1/phan-hoi/...)
   │  theo lịch (APScheduler, giờ VN) hoặc admin bấm           (/api/v1/admin/huan-luyen)
   ▼
du_lieu.py     dữ liệu gốc trong gói + phiếu phản hồi (lọc nhiễu, mỗi người 1 phiếu, 20% giữ lại)
mo_hinh.py     huấn luyện lại ĐÚNG cấu hình Giai đoạn 9 — chép nguyên MoHinhNganh
tien_trinh.py  chấm ứng viên với bản đang phục vụ (test khoá + phiếu giữ lại) → cổng kiểm định
phien_ban.py   lưu phiên bản vào MongoDB GridFS (đĩa Render bị xoá sau mỗi lần deploy)
lich.py        cron huấn luyện + 5 phút đồng bộ phiên bản giữa các worker
```

- Huấn luyện lại trên đúng dữ liệu gốc phải ra mô hình **trùng từng byte** với gói — đã
  kiểm; sửa `mo_hinh.py` thì kiểm lại bằng cách so SHA-256 với `mo_hinh.json`.
- Không tinh chỉnh siêu tham số trong vòng lặp — tự dò lại trên vài chục phiếu là học vẹt.
- `EDUTALK_PHIEN_BAN=goc` ép dùng mô hình trong gói (script kiểm khớp notebook đặt sẵn).
- Retrain chạy trong tiến trình backend, cộng ~95 MB lúc chạy — xem bảng RAM trong Dockerfile.
- Thử vòng lặp trên MongoDB TẠM (`mongod --port 27099`), đừng thử trên Atlas: phiên bản được
  đưa vào phục vụ ở đó sẽ bị server thật tự nạp trong 5 phút.

### Kho tri thức RAG — trang quản trị

`api/v1/kho_tri_thuc.py`: thông tin kho, kiểm kê nguồn (`services/rag/kiem_ke.py` — file nào
đã nạp/chưa nạp/bị bỏ qua), duyệt chunk, thử truy xuất, đo truy hồi chạy nền
(`services/rag/danh_gia.py`, dùng chung với `scripts/kiem_truy_hoi.py`). Chỉ số chính bám báo
cáo tuần: Precision@k, Recall@k, Context Precision, Context Recall — kèm đối chứng từ khoá và
bốc bừa.

Mặc định là mô hình **Hướng 1** (`research/`), nạp bởi `services/major_predictor_h1.py`:
```
fieldId=None → model_nganh.json    xếp hạng cả 39 ngành     (khám phá, hiện 5)
fieldId=k    → model_nhom{k}.json  chỉ ngành trong nhóm k   (tư vấn, hiện 2)
63 đặc trưng · 9 nhóm ngành
```

Đường dẫn mô hình:
```python
os.getenv("EDUTALK_MODEL_DIR") or backend/data/mo_hinh/huong1
```

Gói đó sinh bởi `backend/scripts/dong_goi_mo_hinh_huong1.py` từ
`research/data/processed/10_ChotModel` (Giai đoạn 10 không lưu bộ số chuẩn hoá điểm, nên
script tính lại và kiểm từng ô). Backend kiểm SHA-256 từng file lúc khởi động. Đổi mô hình
bằng biến môi trường, không sửa code: `EDUTALK_PIPELINE=r3` → `research3/`,
Nhánh `legacy` đã xoá 20/09/2026.

### Bẫy chí mạng — đặc trưng phải khớp lúc huấn luyện

`TO_HOP_MAP`, `MON`, `MUC_TIEU_MA`, `NHOM_TO_HOP`, `BETA`, `TRONG_SO_NGOAI_TO_HOP` đều
được **chép nguyên** từ notebook. Sửa một bên mà quên bên kia thì mô hình **vẫn chạy, vẫn
trả kết quả trông hợp lý, nhưng sai âm thầm** — không có exception nào báo. Mỗi lần đụng
vào phần dựng đặc trưng, mở notebook tương ứng ra đối chiếu.

`TRONG_SO_NGOAI_TO_HOP = 0.5` là **lọc mềm**, cố ý. HUIT còn xét học bạ và ĐGNL nên thí
sinh có thể đỗ ngành không khớp tổ hợp đã khai. Lọc cứng làm mất ngành đúng của 8/102 em
(đo trên pipeline đời đầu). Trên test Hướng 1, bật lọc mềm làm tư vấn Top-2 90,6% → 90,5%
và khám phá Top-5 81,8% → 81,3% — nên notebook và `kiem_mo_hinh_huong1.py` so khi TẮT lọc.

Cách kiểm backend khớp notebook: `python backend/scripts/kiem_mo_hinh_huong1.py`.

---

## MongoDB

Kết nối qua `motor` (async), mở và đóng trong `lifespan`. Trong router lấy handle bằng
`Depends(get_database)`; ngoài router (tác vụ nền, service) thì `get_db()`.

```python
from app.api.deps import get_database

async def vi_du(db=Depends(get_database)):
    doc = await db["users"].find_one({"_id": uid})
```

Luôn `await` — quên `await` thì nhận về coroutine và lỗi xuất hiện ở chỗ khác hẳn.

`MONGO_URI` đọc qua `core/config.py`. Thiếu thì app **vẫn khởi động**, chỉ cảnh báo lúc
lifespan chạy và trả 503 khi có request chạm tới CSDL.

**Không có Postgres.** Service đó đã gỡ khỏi `docker-compose.yml` 20/09/2026. Đó từng là tàn
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

- `pytest -q` xanh và `ruff check app tests --select F` sạch
- `/docs` mở được, endpoint mới hiện đúng schema
- gọi thử bằng `curl`, đọc body trả về — không chỉ xem status 200
- endpoint dự đoán: kiểm tra danh sách ngành trả về (tư vấn 2, khám phá 5) có mã, tên,
  xác suất và phần giải thích SHAP; đụng tới mô hình thì chạy `kiem_mo_hinh_huong1.py`
- không có `MajorPredictor()` nào được gọi ngoài `get_predictor()`
- không có `Header("Authorization")` nào ngoài `api/deps.py`
