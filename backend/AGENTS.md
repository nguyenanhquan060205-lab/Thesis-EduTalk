# Luật cho `backend/`

**Đọc trước khi sửa:** `../.claude/skills/backend-api/SKILL.md`

Môi trường: `conda activate Edutalk`.

## Quy ước đặt tên

| Thứ | Ngôn ngữ |
|---|---|
| Tên file, hàm, biến, class | **tiếng Anh** |
| Chú thích và docstring | **tiếng Việt** |
| Chuỗi hiển thị cho người dùng (`detail` của lỗi, thông báo) | **tiếng Việt** — app phục vụ người Việt |

`services/rag/`, `services/huan_luyen/`, `api/v1/phan_hoi.py` đặt tên tiếng Việt từ trước:
**giữ nguyên, không đổi ngược**. Luật trên áp cho code mới và code đang sửa tới.

## Sáu điều không được vi phạm

1. **Nạp mô hình một lần.** Luôn đi qua `get_predictor()` (biến toàn cục + khoá; đổi phiên bản
   nóng bằng `nap_lai_predictor()` — không tự dựng lại predictor ở chỗ khác).
   **Không bao giờ** gọi `MajorPredictorH1()` / `MajorPredictorR3()` / `MajorPredictor()`
   trực tiếp trong hàm xử lý request — mỗi lần gọi sẽ đọc lại mô hình từ đĩa và dựng lại
   Booster.

2. **Đặc trưng phải khớp lúc huấn luyện.** Hằng số được chép nguyên từ notebook. Lệch một
   chi tiết thì mô hình **vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm** —
   không có exception nào báo. Cách kiểm duy nhất đáng tin:
   `python scripts/kiem_mo_hinh_huong1.py` — cho 2.546 dòng test của `research/` đi qua
   `recommend()` và đối chiếu với `bang_ket_qua.csv`.

3. **Router mỏng, service dày.** `api/v1/*.py` chỉ điều phối; nghiệp vụ nằm trong
   `services/`. Service **không** được ném `HTTPException` — nó không biết mình đang được
   gọi từ HTTP hay từ script; ném lỗi của miền nghiệp vụ rồi để router dịch sang mã HTTP
   (mẫu có sẵn: `TokenExpired` → `api/deps.py` → 401 kèm cờ `expired`).

4. **Xác thực và CSDL chỉ đi qua `api/deps.py`.** `Depends(get_current_uid)` /
   `Depends(require_admin)` / `Depends(get_database)` — **không** tự đọc header
   `Authorization`, không tự cắt chuỗi `"Bearer "`, không tự gọi `get_db()` trong router.
   Router toàn endpoint admin thì gác ở cấp router: `APIRouter(dependencies=[Depends(require_admin)])`.

5. **XAI phải đưa số SHAP vào prompt.** Tuyệt đối không hỏi mô hình ngôn ngữ kiểu "đoán
   xem vì sao ngành này được chọn" — lời giải thích nghe thuyết phục nhưng không liên quan
   gì tới mô hình thật, tệ hơn là không giải thích.

6. **CSDL là MongoDB qua `motor`.** Không có Postgres, không có SQL. Service
   `postgres` trong `docker-compose.yml` đã gỡ 20/09/2026 vì không ai đọc tới.

## Kiểm thử — chạy trước và sau mỗi lần sửa

```bash
pip install -r requirements-dev.txt     # lần đầu
pytest -q                               # 169 test, ~2 giây
python -m ruff check app tests --select F
```

`tests/test_api_contract.py` chụp lại toàn bộ bảng route (đường dẫn · method · tham số) vào
`tests/snapshot_api.json` và so sau mỗi lần sửa. Web gọi 39 đường, mobile 55 — đổi nhầm một
đường là gãy client trong khi backend vẫn xanh. **Cố ý** thêm/bỏ endpoint thì:

```bash
EDUTALK_CAP_NHAT_ANH_CHUP=1 pytest tests/test_api_contract.py   # rồi ĐỌC diff của file json
```

`ruff` bắt được thứ pytest không bắt: tên chưa định nghĩa ở nhánh code mà test chưa chạm tới.

## Mô hình nào đang chạy

Mặc định là **Hướng 1 (`research/`) — 9 nhóm ngành, 63 đặc trưng**, nạp bởi
`services/major_predictor_h1.py` từ gói `data/mo_hinh/huong1/`. Lớp này kế thừa
`MajorPredictorR3` và chỉ khác ở phần NẠP: mô hình nhóm tên `model_nhom{k}.json`, không có
phân tầng, bộ số chuẩn hoá điểm tính trên toàn bộ `train_final`.

```bash
python scripts/dong_goi_mo_hinh_huong1.py   # sau mỗi lần chạy lại Giai đoạn 10 của research/
python scripts/kiem_mo_hinh_huong1.py       # phải in "✅ Backend khớp notebook"
```

