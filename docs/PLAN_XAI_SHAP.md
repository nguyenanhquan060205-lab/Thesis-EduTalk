# Kế hoạch triển khai XAI (SHAP) — EduTalk HUIT

**Ngày lập:** 04/09/2026 · Gộp và thay thế toàn bộ plan XAI trước đó.
**Trạng thái:** đã chạy thử toàn bộ phần lõi, các con số dưới đây là đo thật.

---

## 1. Chốt nhanh

| Câu hỏi | Trả lời |
|---|---|
| Làm được không? | **Được.** Đã chạy ra kết quả thật trên model và dữ liệu test hiện có |
| Dùng thư viện gì để **tính**? | `xgboost` — **đã có sẵn ở backend**, không cài thêm |
| Dùng thư viện gì để **vẽ**? | `shap` — **chỉ trong conda `Edutalk`** cho notebook |
| Chậm thêm bao nhiêu? | **4,8 ms** mỗi lượt dự đoán |
| Có phải train lại model? | **Không** |
| Có phải đổi cấu trúc dữ liệu? | **Không** — thêm một khoá `explain` vào JSON |
| Phần lõi bao nhiêu dòng? | **~20 dòng** trong `major_predictor.py` |

---

## 2. Số đo — cơ sở của mọi quyết định bên dưới

Đo trước khi viết code, nhờ vậy tránh được ba lựa chọn sai.

| Đo | Kết quả | Kéo theo |
|---|---|---|
| Cộng tính TreeSHAP | `Σφ + base = margin`, sai lệch **1,19e-06** | dùng được, không cần xấp xỉ |
| Công thức gộp `φ₂ + β·φ₁` | tái tạo **đúng 100%** thứ hạng 39 ngành trên **cả 102 mẫu** | **một** biểu đồ, không phải hai |
| Độ trễ thêm / 1 lượt | tầng 1 `0,93 ms` + tầng 2 `3,84 ms` = **4,8 ms** | tính đủ 39 ngành, **khỏi tối ưu** |
| RAM 2 model + SHAP | **94 MB** (tổng tiến trình 228 MB) | `gunicorn -w 4` ⇒ ~900 MB, xem §7 |
| `shap` nạp model XGBoost 3.2 đa lớp | **vỡ cả 4 cách gọi** | backend không dùng `shap` |

### 2.1. Vì sao backend không cài `shap`

`shap` 0.49 không đọc được model đa lớp của XGBoost 3.2 — nó đọc `base_score` (vốn là **vector
một phần tử mỗi lớp**) như thể là **một số vô hướng**. Đã thử đủ 4 đường, chết cả 4:

```
✘ shap.TreeExplainer(sklearn wrapper) → ValueError: could not convert string to float
✘ shap.TreeExplainer(Booster thô)     → ValueError
✘ shap.Explainer(sklearn wrapper)     → TypeError
✘ shap.Explainer(Booster thô)         → TypeError
```

Thay bằng TreeSHAP có sẵn trong chính XGBoost — **cùng thuật toán, cùng tác giả, cùng con số**:

```python
booster.predict(dmatrix, pred_contribs=True)     # ✔ (n_lớp, 43+1)
```

> Đây là lý do **kỹ thuật**, không phải để tiết kiệm dung lượng. Kể cả VPS mạnh thì vẫn không
> dùng `shap` ở backend được, vì nó **không chạy**. Mà backend cũng chỉ cần con số, không cần
> vẽ — frontend tự vẽ thanh bằng CSS.

### 2.2. Vì sao SHAP chứ không phải LIME

Thầy cho chọn *"SHAP hoặc LIME"*. Chọn SHAP:

| | SHAP (TreeSHAP) | LIME |
|---|---|---|
| Với mô hình cây | **chính xác**, có công thức đóng | xấp xỉ bằng lấy mẫu ngẫu nhiên |
| Chạy 2 lần cùng đầu vào | **kết quả y hệt** | có thể lệch nhau |
| Kiểm chứng được | **có** — `Σφ + base = margin` | không có ràng buộc tương đương |
| Tốc độ | 4,8 ms | chậm hơn nhiều (phải lấy mẫu quanh mỗi điểm) |

---

## 3. Đối chiếu yêu cầu của thầy (`docs/HuongDan.docx`)

Trích nguyên văn, đối chiếu với thiết kế:

