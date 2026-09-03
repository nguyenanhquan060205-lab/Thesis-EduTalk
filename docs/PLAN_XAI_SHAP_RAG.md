# 📑 KẾ HOẠCH TOÀN DIỆN: TRIỂN KHAI XAI (SHAP 2 TẦNG) & RAG CHATBOT (EDUTALK HUIT)

> **Tài liệu tham chiếu:** Hệ thống gợi ý ngành học phân cấp EduTalk HUIT  
> **Lưu trữ:** `docs/PLAN_XAI_SHAP_RAG.md`  
> **Ngày lập:** 03/09/2026

---

## 🧭 TỔNG QUAN VÀ ĐẶC THÙ BÀI TOÁN

Hệ thống EduTalk áp dụng kiến trúc **Machine Learning phân cấp 2 tầng** dựa trên dữ liệu tuyển sinh và khảo sát của Trường Đại học Công Thương TP.HCM (HUIT):
- **Tầng 1 (Macro):** Phân loại học sinh vào **7 Khối ngành** (CNTT & AI, Kinh doanh & Quản lý, Du lịch - Khách sạn, Kỹ thuật & Công nghệ, Thực phẩm - Sinh học - Môi trường, Luật, Ngoại ngữ).
- **Tầng 2 (Micro):** Phân loại chi tiết vào **39 Ngành đào tạo** cụ thể của trường.
- **Quy tắc gợi ý thực tế trên giao diện:** Hệ thống đề xuất **Top 3 Khối ngành** phù hợp nhất; và trong từng khối ngành, hiển thị **Top 3 Ngành học** triển vọng nhất thuộc khối đó dựa trên hàm xác suất kết hợp:
  $$P(\text{ngành}) \propto P_2(\text{ngành}) \times P_1(\text{khối chứa ngành})^\beta \quad (\beta = 0.6)$$

Chính vì cấu trúc 2 tầng này, việc triển khai **Giải thích mô hình (XAI - Explainable AI)** và **Hỏi đáp tăng cường tri thức (RAG - Retrieval-Augmented Generation)** cần được thiết kế chuyên biệt, tương thích chặt chẽ với cấu trúc dữ liệu thực tế.

---

## 🎯 PHẦN 1: KẾ HOẠCH TRIỂN KHAI XAI (SHAP 2 TẦNG PHÂN CẤP)

### 1.1. Bản chất toán học & Cơ sở lý luận của SHAP trên bài toán 2 tầng

SHAP (*SHapley Additive exPlanations*) dựa trên lý thuyết trò chơi hợp tác của Lloyd Shapley (1953):
- Đánh giá mức độ đóng góp công bằng của từng đặc trưng $i \in \{1..43\}$ (tính cách, sở thích Likert, điểm thi, tổ hợp xét tuyển) vào độ lệch dự đoán so với mức trung bình nền của quần thể (base value / expected value).
- Đối với XGBoost, thuật toán **TreeSHAP** (*Lundberg et al., Nature Machine Intelligence 2020*) tính toán chính xác giá trị đóng góp trên cấu trúc nhánh cây với độ phức tạp $O(TLD^2)$, cho phép suy diễn thời gian thực (~30–50ms).

#### ⚠️ Điểm cốt lõi: Tại sao phải giải thích 2 tầng tách biệt?
1. Mô hình Tầng 1 (`model_stage1_khoinganh.json`, 7 lớp) và Tầng 2 (`model_stage2_nganh.json`, 39 lớp) là **hai mô hình độc lập** được huấn luyện với hàm mất mát riêng (Multi-class Logloss).
2. Phép kết hợp $P_2 \times P_1^\beta$ được thực hiện ở giai đoạn suy diễn hậu kỳ (post-processing) trên không gian xác suất sau Softmax. Giá trị SHAP vốn có tính chất cộng tính trên không gian Log-odds (trước Softmax), **không thể cộng dồn tuyến tính từ Tầng 1 sang Tầng 2**.
3. **Cách giải quyết khoa học và chuẩn mực:** Xây dựng cơ chế **Giải thích phân cấp (Hierarchical Explainability)**:
   - **Giải thích Tầng 1 (Vĩ mô - Macro Explainability):** Trả lời câu hỏi *"Tại sao em lại phù hợp nhất với Khối ngành Kỹ thuật & Công nghệ thay vì Khối Kinh doanh hay Ngoại ngữ?"*.
   - **Giải thích Tầng 2 (Vi mô - Micro Explainability):** Trả lời câu hỏi *"Trong Khối Kỹ thuật & Công nghệ đó, tại sao ngành Kỹ thuật Cơ điện tử lại xếp cao hơn Công nghệ Chế tạo máy hay Kỹ thuật Nhiệt?"*.

