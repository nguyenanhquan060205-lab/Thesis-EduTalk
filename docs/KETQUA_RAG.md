# Kết quả thực nghiệm RAG — đo ngày 10/09/2026

Mọi con số dưới đây chạy lại được bằng hai lệnh, không có số nào gõ tay:

```bash
conda activate Edutalk
cd backend
python scripts/kiem_truy_hoi.py      # tầng truy hồi
python scripts/kiem_rag.py           # tầng sinh
```

Cấu hình lúc đo: `gemini-embedding-2` 768 chiều · Chroma 1.5.9 cosine · top-k = 4 ·
`gemini-flash-lite-latest` · kho 39 chunk sinh từ `tuyen_sinh_huit_2026.json`.

---

## 1. Chọn model sinh — đo trước khi chọn, không chọn theo "mới nhất"

Cùng một prompt RAG, chạy 3 lần mỗi model:

| model | lần 1 | lần 2 | lần 3 |
|---|---:|---:|---:|
| `gemini-3.8-flash` | **504 timeout** | — | — |
| `gemini-3.7-flash` | 7.3s | 3.5s | 15.4s |
| `gemini-3.5-flash` | 2.8s | 3.2s | 2.7s |
| **`gemini-flash-lite-latest`** ← chọn | **0.8s** | **1.0s** | **1.0s** |

Các bản 3.7/3.8 có suy luận nội bộ. Trong RAG, câu trả lời **đã nằm sẵn trong ngữ
cảnh**, chỉ việc đọc ra — nghĩ thêm không làm đúng hơn, chỉ làm thí sinh chờ.

Kết luận đi ngược trực giác "model mới hơn thì tốt hơn", và đó chính là lý do phải đo.

---

## 2. Ngưỡng chặn câu lạc đề — đo ra, không đoán

10 câu đúng chủ đề và 8 câu lạc đề, xem khoảng cách cosine của đoạn gần nhất:

| nhóm | gần nhất | xa nhất |
|---|---:|---:|
| đúng chủ đề | 0.162 | **0.286** |
| lạc đề | **0.384** | 0.491 |

Hai nhóm **tách rời hẳn**, khe hở 0.286 → 0.384. Cắt ở giữa: `NGUONG_LAC_DE = 0.35`.

Không có ngưỡng này thì câu *"Hôm nay trời Sài Gòn thế nào?"* vẫn kéo về 4 ngành ngẫu
nhiên rồi nhét vào prompt.

> ⚠️ Hai số này gắn với `gemini-embedding-2` ở 768 chiều. Đổi bộ nhúng hoặc số chiều
> là phải đo lại — không gian vector khác thì thang khoảng cách cũng khác.

---

## 3. Tầng truy hồi — 38 câu gán nhãn tay, chia 4 mức khó

Bộ câu hỏi ở `backend/data/kiem_thu/truy_hoi.json`.

| mức độ | câu | **vector Hit@1** | từ khoá Hit@1 | đoán bừa | vector hơn từ khoá |
|---|--:|--:|--:|--:|--:|
| A · nêu nguyên văn tên ngành | 5 | 100% | 100% | 0% | **+0.0** |
| B · viết tắt (CNTT, QTKD, TMĐT, AI) | 9 | 100% | 33.3% | 0% | **+66.7** |
| C · gõ không dấu | 6 | 100% | 100% | 0% | **+0.0** |
| D · chỉ nói nguyện vọng, không nêu tên ngành | 18 | 100% | 61.1% | 5.6% | **+38.9** |
| **TỔNG** | **38** | **100%** | **65.8%** | **2.6%** | **+34.2** |

*Hit@4 và MRR của vector đều đạt 100% / 1.000 ở cả bốn mức.*

### Đọc bảng này thế nào

**Cột "từ khoá" mới là phần đáng giá.** Đó là TF-IDF chạy trên đúng 39 chunk ấy, không
có vector nào cả. Nó trả lời câu hỏi mà hội đồng chắc chắn sẽ hỏi: *"sao không tìm bằng
từ khoá cho xong?"*

Câu trả lời bằng số: **ở mức A và C, từ khoá đạt đúng 100% — tầng nhúng không đóng góp
gì.** Embedding chỉ kiếm được chỗ đứng ở:

- **Mức B, +66.7 điểm** — thí sinh gõ *"CNTT"*, *"QTKD"*, *"TMĐT"*. Không có chữ nào
  trùng với *"Công nghệ thông tin"*, nên từ khoá bó tay.
