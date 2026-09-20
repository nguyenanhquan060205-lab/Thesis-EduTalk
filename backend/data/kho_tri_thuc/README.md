`# Kho tri thức cho chatbot — dữ liệu cần chuẩn bị

Đây là **nguồn gốc**. Chroma chỉ là thứ dựng ra từ đây, xoá lúc nào cũng dựng lại được.

---

## Luật số 1 — mọi thứ đều vào Chroma, chỉ khác nhau ở CÁCH VIẾT RA

Hệ thống chạy **RAG thuần**: một đường truy vấn duy nhất qua Chroma, không có nhánh
tra cứu nào đi tắt. Nên câu hỏi không phải *"cái này có vào Chroma không"* mà là
*"cái này viết thành đoạn văn kiểu gì trước khi nhúng"*.

| Hình dạng nguồn | Ví dụ | Ai biến nó thành đoạn văn | Bạn viết file gì |
|---|---|---|---|
| **Có cấu trúc** — mỗi ngành một giá trị | điểm chuẩn · tổ hợp · mã ngành · **học phí** · **chỉ tiêu** | `nguon_co_cau_truc.py` sinh câu tự động | `.json` |
| **Văn xuôi** — không đoán trước được câu hỏi | điều kiện xét tuyển · chương trình đào tạo · cơ hội việc làm · học bổng · quy chế | bạn tự viết thành câu | `.md` |

Với nguồn có cấu trúc, code đọc JSON rồi ghép thành câu hoàn chỉnh kiểu *"Ngành Ngôn
ngữ Anh, mã ngành 7220201, Trường Đại học Công Thương TP.HCM (HUIT)… Điểm chuẩn năm
2026 là 22.5 điểm."* — rồi mới nhúng. Bạn chỉ cần giữ JSON đúng, phần viết câu là việc
của code.

**Đừng dán thẳng bảng vào `.md`.** Bảng 39 dòng rút từ PDF ra sẽ thành mớ số lộn xộn
không biết số nào của ngành nào. Dữ liệu dạng bảng thì để nguyên JSON và để code sinh
câu — đó chính là lý do có hai cột trên.

---

## Cần chuẩn bị những gì

### A. Dữ liệu có cấu trúc → `.json` trong `backend/data/co_cau_truc/`

| Hạng mục | Trạng thái | File |
|---|---|---|
| Điểm chuẩn · tổ hợp · mã ngành | ✅ **đã có, 39/39 ngành** | `co_cau_truc/tuyen_sinh_huit_2026.json` |
| Ngành → 9 nhóm ngành | ✅ đã có | `co_cau_truc/mapping_nhom_nganh.json` |
| Học phí · chỉ tiêu | ❌ cần thu thập | `co_cau_truc/hoc_phi_chi_tieu.json` |

Hai file đầu là **bản sao** do `scripts/nap_kho.py` tự chép từ `research/` và
`research3/` mỗi lần chạy — đừng sửa tay ở đây, sửa ở nguồn gốc rồi chạy lại script.
Lý do phải có bản sao: `docker-compose.yml` khai `context: ./backend` nên image không
chứa hai thư mục research.

Mẫu cho file học phí:

```json
{
  "nguon": "Đề án tuyển sinh HUIT 2026",
  "ngay_lay": "2026-09-11",
  "link": "https://ts.huit.edu.vn/...",
  "nganh": {
    "7480201": {
      "ten": "Công nghệ thông tin",
      "hoc_phi_nam_2026": 25000000,
      "don_vi": "VND/năm",
      "chi_tieu_2026": 300
    }
  }
}
```

> ⚠️ File này **chưa được code đọc**. Thêm nó vào rồi thì phải mở
> `nguon_co_cau_truc.py` bổ sung phần ghép câu học phí vào `mo_ta()`, nếu không nó nằm
> đó mà không vào Chroma.

### B. Văn xuôi → `.md` trong thư mục này

Thứ tự dưới đây **đo ra, không phải xếp theo cảm tính**. Chạy
`python scripts/do_lo_hong.py` để đo lại bất cứ lúc nào — nó bắn 27 câu hỏi kiểu
thí sinh vào kho rồi xem chủ đề nào chưa có nội dung.

Kết quả đo ngày 20/09/2026, kho **383 chunk** (khởi điểm 39):

| Chủ đề | Kho hiện tại | Lấy từ đâu |
|---|---|---|
| Điểm chuẩn · tổ hợp | ✅ 3/3 | `tuyen_sinh_huit_2026.json` |
| Chọn ngành theo sở thích | ✅ 3/3 | *(nt)* |
| Học phí | ✅ 3/3 | `hoc_phi/` × 39 — `scripts/lay_hoc_phi.py` |
| Học bổng · miễn giảm | ✅ 3/3 | `ho_tro/` — `scripts/lay_tuyen_sinh.py` |
| Chương trình đào tạo | ✅ 3/3 | `ctdt/` × 38 — `scripts/lay_ctdt.py` |
| Hồ sơ · thời gian nộp | ⚠️ 2/3 | `xet_tuyen/` — nguồn không có ngày báo kết quả |
| Cơ hội việc làm theo ngành | ⚠️ 2/3 | `nghe_nghiep/` × 17 — `scripts/lay_nghe_nghiep.py` |
| Phương thức xét tuyển | ⚠️ 1/3 | `xet_tuyen/` — xem ghi chú dưới |
| ~~Ký túc xá · cơ sở · chuyển ngành~~ | ⊘ | ngoài phạm vi khoá luận, đã bỏ |

**Hai câu trượt là do NGUỒN KHÔNG CÓ, không phải cào thiếu:**

- *"Khi nào HUIT công bố kết quả trúng tuyển?"* — thông báo của trường ghi nguyên văn
  *"theo đúng khung thời gian theo hướng dẫn của Bộ GD&ĐT"*, không nêu ngày nào.
- *"Lương khởi điểm ngành Logistics khoảng bao nhiêu?"* — trường không công bố mức
  lương ở bất kỳ trang nào.

Cả hai **đừng lấp bằng số tự nghĩ ra**. Bot trả lời "chưa có dữ liệu" là hành vi đúng;
một con số bịa kèm dòng `Nguồn:` nghe đáng tin hơn cả lúc không có RAG.

**Còn ô "Phương thức xét tuyển" thì tài liệu CÓ, chỉ là không lấy ra được.** Kho chứa
"học bạ" ở 4 chunk, "Đánh giá năng lực" ở 1 chunk, và mục 1.3 liệt kê đủ PT1–PT5. Đo
thẳng thứ hạng của chunk đáp án:

```
"Em xét học bạ vào HUIT được không?"     → đáp án hạng 41/60
"Điểm ĐGNL có xét vào HUIT được không?"  → đáp án hạng  9/60
                                            top-k chỉ lấy 4 đoạn đầu