---

### 1.2. Kế hoạch nghiên cứu & Thực nghiệm: Notebook `10_xai_shap.ipynb`

Tạo notebook mới: `research/notebooks/10_xai_shap.ipynb` tiếp nối mạch nghiên cứu từ giai đoạn 1–9.

#### Các bước triển khai trong Notebook:
1. **Chuẩn bị dữ liệu & Khởi tạo Explainer:**
   - Đọc 2 mô hình XGBoost (`model_stage1_khoinganh.json` & `model_stage2_nganh.json`) và 43 tên đặc trưng từ `feature_names.json`.
   - Đọc dữ liệu kiểm tra độc lập 102 sinh viên thật: `X_test.csv`, `y_test_khoi.csv`, `y_test_nganh.csv`.
   - Khởi tạo 2 `shap.TreeExplainer`:
     ```python
     explainer_stage1 = shap.TreeExplainer(model_stage1)
     explainer_stage2 = shap.TreeExplainer(model_stage2)
     ```
   - Tính toán SHAP values trên tập test:
     - `shap_values_stage1`: Kích thước $(102, 43, 7)$
     - `shap_values_stage2`: Kích thước $(102, 43, 39)$

2. **Phân tích tầm quan trọng đặc trưng toàn cục (Global Importance):**
   - So sánh xếp hạng đặc trưng của SHAP với xếp hạng của XGBoost Built-in (Gain/Weight).
   - **Chứng minh luận điểm khoa học của đề tài:** XGBoost feature importance từng đánh giá thấp các câu Likert sở thích, nhưng thực nghiệm Ablation (Bước 8.7) chứng minh sở thích đóng góp +10.4% Top-3. SHAP Summary Plot sẽ làm rõ: các câu Likert có biên độ tác động cực lớn ở các phân lớp đặc thù (VD: `likert_logic` quyết định khối CNTT và Kỹ thuật; `likert_dinh_duong` và `likert_thi_nghiem` quyết định khối Thực phẩm - Sinh học).

3. **Xuất 4 hình minh hoạ học thuật chất lượng cao (220 DPI):**
   - 📊 `hinh_10_1_shap_global_khoinganh.png`: Beeswarm Plot phân bố tác động của 15 đặc trưng hàng đầu lên 7 khối ngành.
   - 📊 `hinh_10_2_shap_global_nganh.png`: Mean absolute SHAP values thể hiện các đặc trưng cốt lõi chi phối 39 ngành học.
   - 📊 `hinh_10_3_shap_waterfall_stage1_case.png`: Waterfall Plot giải thích chi tiết quyết định khối ngành cho 1 trường hợp học sinh cụ thể (Case study).
   - 📊 `hinh_10_4_shap_waterfall_stage2_top3.png`: Waterfall Plot so sánh 3 ngành trong cùng 1 khối của trường hợp case study, chỉ ra yếu tố phân hoá giữa các ngành.

4. **Xuất tài nguyên cho Backend suy diễn:**
   - File `research/data/processed/10_xai/shap_metadata.json`: Lưu trữ `expected_value` của cả 2 tầng, danh mục ánh xạ tên đặc trưng sang tên tiếng Việt có dấu, ngưỡng phân vị để chuyển đổi SHAP score thành ngôn ngữ tự nhiên.

---

### 1.3. Tích hợp Backend API (`major_predictor.py` & `predict.py`)

#### Cập nhật `MajorPredictor`:
- Khởi tạo sẵn `self.explainer_stage1` và `self.explainer_stage2` trong `__init__` (nạp 1 lần duy nhất cùng lúc với mô hình để tránh trễ bộ nhớ khi gọi API).
- Thêm phương thức `explain_recommendation(X, top_field_ids, top_majors_by_field)`:
  1. Với mỗi khối trong Top khối ngành: Lấy Top 3 đặc trưng có đóng góp dương lớn nhất và Top 1 đặc trưng cản trở (nếu có).
  2. Với mỗi ngành trong Top 3 của khối: Lấy Top 3 đặc trưng chi phối quyết định xếp hạng nội bộ.
  3. Chuyển đổi định lượng SHAP sang định tính (Rule-based Natural Language Generator):
     - Ví dụ: `likert_logic = 5` và `shap > 0.08` $\rightarrow$ *"Tư duy logic xuất sắc (5/5) là yếu tố nổi bật thúc đẩy độ phù hợp với ngành này (+12%)."*
     - Ví dụ: `diem_Toan = 8.5` $\rightarrow$ *"Điểm môn Toán đạt 8.5 giúp củng cố lợi thế xét tuyển."*