- **Mức D, +38.9 điểm** — thí sinh nói *"em muốn làm lập trình viên"* mà không biết tên
  ngành. Đây cũng là kiểu câu duy nhất mà **tra bảng bó tay hoàn toàn (0%)**, vì không
  có tên ngành nào để so khớp.

Nói cách khác: mức A/C là phần việc của tra bảng, mức B/D là phần việc của vector. Đó
là căn cứ định lượng cho kiến trúc lai, không phải lập luận suông.

### Đã cân nhắc kiến trúc lai, và đã bỏ

Có một giai đoạn hệ thống chạy **kiến trúc lai**: câu hỏi nào nhắc đúng tên ngành kèm
từ khoá kiểu *"điểm chuẩn"* thì tra thẳng dict (function calling), còn lại mới đi
vector. Đã gỡ, vì đo ra thì nó **không cải thiện gì**:

| | RAG thuần | Lai (RAG + tra bảng) |
|---|--:|--:|
| Tầng sinh, 50 câu | **100%** | **100%** |
| Context precision | 0.303 | 0.303 |
| Hit@1 truy hồi | 100% | 100% |
| Số đường truy vấn phải bảo trì | **1** | 2 |

Tra bảng chỉ kích hoạt được ở **18%** số câu (câu phải nhắc nguyên tên ngành), và ở
đúng những câu đó thì vector cũng đã trả về chunk đúng ở hạng 1. Giữ thêm một đường
thứ hai chỉ để làm lại việc mà đường thứ nhất đã làm đúng.

Lý do bỏ, xếp theo thứ tự quan trọng:

1. **Không đo được lợi ích.** Hai cột số bằng nhau tuyệt đối.
2. **Đề tài là RAG.** Hai đường truy vấn làm kiến trúc mất mạch lạc và phải giải
   thích thêm một cơ chế mà không có số liệu nào biện hộ.
3. **Ít code hơn thì ít lỗi hơn.** Bỏ được `tim_nganh` / `can_tra_bang` / `tra_cuu`,
   bỏ luôn phần khử trùng giữa hai đường.

Dữ liệu điểm chuẩn **không mất**: `nguon_co_cau_truc.py` vẫn đọc
`tuyen_sinh_huit_2026.json` ở bước ① Thu thập, viết mỗi ngành thành một đoạn văn hoàn
chỉnh rồi nhúng vào Chroma như mọi tài liệu khác. Nó đổi vai từ *nguồn tra cứu* thành
*nguồn tài liệu*.

### Hai điểm yếu phải nói thẳng trong báo cáo

1. **Kho chỉ 39 chunk.** Chọn 4 trong 39 là bài toán dễ; ở quy mô hàng nghìn chunk thì
   Hit@1 100% sẽ không giữ được.
2. **Mức D có 2–3 mã ngành cùng được tính là đúng** (câu *"làm lập trình viên"* chấp
   nhận CNTT, TTNT, KHDL). Gán nhãn rộng như vậy làm con số đẹp hơn thực tế. Mốc đoán
   bừa 5.6% vẫn cho thấy 100% là thật, nhưng không nên trình bày như thể mỗi câu chỉ có
   một đáp án duy nhất.

---

## 4. Tầng sinh — RAG có làm chatbot bớt bịa không

50 câu hỏi, đáp án lấy thẳng từ `tuyen_sinh_huit_2026.json`, chấm bằng máy.

| | Điểm chuẩn | Tổ hợp | **TỔNG** |
|---|--:|--:|--:|
| **TẮT RAG** (model tự trả lời) | 0/24 · **0.0%** | 7/26 · 26.9% | 7/50 · **14.0%** |
| **BẬT RAG** | 24/24 · **100%** | 26/26 · 100% | 50/50 · **100%** |
| **chênh** | **+100.0** | +73.1 | **+86.0 điểm** |

*Chạy trước ở n = 20 cho 15.0% → 100.0% (+85.0). Nâng lên n = 50 kết quả gần như
không đổi, nên con số đã ổn định.*

### ⚠️ 100% này đo TRUNG THỰC VỚI NGUỒN, không đo ĐÚNG VỚI THỰC TẾ

Phải phân biệt rạch ròi, nếu không thì cả bảng trên bị hiểu sai:

| | đo cái gì | bảng trên nói được không |
|---|---|---|
| **Faithfulness** — trung thực với nguồn | bot có chép đúng những gì trong tài liệu không | ✅ **100%** |
| **Factual accuracy** — đúng với thực tế | con số trong tài liệu có đúng ngoài đời không | ❌ **không đo được** |