4 đoạn thực lấy cho câu ĐGNL: nganh, nganh, nganh, nganh
```

39 chunk theo ngành đều mở đầu *"Ngành X, mã ngành …, Trường Đại học Công Thương
TP.HCM (HUIT)…"* rồi nói tổ hợp và điểm chuẩn, nên câu nào về tuyển sinh HUIT chúng
cũng hợp một chút — và có tới 39 cái cùng hợp một chút. Chúng thắng vì **đông**, không
vì đúng hơn.

Đây là hệ quả kho phình từ 39 lên 383 chunk trong khi `NGUONG_LAC_DE = 0.35` và
`BIEN_DO = 0.12` ở `tro_ly.py` được đo hồi kho còn 39 — chính file đó ghi sẵn cảnh báo
phải đo lại khi đổi kho. **Thêm tài liệu không chữa được**, chỉ làm chen chúc thêm.
Ba hướng sửa, đều ở tầng truy xuất:

1. ép top-k không lấy quá 2 đoạn cùng `loai` (rẻ nhất; câu ĐGNL đúng ngay vì hạng 9 lọt)
2. đo lại `NGUONG_LAC_DE` / `BIEN_DO` trên kho 383 chunk
3. nâng top-k 4 → 6–8 (dễ nhất nhưng làm loãng prompt, đúng thứ `BIEN_DO` sinh ra để chặn)

### 🔴 "GIẢ CÓ" — kiểu lỗ hổng nguy hiểm nhất

Bảng trên phân biệt hai thứ mà nhìn qua tưởng giống nhau:

| | nghĩa là gì |
|---|---|
| ❌ trống hoàn toàn | vector không tìm được đoạn nào, bot biết là mình không có gì |
| 🔴 **giả có** | vector **tìm được** đoạn, nhưng đoạn đó **không chứa câu trả lời** |

Ví dụ đo thật: hỏi *"Học phí ngành CNTT bao nhiêu?"* → vector lấy về chunk ngành CNTT
ở khoảng cách 0.263, rất gần. Nhưng chunk đó chỉ nói điểm chuẩn và tổ hợp, **không có
một chữ nào về học phí**. Nó gần vì trùng cụm *"ngành Công nghệ thông tin"*.

> Khoảng cách cosine đo **cùng chủ đề**, không đo **có chứa câu trả lời**.

Ngưỡng `NGUONG_LAC_DE = 0.35` chỉ chặn câu **lạc miền** (thời tiết, bóng đá). Nó
**không** chặn được câu đúng miền mà kho chưa có dữ liệu.

Cái chặn được là **prompt**. Đã thử thật 4 câu thuộc nhóm giả có — bot trả lời
*"hiện tại hệ thống chưa có dữ liệu … xem tại ts.huit.edu.vn"*, không bịa con số nào.
Nên **thêm dữ liệu từng phần được**: thiếu chủ đề nào thì bot nói thiếu chủ đề đó,
không có chuyện nửa vời ra kết quả sai.

Hệ quả cho việc sửa prompt: luật *"ngữ cảnh không có thì nói thẳng chưa có dữ liệu"*
và ví dụ few-shot thứ 2 trong `gemini_service.py` là **lưới an toàn duy nhất** cho
nhóm này. Đừng gỡ, và sửa xong phải chạy lại `scripts/do_lo_hong.py`.

---

## Định dạng file `.md` — bắt buộc có phần đầu

```markdown
---
loai: dieu_kien            # dieu_kien | hoc_bong | nghe_nghiep | ctdt | quy_che
nganh: null                # null nếu áp dụng chung; hoặc mã ngành "7480201"
nam: 2026
nguon: Đề án tuyển sinh HUIT 2026
link: https://ts.huit.edu.vn/dieu-kien-xet-tuyen
ngay_lay: 2026-09-10
---