| Thầy yêu cầu | Kế hoạch đáp ứng |
|---|---|
| `XAIService` — trích xuất giải thích (SHAP/LIME) | §5.1 hàm `giai_thich()` |
| *"XAI Engine (tính giá trị SHAP)"* trong luồng tuần tự | §5.1, gọi ngay sau khi có xác suất |
| *"Waterfall/Force plot **đơn giản hoá thành biểu đồ thanh** trực quan cho học sinh dễ hiểu"* | §6 — thanh xanh/đỏ |
| *"…của **từng học sinh cụ thể** nhằm đảm bảo tính minh bạch"* | §5.1 giải thích theo từng lượt |
| `KetQuaDuDoan` lưu *"các thông số giải thích XAI"* · bảng `XAI_Logs` | §5.3 lưu `explain` vào `prediction_history` |
| `GET /api/v1/explain/{prediction_id}` | §5.3 |
| Thư viện: `shap`, `matplotlib`/`seaborn` | §4 dùng trong notebook để vẽ hình báo cáo |

**Lưu ý:** thầy **không** nhắc "TreeSHAP" (0 lần trong tài liệu) — thầy nói "SHAP" ở mức khái
niệm. TreeSHAP là tên thuật toán SHAP dành cho mô hình cây, tức **cách hiện thực đúng** cho
XGBoost. Không lệch ý thầy.

**Một chỗ cần diễn giải:** ví dụ của thầy dùng đơn vị phần trăm — *"Điểm Toán chiếm 40% quyết
định gợi ý ngành IT"*. SHAP gốc trả **giá trị có dấu** (`+0,61` / `−0,25`). Quy sang phần trăm
`|φᵢ| / Σ|φ|` thì **mất dấu**, không còn phân biệt được đẩy lên với kéo xuống. Giải pháp: trả
**cả hai** — `dong_gop` có dấu và `phan_tram`. Giao diện hiện thanh theo dấu, chú thích theo %.

---

## 4. Giai đoạn 1 — Notebook `research/notebooks/10_xai_shap.ipynb`

Nối tiếp mạch GĐ1–9: mọi khẳng định có `assert`, hình 220 DPI, đặt tên `hinh_10_*`.

### 4.1. Các bước

| # | Bước | Ràng buộc |
|---|---|---|
| 1 | `pip install shap` vào conda `Edutalk` (đã cài) | |
| 2 | Nạp 2 model + `X_test` (102×43) + `M_nganh_khoi` + `feature_names.json` | |
| 3 | Tính `pred_contribs` cả 2 tầng | `(102,7,44)`, `(102,39,44)` |
| 4 | **`assert` cộng tính** `\|Σφ+base − margin\|.max() < 1e-4` | **chặn cứng** |
| 5 | **`assert` công thức gộp** — thứ hạng từ `φ₂+β·φ₁` trùng `recommend()` trên cả 102 mẫu | **chặn cứng** |
| 6 | Tầm quan trọng toàn cục, đối chiếu `gain` sẵn có của XGBoost | |
| 7 | Soi **25 ngành F1 = 0** — đặc trưng nào dìm chúng | |
| 8 | Đối chiếu SHAP với ablation GĐ8 (Likert **+10,4 điểm** Top-3) | |
| 9 | Phân tích **thiên lệch giới tính** (xem §8) | |
| 10 | Xuất `10_xai/dong_gop_toan_cuc.json` | |

Bước 4 và 5 **phải nằm đầu**. Sai ở đó thì toàn bộ §5 phải thiết kế lại — phát hiện ở notebook
mất một buổi, phát hiện sau khi code xong backend + frontend mất cả tuần.

### 4.2. Hình xuất ra

| Tệp | Nội dung |
|---|---|
| `hinh_10_1_shap_toan_cuc.png` | Beeswarm 15 đặc trưng mạnh nhất theo 7 khối |
| `hinh_10_2_shap_vs_gain.png` | SHAP đối chiếu `gain` — chỗ bất đồng mới đáng bàn |
| `hinh_10_3_nganh_f1_khong.png` | Vì sao 25 ngành không bao giờ được đoán trúng |
| `hinh_10_4_mot_hoc_sinh.png` | Waterfall — bản mẫu cho giao diện |
| `hinh_10_5_gop_hai_tang.png` | Tách `φ₂` và `β·φ₁` trong cùng một cột |
| `hinh_10_6_thien_lech_gioi_tinh.png` | Đóng góp của `gioi_tinh_ma` theo từng khối |

Hình 10.5 là hình **đắt nhất về học thuật** — một đồ án dùng SHAP thông thường không có nó.

---

## 5. Giai đoạn 2 — Backend

### 5.1. `major_predictor.py` — phần lõi

