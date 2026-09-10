# EduTalk HUIT — hướng dẫn cho Claude

Khoá luận cử nhân CNTT, HUIT. Hệ thống gợi ý ngành học bằng XGBoost, kèm web, app di
động và backend. Monorepo, bốn khối tách rời.

**Ngôn ngữ:** chú thích code, tài liệu và báo cáo đều viết **tiếng Việt**. Giữ nguyên
quy ước đó — đừng chèn chú thích tiếng Anh vào file đang dùng tiếng Việt.

---

## Bản đồ kho

| Thư mục | Nội dung | Skill tương ứng |
|---|---|---|
| `research/` | Pipeline **cũ**, 2 tầng, 43 đặc trưng — chỉ còn là đường lùi (`EDUTALK_PIPELINE=legacy`) | — |
| `research2/` | Pipeline mới, **7 khối ngành gốc HUIT** | `research-pipeline` |
| `research3/` | Pipeline mới, **9 nhóm ngành chia lại** — ⭐ **backend đang phục vụ mô hình này** | `research-pipeline` |
| `backend/` | FastAPI + MongoDB + Firebase + Gemini, serve mô hình | `backend-api` |
| `web/` | Next.js 16 App Router — cổng thí sinh + dashboard admin | `web-ui` |
| `mobile/` | Flutter (iOS + Android) | `mobile-flutter` |
| `scripts_baocao/` | Sinh và vá báo cáo Word so sánh research2 ↔ research3 | — |
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
- **Không dùng Postgres trên thực tế.** `docker-compose.yml` còn khai service
  `postgres:15-alpine` và `DATABASE_URL`, nhưng **code không đụng tới** — dữ liệu nằm ở
  MongoDB và Firestore. File compose đó là tàn dư, đừng lấy làm nguồn tin về CSDL.

---

## Chạy

```bash
conda activate Edutalk          # môi trường Python duy nhất của dự án

# backend  →  http://localhost:8000  (Swagger ở /docs)
cd backend && uvicorn app.main:app --reload

# web      →  http://localhost:3000
cd web && npm run dev           # next dev --webpack

# mobile
cd mobile && flutter run
```

Web đọc backend qua `NEXT_PUBLIC_API_URL`, mặc định `http://localhost:8000`
(`web/src/lib/api.ts`).

---

## Sợi dây nối research ↔ backend

Backend phục vụ mô hình của **`research3/`** (9 nhóm ngành, 63 đặc trưng), nạp bởi
`backend/app/services/major_predictor_r3.py`. Pipeline cũ `research/` (2 tầng, 43 đặc
trưng) vẫn còn và bật lại được:

```bash
EDUTALK_PIPELINE=legacy          # quay về research/
EDUTALK_MODEL_DIR=<tuyệt đối>/research2/data/processed/10_ChotModel   # đổi thư mục mô hình
```

Số liệu đang phục vụ, đo trên 102 em test: **tư vấn Top-3 = 86,3%**, khám phá Top-3 =
35,3%. Backend tái tạo đúng cả sáu con số của notebook.

**Bẫy chí mạng:** cách dựng đặc trưng ở backend phải **giống hệt** lúc huấn luyện. Lệch
một hằng số thì mô hình vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng sai âm thầm và
không có gì báo lỗi. Cách kiểm duy nhất đáng tin: chạy 102 em trong
`khaosat_test_KHOA.csv` qua `recommend()` rồi đối chiếu với `metrics.json`.

---

## Quy ước chung khi làm việc trên kho này

1. **Notebook không viết tay.** Mọi `.ipynb` trong `research2/`, `research3/` được sinh
   từ `scripts/g0X.py`. Sửa thẳng notebook sẽ mất trắng ở lần sinh sau. Xem skill
   `research-pipeline`.
2. **Mọi bảng chỉ số phải có cột "đoán bừa".** Nhóm 2 ngành thì Top-3 tự đúng 100% mà
   không cần mô hình; thiếu cột đối chứng thì con số 85% có thể chỉ hơn đoán bừa 2 điểm.
3. **Không sửa số liệu trong `docs/*.docx` bằng cách sinh lại tài liệu** — người dùng đã
   chỉnh định dạng bằng tay. Dùng `scripts_baocao/va_so.py`, nó chỉ ghi đè phần text và
   giữ nguyên font, màu, khung bảng, hình.
4. **Không đụng `research/`** khi làm research2/research3 — đó là pipeline cũ, giữ
   nguyên làm đường lùi.
