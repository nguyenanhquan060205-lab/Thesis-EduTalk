# Kế hoạch — RAG cho Trợ lý EduTalk

> ## ⚠️ TÀI LIỆU NÀY LÀ BẢN KẾ HOẠCH BAN ĐẦU — GIỮ LẠI LÀM LỊCH SỬ
>
> Đã triển khai xong Bước 0–4 và đo đạc đầy đủ. **Số liệu và kiến trúc thật nằm ở
> [KETQUA_RAG.md](KETQUA_RAG.md)** — đọc file đó, không đọc file này, khi cần biết hệ
> thống đang chạy thế nào.
>
> Bốn chỗ kế hoạch này nói SAI so với thực tế, vì đo xong mới biết:
>
> | Kế hoạch ghi | Thực tế sau khi đo |
> |---|---|
> | Model sinh `gemini-3.8-flash` | **504 timeout**. Giữ `gemini-flash-lite-latest` (0.9s) |
> | MongoDB là nguồn sự thật, Chroma là bộ đệm | Nguồn sự thật là **file trong git** (`data/kho_tri_thuc/*.md` + `data/co_cau_truc/*.json`). Không dùng MongoDB cho kho tri thức |
> | Kiến trúc lai: tra bảng cho số, RAG cho văn xuôi | **RAG thuần**, một đường duy nhất. Lai không cải thiện gì (100% cả hai) nên đã gỡ |
> | Chroma nhẹ, ~1 MB | **~90 MB** (63 MB import + 27 MB index) |
>
> Giữ file này vì nó ghi lại *vì sao* đã cân nhắc những hướng đó — phần "đã thử và đã
> loại" là thứ hội đồng hay hỏi.

---

## 1. Hiện trạng — RAG chưa tồn tại

[README.md](../README.md) ghi *"FastAPI … (XGBoost, **RAG Chatbot**)"* và
[KeHoach_TrienKhai.md](KeHoach_TrienKhai.md) có mục *"RAG Knowledge Base Panel — nạp vào
Vector Database"*. Cả hai đều là **dự định**, chưa hiện thực.

Chatbot đang chạy trong [gemini_service.py](../backend/app/services/gemini_service.py):

```
câu hỏi + lịch sử chat  ──▶  gemini-flash-lite-latest  ──▶  câu trả lời
                                    ▲
                            system_instruction
```

Không truy xuất, không vector store. `requirements.txt` không có `chromadb`,
`langchain`, `sentence-transformers` hay `faiss`.

### Vì sao đây là lỗi, không phải thiếu tính năng

System prompt bảo Gemini trả lời *"chính xác về **TẤT CẢ** các trường Đại học"* — gồm
**điểm chuẩn** và **học phí**. Model không có nguồn nào để tra, nên nó **bịa số**.

Trong khi kho đã có sẵn dữ liệu chuẩn mà chatbot **chưa từng được thấy**:

| Nguồn | Nội dung | Vị trí |
|---|---|---|
| Ngành & điểm chuẩn | 39 ngành · tổ hợp · điểm chuẩn 2024/2025/2026 | `research/data/processed/tuyen_sinh_huit_2026.json` |
| Nhóm ngành | ngành → 9 nhóm | `research3/…/01_LamSachKhaoSat/mapping.json` |
| Tin tuyển sinh | crawl từ `ts.huit.edu.vn`, 8h và 20h mỗi ngày | MongoDB `news` |
| Chương trình khung | **chưa có** — admin sẽ tự thêm | MongoDB `kho_tri_thuc` (mới) |

Ví dụ cụ thể: hỏi *"Ngôn ngữ Anh HUIT bao nhiêu điểm?"* — file ghi **22.5** (2026),
chatbot hiện tại đoán bừa.

---

## 2. Kiến trúc đề xuất

**Nguyên tắc cốt lõi: MongoDB là nguồn sự thật, kho vector chỉ là bộ nhớ đệm dựng lại
được.**