```python
# Nạp 1 lần lúc khởi động, không dựng lại mỗi request
self._b1 = self.model1.get_booster()
self._b2 = self.model2.get_booster()

def giai_thich(self, x_row, j_nganh, k_khoi, mode, top=5):
    d  = xgb.DMatrix(x_row, feature_names=self.columns)
    c1 = self._b1.predict(d, pred_contribs=True)[0]      # (7, 44)
    c2 = self._b2.predict(d, pred_contribs=True)[0]      # (39, 44)

    # guided: người dùng tự chọn khối ⇒ P₁ bị ép = 1 ⇒ tầng 1 KHÔNG tham gia
    # xếp hạng, nên cũng không được xuất hiện trong giải thích.
    he_so_t1 = 0.0 if mode == "guided" else self.BETA
    phi = c2[j_nganh, :-1] + he_so_t1 * c1[k_khoi, :-1]
    ...
```

### 5.2. Cấu trúc JSON trả về

```jsonc
"explain": {
  "mode": "explore",
  "features": [
    { "ten": "Tư duy logic", "gia_tri": 5,
      "dong_gop": 0.61,        // có dấu — dùng vẽ thanh
      "phan_tram": 15.4,       // để khớp cách diễn đạt của thầy
      "tang2": 0.40, "tang1": 0.21 }   // 0.40 + 0.6*0.35 = 0.61
  ]
}
```

Trả riêng `tang2` / `tang1` để giao diện tách được phần nào do khối, phần nào do ngành — và để
kiểm chứng được bằng mắt.

### 5.3. Lưu vết và endpoint

| # | Việc | Nơi sửa |
|---|---|---|
| 1 | Thêm `explain` vào từng phần tử `majors[]` | `major_predictor.recommend()` |
| 2 | Khai báo `explain` trong `MajorSuggestion` | `models/predict_models.py` |
| 3 | Ghi `explain` khi lưu lịch sử | `api/v1/survey.py:91` |
| 4 | `GET /api/v1/explain/{prediction_id}` | `api/v1/predict.py` |

Mục 4 **phải kiểm quyền**: chỉ **chính chủ** hoặc **admin**, giống `GET /users/{uid}`. Bản ghi
tư vấn gắn với hồ sơ cá nhân — không lặp lại lỗ hổng đã sửa hôm trước.

`prediction_history` hiện có `user_id`, `mode`, `predicted_major`, `fields`, `majors`, `input`,
`createdAt`. Thêm `explain` là đủ, **không đổi cấu trúc**.

### 5.4. Bảng dịch 43 tên đặc trưng

| Máy | Người |
|---|---|
| `likert_logic` · `likert_to_mo` · `likert_thi_nghiem` … | Tư duy logic · Tò mò · Thích thí nghiệm … |
| `diem_Toan` … `diem_Tin` | Điểm Toán … Điểm Tin |
| `diem_tb_z` · `diem_max_z` · `diem_min_z` | **Mặt bằng điểm** · Môn mạnh nhất · Môn yếu nhất |
| `gioi_tinh_ma` · `muc_tieu_ma` | Giới tính · Mục tiêu sau tốt nghiệp |
| `to_hop_A00` … `to_hop_X26` | Tổ hợp A00 … X26 |
| `nhom_to_hop_TN/XH/HH` | Nhóm Tự nhiên / Xã hội / Hỗn hợp |

Hai chỗ dịch dễ sai:
- `diem_tb_z` **không phải** "điểm trung bình" mà là **mặt bằng điểm so với chung** (z-score).
  Ghi nhầm thì học sinh thấy *"Điểm trung bình: −0,3"* sẽ hoảng.
- Ô điểm **khuyết** (`NaN`) vẫn có đóng góp SHAP hợp lệ, vì XGBoost học hướng rẽ riêng cho ô
  khuyết — *"không thi môn này"* tự nó là thông tin. Nhưng hiện ra *"Điểm Hóa: nan"* thì vô
  nghĩa với người đọc → phải đổi thành **"Không thi môn Hóa"**.

---

## 6. Giai đoạn 3 — Giao diện `(main)/result/page.tsx`

Mỗi thẻ ngành thêm mục gập/mở. Dạng đã chạy thử:

```
VÌ SAO MÔ HÌNH XẾP NGÀNH NÀY                        [thu gọn ▲]
──────────────────────────────────────────────────────────────
Giới tính              1.0  ██████████▶        +0.78  (19.7%)
Tư duy logic           5.0  ███████▶           +0.61  (15.4%)
Thích thí nghiệm       5.0  ███████▶           +0.55  (13.8%)
Thích tranh luận       5.0  ████▶              +0.35  ( 8.9%)
Điểm Hóa               9.0  ███▶               +0.28  ( 7.1%)
──────────────────────────────────────────────────────────────
▶ đẩy lên   ◀ kéo xuống   độ dài = mức ảnh hưởng
```

### Ba ràng buộc câu chữ

