# EduTalk HUIT — hướng dẫn cho Gemini

Khoá luận cử nhân CNTT, HUIT. Monorepo: nghiên cứu XGBoost + backend + web + app di động.

**Ngôn ngữ:** chú thích code, tài liệu và báo cáo đều viết **tiếng Việt**. Giữ đúng quy
ước đó.

---

## Trước khi sửa bất cứ thứ gì — đọc file luật của phần bạn đụng vào

Kho này giữ luật trong `.claude/skills/`. Đó là kiến thức đã trả giá để có, không phải
gợi ý. **Mở ra đọc, đừng đoán nội dung.**

| Bạn đang làm ở | Bắt buộc đọc |
|---|---|
| bất kỳ đâu | `CLAUDE.md` — bản đồ kho, stack thật, cách chạy |
| `research2/`, `research3/`, notebook, mô hình | `.claude/skills/research-pipeline/SKILL.md` |
| `backend/` | `.claude/skills/backend-api/SKILL.md` |
| `web/` | `.claude/skills/web-ui/SKILL.md` |
| `mobile/` | `.claude/skills/mobile-flutter/SKILL.md` |

Nếu đang làm **nâng cấp giao diện web**, đọc thêm:
`.claude/skills/web-ui/references/nang-cap-uiux.md` — đề bài đầy đủ: bảng màu khoá cứng,
danh sách thư viện được phép, cách chia vùng, quy trình làm việc.

Cần dựng component chuyển động mới thì tra
`.claude/skills/web-ui/references/motion-catalog.md`.

**Đọc xong, tóm tắt lại các luật bạn rút ra được và chờ duyệt trước khi sửa code.** Nếu
không mở được file nào, dừng lại và báo.

---

## Bốn thứ dự án này KHÔNG dùng — đừng đề xuất

- **Không có Redis.**
- **Không có Hadoop/HDFS/Spark.** Dữ liệu là 766 phiếu + 18.024 dòng Excel, cỡ vài MB.
  Pandas là đủ và đúng.
- **Không có BLoC/Riverpod** trong `mobile/`. Và `go_router` tuy có trong pubspec nhưng
  **không dùng ở đâu cả** — điều hướng thật là `Navigator.push`.
- **Backend KHÔNG còn chạy `research/`.** Mô hình đang phục vụ là của `research3/`
  (9 nhóm ngành, 63 đặc trưng). Lùi lại bằng `EDUTALK_PIPELINE=legacy`.
- **Không dùng Postgres trên thực tế.** `docker-compose.yml` còn khai `postgres:15-alpine`
  nhưng code không đụng tới; dữ liệu nằm ở MongoDB và Firestore. Đừng viết code SQL.

---

## Ba luật xuyên suốt, áp dụng ở mọi nơi

1. **Notebook không viết tay.** Mọi `.ipynb` trong `research2/`, `research3/` được sinh từ
   `scripts/g0X.py`. Sửa thẳng notebook là mất trắng ở lần sinh sau.
2. **Mọi bảng chỉ số phải có cột "đoán bừa".** Nhóm 2 ngành thì Top-3 tự đúng 100% mà
   không cần mô hình; thiếu cột đối chứng thì con số 85% có thể chỉ hơn đoán bừa 2 điểm.
3. **Không sinh lại `docs/*.docx`.** Người dùng đã chỉnh định dạng bằng tay. Dùng
   `scripts_baocao/va_so.py` — nó chỉ ghi đè phần text, giữ nguyên font, màu, khung, hình.

---

## Chạy

```bash
conda activate Edutalk

cd backend && uvicorn app.main:app --reload    # :8000, Swagger ở /docs
cd web     && npm run dev                      # :3000
cd mobile  && flutter run
```

---

## Phạm vi

Chỉ sửa đúng phần được giao. **Không đụng `research/`** (pipeline cũ mà backend đang chạy
thật) trừ khi được yêu cầu rõ ràng.