```
Đừng hỏi *"lưu ở Mongo hay Chroma"*. Hỏi: **cái gì là dữ liệu gốc, cái gì là thứ dựng ra
từ dữ liệu gốc?** Đây đúng mô hình pipeline nghiên cứu của dự án:

```
raw/ (766 phiếu, Excel)  ──g01…g10──▶  model_nganh.json
   dữ liệu gốc                          artifact: xoá được, dựng lại được
```

Kho tri thức y hệt — **Chroma là artifact, không phải bản sao thứ hai**:

```
   NGUỒN GỐC (đã tồn tại sẵn)                    ARTIFACT (dựng lại được)
   ┌────────────────────────────────┐
   │ tuyen_sinh_huit_2026.json      │──┐
   │   39 ngành · điểm chuẩn 3 năm  │  │
   ├────────────────────────────────┤  │        ┌──────────────────────────┐
   │ MongoDB `news` (CHỈ tin duyệt) │──┼──nap──▶│ Chroma                   │
   │   crawler ghi 8h & 20h         │  │  _kho  │  chunk + vector 768      │
   ├────────────────────────────────┤  │  .py   │  + metadata              │
   │ MongoDB `tai_lieu`  ← MỚI      │──┘        │  {loai,nganh,nam,nguon}  │
   │   CTĐT, học phí — admin nhập   │           └────────────┬─────────────┘
   └────────────────────────────────┘                        │
                                                             │ top-k + lọc metadata
                                                             ▼
   câu hỏi ──▶ [ngữ cảnh + câu hỏi + lịch sử] ──▶ gemini-3.8-flash ──▶ trả lời
                                                                        │
                                                          kèm TRÍCH NGUỒN
```

**Không lưu trùng nội dung.** Chroma giữ chunk + vector + metadata và là nơi truy vấn.
Ba nguồn gốc thì hai đã có sẵn; chỉ `tai_lieu` là mới — vì chương trình khung và học phí
do admin nhập tay thì phải có chỗ chứa, sửa và xoá được. Không thể bắt admin gõ thẳng vào
Chroma.

Script `nap_kho.py` đọc ba nguồn → chunk → nhúng → đẩy vào Chroma. Chạy khi cần, hoặc tự
chạy lúc khởi động nếu Chroma rỗng.

### Vì sao MongoDB làm nguồn sự thật

App deploy trên **Render** (`edutalk-7ndf.onrender.com`). Ổ đĩa Render là **ephemeral** —
không gắn Persistent Disk thì mọi thứ ghi ra đĩa **bị xoá sau mỗi lần restart hoặc
redeploy**. Mà `chromadb.PersistentClient` ghi ra đĩa.

Hậu quả nếu làm ngây thơ: index biến mất, chatbot **lặng lẽ tụt về không-RAG, không có
lỗi nào báo**. Đúng kiểu bug đã dính hai lần ở pipeline nghiên cứu.

Cách né: tài liệu nằm trong MongoDB (đã có sẵn, bền vững), index **dựng lại lúc khởi
động**.

### Lưu luôn vector trong MongoDB, đừng nhúng lại mỗi lần khởi động

Nếu khởi động mà nhúng lại toàn bộ kho thì mỗi lần Render restart là một loạt lệnh gọi
Gemini. Ba hệ quả xấu:

- **Chạm giới hạn tần suất.** Gói free của Gemini có trần số lệnh gọi mỗi phút. Nhúng vài
  trăm tài liệu một lúc dễ bị chặn → khởi động chậm hoặc lỗi.
- **Tốn quota vô ích.** Cùng một nội dung, nhúng đi nhúng lại hàng chục lần.
- **Render free ngủ đông sau ~15 phút không ai truy cập.** Mỗi lần thức dậy lại nhúng lại
  từ đầu — người dùng đầu tiên phải chờ.

Cách đúng: **nhúng đúng một lần khi tài liệu được thêm hoặc sửa, lưu vector ngay trong
document MongoDB**. Khởi động chỉ việc đọc vector có sẵn nạp vào Chroma — không gọi API
lần nào.

```
{ _id, loai, tieu_de, noi_dung, nguon, nam, ngay_cap_nhat,
  bam_noi_dung: "sha256…",     ← đổi thì mới nhúng lại
  vector: [768 số thực] }