Tính tới lúc đo, **điểm chuẩn trong `tuyen_sinh_huit_2026.json` chưa được đối chiếu
với công bố chính thức của trường.** Nếu file đang chứa số tạm thì bot sẽ nói đúng
số tạm ấy — vẫn 100% faithfulness, mà vẫn sai với thí sinh.

RAG **không** làm model thông minh hơn, nó làm model **lặp lại dữ liệu của bạn**. Trần
chất lượng của hệ thống chính là chất lượng file nguồn. Nói thẳng điều này trong báo cáo
vững hơn nhiều so với để hội đồng hỏi *"số này đối chiếu với đâu?"*.

**Đổi dữ liệu thật vào:** thay nội dung `tuyen_sinh_huit_2026.json` rồi chạy
`python scripts/nap_kho.py`. Không phải sửa dòng code nào — ngành nào đổi số thì nhúng
lại ngành đó, phần còn lại dùng vector cũ. Chạy lại `kiem_rag.py` để ra bảng mới.

**Điểm chuẩn 0% khi tắt RAG** là con số quan trọng nhất của cả bài đo: model **không
biết** điểm chuẩn HUIT, nhưng nó vẫn trả lời trôi chảy, tự tin, kèm cả lời khuyên. Ví
dụ thật lúc chạy thử: bot khẳng định *"điểm chuẩn Ngôn ngữ Anh năm gần nhất (2024) là
21,00 điểm"* — giá trị thật là **23.0**.

Đó là lý do RAG ở đây không phải tính năng trang trí mà là điều kiện để hệ thống dùng
được: một chatbot tuyển sinh nói sai điểm chuẩn còn tệ hơn không có chatbot.

---

## 5. Hai lỗi tự tìm ra trong lúc đo

Ghi lại vì cả hai đều thuộc loại **sai âm thầm**, và cách phát hiện đáng đưa vào báo cáo.

### 5.1 Hàm chấm loại nhầm câu trả lời đúng

Bản đầu so chuỗi: đáp án `21.0` rút gọn thành `"21"`, biểu thức chính quy
`(?<![\d.,])21(?![\d.,])`. Model viết `"21.0"` → sau `21` là dấu chấm → **không khớp**.
Câu trả lời đúng bị chấm sai.

Hậu quả: lần chạy đầu báo BẬT RAG = 65.0%, thấp hơn sự thật **35 điểm**. Sửa bằng cách
rút mọi số trong câu trả lời rồi **so bằng giá trị số**, không so chuỗi.

Bài học: khi một phép đo cho kết quả xấu hơn dự đoán, nghi ngờ phép đo trước khi nghi
ngờ hệ thống.

### 5.2 Truy xuất bỏ quên lịch sử hội thoại

`lay_ngu_canh()` chỉ nhúng **câu hỏi hiện tại**. Thí sinh hỏi *"Ngành Ngôn ngữ Anh thế
nào?"* rồi lượt sau gõ *"2026"* — nhúng riêng chữ `"2026"` cho ra vector vô nghĩa, ngưỡng
lạc đề vứt sạch ngữ cảnh, và bot trả lời **không có dữ liệu nào**, tức là bịa.

Đo trước và sau khi sửa:

| câu hỏi lượt sau | không ghép lịch sử | có ghép lịch sử |
|---|---|---|
| `"2026"` | **0 đoạn** | Ngôn ngữ Anh + 3 đoạn |
| `"điểm chuẩn"` | **0 đoạn** | tra bảng: Ngôn ngữ Anh + 3 đoạn |
| `"còn tổ hợp thì sao ạ"` | **0 đoạn** | tra bảng: Ngôn ngữ Anh + 3 đoạn |

Cách sửa: câu hỏi **ngắn hơn 8 từ** thì ghép 2 lượt hỏi gần nhất của người dùng vào
trước rồi mới nhúng. Chỉ lấy lượt của người dùng, không lấy câu bot trả lời — câu bot
dài, ghép vào sẽ dìm mất mấy chữ của câu hỏi thật.

---

## 5b. RAM và độ trễ — RAG có làm chậm người dùng không

**RAM ở đây là của MÁY CHỦ, không phải của thí sinh.** Chroma chạy nhúng trong tiến
trình FastAPI; trình duyệt và điện thoại chỉ nhận về JSON chữ, không đụng gì tới nó.

Đo bằng `psutil` trên tiến trình backend:

| | RAM tích luỹ | thêm |
|---|--:|--:|
| Python + thư viện nền | 21.3 MB | |
| `google-generativeai` (đã có từ trước RAG) | 99.4 MB | +78.1 |
| `import chromadb` | 162.6 MB | **+63.2** |
| nạp 39 chunk vào Chroma | 189.8 MB | **+27.2** |
| mô hình XGBoost | **319.6 MB** | +129.8 |

**Chroma tốn ~90 MB.** (Một phép đo trước đó cho ra "~1 MB" — sai, do đo không đúng cách.)

### Độ trễ mỗi câu hỏi

| | thời gian | chiếm |
|---|--:|--:|
| Nhúng câu hỏi (gọi API Google qua mạng) | **767.6 ms** | 46% |
| **Chroma tìm trong 39 vector** | **0.83 ms** | **0.05%** |
| Gemini sinh câu trả lời | ~900 ms | 54% |

Kết luận quan trọng: **RAG làm chậm thêm ~0.8s, và toàn bộ 0.8s đó là lệnh gọi API
nhúng, không phải Chroma.** Tối ưu Chroma là tối ưu nhầm chỗ.

Đã thêm nhớ đệm LRU 512 câu hỏi gần nhất cho lệnh gọi nhúng. Đo lại cùng một câu:

```
lần 1: 1627.2 ms      lần 2: 1.4 ms      lần 3: 1.0 ms
```

### Kho phình to thì sao

| số chunk | RAM thêm | thời gian tìm |
|--:|--:|--:|
| 39 | 27 MB | 0.83 ms |
| 1.000 | 75 MB | 0.87 ms |
| 10.000 | 256 MB | 1.90 ms |
| 100.000 | 912 MB | **2.28 ms** |

Gấp 2.500 lần dữ liệu, thời gian tìm chỉ tăng 1.4 ms. **RAM mới là thứ giới hạn quy
mô, không phải tốc độ** — điểm đáng nêu trong phần bàn về khả năng mở rộng.

### Hệ quả cho cấu hình deploy

320 MB × 2 worker = 640 MB, **vượt 512 MB của gói Render free**. Dockerfile đã bỏ cờ
`-w` để gunicorn đọc `WEB_CONCURRENCY`, đổi được trên trang cấu hình Render mà không
phải build lại image:

| gói | `WEB_CONCURRENCY` |
|---|---|
| Render free 512 MB | **1** |
| Render Standard 2 GB | **4** |

---

## 6. Vì sao không dùng RAGAS cho tầng truy hồi

`context_precision` và `context_recall` của RAGAS phải nhờ một LLM chấm xem đoạn lấy về
có liên quan không. Ở bài toán này ta **biết chắc** đoạn nào đúng — câu hỏi về ngành X
thì chunk `nganh-<mã X>` là đáp án. Đo trực tiếp thì:

- kết quả **tất định**, chạy lại lúc nào cũng ra đúng con số đó;
- không tốn lượt API nào cho việc chấm;
- không ai cãi được cách chấm.

RAGAS vẫn đáng dùng cho `faithfulness` và `answer_relevancy` ở tầng sinh — nhưng **cài
ở conda env riêng**. Đo thật: `pip install ragas` kéo theo **48 gói** và nâng
`pydantic` 2.7.1 → 2.13.5, đúng gói FastAPI đang dựa vào. Tuyệt đối không đưa vào
`requirements.txt`.

---

## 7. Ghi chú trung thực cho phần bảo vệ

- Ở quy mô 39 chunk, một phép nhân ma trận numpy cho kết quả **y hệt** Chroma và nhanh
  hơn. Chroma hơn thật sự khi vượt ~100.000 vector. Chọn Chroma vì chuẩn mực kiến trúc
  và khả năng mở rộng, **không phải vì hiệu năng ở quy mô hiện tại** — nói thẳng điều
  này vững hơn là để hội đồng tự phát hiện.
- Chroma cài về nặng ~150 MB, trong đó `kubernetes` 69 MB và `onnxruntime` 64.5 MB
  **không dùng tới**. `onnxruntime` đi kèm để Chroma tự nhúng bằng model ONNX cục bộ —
  dự án **cố ý không dùng**, tự nhúng bằng Gemini rồi truyền vector vào.
- Chưa đo được ích lợi của overlap 25 từ, vì 39 chunk hiện tại sinh từ JSON và mỗi
  chunk đã tự chứa đủ nghĩa nên không đi qua đường chunking văn xuôi. Có tài liệu `.md`
  thật rồi thì bật/tắt `TU_CHONG_LAN` rồi chạy `kiem_truy_hoi.py` để so.