#### Cập nhật Schema Pydantic (`predict_models.py`):
```python
class FactorExplanation(BaseModel):
    feature: str          # "likert_logic"
    label: str            # "Tư duy logic"
    user_value: float     # 5.0
    impact: str           # "rat_tich_cuc" | "tich_cuc" | "trung_tinh" | "tieu_cuc"
    description: str      # Lời giải thích tự nhiên dễ hiểu

class MajorExplanation(BaseModel):
    rank: int
    code: str
    name: str
    top_factors: list[FactorExplanation]

class FieldExplanation(BaseModel):
    field_id: int
    field_name: str
    macro_factors: list[FactorExplanation]
    top_majors: list[MajorExplanation]
```

---

### 1.4. Tối ưu giao diện người dùng Frontend (`result/page.tsx`)

Tránh hiển thị các con số thống kê khó hiểu đối với học sinh 17–18 tuổi:
1. **Tại Banner Khối ngành phù hợp (Tầng 1):**
   - Thêm hộp thoại/tab: *"🔍 Vì sao EduTalk gợi ý bạn thuộc Khối ngành này?"*.
   - Hiển thị 3 huy hiệu (Badges) nổi bật: VD: 🧠 *Tư duy logic nhạy bén*, 🔬 *Yêu thích khám phá công nghệ*, 📐 *Nền tảng Toán tự nhiên vững vàng*.
2. **Tại từng Card Ngành học (Tầng 2):**
   - Dưới mỗi ngành trong Top 3 của khối, thiết kế thanh Accordion mở rộng: *"Bản đồ phù hợp cá nhân hoá"*.
   - Thanh trượt đóng góp trực quan:
     - 🟢 Màu xanh lá: Sở thích / năng lực phù hợp cao với ngành.
     - 🟡 Màu vàng: Các điểm cần cân nhắc hoặc cải thiện thêm.

---

## 🤖 PHẦN 2: KẾ HOẠCH TRIỂN KHAI RAG CHATBOT (TƯ VẤN HUIT THÔNG MINH)

### 2.1. Đặt vấn đề & Điểm yếu hiện tại

Hiện tại, `GeminiService` (`gemini_service.py`) gọi trực tiếp mô hình `gemini-flash-lite-latest` kèm một System Instruction chung.
- **Hạn chế lớn:**
  1. Mô hình Gemini không có dữ liệu tuyển sinh chính xác từng năm của HUIT $\rightarrow$ Dễ bị ảo giác (hallucination), nhầm lẫn điểm chuẩn, bịa đặt tổ hợp môn hoặc đề án tuyển sinh 2024–2026.
  2. Chatbot tách rời khỏi quy trình khảo sát: Khi học sinh nhận kết quả dự đoán xong, bấm vào chat thì Bot không nắm được học sinh vừa thi khối gì, điểm bao nhiêu, hợp ngành nào để tư vấn tiếp.

---

### 2.2. Kiến trúc RAG với Vector Database ChromaDB

```
                            [Câu hỏi của học sinh]
                                      │
                                      ▼
                      [GEMINI TEXT-EMBEDDING-004]
                    (Chuyển câu hỏi thành Vector 768d)
                                      │
                                      ▼
                 ┌─────────────────────────────────────────┐
                 │        VECTOR DATABASE CHROMADB         │
                 │      (Lưu trữ cục bộ Persistent)        │
                 ├────────────────────┬────────────────────┤
                 │ Collection 1:      │ Collection 2:      │
                 │ huit_majors_data   │ huit_news_events   │
                 │ (39 ngành, đề án,  │ (Tin tức cào từ    │
                 │ điểm chuẩn, nghề)  │ ts.huit.edu.vn)    │
                 └────────────────────┴────────────────────┘
                                      │
                                      ▼ (Cosine Similarity Search)
                   [Top-k Đoạn văn ngữ cảnh phù hợp nhất]
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ TẦNG NGỮ CẢNH CÁ NHÂN HOÁ (Personalized User Context từ kết quả khảo sát) │
│ - Kết quả dự đoán vừa nhận: Top 3 Khối, Top 3 Ngành trong khối            │
│ - Tổ hợp thi + Điểm thi 3 môn + Mục tiêu nghề nghiệp                      │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
                 [PROMPT AUGMENTATION (Tăng cường ngữ cảnh)]
                                      │
                                      ▼
                 [GOOGLE GEMINI FLASH LITE GENERATION]
                                      │
                                      ▼
          [Câu trả lời chuẩn xác 100% dựa trên dữ liệu thật của HUIT]
```