# Điều kiện xét tuyển năm 2026

Nội dung viết bình thường, mỗi ý một đoạn...
```

### Vì sao bắt buộc từng trường

| Trường | Không có thì sao |
|---|---|
| `nam` | điểm chuẩn 2024 và 2026 khác nhau; thiếu năm thì bot trích số cũ mà nghe vẫn hợp lý |
| `link` | thí sinh không kiểm chứng được, và hội đồng hỏi *"số này ở đâu ra"* thì không trả lời được |
| `loai` | không lọc được theo chủ đề khi truy xuất |
| `ngay_lay` | không biết tài liệu đã cũ chưa |

---

## Vì sao dùng `.md` chứ không phải PDF hay Word

- **Không phải rút text.** PDF phải trích xuất, dễ nát bố cục, bảng biến thành số lộn xộn.
- **PDF scan còn tệ hơn** — phải OCR, sai chính tả tiếng Việt tùm lum. Kiểm tra nhanh: mở
  PDF bôi đen một dòng chữ, bôi được là PDF chữ, không được là ảnh scan.
- **Bạn tự đọc và sửa được** trước khi nạp, thấy ngay chỗ nào sai.
- **Git theo dõi được**, sửa gì cũng có lịch sử.

Cách làm: mở trang web hoặc PDF của trường → copy phần chữ → dán vào `.md` → **đọc lại
một lượt bằng mắt**, xoá tiêu đề/chân trang lặp, số trang, mục lục thừa.

Bước đọc lại bằng mắt chính là *"Bước 2 — Làm sạch dữ liệu"* trong sơ đồ. Với vài chục
tài liệu thì làm tay nhanh và chuẩn hơn viết code làm sạch tự động.

---

## Luật số 2 — sai một chữ là chatbot sai một cách rất thuyết phục

Trần chất lượng của RAG chính là chất lượng kho này. RAG **không** làm model thông minh
hơn, nó làm model **lặp lại dữ liệu của bạn**.

Ghi nhầm học phí 25 triệu thành 250 triệu thì chatbot sẽ nói 250 triệu — **kèm dòng
"Nguồn: Đề án tuyển sinh HUIT 2026"**. Lúc đó nó **tệ hơn không có RAG**, vì câu sai
khoác vỏ tài liệu chính thức và thí sinh không còn cơ sở nào để nghi ngờ.

Nên: **chỉ lấy từ nguồn chính thức của trường**, ghi link đầy đủ, và đọc lại trước khi nạp.

---

## Cách làm — đừng chuẩn bị hết rồi mới nạp

```
① Dựng đường ống một lần        ← đã xong, xem backend/scripts/thu_rag.py
② Đổ vào 2–3 tài liệu thôi
③ Hỏi thử, xem lấy đúng đoạn không, chỉnh cách chunk
④ Ổn rồi mới đổ hàng loạt
```

Chuẩn bị xong 200 tài liệu rồi mới phát hiện chunk chia sai thì phải làm lại từ đầu.

**Bắt đầu bằng đúng một hạng mục.** Lấy `dieu_kien_xet_tuyen.md`, nạp vào, hỏi thử
*"Em thi khối A00 có xét được ngành CNTT không?"*, xem trả lời có đúng không. Đúng rồi
mới sang mục tiếp theo.