1. Tiêu đề là **"Vì sao *mô hình* xếp ngành này"**, không phải *"Vì sao bạn hợp ngành này"*.
   Mô hình đúng Top-1 **17,6%** — khẳng định nhân quả về con người là vượt quá bằng chứng.
   SHAP nói *mô hình đã dựa vào đâu*, không chứng minh *điều đó đúng với bạn*.
2. Chế độ **Tư vấn**: ghi rõ *"Bạn đã chọn sẵn nhóm ngành nên phần giải thích chỉ xét trong
   nhóm đó."*
3. Kèm một dòng nhắc mức tin cậy, để không ai thấy biểu đồ đẹp rồi tưởng mô hình chắc chắn.

---

## 7. Hai phát hiện phải đưa vào báo cáo

Bản chạy thử đã lộ ra hai thứ — đều là **điểm cộng nếu chủ động nêu**, điểm trừ nếu để hội đồng
tự phát hiện.

### 7.1. Mô hình dựa nhiều vào giới tính

`Giới tính` đứng **đầu bảng ở 2/3 ca thử**, chiếm ~**20%** mức ảnh hưởng, đẩy mạnh về nhóm
ngành kỹ thuật. Đây chính là giá trị của XAI: nó soi ra được chỗ mô hình đang thiên lệch.

Cần định lượng ở bước 9 của notebook, rồi viết vào Thảo luận — kèm ghi chú rằng dữ liệu huấn
luyện phản ánh **cơ cấu giới tính thực tế của từng ngành ở HUIT**, nên mô hình học lại chính
sự mất cân bằng đó.

### 7.2. Đóng góp của môn không thi

Học sinh #8 không thi Hóa nhưng `Điểm Hóa` vẫn được `+0,30`. Đúng về toán, nhưng phải diễn đạt
lại cho người đọc hiểu (§5.4).

### 7.3. Ghi chú hạ tầng (ngoài phạm vi XAI)

`backend/Dockerfile` đang đặt `gunicorn -w 4`, **mỗi worker nạp một bản model riêng** ⇒ ~900 MB
chỉ riêng Python + model. Chọn VPS nên tính tối thiểu **2 GB**. Muốn tiết kiệm thì giảm `-w 2`
hoặc bật `--preload` để các worker fork sau khi model đã nạp (chia sẻ bộ nhớ copy-on-write).

---

## 8. Thứ tự thi công

```
1. notebook 10_xai_shap   ──►   2. backend   ──►   3. giao diện
   assert bước 4,5 phải xanh
```

Không nhảy cóc. Assert bước 5 đỏ nghĩa là công thức gộp sai và toàn bộ §5 phải làm lại.
(Đã chạy thử ngoài notebook và nó xanh, nên rủi ro thấp — assert chỉ là chốt chặn.)

---

## 9. Kiểm chứng khi xong

**Nghiên cứu**
- `|Σφ + base − margin|.max() < 1e-4` cho cả 2 tầng
- Thứ hạng từ `φ₂+β·φ₁` trùng `recommend()` trên **cả 102 mẫu**
- 6 hình xuất đủ, 220 DPI

**Backend**
- Độ trễ `/recommend` tăng **< 20 ms** (đo được 4,8 ms, để biên rộng)
- `requirements.txt` **không** thêm `shap`; `docker build` không kéo `numba`/`llvmlite`
- Chế độ guided: `explain.features[].tang1` toàn `0.0`
- `GET /explain/{id}` trả **403** với người không phải chủ bản ghi và không phải admin
- Ô điểm khuyết hiện **"Không thi môn X"**, không hiện `nan`

**Giao diện**
- `tsc --noEmit` = 0 lỗi, `eslint` sạch trên tệp đã sửa
- Không câu nào khẳng định nhân quả về người dùng
- `/result` HTTP 200, biểu đồ đúng ở **cả hai** chế độ

---

## 10. Ngoài phạm vi đợt này

Đề cương của thầy còn ba hạng mục chưa có kế hoạch nào phủ:

| Hạng mục | Hiện trạng |
|---|---|
| **RAG thật** — Vector DB + embeddings + trích dẫn nguồn | chatbot hiện **không có bước truy hồi nào**, chỉ là Gemini + system prompt |
| **Feedback Loop** — người dùng đánh giá gợi ý, ghi nhận ngành thực tế đã chọn | chưa có |
| Sơ đồ Use-Case / BCE / Sequence / ERD | tài liệu phân tích, chưa có |

XAI **không phụ thuộc** ba thứ trên, làm được ngay. Nhưng đầu ra của XAI là nguyên liệu cho
RAG sau này: đưa kết quả dự đoán + giải thích SHAP vào prompt thì chatbot mới trả lời bám đúng
hồ sơ học sinh, thay vì bịa một lý do nghe hợp lý.
