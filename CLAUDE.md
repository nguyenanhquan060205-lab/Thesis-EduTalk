# EduTalk HUIT — hướng dẫn cho Claude

Khoá luận cử nhân CNTT, HUIT. Hệ thống gợi ý ngành học bằng XGBoost, kèm web, app di
động và backend. Monorepo, bốn khối tách rời.

**Ngôn ngữ:** chú thích code, tài liệu và báo cáo đều viết **tiếng Việt**. Giữ nguyên
quy ước đó — đừng chèn chú thích tiếng Anh vào file đang dùng tiếng Việt.

---

## Bản đồ kho

| Thư mục | Nội dung | Skill tương ứng |
|---|---|---|
| `research/` | **Hướng 1** — gộp 676 phiếu khảo sát + 16.296 dòng từ hồ sơ trúng tuyển rồi chia 70/15/15 — ⭐ **backend đang phục vụ mô hình này** | `research-pipeline` |
| `research1/` | **Hướng 2** — cùng pipeline, nhưng niêm phong 676 phiếu làm tập đo người thật | `research-pipeline` |
| `research2/` | Pipeline cũ, **7 khối ngành gốc HUIT** | `research-pipeline` |
| `research3/` | Pipeline cũ, **9 nhóm ngành chia lại** — mô hình phục vụ trước Hướng 1, giữ làm đường lùi | `research-pipeline` |
| `backend/` | FastAPI + MongoDB + Firebase + Gemini, serve mô hình | `backend-api` |
| `web/` | Next.js 16 App Router — cổng thí sinh + dashboard admin | `web-ui` |
| `mobile/` | Flutter (iOS + Android) | `mobile-flutter` |
| `scripts_baocao/` | Sinh 3 báo cáo Word: Hướng 1, Hướng 2, so sánh hai hướng | — |
| `docs/` | Báo cáo `.docx` bàn giao | — |

---

## Stack thật (đã kiểm chứng trong file khoá phụ thuộc)

**Backend** — `backend/requirements.txt`
FastAPI 0.111 · Pydantic 2.7 · **MongoDB qua `motor` 3.4** · Firebase Admin 6.5 ·
`google-generativeai` 0.7 (Gemini) · **XGBoost 3.2.0** · scikit-learn 1.4 · Cloudinary ·
APScheduler · BeautifulSoup4.

**Web** — `web/package.json`
**Next.js 16.2 App Router** · React 19.2 · **Tailwind v4** · Recharts 3.10 · zustand 5 ·
framer-motion 12 · GSAP 3.15 · axios · Firebase Web SDK 12 · lucide-react.

**Mobile** — `mobile/pubspec.yaml` (tên package: **`ui_login_out`**)
Flutter · `provider` 6.1 · bộ Firebase (auth, firestore, messaging, storage, app_check,
firebase_ai) · `http` · Cloudinary · `flutter_animate` · `lottie`.

### Những thứ dự án này KHÔNG dùng — đừng đề xuất

- **Không có Redis.** Không nằm trong `requirements.txt` lẫn `docker-compose.yml`.
- **Không có Hadoop/HDFS/Spark.** Toàn bộ dữ liệu là 766 phiếu khảo sát + 18.024 dòng
  Excel, cỡ vài MB. Pandas là đủ và đúng.
- **Không có BLoC/Riverpod** trong `mobile/`. Trạng thái là `setState` + một
  `ChangeNotifier` (`ThemeNotifier`) qua `provider`. Đừng đòi refactor sang BLoC.
- **`go_router` có trong pubspec nhưng không dùng ở đâu cả.** Điều hướng thực tế toàn bộ
  là `Navigator.push`. Viết `context.go(...)` sẽ nổ lúc chạy.
- **Không có Postgres, không có SQL.** Dữ liệu nằm ở MongoDB Atlas và Firestore, cả hai
  đều là dịch vụ ngoài. `docker-compose.yml` từng khai `postgres:15-alpine` kèm
  `DATABASE_URL` — đã gỡ 20/09/2026 vì không dòng code nào đọc tới.

---

## Chạy

```bash
conda activate Edutalk          # môi trường Python duy nhất của dự án

# backend  →  http://localhost:8000  (Swagger ở /docs)
cd backend && uvicorn app.main:app --reload
pytest -q                       # 169 test (cần: pip install -r requirements-dev.txt)

# web      →  http://localhost:3000
cd web && npm run dev           # next dev --webpack

# mobile
cd mobile && flutter run
```