---

### 2.3. Chi tiết thiết kế Vector Database ChromaDB

#### 1. Cấu trúc lưu trữ ChromaDB (`backend/chromadb_data/`):
- **Cơ chế:** Dùng `chromadb.PersistentClient(path="backend/chromadb_data")` chạy trực tiếp trong Python, lưu trữ bền vững dạng file nhúng, hoàn toàn miễn phí và không phụ thuộc dịch vụ cloud bên thứ ba.
- **Mô hình Embedding:** Sử dụng `models/text-embedding-004` thông qua `google.generativeai` (vector 768 chiều), xử lý tiếng Việt rất tốt và dùng chung khóa `GEMINI_API_KEY` đã cấu hình sẵn trong backend.
- **Tổ chức Collections:**
  - **Collection `huit_majors_data` (39 chunks):**
    + Mỗi chunk là tài liệu tổng hợp đầy đủ của một ngành: Tên ngành, mã ngành, khối ngành, danh sách 4 tổ hợp môn, điểm chuẩn chính xác 3 năm (2024, 2025, 2026), biến động điểm, mục tiêu đào tạo và các vị trí việc làm sau tốt nghiệp (trích xuất từ `tuyen_sinh_huit_2026.json` và cơ sở dữ liệu ngành).
    + Metadata: `{"major_code": "7480201", "faculty_id": 0, "faculty_name": "CNTT & AI"}`.
  - **Collection `huit_news_events`:**
    + Chunking từ các bài viết tuyển sinh cào tự động từ trang `ts.huit.edu.vn` (lưu trong MongoDB `news`).
    + Metadata: `{"sourceUrl": "...", "date": "...", "category": "..."}`.

#### 2. Dịch vụ RAG (`backend/app/services/rag_service.py`):
```python
class HUITRAGService:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path="backend/chromadb_data")
        self.majors_collection = self.chroma_client.get_or_create_collection(
            name="huit_majors_data",
            metadata={"hnsw:space": "cosine"}
        )
        self.news_collection = self.chroma_client.get_or_create_collection(
            name="huit_news_events",
            metadata={"hnsw:space": "cosine"}
        )

    async def get_embedding(self, text: str) -> list[float]:
        """Gọi Gemini text-embedding-004 tạo vector 768 chiều."""
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_query"
        )
        return result["embedding"]

    async def retrieve_context(self, query: str, n_results: int = 3) -> str:
        """Truy xuất tài liệu tương đồng nhất từ ChromaDB."""
        query_vec = await self.get_embedding(query)
        results = self.majors_collection.query(
            query_embeddings=[query_vec],
            n_results=n_results
        )
        # Ghép các đoạn tài liệu tìm được thành chuỗi ngữ cảnh [CONTEXT_HUIT]
        context_parts = results["documents"][0] if results["documents"] else []
        return "\n\n---\n\n".join(context_parts)
```

#### 3. Nâng cấp Chat Service (`gemini_service.py`):
- Thêm tham số `prediction_context: dict | None` vào phương thức `send_message()`.
- Tự động gọi `HUITRAGService.retrieve_context(message)` để lấy các thông tin ngành/điểm chuẩn/học phí sát nhất với câu hỏi.
- System Instruction được bổ sung nguyên tắc đối soát nghiêm ngặt:
  > *"Bạn là Cố vấn học tập thông minh EduTalk HUIT. Bạn PHẢI ưu tiên sử dụng thông tin điểm chuẩn, tổ hợp môn, chính sách được cung cấp trong khối [CONTEXT_HUIT]. Tuyệt đối không phỏng đoán hoặc bịa đặt số liệu ngoài ngữ cảnh này. Nếu thông tin không có trong văn bản, hãy thành thật hướng dẫn thí sinh liên hệ trực tiếp Phòng Tuyển sinh HUIT."*

#### 4. Liên kết luồng dữ liệu trên Web (`ChatWidget.tsx`):
- Khi học sinh đang ở trang `/result`, nút hành động chính bổ sung:
  - 💬 *"Chat với AI về kết quả này"*