```

768 số thực ≈ 6 KB mỗi tài liệu, thoải mái dưới trần 16 MB của MongoDB.

Trường `bam_noi_dung` để biết nội dung có thay đổi thật không — sửa lỗi chính tả một chữ
cũng không cần nhúng lại nếu băm không đổi.

### Chatbot phải sống được khi RAG chết

Nhúng câu hỏi cũng là một lệnh gọi API, có thể lỗi mạng hoặc bị chặn tần suất. Khi đó
**chatbot vẫn phải trả lời được** ở chế độ không-RAG kèm cảnh báo, chứ không được ném lỗi
500. Nhưng phải **ghi log rõ ràng** — nếu im lặng thì đúng vào cái bẫy "lặng lẽ tụt về
không-RAG" đã nêu ở trên.

---

## 2b. Rà soát sơ đồ 4 bước

Sơ đồ gốc: **Thu thập → Làm sạch → Chunking → Embedding & Storage (Chroma)**.

Khung đúng. Chunking theo *đơn vị ngữ nghĩa* tốt hơn chia cứng theo ký tự, và metadata
kèm tên ngành + nguồn là đúng. Năm chỗ cần bổ sung:

### Thiếu 1 — sơ đồ mới có nửa đầu

Bốn bước đó là **nạp dữ liệu** (ingestion). Nửa sau — **truy vấn** — chưa có:

```
Bước 5 TRUY XUẤT      câu hỏi → nhúng → tìm k đoạn gần nhất → lọc theo metadata
Bước 6 SINH CÂU TRẢ LỜI  ngữ cảnh + câu hỏi + lịch sử → Gemini → trả lời KÈM TRÍCH NGUỒN
Bước 7 ĐÁNH GIÁ       bộ câu hỏi có đáp án chuẩn → so tỉ lệ đúng khi bật/tắt RAG
```

Hội đồng nhìn sơ đồ dừng ở "Storage" sẽ hỏi ngay *"rồi lấy ra dùng thế nào?"*.

### Thiếu 2 — không có phép đo

Cả dự án đã theo luật *"mọi bảng chỉ số phải có cột đoán bừa"*. RAG cũng vậy: phải có
**mốc không-RAG** để so, nếu không thì không chứng minh được nó có tác dụng.

Cách đo: ~30 câu hỏi lấy đáp án thẳng từ `tuyen_sinh_huit_2026.json` (*"Ngành X điểm
chuẩn 2026?"*, *"Ngành Y xét tổ hợp nào?"*), chạy hai lần — tắt RAG và bật RAG — rồi so
tỉ lệ trả lời khớp dữ liệu thật.

### Thiếu 3 — vòng cập nhật

Sơ đồ là một chiều, chạy một lần. Nhưng crawler cào tin **8h và 20h mỗi ngày**. Không có
vòng nạp lại thì tin mới không bao giờ vào kho.

### Thiếu 4 — lọc tin chưa duyệt

Tài liệu trong collection `news` có trường **`status: "pending"`** — tin vừa cào phải chờ
admin duyệt. Nếu index cả tin `pending` thì **nội dung chưa kiểm duyệt trở thành câu trả
lời chính thức** của trợ lý. Chỉ nạp tin đã duyệt.

### Thiếu 5 — Chroma không được làm kho cuối

Sơ đồ vẽ Chroma DB là điểm đến cuối. Trên Render, đĩa bị xoá mỗi lần redeploy (mục 2).
Chroma vẫn dùng, nhưng đứng **sau** MongoDB: Mongo giữ tài liệu, Chroma là index dựng lại
lúc khởi động.

### Siết thêm ba chỗ

| Chỗ | Vấn đề | Cách xử lý |
|---|---|---|
| **Metadata thiếu năm** | điểm chuẩn 2024 và 2026 khác nhau; thiếu `nam` thì bot trích số cũ mà vẫn nghe hợp lý | thêm `nam`, `ngay_cap_nhat` vào metadata; prompt bắt nêu rõ năm |
| **Chunk không chặn kích thước** | `gemini-embedding-2` giới hạn **8.192 token**. CTĐT một ngành có thể vượt | chia theo đơn vị ngữ nghĩa trước, đoạn nào vượt ~1.500 từ thì cắt tiếp có chồng lấn |
| **Chưa chống trùng** | Đề án tuyển sinh và Website ghi **cùng một điểm chuẩn** → hai chunk gần trùng chiếm hết top-k, đẩy thông tin khác ra ngoài | băm nội dung đã chuẩn hoá, bỏ bản trùng; ưu tiên nguồn có `nam` mới hơn |

### Một điều chỉnh về Bước 1 và 2

Sơ đồ coi mọi nguồn là văn bản thô cần làm sạch. Nhưng `tuyen_sinh_huit_2026.json` **đã là
dữ liệu có cấu trúc** — 39 ngành, tổ hợp, điểm chuẩn 3 năm, sạch sẵn. Đưa nó qua bước
"làm sạch văn bản" rồi chunk là **đi lùi**: mất cấu trúc, dễ sinh lỗi.

Tách hai luồng:

```
Nguồn CÓ CẤU TRÚC (JSON, MongoDB)  ──▶ sinh thẳng chunk chuẩn ──▶ nhúng
Nguồn VĂN BẢN THÔ (PDF đề án, HTML web) ──▶ làm sạch ──▶ chunk ──▶ nhúng
```

Riêng tin tức: trường `content_html` là **HTML thô**, đúng chỗ cần bước làm sạch của bạn.

---

## 3. Kho vector — chốt dùng Chroma

**Đã chốt: dùng Chroma.** Lý do: đây là khoá luận, "Vector Database" là thành phần cần
nêu được trong kiến trúc, và Chroma cho sẵn API lọc theo metadata (`where={"nam": 2026}`)
— đúng thứ cần cho dữ liệu điểm chuẩn theo năm.

Hai điều phải biết khi dùng, để không bị hỏi bất ngờ:

**Nặng 150 MB, trong đó 133 MB không dùng tới.** Đo thật lúc cài:

| Gói | Dung lượng | Dự án dùng không? |
|---|---:|---|
| `kubernetes` | 69.0 MB | ❌ chỉ cần khi chạy Chroma dạng server cụm |
| `onnxruntime` | 64.5 MB | ❌ chỉ cần cho nhúng cục bộ — ta dùng Gemini API |
| `tokenizers` | 9.4 MB | ❌ đi kèm onnxruntime |
| `chromadb` lõi | 4.2 MB | ✅ |
| còn lại | 3.0 MB | ✅ |

Ảnh hưởng: ảnh Docker phình, thời gian build trên Render lâu hơn. Chấp nhận được.

**Xung đột `protobuf`.** Cài Chroma nâng `protobuf` lên 7.36.1, pip cảnh báo không tương
thích `google-ai-generativelanguage 0.6.6`. Đã thử: Gemini và backend **hiện vẫn chạy**.
Nhưng phải **ghim phiên bản** trong `requirements.txt` để lần deploy sau không vỡ.

**Ghi chú trung thực cho báo cáo:** ở quy mô vài trăm tài liệu, tìm kiếm bằng một phép
nhân ma trận numpy cũng cho kết quả y hệt và nhanh hơn. Chroma chỉ thật sự hơn khi vượt
~100.000 vector. Chọn Chroma vì tính chuẩn mực kiến trúc và khả năng mở rộng, không phải
vì hiệu năng ở quy mô hiện tại — nói thẳng điều này trong báo cáo sẽ vững hơn là để hội
đồng tự phát hiện.

---

## 4. Sáu bước triển khai

| # | Bước | Nội dung | File |
|---|---|---|---|
| 0 | Chuẩn bị | chốt thư viện · đổi model sang `gemini-3.8-flash` | `requirements.txt` · `gemini_service.py` |
| 1 | Kho tài liệu | collection `kho_tri_thuc` trong MongoDB: `{loai, tieu_de, noi_dung, nguon, cap_nhat}` | `services/rag/kho.py` |
| 2 | Nạp nguồn có sẵn | 39 ngành từ JSON · đồng bộ `news` · chỗ cắm cho chương trình khung | `services/rag/nguon.py` |
| 3 | Nhúng & tìm kiếm | `gemini-embedding-001`, 768 chiều, nhúng theo lô · dựng index lúc khởi động | `services/rag/tim.py` |
| 4 | Nối vào chatbot | truy xuất k đoạn → chèn vào prompt → **bắt buộc trích nguồn** | `gemini_service.py` |
| 5 | Trang quản trị | admin thêm/sửa/xoá tài liệu, index cập nhật ngay | `api/v1/kho_tri_thuc.py` |
| 6 | Kiểm chứng | bộ câu hỏi có đáp án đúng, đo tỉ lệ trả lời khớp dữ liệu thật | `scripts/kiem_rag.py` |

### Bước 4 — luật sống còn

Giống luật đã áp cho XAI: **đưa dữ liệu thật vào prompt, không hỏi model "mày nghĩ điểm
chuẩn bao nhiêu"**. Prompt phải nói rõ:

> Chỉ trả lời điểm chuẩn, tổ hợp, học phí **dựa trên ngữ cảnh được cung cấp**. Ngữ cảnh
> không có thì nói thẳng là chưa có dữ liệu, **tuyệt đối không suy đoán**.

Thiếu câu này thì RAG chỉ là trang trí — model vẫn bịa khi ngữ cảnh không khớp.

### Bước 6 — đo được mới gọi là xong

Dựng ~30 câu hỏi có đáp án chuẩn lấy thẳng từ `tuyen_sinh_huit_2026.json`
(*"Ngành X điểm chuẩn 2026?"*, *"Ngành Y xét tổ hợp nào?"*), chạy trước và sau khi bật
RAG, so tỉ lệ đúng. Không có phép đo này thì không chứng minh được RAG có tác dụng, và
hội đồng sẽ hỏi.

---

## 5. Đã chốt

- **Bộ nhúng:** **`gemini-embedding-2`** — bản mới nhất khoá hiện tại gọi được. Gốc 3072
  chiều, rút xuống **768 chiều** bằng `output_dimensionality` (Matryoshka). Đã thử: nhúng
  đơn và nhúng theo lô đều chạy. Dùng lại `GEMINI_API_KEY` sẵn có, không tốn RAM.

  > `text-embedding-004` **không dùng được nữa** — gọi thử trả về `404 … is not supported
  > for embedContent`. Nó thuộc dòng `text-embedding` (2024) đã bị dòng `gemini-embedding`
  > thay thế; số "004" lớn hơn "001" nhưng đời cũ hơn.

  Đo thử trên 39 ngành thật với 5 câu hỏi kiểu thí sinh: `gemini-embedding-001` và
  `gemini-embedding-2` **đều đạt Top-1 5/5, MRR 1.000**. Ở quy mô này chọn model nào cũng
  như nhau; khác biệt chỉ lộ khi kho lên hàng nghìn tài liệu.
- **Model sinh:** `gemini-3.8-flash` — mới nhất mà khoá hiện tại gọi được, 1.048.576 token
  vào. Đang dùng `gemini-flash-lite-latest`, yếu hơn.
- **Phạm vi kho:** ngành học · tin tức · chương trình khung · mở rộng thêm sau.

- **Kho vector:** Chroma (mục 3), đứng sau MongoDB, dựng lại lúc khởi động.
- **Hạ tầng đích:** **Render Standard 2 GB (~$25/tháng)**, dự kiến mua **giữa tháng
  10/2026**. Từ nay tới đó phát triển trên máy cục bộ (Mac / Windows 24 GB).

### Hệ quả của mốc giữa tháng 10

Trong 5 tuần chờ, backend công khai vẫn nằm trên **Render free 512 MB**. Mà Dockerfile
đang khai `-w 4` → 4 tiến trình × 387 MB ≈ **1,5 GB**, gấp ba lần RAM cho phép.

Phải sửa ngay, không đợi tới lúc mua gói:

```dockerfile
# trước:  CMD ["gunicorn", "app.main:app", "-w", "4", ...]
CMD ["gunicorn", "app.main:app", "-w", "2", "--preload", \
     "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

`--preload` nạp app **trước khi fork** nên 227 MB mô hình XGBoost được chia sẻ qua
copy-on-write thay vì nhân bản theo từng worker. Lên gói 2 GB thì nâng lại `-w 4`.

**Việc cần làm trước tiên:** xem log Render hiện tại có dòng OOM hay `Worker was sent
SIGKILL` không. Nếu có thì bản đang chạy đã hỏng âm thầm suốt thời gian qua, và mọi thử
nghiệm trên đó đều không đáng tin.

### Lịch 5 tuần

| Tuần | Việc | Chạy ở đâu |
|---|---|---|
| 1 | Bước 0–2: ghim thư viện, đổi model, dựng `kho_tri_thuc`, nạp 39 ngành | cục bộ |
| 2 | Bước 3–4: nhúng, Chroma, nối vào chatbot, bắt trích nguồn | cục bộ |
| 3 | Bước 5: trang quản trị tài liệu; nạp tin tức đã duyệt + chương trình khung | cục bộ |
| 4 | Bước 7: bộ 30 câu hỏi, đo bật/tắt RAG, chỉnh top-k và cách chunk | cục bộ |
| 5 | Mua Render Standard, deploy, đo lại trên môi trường thật, viết báo cáo | Render |

Thứ tự này đặt phép đo ở tuần 4 — **trước** khi tiêu tiền. Nếu RAG không cải thiện được
gì thì biết sớm, còn kịp đổi hướng.

## 6. Sơ đồ hoàn chỉnh — 7 bước

```
  NGUỒN CHÍNH THỨC HUIT
  Đề án tuyển sinh · Website · CTĐT · Học phí · Điểm chuẩn · Chỉ tiêu
            │
   ┌────────┴────────┐
   ▼                 ▼
CÓ CẤU TRÚC      VĂN BẢN THÔ
(JSON, Mongo)    (PDF, HTML)
   │                 │
   │            ① THU THẬP
   │            ② LÀM SẠCH   bỏ ký tự thừa, tiêu đề/chân trang lặp,
   │                          thông tin lỗi thời, chuẩn hoá định dạng
   └────────┬────────┘
            ▼
      ③ CHUNKING        theo đơn vị ngữ nghĩa (ngành · điều kiện ·
            │            học phí · CTĐT), chặn ≤ ~1.500 từ, chống trùng
            ▼
      ④ EMBEDDING       gemini-embedding-2 → 768 chiều
            │            metadata: {loai, nganh, nam, nguon, ngay_cap_nhat}
            ▼
   ┌──────────────────────────────┐
   │ MongoDB kho_tri_thuc         │  ← nguồn sự thật, bền vững
   │        ↓ dựng lại khi khởi động
   │ Chroma (in-memory)           │  ← index truy vấn
   └──────────────┬───────────────┘
                  ▼
      ⑤ TRUY XUẤT      câu hỏi → nhúng → top-k + lọc metadata
                  ▼
      ⑥ SINH TRẢ LỜI   ngữ cảnh + câu hỏi + lịch sử → gemini-3.8-flash
                  │     → trả lời KÈM TRÍCH NGUỒN
                  ▼
      ⑦ ĐÁNH GIÁ       30 câu hỏi có đáp án chuẩn · so bật/tắt RAG
```