Web đọc backend qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8000`
(`web/src/lib/api.ts`).

> **scipy phải là bản conda-forge.** Từ macOS 26 trở lên, trình nạp thư viện từ chối
> `_spropack.so` trong bản scipy 1.15.3 của PyPI (`zero-fill section type`), kéo theo
> **scikit-learn và xgboost đều không import được**. Cách chữa đã kiểm chứng 19/09/2026:
> `conda install -n Edutalk -c conda-forge scipy=1.15.2 numpy=1.26.4` — numpy giữ nguyên
> phiên bản nên số liệu mô hình không đổi (đã xác nhận bằng `kiem_mo_hinh_huong1.py`).

---

## Sợi dây nối research ↔ backend

Backend phục vụ mô hình **Hướng 1** (`research/`, 9 nhóm ngành, 63 đặc trưng), nạp bởi
`backend/app/services/major_predictor_h1.py` từ gói **`backend/data/mo_hinh/huong1/`**.
Gói nằm trong `backend/` để theo được vào ảnh Docker.

```bash
# Chạy lại Giai đoạn 10 của research/ thì phải đóng gói lại, rồi kiểm:
python backend/scripts/dong_goi_mo_hinh_huong1.py
python backend/scripts/kiem_mo_hinh_huong1.py
```

Backend kiểm SHA-256 từng file của gói lúc khởi động. Vòng lặp phản hồi (`backend/app/services/huan_luyen/`)
huấn luyện lại định kỳ từ nhãn "ngành đã chọn" của người dùng và lưu phiên bản vào MongoDB
GridFS — phiên bản đang phục vụ có thể khác gói; `EDUTALK_PHIEN_BAN=goc` ép dùng gói.
Đường lùi duy nhất còn lại là `EDUTALK_PIPELINE=r3` (mô hình `research3/` phục vụ trước
đây), và nó **chỉ chạy ở máy dev**: gói mô hình nằm trong `research3/`, ngoài
`context: ./backend` của Docker nên ảnh không có. Nhánh `legacy` (pipeline 2 tầng đời đầu)
đã xoá 20/09/2026 cùng 554 dòng code của nó.

**Đừng nhầm tên file predictor.** `major_predictor_h1.py` chỉ có `__init__` (133 dòng) và
thừa kế toàn bộ `recommend`, `build_features`, `giai_thich` từ `major_predictor_r3.py`.
Nghĩa là file tên "_r3" chính là **mã đang phục vụ Hướng 1**, không phải bản dự phòng —
xoá nó là sập hệ thống.

**Bảng tuyển sinh không thuộc pipeline nào.** `backend/data/co_cau_truc/tuyen_sinh_huit_2026.json`
(39 ngành · tổ hợp · điểm chuẩn 3 năm) là **dữ liệu của trường**, dùng chung cho mọi cách
nhóm ngành. Trước đây nó nằm nhờ trong `research/`; giờ nhà chính thức là `backend/data/`,
để nó theo được vào ảnh Docker (`docker-compose.yml` khai `context: ./backend`). Thiếu file
này thì mô hình **vẫn chạy** nhưng mất lọc tổ hợp và nhãn rủi ro — có log cảnh báo.

Điểm vận hành: **tư vấn hiện 2 ngành, khám phá hiện 5**. Số liệu đang phục vụ, đo trên
2.546 dòng test (tắt lọc mềm theo tổ hợp): **tư vấn Top-2 = 90,6%** (đoán bừa 47,6%),
**khám phá Top-5 = 81,8%** (đoán bừa 12,8%). Tập test phần lớn là hồ sơ trúng tuyển có
Likert do copula sinh; trên người thật (Hướng 2, 676 phiếu) mức kỳ vọng là 78,6% và 59,9%.
Backend tái tạo đúng từng dòng của notebook.

**Bẫy chí mạng:** cách dựng đặc trưng ở backend phải **giống hệt** lúc huấn luyện. Lệch
một hằng số thì mô hình vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm và
không có gì báo lỗi. Cách kiểm duy nhất đáng tin: `backend/scripts/kiem_mo_hinh_huong1.py`
— cho 2.546 dòng `test_KHOA.csv` đi qua `recommend()` rồi đối chiếu với `bang_ket_qua.csv`.

---

## Quy ước chung khi làm việc trên kho này

1. **Notebook không viết tay.** Mọi `.ipynb` trong `research/`, `research1/`, `research2/`,
   `research3/` được sinh
   từ `scripts/g0X.py`. Sửa thẳng notebook sẽ mất trắng ở lần sinh sau. Xem skill
   `research-pipeline`.
2. **Mọi bảng chỉ số phải có cột "đoán bừa".** Nhóm 2 ngành thì Top-3 tự đúng 100% mà
   không cần mô hình; thiếu cột đối chứng thì con số 85% có thể chỉ hơn đoán bừa 2 điểm.
3. **Không sửa số liệu trong `docs/*.docx` bằng cách sinh lại tài liệu** — người dùng đã
   chỉnh định dạng bằng tay. Dùng `scripts_baocao/va_so.py`, nó chỉ ghi đè phần text và
   giữ nguyên font, màu, khung bảng, hình.
4. **Giai đoạn 1–5 của `research/` và `research1/` trùng khít** (cùng `g01`–`g05.py`,
   cùng file kết quả từng byte). Sửa ở hướng này thì sửa y hệt ở hướng kia, nếu không
   phép so sánh hai hướng mất ý nghĩa.