- Khi bấm nút, Chat Widget tự động mở ra và nạp ngữ cảnh cá nhân hoá từ kết quả khảo sát:
  - *"Chào bạn! Mình thấy kết quả khảo sát gợi ý bạn phù hợp nhất với Khối ngành Kỹ thuật & Công nghệ, đặc biệt là ngành Công nghệ thông tin và Cơ điện tử. Với điểm tổ hợp A00 của bạn là 23.5 điểm, bạn có muốn mình phân tích cơ hội trúng tuyển năm 2026 không?"*

---

## 📅 LỘ TRÌNH TRIỂN KHAI VÀ PHÂN CHIA CÔNG VIỆC

| Giai đoạn | Nội dung công việc | File ảnh hưởng | Thời gian dự kiến |
|:---:|---|---|:---:|
| **GĐ 1** | **Xây dựng Notebook XAI TreeSHAP 2 tầng**<br>- Huấn luyện Explainer trên 2 model<br>- Phân tích SHAP test set 102 mẫu<br>- Xuất 4 hình chuẩn 220 DPI | `research/notebooks/10_xai_shap.ipynb`<br>`research/data/processed/10_xai/*` | 1.5 ngày |
| **GĐ 2** | **Tích hợp XAI vào Backend Core**<br>- Cache TreeExplainer trong `MajorPredictor`<br>- Viết hàm sinh lời giải thích tự nhiên<br>- Cập nhật Schema API `/recommend` | `backend/app/services/major_predictor.py`<br>`backend/app/models/predict_models.py` | 1 ngày |
| **GĐ 3** | **Cập nhật giao diện kết quả Frontend**<br>- Hiển thị lý do phù hợp tại Khối ngành<br>- Hiển thị thanh đóng góp đặc trưng tại Top ngành | `web/src/app/(main)/result/page.tsx` | 1 ngày |
| **GĐ 4** | **Xây dựng Vector DB ChromaDB & RAG Service**<br>- Cài đặt `chromadb`<br>- Script index 39 ngành & tin tức vào ChromaDB<br>- Service truy vấn Semantic Search kèm Gemini Embedding | `backend/requirements.txt`<br>`backend/app/services/rag_service.py`<br>`backend/app/services/gemini_service.py` | 1.5 ngày |
| **GĐ 5** | **Liên kết Chatbot với Kết quả Khảo sát**<br>- Đính kèm Personal Context từ trang result sang Chat<br>- Kiểm thử toàn diện kịch bản hỏi đáp thực tế với ChromaDB | `backend/app/api/v1/chat.py`<br>`web/src/components/features/chat/ChatWidget.tsx` | 1 ngày |

---

## ⚖️ PHÂN TÍCH ƯU - NHƯỢC ĐIỂM ĐỂ BẢO VỆ KHÓA LUẬN

### 🌟 Điểm mạnh nổi bật trước Hội đồng:
1. **Tính minh bạch & giải thích được (Explainability):** Vượt qua nhược điểm "hộp đen" (black-box) thường gặp của Machine Learning bằng TreeSHAP chuẩn toán học.
2. **Thiết kế phân cấp đồng bộ:** Cả quá trình dự đoán (Prediction) và quá trình giải thích (Explanation) đều tuân thủ kiến trúc 2 tầng (Khối $\rightarrow$ Ngành), thể hiện tư duy hệ thống mạch lạc.
3. **Kiến trúc RAG hiện đại với ChromaDB:** Sử dụng Vector Database mã nguồn mở kết hợp Gemini Embedding để tìm kiếm ngữ nghĩa, giải quyết triệt để vấn đề ảo giác của mô hình ngôn ngữ lớn (LLM Hallucination).

### ⚠️ Hạn chế khoa học cần trình bày rõ ràng (Thảo luận phản biện):
1. **Tính độc lập giữa 2 bộ SHAP:** SHAP giải thích Tầng 1 riêng và Tầng 2 riêng, chưa mô hình hoá được trực tiếp đạo hàm của phép nhân xác suất phi tuyến $P_2 \times P_1^\beta$.
2. **Sự phụ thuộc vào chất lượng mô hình:** SHAP giải thích nguyên nhân *tại sao mô hình đưa ra phán đoán đó*, chứ không khẳng định tuyệt đối phán đoán đó là chân lý ngoài đời thực. Nếu ngành đó thuộc nhóm 25/39 ngành có $F_1 = 0$, lời giải thích chỉ phản ánh thiên lệch học được từ tập dữ liệu mất cân bằng.
3. **Cập nhật Vector Database:** Tri thức trong ChromaDB cần được re-index định kỳ khi có đề án tuyển sinh năm học mới hoặc khi crawler cào thêm các bài viết mới từ trường.