Gói bị lệch mã băm SHA-256 thì backend từ chối khởi động. Đường lùi còn lại:
`EDUTALK_PIPELINE=r3` → `research3/` (có 2 nhóm phân tầng 4 và 7) — chỉ chạy ở máy dev,
gói mô hình nằm ngoài Docker context. Nhánh `legacy` đã xoá 20/09/2026.

Các lớp có **cùng bề mặt công khai** nên router không cần biết đang chạy bản nào. Thêm
thuộc tính mới cho lớp này thì phải thêm cho các lớp kia, nếu không đổi biến môi trường là
vỡ.

Điểm vận hành: tư vấn hiện **2** ngành, khám phá hiện **5**. Client không gửi `limit` thì
`recommend()` tự lấy đúng hai số này qua `so_goi_y()`; `/predict/catalog` trả chúng trong
`soGoiY` để giao diện hiển thị mà không phải gõ cứng. Trên 2.546 dòng test (tắt lọc
mềm theo tổ hợp): tư vấn Top-2 **90,6%**, khám phá Top-5 **81,8%**. Backend tái tạo đúng
từng dòng của notebook — nếu sửa gì mà lệch đi thì là đã sai.

## Vòng lặp phản hồi và huấn luyện lại

Người dùng gắn "ngành đã chọn / đã đỗ" vào lượt tư vấn đã lưu (`api/v1/phan_hoi.py`) →
`services/huan_luyen/` huấn luyện lại theo lịch hoặc khi admin bấm (`api/v1/admin_huan_luyen.py`)
→ chỉ đưa vào phục vụ khi qua cổng kiểm định → phiên bản lưu MongoDB GridFS. Chi tiết trong
skill `backend-api`.

**Đừng thử vòng lặp trên MongoDB Atlas thật** — phiên bản được đưa vào phục vụ sẽ bị server
production tự nạp sau ≤ 5 phút. Dựng `mongod --port 27099` tạm và đặt `MONGO_URI` trỏ vào đó.

## Bản đồ thư mục

```
app/
├── main.py              create_app() + lifespan + BẢNG ROUTER (thêm endpoint = thêm 1 dòng)
├── api/
│   ├── deps.py          ⭐ xác thực · phân quyền · handle Mongo — đường DUY NHẤT
│   └── v1/              router mỏng, chỉ điều phối
│       ├── admin/       8 file theo mảng, cùng tiền tố /api/v1/admin
│       └── …            13 router còn lại
├── core/                hạ tầng, không chứa nghiệp vụ
│   ├── config.py        Settings (pydantic-settings) — mọi biến môi trường
│   ├── paths.py         mốc neo đường dẫn tới data/
│   ├── errors.py        handler lỗi tập trung (503 thiếu tệp · 500 không rò chi tiết)
│   ├── mongodb.py · firebase_admin_config.py · privacy.py
├── models/              schema Pydantic — KHÔNG phải mô hình học máy
└── services/
    ├── auth/            service.py · otp.py · email_change.py (lớp trộn)
    ├── rag/ · huan_luyen/
    └── major_predictor*.py · post_service.py · news_service.py · …
```

**Đường dẫn tới dữ liệu đi qua `core/paths.py`.** Đừng viết
`Path(__file__).resolve().parents[3]` — dời file một bậc là lệch hết mà không có gì
báo, lỗi chỉ hiện lúc chạy.

**Biến môi trường đi qua `core/config.py`.** Ba biến cố ý nằm ngoài vì phải đọc lúc
gọi: `EDUTALK_PIPELINE`, `EDUTALK_PHIEN_BAN`, `EDUTALK_MODEL_DIR`.

## Lưu ý

`fieldId` trong `predict_models.py` giới hạn `0..8` theo số nhóm (Hướng 1 và research3
cùng cách nhóm). Đổi cách
nhóm thì phải sửa chặn trên này, nếu không nhóm cuối bị trả 422 khó hiểu.

Thiếu `MONGO_URI` thì app **vẫn khởi động**, chỉ in cảnh báo. `Depends(get_database)` sẽ
trả 503 lúc code chạm tới collection — cố ý ném muộn: ném ngay lúc giải phụ thuộc thì
request thiếu token nhận 503 thay vì 401, lỗi hạ tầng che mất lỗi xác thực.

Ba endpoint `/users/{uid}/premium`, `/users/{uid}/notifications/{id}/read` và
`.../read-all` chỉ đòi **đã đăng nhập**, không so `uid` trên URL với người gọi. Đó là
hành vi cũ, giữ nguyên để không phá client — muốn siết thì phải sửa cả mobile.

## Xong nghĩa là

`pytest -q` xanh, `ruff check app tests --select F` sạch, `/docs` mở được, endpoint mới
hiện đúng schema, và đã gọi thử bằng `curl` **đọc body trả
về** — không chỉ xem status 200.
