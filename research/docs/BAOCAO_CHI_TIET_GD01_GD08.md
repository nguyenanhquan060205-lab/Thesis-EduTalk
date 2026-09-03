<div align="center">

# 📊 BÁO CÁO PIPELINE MACHINE LEARNING
### Hệ thống gợi ý ngành học EduTalk HUIT

*Chi tiết 45 bước xử lý qua 8 giai đoạn*

</div>

---

## ⚡ Đọc nhanh trong 1 phút

Hệ thống nhận vào **10 câu hỏi về sở thích + điểm thi + tổ hợp** của học sinh, trả về **3 ngành học phù hợp nhất**.

> **📥 Học sinh phải nhập gì?**
>
> | Thông tin | Bắt buộc? | Ghi chú |
> |---|:---:|---|
> | 10 câu hỏi sở thích | 🔴 **BẮT BUỘC** | Không có thì không chạy được — đóng góp +10,4 điểm Top-3 (*Bước 8.7*) |
> | Điểm thi + tổ hợp | 🔴 **BẮT BUỘC** | |
> | Giới tính, mục tiêu | 🔴 **BẮT BUỘC** | |
> | **Khối ngành quan tâm** | 🟢 **TUỲ CHỌN** | **Đây là thứ duy nhất được phép bỏ trống — và chính là lý do mô hình chia 2 tầng** |
>
> Vì khối ngành có thể bỏ trống nên hệ thống có **2 chế độ**:
> **Khám phá** (học sinh chưa biết mình thích khối nào → mô hình tự đoán khối rồi mới đoán ngành) và
> **Tư vấn** (học sinh đã chọn khối → mô hình chỉ xếp hạng trong khối đó).

<table>
<tr><td width="50%" valign="top">

**🎯 Kết quả đạt được**

| Chỉ số | Giá trị |
|---|---|
| Đoán trúng **khối ngành** | **54,9%** |
| Khối ngành trong top 3 | **86,3%** |
| Đoán trúng **ngành** trong top 3 | **39,2%** |
| Ngành trong top 5 | **52,9%** |
| AUC-ROC (năng lực xếp hạng) | **0,844** |

</td><td width="50%" valign="top">

**📐 Quy mô dữ liệu**

| Nguồn | Số lượng |
|---|---|
| Hồ sơ trúng tuyển THPT | 15.888 |
| Phiếu khảo sát sinh viên | 676 |
| → Dùng để học | 574 |
| → Dùng để chấm điểm | 102 |
| Dữ liệu tổng hợp (GA sinh) | 13.796 |

</td></tr>
</table>

> **💡 Hiểu con số 39,2% thế nào?**
> Hiển thị 3 ngành gợi ý thì khoảng **4 trong 10 học sinh** thấy đúng ngành mình hợp trong đó.
> Nếu đoán bừa thì chỉ 7,7%. Nếu luôn đoán ngành phổ biến nhất thì 17,4%.
> ⇒ Hệ thống tốt hơn **5,1 lần** so với đoán bừa.

---

## 🗺️ Bản đồ pipeline

```
        📄 TTTH_THPT_Cleaned.xlsx          📋 khao_sat...clean.csv
           18.024 hồ sơ trúng tuyển           766 phiếu khảo sát
                    │                                 │
        ┌───────────▼───────────┐        ┌────────────▼────────────┐
        │  1️⃣  LÀM SẠCH         │        │  2️⃣  TÁCH DỮ LIỆU      │
        │  → 15.888 hồ sơ       │        │  → 574 học / 102 chấm   │
        │  Có: điểm thi, ngành  │        │  Có: đủ mọi thông tin   │
        │  Thiếu: sở thích ❌   │        │  🔒 Khoá tập chấm điểm  │
        └───────────┬───────────┘        └────────────┬────────────┘
                    │                                 │
                    │                     ┌───────────▼───────────┐
                    │                     │  3️⃣  HỌC PHÂN PHỐI    │
                    │                     │  "SV ngành X thường   │
                    │                     │   trả lời thế nào?"   │
                    │                     └───────────┬───────────┘
                    └──────────────┬──────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  4️⃣  GA SINH DỮ LIỆU         │
                    │  Ghép sở thích vào hồ sơ TTTH│
                    │  → 13.796 dòng tổng hợp      │
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────────────┐       ┌───────────────────────────┐
        │  5️⃣  GỘP + TRỌNG SỐ  │──────►│  6️⃣  KIỂM ĐỊNH           │
        │  → 14.370 dòng       │       │  Dữ liệu giả có giống     │
        └──────────┬───────────┘       │  thật không? → ĐẠT ✅     │
                   │                   └───────────────────────────┘
                   ▼
        ┌──────────────────────┐
        │  7️⃣  TẠO ĐẶC TRƯNG   │  43 đặc trưng, không rò rỉ đáp án
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  8️⃣  HUẤN LUYỆN      │  XGBoost 2 tầng → Top-3 = 39,2%
        └──────────────────────┘
```

---

## 📖 Cách đọc tài liệu này

Mỗi bước xử lý được trình bày theo **4 phần cố định**:

| Nhãn | Trả lời câu hỏi |
|:---:|---|
| 🔧 **Cách làm** | Bước này xử lý dữ liệu như thế nào? |
| 📊 **Kết quả** | Ra được con số gì? |
| 📈 **Hình minh hoạ** | Xem hình nào để hiểu? |
| 💡 **Rút ra** | Điều này có ý nghĩa gì? |

> ✅ **Mọi con số trong tài liệu lấy trực tiếp từ output notebook**, đã kiểm chứng tự động bằng script — không gõ tay.

### Bảng tra nhanh 8 giai đoạn

| | Giai đoạn | Làm gì | Notebook | Bước | Hình |
|:---:|---|---|---|:---:|:---:|
| 1️⃣ | [Làm sạch dữ liệu THPT](#1️⃣-giai-đoạn-1--làm-sạch-dữ-liệu-trúng-tuyển-thpt) | Lọc và chuẩn hoá 18.024 hồ sơ | `01_Flatten_TTTH` | 7 | 6 |
| 2️⃣ | [Tách dữ liệu](#2️⃣-giai-đoạn-2--tách-dữ-liệu-học-và-dữ-liệu-chấm-điểm) | Chia học/chấm điểm, thiết kế kiểm tra chéo | `02_tachtest` | 5 | 5 |
| 3️⃣ | [Học phân phối](#3️⃣-giai-đoạn-3--học-hồ-sơ-sở-thích-của-từng-ngành) | Học "sinh viên ngành X thích gì" | `03_hocphanphoi` | 5 | 3 |
| 4️⃣ | [GA sinh dữ liệu](#4️⃣-giai-đoạn-4--thuật-toán-di-truyền-sinh-dữ-liệu) | Bù phần dữ liệu còn thiếu | `04_GA_sinhdata` | 6 | 4 |
| 5️⃣ | [Gộp + trọng số](#5️⃣-giai-đoạn-5--gộp-dữ-liệu-và-cân-trọng-số) | Trộn dữ liệu thật và tổng hợp | `05_gop_data` | 4 | 3 |
| 6️⃣ | [Kiểm định](#6️⃣-giai-đoạn-6--kiểm-định-dữ-liệu-tổng-hợp) | Dữ liệu giả có giống thật không? | `06_kiemdinhGA` | 5 | 2 |
| 7️⃣ | [Tạo đặc trưng](#7️⃣-giai-đoạn-7--tạo-đặc-trưng-cho-mô-hình) | Chuyển thành số cho máy học | `07_chuan_bi_train` | 4 | 2 |
| 8️⃣ | [Huấn luyện](#8️⃣-giai-đoạn-8--huấn-luyện-và-chấm-điểm-mô-hình) | Train XGBoost và chấm điểm | `08_train_xgboost` | 9 | 7 |
| | **Tổng** | | | **45** | **32** |

---

<div align="center">

# 1️⃣ GIAI ĐOẠN 1 — Làm sạch dữ liệu trúng tuyển THPT

</div>

> **Một câu:** Biến file Excel hồ sơ trúng tuyển thô thành bảng dữ liệu sạch, mỗi dòng ghi rõ thí sinh
> đó thi môn nào được bao nhiêu điểm và đỗ ngành gì.

**📥 Vào:** `TTTH_THPT_Cleaned.xlsx` — 18.024 hồ sơ xét tuyển thật
**📤 Ra:** `TTTH_processed_flatten.csv` — 15.888 dòng × 12 cột
**🎯 Vai trò:** Đây là nguồn dữ liệu **ĐIỂM THI ↔ NGÀNH** thật và lớn nhất của đề tài

<table><tr><td>

⚠️ **Điểm cần nhớ:** Tập này **có** điểm thi và ngành thật, nhưng **không có** 10 câu hỏi sở thích,
giới tính, mục tiêu nghề nghiệp. Phần thiếu sẽ được bù ở Giai đoạn 4.

</td></tr></table>

## Bước 1.1 — Đọc và xem qua dữ liệu

🔧 **Cách làm**
Đọc file Excel, in số dòng, tên cột và đếm xem có ô nào bị trống không.

📊 **Kết quả**

```
Số hồ sơ    : 18.024
Số cột      : 8
Tên cột     : SBD, Mã ngành trúng tuyển, Mã tổ hợp trúng tuyển,
              DUT, M1, M2, M3, KQ
Ô trống     : 0  (toàn bộ bảng)
```

📈 **Hình minh hoạ** — không có (bước xem qua, chỉ in bảng)

💡 **Rút ra**
Dữ liệu gốc đầy đủ, không thiếu ô nào. Nhưng có một vấn đề: **`M1/M2/M3` không cho biết môn nào**.
Chúng chỉ là "điểm môn thứ 1, thứ 2, thứ 3" theo thứ tự của tổ hợp. Đây chính là lý do phải "làm phẳng"
ở Bước 1.3.

---

## Bước 1.2 — Lọc dữ liệu qua 4 bước

🔧 **Cách làm**
Áp dụng lần lượt 4 phép lọc, mỗi bước ghi lại còn bao nhiêu dòng.

| Bước | Việc làm | Tại sao |
|:---:|---|---|
| 1 | Giữ `KQ == 'TT'` | Chỉ lấy thí sinh **đỗ**. Thí sinh trượt không cho biết gì về quan hệ điểm ↔ ngành |
| 2 | Bỏ tổ hợp `D10` | Không biết tổ hợp này gồm 3 môn nào ⇒ không làm phẳng được |
| 3 | Đổi 3 mã ngành cũ sang mã mới | Trường đổi mã ngành qua các năm. **Chỉ đổi khi tổ hợp phù hợp với ngành mới** |
| 4 | Giữ đúng 39 ngành trong đề tài | Loại ngành ngoài phạm vi nghiên cứu |

📊 **Kết quả** — *Bảng 1.1*

| Bước xử lý | Còn lại | Bị loại | Tỷ lệ giữ |
|---|---:|---:|---:|
| Dữ liệu thô | 18.024 | — | 100,0% |
| Loại hồ sơ trượt | 17.272 | 752 | 95,8% |
| Loại tổ hợp D10 | 16.309 | 963 | 90,5% |
| Đổi 3 mã ngành cũ | 16.250 | 59 | 90,2% |
| **Giữ 39 ngành** | **15.888** | 362 | **88,1%** |

📈 **Hình minh hoạ** — `hinh_1_1_pheu_lam_sach.png`
Biểu đồ phễu ngang, mỗi bước một thanh, ghi rõ số hồ sơ còn lại + phần trăm + số bị loại.

💡 **Rút ra**
Giữ lại được **88,1%** dữ liệu — tỷ lệ cao. Không phép lọc nào loại quá 6%.
Mỗi bước đều có lý do rõ ràng, không có chỗ nào loại bừa.

---

## Bước 1.3 — Làm phẳng điểm thi thành 10 cột theo môn

🔧 **Cách làm**
Dùng bảng tra 15 tổ hợp để biết `M1/M2/M3` là môn gì, rồi đưa vào đúng cột.

```
Tổ hợp A00 = [Toán, Lý, Hoá]   →  M1 vào cột Toán, M2 vào Lý,  M3 vào Hoá
Tổ hợp D01 = [Toán, Văn, Anh]  →  M1 vào cột Toán, M2 vào Văn, M3 vào Anh
```

> **🔑 Quyết định quan trọng: KHÔNG điền giá trị vào ô trống.**
> Thí sinh thi A00 thì 7 môn còn lại để trống. Nhiều người sẽ điền 0 hoặc điền điểm trung bình —
> **đó là sai**. Thí sinh không thi môn Sinh **không có nghĩa** em ấy được 0 điểm môn Sinh.
> XGBoost có cơ chế xử lý ô trống riêng, nên cứ để trống là đúng nhất.

📊 **Kết quả**
Được 10 cột `diem_<Môn>`, mỗi dòng **đúng 3 cột có số**, 7 cột để trống.
Tổ hợp thực tế có trong TTTH: `A00, A01, B00, D01, D07, D09, D15` — **7 tổ hợp**.

📈 **Hình minh hoạ** — không có (bước biến đổi cấu trúc bảng)

💡 **Rút ra**
Bước này bắt buộc để hai nguồn dữ liệu (TTTH và khảo sát) có **cùng định dạng cột**, mới gộp lại được ở Giai đoạn 5.

---

## Bước 1.4 — Máy tự kiểm tra

🔧 **Cách làm**
Đặt 4 câu lệnh kiểm tra tự động (`assert`). Nếu sai, notebook **dừng ngay tại chỗ** thay vì chạy tiếp với dữ liệu hỏng.

📊 **Kết quả**

| Kiểm tra | Ý nghĩa | |
|---|---|:---:|
| Mọi tổ hợp đều có trong bảng tra | Không bỏ sót tổ hợp lạ | ✅ |
| Mỗi dòng có **đúng 3** điểm môn | Làm phẳng đúng, không mất/thừa | ✅ |
| Mã ngành đều nằm trong 39 ngành | Bước lọc 4 chạy đúng | ✅ |
| Điểm nằm trong khoảng 0–10 | Không có điểm vô lý | ✅ |

Kết quả cuối: **15.888 hồ sơ**, có dữ liệu cho **34/39 ngành**.

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
Cơ chế tự kiểm tra khiến lỗi lộ ra **ngay tại chỗ** thay vì âm thầm lan xuống các giai đoạn sau
rồi mới phát hiện khi mô hình cho kết quả kỳ lạ.

---

## Bước 1.5 — Thống kê điểm thi

🔧 **Cách làm**
Tính trung bình, độ lệch chuẩn, phân vị cho 10 cột điểm; đếm bao nhiêu thí sinh thi mỗi môn.

📊 **Kết quả** — *Bảng 1.2*

| Môn | Số thí sinh thi | Tỷ lệ thiếu | Trung bình | Độ lệch chuẩn | Trung vị |
|---|---:|---:|---:|---:|---:|
| **Toán** | 15.620 | 1,7% | 7,37 | 0,83 | 7,50 |
| Anh | 9.333 | 41,3% | 7,37 | 1,03 | 7,40 |
| Lý | 7.591 | 52,2% | 7,20 | 0,90 | 7,25 |
| Hoá | 7.473 | 53,0% | 7,40 | 0,81 | 7,50 |
| Văn | 6.443 | 59,4% | 6,93 | 1,10 | 7,00 |
| Sinh | 821 | 94,8% | 7,06 | 0,92 | 7,20 |
| Địa | 268 | 98,3% | **6,09** | 1,13 | 6,00 |
| Sử | 115 | 99,3% | **7,45** | 0,95 | 7,60 |
| GDKT-PL | 0 | 100% | — | — | — |
| Tin | 0 | 100% | — | — | — |

Điểm trung bình 3 môn của toàn bộ hồ sơ: **7,28 ± 0,65**

📈 **Hình minh hoạ**
- `hinh_1_2_thieu_diem_theo_mon.png` — thanh ngang tỷ lệ thiếu, tô màu theo mức nghiêm trọng
- `hinh_1_3_phan_bo_diem.png` — hộp phân bố điểm từng môn + biểu đồ tần suất điểm trung bình

💡 **Rút ra — phát hiện quan trọng**

> Mặt bằng điểm giữa các môn **chênh nhau hơn 1 điểm** (Sử 7,45 vs Địa 6,09).
>
> Nghĩa là: **8,0 điểm của tổ hợp A00 và 8,0 điểm của tổ hợp C00 không giống nhau.**
> Giống như so điểm của hai lớp có đề thi khó dễ khác nhau — không so trực tiếp được.
>
> ⇒ Đây là căn cứ cho việc **chuẩn hoá điểm** ở Giai đoạn 7.

---

## Bước 1.6 — Xem phân bố theo ngành và khối ngành

🔧 **Cách làm**
Đếm số hồ sơ mỗi ngành, gom thành 7 khối ngành, tìm ngành nào không có dữ liệu.

📊 **Kết quả** — *Bảng 1.3 (trích)*

| Ngành | Khối ngành | Số hồ sơ | Tỷ lệ |
|---|---|---:|---:|
| Công nghệ thông tin | CNTT & Máy tính | **1.866** | 11,74% |
| Quản trị kinh doanh | Kinh doanh & Quản lý | 1.010 | 6,36% |
| Công nghệ thực phẩm | Thực phẩm, Sinh học & MT | 948 | 5,97% |
| *…31 ngành khác…* | | | |
| Công nghệ vật liệu | Kỹ thuật & Công nghệ | **19** | 0,12% |
| **5 ngành không có dữ liệu** | | **0** | 0% |

**Hai phát hiện:**

<table><tr><td width="50%" valign="top">

**📉 Mất cân bằng 98 lần**

Nhiều nhất: 1.866 hồ sơ (CNTT)
Ít nhất: 19 hồ sơ (CN vật liệu)

</td><td width="50%" valign="top">

**❌ 5/39 ngành trống hoàn toàn**

Luật · Trí tuệ nhân tạo · Quản lý Công nghiệp
Logistics · Du lịch

</td></tr></table>

📈 **Hình minh hoạ**
- `hinh_1_4_ho_so_theo_39_nganh.png` — thanh ngang cả 39 ngành, tô màu theo khối,
  5 ngành trống vẽ **nét gạch chéo** kèm chữ "KHÔNG CÓ DỮ LIỆU"
- `hinh_1_5_khoi_nganh_va_diem.png` — phân bố 7 khối + mặt bằng điểm từng khối

💡 **Rút ra**
Cả hai phát hiện đều chi phối thiết kế về sau:
- **Mất cân bằng** → xử lý ở GĐ4 (đặt trần/sàn) và GĐ5 (trọng số lớp)
- **5 ngành trống** → GĐ4 phải **mượn hồ sơ điểm từ ngành khác cùng khối**. Đây là hạn chế phải nêu rõ trong khoá luận.

---

## Bước 1.7 — Đối chiếu tổ hợp giữa hai nguồn

🔧 **Cách làm**
Đọc thêm file khảo sát, so xem hai nguồn có cùng tập tổ hợp không.

📊 **Kết quả**

| Nguồn | Số tổ hợp | Danh sách |
|---|:---:|---|
| TTTH | 7 | A00, A01, B00, D01, D07, D09, D15 |
| Khảo sát | 15 | *thêm* B08, C00, C01, C02, C03, D14, X01, X26 |

**8 tổ hợp chỉ có ở khảo sát** — chiếm **122/766 = 15,9%** số phiếu.

📈 **Hình minh hoạ** — `hinh_1_6_lech_phan_phoi_to_hop.png`
Biểu đồ cột kép so tỷ lệ tổ hợp giữa hai nguồn, **tô nền vàng** những tổ hợp chỉ có ở khảo sát.

💡 **Rút ra**
Các cột đánh dấu 8 tổ hợp này sẽ **chỉ bật ở dòng thật**, không bao giờ bật ở dòng tổng hợp.
⇒ GĐ7 sẽ thêm đặc trưng **"nhóm tổ hợp" (Tự nhiên / Xã hội / Hỗn hợp)** để mô hình vẫn hiểu được
các tổ hợp hiếm này.

---

## ✅ Đánh giá Giai đoạn 1

| Tiêu chí | Đánh giá |
|---|---|
| Giữ được nhiều dữ liệu | ✅ 88,1%, không phép lọc nào loại quá 6% |
| Minh bạch | ✅ Mỗi bước có lý do, ghi rõ số dòng bị loại |
| Xử lý ô trống | ✅ Để trống, không điền bừa |
| Tự kiểm tra | ✅ 4 lệnh `assert` |
| Rò rỉ dữ liệu | ✅ Không (tập chấm điểm chưa tồn tại) |

**Hạn chế:** bỏ cột `DUT` (điểm ưu tiên — khảo sát không có) · 2 cột điểm rỗng hoàn toàn ·
quy tắc đổi 3 mã ngành làm thủ công, không kiểm chứng được bằng dữ liệu.

> **Kết luận: ĐẠT.**
> Giá trị lớn nhất của giai đoạn này **không phải** là "làm sạch được bao nhiêu dòng",
> mà là **phát hiện sớm 3 hạn chế cấu trúc** của dữ liệu — cả ba đều đã có phương án xử lý cụ thể.

---

<div align="center">

# 2️⃣ GIAI ĐOẠN 2 — Tách dữ liệu học và dữ liệu chấm điểm

</div>

> **Một câu:** Chia 766 phiếu khảo sát thành phần để mô hình **học** và phần để **chấm điểm** mô hình,
> đảm bảo hai phần không dính nhau.

**📥 Vào:** `khao_sat_dinh_huong_nganh_hoc_clean.csv` — 766 phiếu khảo sát sinh viên HUIT
**📤 Ra:** 4 file — tập học, tập chấm điểm, chỉ số fold, bảng phân loại ngành

<table><tr><td>

🔴 **Đây là giai đoạn quyết định tính trung thực của toàn bộ báo cáo.**
Nếu tách sai ở đây, mọi con số ở Giai đoạn 8 đều vô nghĩa — giống như cho học sinh xem trước đề thi
rồi khen em ấy làm bài giỏi.

</td></tr></table>

## Bước 2.1 — Xây bảng phân loại 39 ngành → 7 khối

🔧 **Cách làm**
Định nghĩa **một lần duy nhất** bảng `tên ngành → (mã ngành, mã khối)`, kiểm tra hợp lệ rồi ghi ra
file `nganh_khoi_mapping.json`.

📊 **Kết quả** — *Bảng 2.1*

| Khối | Tên khối | Số ngành |
|:---:|---|:---:|
| 0 | CNTT & Máy tính | 4 |
| 1 | Kinh doanh & Quản lý | 10 |
| 2 | Du lịch, Khách sạn & Ẩm thực | 6 |
| 3 | Kỹ thuật & Công nghệ | 8 |
| 4 | Thực phẩm, Sinh học & Môi trường | 7 |
| 5 | Luật | 2 |
| 6 | Ngoại ngữ | 2 |

Kiểm tra: đủ 39 ngành ✅ · mã không trùng ✅ · đủ 7 khối ✅ · mọi ngành trong khảo sát đều có trong bảng ✅

📈 **Hình minh hoạ** — không có (bước định nghĩa)

💡 **Rút ra**
Các Giai đoạn 3, 4, 5, 7, 8 đều cần bảng này. Nếu mỗi notebook tự chép một bản riêng, chỉ cần sửa
một chỗ mà quên chỗ khác là **toàn pipeline lệch nhau mà không ai biết**. Đọc chung từ một file
loại bỏ hoàn toàn rủi ro đó.

---

## Bước 2.2 — Loại phiếu điền cho có

🔧 **Cách làm**
Phát hiện phiếu **"điền một đường thẳng"** — người trả lời chọn **cùng một mức cho cả 10 câu**
(ví dụ toàn số 3). Dùng hai tiêu chí song song rồi lấy hợp:

- **Tiêu chí A:** cả 10 câu cùng một giá trị
- **Tiêu chí B:** độ lệch chuẩn 10 câu ≤ 0,3

📊 **Kết quả**

| Tiêu chí | Số phiếu bị bắt |
|---|---:|
| A — cả 10 câu cùng một mức | 90 |
| B — độ lệch chuẩn ≤ 0,3 | 90 |
| **Chỉ bị bắt bởi B (không phải A)** | **0** |

```
Trước lọc :  766 phiếu
Bị loại   :   90 phiếu  (11,7%)
Sau lọc   :  676 phiếu, vẫn đủ 39 ngành
```

📈 **Hình minh hoạ** — `hinh_2_1_loc_phieu_dien_dai.png`
Panel phải **vẽ trực tiếp 6 phiếu bị loại (đường đỏ nằm ngang tắp) cạnh 6 phiếu được giữ
(đường xanh lên xuống)**. Nhìn là hiểu ngay vì sao phải loại, không cần đọc giải thích.

💡 **Rút ra**

> **Tại sao bắt buộc phải loại?**
> Giai đoạn 3 sẽ học "sinh viên ngành X thích gì" từ chính các phiếu này, rồi Giai đoạn 4 nhân bản
> lên hàng nghìn dòng. Giữ phiếu rác thì **cái sai bị khuếch đại lên hàng nghìn lần**.
>
> **Tại sao lọc trước khi tách mà không bị coi là gian lận?**
> Vì phép lọc này **xét từng dòng riêng lẻ**, không dùng bất kỳ thống kê nào từ dữ liệu.
> Một phiếu bị loại hay không chỉ phụ thuộc vào chính 10 câu trả lời của nó.

Hai tiêu chí bắt **đúng cùng một nhóm** — notebook in rõ điều này thay vì để người đọc phải đoán.

---

## Bước 2.3 — Thống kê dữ liệu khảo sát

🔧 **Cách làm**
Tính trung bình, độ lệch chuẩn cho 10 câu Likert; đếm phân bố giới tính, mục tiêu, tổ hợp.

📊 **Kết quả** — *Bảng 2.2: 10 câu hỏi sở thích*

| Câu hỏi | Trung bình | Độ lệch chuẩn | | Câu hỏi | Trung bình | Độ lệch chuẩn |
|---|---:|---:|---|---|---:|---:|
| Tò mò | **3,65** | 1,02 | | Tranh luận | 3,22 | 1,11 |
| Tư duy logic | **3,58** | 1,02 | | Môi trường | 3,01 | 1,32 |
| Sáng tạo | **3,54** | 1,02 | | Thiết kế | 3,01 | 1,28 |
| Dinh dưỡng | 3,30 | 1,34 | | Hướng nội | **2,98** | 1,24 |
| Năng động | 3,29 | 1,18 | | Thí nghiệm | **2,98** | 1,32 |

*Bảng 2.3: Thông tin nhân khẩu học*

| Thuộc tính | Phân bố |
|---|---|
| Giới tính | Nữ 376 (55,6%) · Nam 300 (44,4%) |
| Mục tiêu | Đi làm 455 (67,3%) · Kinh doanh 105 (15,5%) · Chưa xác định 68 (10,1%) · Nghiên cứu 48 (7,1%) |
| Số tổ hợp | 15 |
| Điểm TB 3 môn | 7,23 ± 0,86 |

📈 **Hình minh hoạ**
- `hinh_2_2_phan_bo_likert.png` — cột chồng 5 mức trả lời từng câu + trung bình có thanh sai số
- `hinh_2_3_nhan_khau_hoc.png` — giới tính, mục tiêu, phân bố 15 tổ hợp

💡 **Rút ra**
Mọi câu đều có đủ 5 mức trả lời (từ 1 đến 5) — dữ liệu **có biến thiên tốt**, không bị dồn cục vào
một mức. Sinh viên tự đánh giá cao nhất ở **Tò mò** và **Tư duy logic**, thấp nhất ở **Hướng nội**
và **Thí nghiệm**. Các tỷ lệ này sẽ được GĐ4 giữ đúng khi sinh dữ liệu tổng hợp.

---

## Bước 2.4 — Tách tập học và tập chấm điểm

🔧 **Cách làm**
Chia 85/15 theo kiểu **phân tầng** — nghĩa là giữ đúng tỷ lệ của từng ngành ở cả hai bên,
để không có ngành nào bị lọt hết sang một phía.

```python
train_test_split(df_clean, test_size=0.15,
                 stratify=df_clean["nganh_hoc"],   # phân tầng theo 39 ngành
                 random_state=42)
```

📊 **Kết quả**

```
📚 TẬP HỌC (train)      :  574 phiếu  (84,9%)
📝 TẬP CHẤM ĐIỂM (test) :  102 phiếu  (15,1%)  🔒 KHOÁ LẠI
```

| Kiểm tra tự động | |
|---|:---:|
| Tổng hai tập = tập sạch | ✅ |
| Tập học đủ 39 ngành và 7 khối | ✅ |
| Tập chấm điểm đủ 39 ngành và 7 khối | ✅ |
| **0 dòng xuất hiện ở cả hai tập** | ✅ |

⚠️ Ngành ít mẫu nhất chỉ có **5 phiếu học, 1 phiếu chấm điểm**.

📈 **Hình minh hoạ** — `hinh_2_4_phan_bo_train_test.png`
Panel trái so hai tập theo 7 khối; panel phải là cột chồng cho cả 39 ngành, ghi rõ dạng `học+chấm`.

💡 **Rút ra**
Chia phân tầng giữ đúng tỷ lệ từng ngành ở cả hai bên. Con số **"1 phiếu chấm điểm"** là giới hạn
thật của dữ liệu — sẽ khiến chỉ số của các ngành hiếm rất nhiễu ở Giai đoạn 8.

---

## Bước 2.5 — Thiết kế kiểm tra chéo (Cross-Validation)

🔧 **Cách làm**
Chỉ có 574 dòng thật cho 39 ngành. Nếu cắt thêm 15% làm tập kiểm tra thì mất thêm ~86 dòng quý.
Giải pháp: **chia 5 phần, lặp 3 lần** = 15 lần đo, mỗi lần lấy 1 phần ra kiểm tra.

📊 **Kết quả**

```
574 phiếu thật
   └── 15 fold  (5 phần × 3 lần lặp)
         🟠 KIỂM TRA = 114–115 phiếu thật    ← mọi chỉ số đo tại đây
         🔵 HỌC      = 459–460 phiếu thật
                     + toàn bộ dữ liệu tổng hợp (thêm ở GĐ8)
```

Kiểm tra: ngành ít nhất ≥ 5 phiếu (đủ chia 5 phần) ✅ · **mỗi dòng được dùng để kiểm tra đúng 3 lần** ✅

📈 **Hình minh hoạ** — `hinh_2_5_thiet_ke_cross_validation.png`
Sơ đồ 5 fold, mỗi fold một hàng, vẽ rõ **ba vùng màu**: xanh lá (dữ liệu tổng hợp — chỉ vào phần HỌC),
xanh dương (HỌC thật), cam (KIỂM TRA thật).

💡 **Rút ra**

> **Tại sao lặp 3 lần?** Mỗi lần kiểm tra chỉ có ~115 dòng — đo một lần quá nhiễu.
> Lấy trung bình 15 lần thì con số ổn định hơn nhiều.
>
> **Tại sao lưu chỉ số fold ra file?** Để Giai đoạn 8 dùng **đúng bộ chia này** cho mọi mô hình.
> Nếu mỗi mô hình tự chia lại thì so sánh giữa chúng không còn công bằng.

---

## ✅ Đánh giá Giai đoạn 2

| Tiêu chí | Đánh giá |
|---|---|
| Tách đúng thời điểm | ✅ Đã kiểm chứng bằng script: chỉ NB02 **ghi** file test, chỉ NB07 **đọc**; NB03–06 không đụng |
| Chia phân tầng | ✅ Đủ 39 ngành, 7 khối ở cả hai tập |
| Không trùng lặp | ✅ 0 dòng |
| Lọc phiếu rác có căn cứ | ✅ Tiêu chuẩn trong nghiên cứu khảo sát; in so sánh hai tiêu chí |
| Thiết kế phù hợp dữ liệu nhỏ | ✅ Chia 5×3 thay vì cắt thêm tập kiểm tra |
| Chạy lại ra kết quả giống hệt | ✅ `random_state=42` cố định |

**Hạn chế:** loại 11,7% dữ liệu là đáng kể · ngành hiếm chỉ 1 phiếu chấm điểm ·
tỷ lệ 85/15 là quy ước, chưa thử nghiệm tỷ lệ khác.

> **Kết luận: ĐẠT — giai đoạn chắc chắn nhất về phương pháp.**

---

<div align="center">

# 3️⃣ GIAI ĐOẠN 3 — Học hồ sơ sở thích của từng ngành

</div>

> **Một câu:** Học xem *"sinh viên ngành Công nghệ thông tin thường trả lời 10 câu sở thích như thế nào?"*
> để Giai đoạn 4 có căn cứ sinh dữ liệu.

**📥 Vào:** `khaosat_train.csv` (574 phiếu) — **tuyệt đối không đọc tập chấm điểm**
**📤 Ra:** 2 file phân phối (bản chính + bản riêng cho từng fold)

## Bước 3.1 — Xem số mẫu mỗi ngành

🔧 **Cách làm** Đọc tập học, đếm số phiếu mỗi ngành.

📊 **Kết quả**

```
Dữ liệu học   : 574 phiếu thật, 39 ngành, 7 khối
Số fold       : 15
Số mẫu/ngành  : ít nhất 5, nhiều nhất 40
```

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
Chỉ 5–40 mẫu mỗi ngành. Với 10 câu hỏi, việc ước lượng quan hệ giữa các câu từ **5 mẫu** là
bất khả thi về mặt toán học. ⇒ Bắt buộc phải dùng kỹ thuật "co ngót" ở Bước 3.2.

---

## Bước 3.2 — Ước lượng phân phối có "co ngót"

🔧 **Cách làm**
Với mỗi ngành, ước lượng **hai thứ**:
1. **Điểm trung bình** của 10 câu (vector 10 số)
2. **Quan hệ giữa các câu** — ma trận 10×10 (gọi là ma trận hiệp phương sai)

Rồi **kéo ước lượng của ngành về phía đặc trưng chung của khối**, theo công thức:

$$\mu_{\text{ngành}} = \frac{n \cdot \bar{x}_{\text{ngành}} + K \cdot \mu_{\text{khối}}}{n + K}, \qquad K = 10$$

> **🎓 Giải thích dễ hiểu**
> Giống như chấm điểm giáo viên bằng phản hồi sinh viên: nếu chỉ có 3 sinh viên đánh giá,
> điểm đó không đáng tin — nên người ta **trộn với điểm trung bình của cả khoa**.
> Càng ít người đánh giá thì càng nghiêng về điểm khoa. Ở đây cũng vậy: ngành ít mẫu thì
> nghiêng về đặc trưng chung của khối ngành.

📊 **Kết quả** — *Bảng 3.1 (trích)*

| Ngành | Số mẫu | Mức "mượn" từ khối |
|---|---:|---:|
| Công nghệ kỹ thuật môi trường | 5 | **66,7%** |
| Quản lý Công nghiệp | 6 | 62,5% |
| Khoa học chế biến món ăn | 7 | 58,8% |
| *…* | | |
| Kế toán | 23 | 30,3% |
| **Công nghệ thông tin** | **40** | **20,0%** |

📈 **Hình minh hoạ** — `hinh_3_1_bayesian_shrinkage.png`
Panel trái: quan hệ *số mẫu ↔ mức mượn* (chấm tô màu theo khối + đường lý thuyết).
Panel phải: ví dụ một ngành ít mẫu, vẽ 3 đường — **trung bình thô** / **đặc trưng khối** / **sau co ngót**.

💡 **Rút ra**

> **Đặc trưng khối lấy từ đâu?**
> Từ **chính dữ liệu học**, không phải người viết tự nghĩ ra ⇒ **không đưa giả định chủ quan vào mô hình**.

Ngành 5 mẫu nghiêng **66,7%** về khối; ngành 40 mẫu chỉ 20%. Đây đúng là hành vi mong muốn.
Mặt trái: ngành 5 mẫu gần như mất hết nét riêng.

---

## Bước 3.3 — Kiểm chứng có giữ được quan hệ giữa các câu không

🔧 **Cách làm**
So ma trận quan hệ của dữ liệu thật với ma trận trong phân phối đã học.

📊 **Kết quả** — *Bảng 3.2: các cặp câu hỏi liên quan nhau nhất*

| Cặp câu hỏi | Hệ số tương quan |
|---|---:|
| Thí nghiệm ↔ Môi trường | **+0,615** |
| Môi trường ↔ Dinh dưỡng | +0,560 |
| Môi trường ↔ Thiết kế | +0,510 |
| Thí nghiệm ↔ Dinh dưỡng | +0,507 |
| Tranh luận ↔ Thiết kế | +0,454 |

| | Giá trị |
|---|---:|
| Mức liên quan trung bình — **dữ liệu thật** | **0,237** |
| Mức liên quan trung bình — **phân phối đã học** | **0,253** |
| Sai lệch | **0,033** |

📈 **Hình minh hoạ**
- `hinh_3_2_ma_tran_tuong_quan.png` — **ba ma trận cạnh nhau**: thật · đã học · nếu làm sai cách
- `hinh_3_3_ho_so_khoi_nganh.png` — bản đồ nhiệt hồ sơ 7 khối + biểu đồ radar 4 khối tiêu biểu

💡 **Rút ra — đây là lý do cốt lõi của cả giai đoạn**

> 10 câu hỏi **không độc lập với nhau**. Người chấm "Thí nghiệm" cao thì thường cũng chấm
> "Môi trường" cao (hệ số 0,615 — khá mạnh).
>
> Nếu chỉ lưu điểm trung bình từng câu rồi sinh dữ liệu bằng 10 phân phối **riêng rẽ**,
> toàn bộ quan hệ này sẽ **biến mất**. Dữ liệu tổng hợp sẽ có người "thích thí nghiệm nhưng ghét
> môi trường" — chuyện gần như không xảy ra ngoài đời.
>
> Panel thứ ba của Hình 3.2 minh hoạ trực tiếp hậu quả đó.

---

## Bước 3.4 — Học phân phối riêng cho từng fold

🔧 **Cách làm**
Lặp qua 15 fold, mỗi fold học lại toàn bộ phân phối **chỉ từ phần học của fold đó**.

📊 **Kết quả**

```
✅ Đã học phân phối riêng cho 15 fold
   Sai lệch so với bản chính: trung bình 0,0736 điểm  |  lớn nhất 0,2087
```

📈 **Hình minh hoạ** — không có

💡 **Rút ra — chống rò rỉ tinh vi**

> Phân phối bản chính học từ **cả 574 phiếu**. Nếu dùng nó sinh dữ liệu rồi đem đo kiểm tra chéo,
> thì dòng tổng hợp trong phần HỌC của một fold đã "biết" đôi chút về dòng thật trong phần
> KIỂM TRA của fold đó ⇒ **điểm số cao hơn thực tế**.
>
> Tách riêng 15 bộ loại bỏ hoàn toàn vấn đề này.

---

## Bước 3.5 — Kiểm tra tính hợp lệ của ma trận

🔧 **Cách làm** Kiểm tra cả 39 ma trận: kích thước, tính đối xứng, tính "xác định dương".

📊 **Kết quả** 39/39 ma trận đều đối xứng và **xác định dương** ✅

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
"Xác định dương" là điều kiện toán học **bắt buộc** — nếu không, hàm sinh dữ liệu ở Giai đoạn 4
sẽ báo lỗi hoặc cho ra giá trị vô nghĩa.

---

## ✅ Đánh giá Giai đoạn 3

| Tiêu chí | Đánh giá |
|---|---|
| Giữ được quan hệ giữa các câu | ✅ Sai lệch chỉ 0,033 |
| Xử lý ngành ít mẫu | ✅ Co ngót có cơ sở lý thuyết, đặc trưng khối lấy từ dữ liệu |
| Ma trận hợp lệ | ✅ 39/39 |
| Chống rò rỉ | ✅ Chỉ đọc tập học + thêm 15 bộ theo fold |

**Hạn chế:** hệ số K chọn theo kinh nghiệm, chưa thử nghiệm giá trị khác ·
ngành 5 mẫu thì 67% đặc trưng là "mượn", gần như mất nét riêng.

> **Kết luận: ĐẠT.**

---

<div align="center">

# 4️⃣ GIAI ĐOẠN 4 — Thuật toán di truyền sinh dữ liệu

</div>

> **Một câu:** Ghép 10 câu sở thích (do thuật toán sinh) vào 15.888 hồ sơ điểm thi thật,
> tạo ra bộ dữ liệu vừa có điểm vừa có sở thích.

## Bài toán: hai nguồn bổ sung nhau nhưng không nguồn nào đủ

| | Điểm thi | Ngành | 10 câu sở thích | Giới tính | Mục tiêu |
|---|:---:|:---:|:---:|:---:|:---:|
| **TTTH** (15.888 hồ sơ) | ✅ THẬT | ✅ THẬT | ❌ thiếu | ❌ thiếu | ❌ thiếu |
| **Khảo sát** (574 phiếu) | ✅ THẬT | ✅ THẬT | ✅ THẬT | ✅ THẬT | ✅ THẬT |

⇒ GA **bù phần còn thiếu cho hồ sơ TTTH**, và **giữ nguyên điểm thi thật**.

## Bước 4.1 — Thiết kế thuật toán di truyền

🔧 **Cách làm**
Điểm khác biệt lớn nhất: **một "cá thể" trong quần thể GA = MỘT BỘ DỮ LIỆU HOÀN CHỈNH**
(ma trận `n × 10`), chứ không phải một dòng đơn lẻ.

| Khái niệm GA | Trong bài toán này |
|---|---|
| **Cá thể** | Một bảng `n × 10` số nguyên 1–5 — cả bộ dữ liệu của 1 ngành |
| **Quần thể** | 10 bộ dữ liệu ứng viên |
| **Độ thích nghi** | Bộ nào có phân phối giống đích nhất thì điểm cao |
| **Chọn lọc** | Đấu loại 3 bộ ngẫu nhiên, lấy bộ tốt nhất |
| **Lai ghép** | Bộ con lấy ngẫu nhiên từng dòng của cha hoặc mẹ |
| **Đột biến** | Thay 6% số dòng bằng dòng mới rút từ phân phối đích |
| **Tinh hoa** | Giữ nguyên 2 bộ tốt nhất mỗi thế hệ |
| **Số thế hệ** | 40 |

📊 **Kết quả** Hàm GA chạy toàn bộ 39 ngành trong **4 giây**.

📈 **Hình minh hoạ** — không có (bước cài đặt)

💡 **Rút ra — vì sao "cá thể = cả bộ dữ liệu"?**

> Thứ ta cần tối ưu là **phân phối của cả tập**, không phải từng dòng riêng lẻ.
>
> Nếu cá thể là một dòng, thì điểm đánh giá ở mức "cả tập" sẽ **giống hệt nhau cho mọi cá thể**
> trong cùng thế hệ, và **bị triệt tiêu hoàn toàn** khi so sánh chọn lọc.
> GA khi đó chỉ còn là lấy mẫu ngẫu nhiên khoác áo GA.

---

## Bước 4.2 — Kiểm chứng GA có thật sự hơn lấy mẫu thường không

🔧 **Cách làm**
Chạy thử trên ngành nhiều dữ liệu nhất (CNTT, 600 dòng), so GA với cách lấy mẫu thông thường
(`làm tròn` + `cắt về khoảng 1–5`).

📊 **Kết quả** — *Bảng 4.1*

| Khía cạnh | Lấy mẫu thường | GA | Cải thiện |
|---|---:|---:|---:|
| Điểm trung bình | 0,0351 | 0,0067 | **80,8%** |
| Độ phân tán | 0,0486 | 0,0187 | **61,5%** |
| Quan hệ giữa các câu | 0,0387 | 0,0247 | **36,0%** |
| **Tổng sai lệch** | 0,3647 | **0,1633** | **55,2%** |

*Bảng 4.2: Tách bạch đóng góp của từng thành phần*

| Mức | Sai lệch | Giảm được |
|---|---:|---:|
| ① Lấy mẫu thường (1 lần) | 0,3647 | — |
| ② Chọn bộ tốt nhất trong 10 lần thử | 0,2827 | 22,5% |
| ③ Sau 40 thế hệ tiến hoá | **0,1633** | **42,2%** |
| **Tổng ① → ③** | | **55,2%** |

📈 **Hình minh hoạ** — `hinh_4_1_ga_hoi_tu.png`
Panel trái: đường hội tụ với **hai vạch mốc** + mũi tên đánh dấu phần đóng góp của "chọn lọc"
và "tiến hoá". Panel phải: sai lệch theo 3 khía cạnh.

💡 **Rút ra**

> **Vì sao cần GA mà không lấy mẫu thẳng?**
> Vì câu trả lời Likert là **số nguyên 1–5 có chặn hai đầu**. Lấy mẫu từ phân phối chuẩn rồi
> cắt về 1–5 và làm tròn sẽ gây **ba loại méo**: lệch trung bình (do cắt ở biên), sai độ phân tán
> (do làm tròn), và méo cả quan hệ giữa các câu.
>
> Đây là bài toán tối ưu có ràng buộc số nguyên — **lấy mẫu trực tiếp không giải được**.

Notebook **tách bạch hai nguồn cải thiện** thay vì gộp thành một con số 55,2% dễ gây hiểu nhầm.

---

## Bước 4.3 — Đối chứng hai kiểu đột biến

🔧 **Cách làm**
Chạy GA hai lần với **cùng khởi tạo, cùng số thế hệ**, chỉ khác cách đột biến:
- **Kiểu A:** sửa từng ô ±1 (mỗi ô 6% khả năng bị sửa)
- **Kiểu B:** thay 6% số dòng bằng dòng mới rút từ phân phối đích

📊 **Kết quả** — *Bảng 4.3*

| Kiểu đột biến | Sai lệch cuối | Tiến hoá giảm được | Sai lệch quan hệ |
|---|---:|---:|---:|
| A — Sửa từng ô ±1 | 0,2827 | **0,0%** | 0,0279 |
| **B — Thay dòng mới** ✅ | **0,1633** | **42,2%** | **0,0247** |

📈 **Hình minh hoạ** — thể hiện qua đường hội tụ ở `hinh_4_1_ga_hoi_tu.png`

💡 **Rút ra — điểm kỹ thuật quan trọng nhất của giai đoạn**

> **Quan hệ giữa 10 câu nằm ở mối liên hệ giữa các ô TRONG CÙNG MỘT DÒNG.**
>
> Sửa từng ô riêng lẻ sẽ **phá vỡ** mối liên hệ đó → mọi đột biến đều bị loại → tiến hoá đóng góp **0%**.
>
> Ngược lại, mỗi dòng mới rút từ phân phối chuẩn nhiều chiều **đã mang sẵn quan hệ đúng**,
> nên quần thể vẫn khám phá được mà không phá hỏng phần đã đạt.
>
> ⇒ Kiểu B vừa giảm sai lệch mạnh hơn, vừa **giữ quan hệ tốt hơn**.

---

## Bước 4.4 — Chọn hồ sơ nền và cân bằng số lượng

🔧 **Cách làm**
Với mỗi ngành, chọn hồ sơ TTTH làm "nền" (giữ nguyên điểm thi thật):

| Trường hợp | Xử lý |
|---|---|
| Ngành có **> 600** hồ sơ | Lấy ngẫu nhiên 600 |
| Ngành có **< 150** hồ sơ | Lấy lặp lên 150 *(mỗi bản sao được sinh sở thích **khác nhau**)* |
| **5 ngành không có hồ sơ** | **Mượn hồ sơ điểm từ ngành khác cùng khối** |

📊 **Kết quả**

```
Dòng nền tổng hợp : 13.796 dòng, đủ 39 ngành
```

| | Nhiều nhất | Ít nhất | Chênh lệch |
|---|---:|---:|---:|
| TTTH gốc | 1.866 | 19 | **98 lần** |
| Sau cân bằng | 600 | 150 | **4 lần** |

📈 **Hình minh hoạ** — `hinh_4_2_can_bang_lop.png`
Thanh ngang cả 39 ngành, so trước/sau cân bằng, có vạch trần 600 và sàn 150.

💡 **Rút ra**

> **Vì sao mượn từ TTTH cùng khối chứ không mượn từ khảo sát?**
> Nếu lấy từ khảo sát, dòng tổng hợp có thể **vô tình sao chép chính dòng thật đang nằm trong
> tập kiểm tra** → gian lận. Mượn từ kho TTTH cùng khối vừa là dữ liệu điểm thật,
> vừa phù hợp khối ngành, vừa **không rò rỉ**.

---

## Bước 4.5 — Sinh bộ dữ liệu chính

🔧 **Cách làm**
Với mỗi ngành: GA sinh 10 câu sở thích; sinh giới tính và mục tiêu theo đúng tỷ lệ đã học ở GĐ3.

📊 **Kết quả**

```
✅ synthetic_GA_data.csv — 13.796 dòng × 30 cột, đủ 39 ngành
   Điểm thi + tổ hợp        : THẬT (giữ nguyên từ hồ sơ trúng tuyển)
   Sở thích + giới tính + mục tiêu : GA sinh
   Thời gian: 4,0 giây
```

Kiểm tra: đủ 39 ngành ✅ · điểm sở thích trong 1–5 ✅ · mỗi dòng giữ đúng 3 điểm thật ✅ ·
không sinh ra phiếu "điền một đường thẳng" ✅

📈 **Hình minh hoạ**
- `hinh_4_3_tong_hop_vs_that.png` — trung bình từng câu (thật vs GA) + ma trận quan hệ
- `hinh_4_4_giu_nguyen_diem_va_ty_le.png` — **chứng minh điểm thi không bị bịa** (biểu đồ trùng khít)

💡 **Rút ra**

> Hình 4.4a là **bằng chứng trực quan** rằng điểm thi hoàn toàn không bị bịa — phân bố của dòng
> tổng hợp trùng khít TTTH gốc.
>
> ⚠️ Lưu ý: Hình 4.3a chỉ cho thấy **trung bình khớp** — điều hiển nhiên vì GA tối ưu theo nó.
> **Kiểm định thật sự nằm ở Giai đoạn 6.**

---

## Bước 4.6 — Sinh bộ dữ liệu riêng cho từng fold

🔧 **Cách làm**
Lặp qua 15 fold, mỗi fold sinh lại các cột bằng phân phối **chỉ học từ phần học của fold đó**.
Vì hồ sơ nền không đổi nên chỉ lưu phần thay đổi.

📊 **Kết quả**

```
✅ synthetic_per_fold.npz — 15 fold × 13.796 dòng  (742 KB)
   Thời gian: 49 giây
```

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
Lưu dạng nén giúp 15 bộ dữ liệu chỉ tốn **742 KB** thay vì hàng chục MB nếu lưu đầy đủ.

---

## ✅ Đánh giá Giai đoạn 4

| Tiêu chí | Đánh giá |
|---|---|
| GA có thật sự hiệu quả | ✅ Giảm sai lệch 55,2%; tiến hoá đóng góp 42,2% (**đo thật**) |
| Giữ quan hệ giữa các câu | ✅ Kiểu đột biến "thay dòng" tốt hơn ở cả hai mặt |
| Giữ dữ liệu thật | ✅ Điểm thi + tổ hợp giữ nguyên 100% |
| Cân bằng số lượng | ✅ 98 lần → 4 lần |
| Chống rò rỉ | ✅ Sinh riêng 15 bộ theo fold |
| Minh bạch | ✅ In bảng đối chứng thay vì khẳng định suông |

**Hạn chế:** 5 ngành phải mượn điểm của khối ⇒ độ tin cậy thấp hơn · trần/sàn chọn theo kinh nghiệm ·
dữ liệu sở thích tổng hợp vẫn dựa trên **giả định** rằng sinh viên cùng ngành có sở thích tương tự.

> **Kết luận: ĐẠT** — với điều kiện kiểm định ở Giai đoạn 6 phải đạt chuẩn.

---

<div align="center">

# 5️⃣ GIAI ĐOẠN 5 — Gộp dữ liệu và cân trọng số

</div>

> **Một câu:** Trộn 574 dòng thật với 13.796 dòng tổng hợp, và cân sao cho dòng thật không bị "chìm nghỉm".

## Bước 5.1 — Gộp hai nguồn

🔧 **Cách làm** Chuẩn hoá cách ghi giới tính, kiểm tra hai nguồn cùng cột, nối lại, đánh dấu dòng nào là thật.

📊 **Kết quả**

```
Khảo sát thật :    574 dòng
Tổng hợp GA   : 13.796 dòng
Tỷ lệ         : 1 : 24
```

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
Tỷ lệ 1:24 là vấn đề. Nếu để nguyên, mô hình sẽ chủ yếu học đặc điểm của **dữ liệu máy sinh**
chứ không phải của **người thật**.

---

## Bước 5.2 — Trọng số theo nguồn

🔧 **Cách làm**
Đặt trọng số sao cho **tổng ảnh hưởng của hai nguồn bằng nhau**:

$$w_{\text{thật}} = \frac{\text{số dòng tổng hợp}}{\text{số dòng thật}} = \frac{13.796}{574} = 24{,}03$$

📊 **Kết quả**

| | Giá trị |
|---|---:|
| Trọng số dòng thật | **24,03** |
| Trọng số dòng tổng hợp | 1,00 |
| Tổng ảnh hưởng — thật | 13.796 |
| Tổng ảnh hưởng — tổng hợp | 13.796 |

📈 **Hình minh hoạ** — `hinh_5_1_trong_so_nguon.png`
Hai biểu đồ tròn cạnh nhau: trái là tỷ lệ **số dòng** (thật chỉ 4%), phải là tỷ lệ **ảnh hưởng** (thật 50%).

💡 **Rút ra**
Con số 24,03 **tính ra từ dữ liệu**, không phải đặt tay. Sau khi nhân trọng số, 574 phiếu thật
tuy chỉ chiếm 4% số dòng nhưng **đóng góp 50%** vào quá trình học.

---

## Bước 5.3 — Trọng số theo ngành

🔧 **Cách làm**
Ngành ít dữ liệu được tăng trọng số, nhưng chỉ tăng theo **căn bậc hai** chứ không tăng hết cỡ:

$$w_{\text{lớp}} = \left(\frac{\text{trung bình}}{\text{của ngành này}}\right)^{0{,}5}$$

📊 **Kết quả**

| | Giá trị |
|---|---|
| Trọng số ngành nhỏ nhất | 0,67 *(Công nghệ thông tin)* |
| Trọng số ngành lớn nhất | 1,62 *(CN kỹ thuật môi trường)* |
| Trọng số cuối cùng | nhỏ nhất 0,361 · giữa 0,479 · lớn nhất 20,86 |
| **Chênh lệch giữa các ngành** | **5,8 lần → 2,4 lần** |

📈 **Hình minh hoạ** — `hinh_5_2_trong_so_lop.png`
Panel trái so tổng ảnh hưởng 39 ngành trước/sau; panel phải là mức chênh lệch thu hẹp.

💡 **Rút ra**

> **Vì sao dùng căn bậc hai mà không cân bằng hết cỡ?**
> Cân bằng hoàn toàn sẽ thổi trọng số của ngành chỉ có 5 mẫu lên quá cao,
> khiến mô hình **học thuộc lòng vài dòng lẻ** thay vì học quy luật.

---

## Bước 5.4 — Kiểm tra và xuất file

🔧 **Cách làm** 6 lệnh kiểm tra tự động, đo tỷ lệ dòng trùng.

📊 **Kết quả**

```
✅ train_final.csv — 14.370 dòng × 33 cột
   Khảo sát thật : 574 dòng (4,0%)
   Tổng hợp GA   : 13.796 dòng (96,0%)
   Dòng trùng hoàn toàn: 0,01%
```

📈 **Hình minh hoạ** — `hinh_5_3_co_cau_tap_huan_luyen.png`
Phân bố theo khối (số dòng vs ảnh hưởng), phân bố trọng số, tỷ lệ dữ liệu thật từng ngành.

💡 **Rút ra**
Không xoá dòng trùng vì tỷ lệ rất nhỏ (0,01%) và việc xoá sẽ làm lệch phân bố đã cân bằng ở GĐ4.

---

## ✅ Đánh giá Giai đoạn 5

| Tiêu chí | Đánh giá |
|---|---|
| Trọng số có cơ sở | ✅ Tính từ dữ liệu, không đặt tay |
| Tách bạch hai vấn đề | ✅ Hai cơ chế riêng cho hai loại mất cân bằng |
| Mức cân bằng hợp lý | ✅ Căn bậc hai, tránh cực đoan |
| Tự kiểm tra | ✅ 6 lệnh `assert` |

**Hạn chế:** trọng số 24,03 là **rất cao** — mô hình dễ học thuộc 574 dòng đó.
Đây chính là nguyên nhân trực tiếp của hiện tượng **học thuộc** sẽ thấy ở Giai đoạn 8.

> **Kết luận: ĐẠT**, nhưng cần lưu ý điểm hạn chế trên.

---

<div align="center">

# 6️⃣ GIAI ĐOẠN 6 — Kiểm định dữ liệu tổng hợp

</div>

> **Một câu:** Trả lời câu hỏi *"dữ liệu do máy sinh có thật sự giống người thật không?"* — bằng cách
> so với những phiếu thật mà máy **chưa từng nhìn thấy**.

<table><tr><td>

🔑 **Nguyên tắc vàng:** So dữ liệu tổng hợp với **dòng thật chưa từng được dùng để sinh ra nó**.

Nếu so với chính công thức đã sinh ra nó thì luôn "đạt" — giống như tự chấm bài của mình.

</td></tr></table>

## Bước 6.1 — Dựng cặp so sánh

🔧 **Cách làm**

```
Với mỗi fold f:
   Phần HỌC của fold f   →  GĐ3 học phân phối  →  GĐ4 sinh dữ liệu  S_f
   Phần KIỂM TRA của f   →  R_f  (chưa hề tham gia sinh ra S_f)

Gộp 5 fold:  R = 574 dòng thật  ⟷  S = 574 dòng tổng hợp KHỚP TỶ LỆ NGÀNH
```

Đồng thời dựng **bộ đối chứng**: sinh theo cách sai (10 phân phối riêng rẽ, cùng trung bình,
cùng độ lệch chuẩn, **chỉ bỏ quan hệ giữa các câu**).

📊 **Kết quả** `✅ 574 dòng thật ⟷ 574 dòng tổng hợp (khớp tỷ lệ ngành)`

📈 **Hình minh hoạ** — không có

💡 **Rút ra**

> **Vì sao phải khớp tỷ lệ ngành?**
> Nếu không, phép so sánh sẽ bị nhiễu bởi việc hai tập có **cơ cấu ngành khác nhau**,
> chứ không phải bởi chất lượng sinh dữ liệu.
>
> **Bộ đối chứng để làm gì?** Để chứng minh quyết định "dùng ma trận quan hệ" ở GĐ3 là **cần thiết**,
> không phải chi tiết thừa.

---

## Bước 6.2 — Phép 1: So từng câu hỏi

🔧 **Cách làm** Với mỗi câu, chạy kiểm định thống kê KS và đo khoảng cách phân phối.

📊 **Kết quả**

| | Cách đang dùng | Cách đối chứng |
|---|---:|---:|
| Số câu **ĐẠT** (p ≥ 0,05) | **10/10** | 10/10 |
| p-value trung vị | **0,877** | 0,486 |
| Khoảng cách trung bình | **0,086** | 0,114 |

📈 **Hình minh hoạ** — panel a, b của `hinh_6_1_bon_phep_kiem_dinh.png`

💡 **Rút ra**
⚠️ **Cả hai cách đều đạt 10/10!** Nghĩa là phép kiểm định **từng câu riêng lẻ không đủ sức phân biệt**
cách làm đúng và cách làm sai. Đây chính là lý do phải có thêm Phép 2, 3, 4.

---

## Bước 6.3 — Phép 2 & 3: So quan hệ và phân phối tổng thể

🔧 **Cách làm** So ma trận quan hệ; đo "khoảng cách năng lượng" trên toàn bộ 10 chiều cùng lúc.

📊 **Kết quả**

| | Cách đang dùng | Cách đối chứng |
|---|---:|---:|
| Sai lệch quan hệ trung bình | **0,0306** | 0,2306 |
| Sai lệch quan hệ lớn nhất | **0,0887** | 0,5655 |
| Mức quan hệ trung bình | **0,2367** | 0,0414 |
| Khoảng cách năng lượng | **0,0147** | 0,0449 |

*Dữ liệu thật có mức quan hệ trung bình = **0,2372***

📈 **Hình minh hoạ** — panel c của `hinh_6_1`; và `hinh_6_2_pca_that_vs_tong_hop.png`
(chiếu 10 chiều xuống mặt phẳng 2 chiều để nhìn bằng mắt)

💡 **Rút ra**
Cách đang dùng tái tạo mức quan hệ **gần như chính xác** (0,2367 vs 0,2372 của thật).
Cách đối chứng chỉ đạt 0,041 — đúng như dự đoán, vì 10 phân phối riêng rẽ thì **không thể có quan hệ**.

---

## Bước 6.4 — Phép 4: Máy có nhận ra dữ liệu giả không?

🔧 **Cách làm**
Huấn luyện một mô hình trả lời câu hỏi: *"dòng này là người thật hay do máy sinh?"*
Chỉ dùng 10 câu sở thích (điểm thi là thật ở cả hai bên nên không phân biệt được).

📊 **Kết quả**

| Cách sinh dữ liệu | AUC | Kết luận |
|---|---:|---|
| **Đang dùng (có ma trận quan hệ)** | **0,620** | ✅ ĐẠT — khó phân biệt |
| Đối chứng (10 phân phối riêng rẽ) | 0,815 | ❌ CHƯA ĐẠT — lộ rõ |

*AUC = 0,50 là lý tưởng (không phân biệt nổi) · ngưỡng đạt < 0,65*

📈 **Hình minh hoạ** — panel d của `hinh_6_1_bon_phep_kiem_dinh.png`
Thanh ngang có vạch 0,50 (lý tưởng) và 0,65 (ngưỡng đạt).

💡 **Rút ra — phép nghiêm khắc nhất và dễ hiểu nhất**

> Nếu một mô hình **phân biệt được** dòng thật với dòng máy sinh, nghĩa là dòng máy sinh **còn lộ**.
>
> Chênh lệch **0,620 vs 0,815** chứng minh: ma trận quan hệ ở Giai đoạn 3 là **quyết định thiết yếu**,
> không phải chi tiết trang trí.

---

## Bước 6.5 — Kết luận kiểm định

🔧 **Cách làm** Tổng hợp 4 tiêu chí, mỗi tiêu chí có ngưỡng rõ ràng.

📊 **Kết quả**

| Tiêu chí | Giá trị | Ngưỡng | |
|---|---:|---:|:---:|
| Kiểm định KS từng câu | 10/10 | ≥ 7/10 | ✅ |
| Sai lệch quan hệ | 0,0306 | < 0,10 | ✅ |
| Khoảng cách năng lượng | 0,0147 | < 0,05 | ✅ |
| AUC phân biệt thật/giả | 0,620 | < 0,65 | ✅ |

<div align="center">

### 🎉 DỮ LIỆU TỔNG HỢP ĐẠT CHUẨN

</div>

📈 **Hình minh hoạ** — `hinh_6_1_bon_phep_kiem_dinh.png` (4 panel, mỗi panel một phép)

💡 **Rút ra**

> Notebook ghi rõ: *"câu hỏi 'dữ liệu tổng hợp có LÀM MÔ HÌNH TỐT HƠN không?' được trả lời bằng
> thực nghiệm ở Giai đoạn 8"*.
>
> **Giống thật** và **có ích** là hai chuyện khác nhau — không được lẫn lộn.

---

## ✅ Đánh giá Giai đoạn 6

| Tiêu chí | Đánh giá |
|---|---|
| Phương pháp kiểm định | ✅ So với dòng thật **chưa từng thấy**, khớp tỷ lệ ngành |
| Có đối chứng | ✅ Chứng minh được một quyết định thiết kế cụ thể |
| Bộ tiêu chí đầy đủ | ✅ Từ từng câu → tổng thể → khả năng phân biệt |
| Kết luận | ✅ **ĐẠT** cả 4 tiêu chí |

**Hạn chế:** AUC 0,620 chưa lý tưởng (0,50) · kiểm định chỉ xét 10 câu sở thích,
**chưa xét quan hệ giữa sở thích và điểm thi**.

> **Kết luận: ĐẠT.** Đây là giai đoạn có giá trị khoa học cao nhất vì nó **kiểm chứng chứ không khẳng định**.

---

<div align="center">

# 7️⃣ GIAI ĐOẠN 7 — Tạo đặc trưng cho mô hình

</div>

> **Một câu:** Chuyển dữ liệu thô thành bảng số để XGBoost học, đồng thời **đảm bảo không có cột nào
> vô tình tiết lộ đáp án**.

> 📌 **Đây là lần đầu tiên tập chấm điểm được mở** — và chỉ để tạo bảng số, chưa dùng để đo gì.

## Bước 7.1 — Tính thống kê chuẩn hoá điểm

🔧 **Cách làm**
Tính trung bình và độ lệch chuẩn từng môn **chỉ trên tập học**, rồi áp dụng y hệt cho tập chấm điểm.

📊 **Kết quả** — *Bảng 7.1 (trích)*

| Môn | TB (tập học) | ĐLC (tập học) | Thiếu ở tập học | Thiếu ở tập chấm |
|---|---:|---:|---:|---:|
| Toán | 7,292 | 0,873 | 2,3% | 5,9% |
| Lý | 7,094 | 0,965 | 53,4% | 47,1% |
| Anh | 7,274 | 1,080 | 41,7% | 54,9% |
| Địa | 6,292 | 1,287 | 97,8% | 95,1% |

📈 **Hình minh hoạ** — `hinh_7_1_chuan_hoa_diem.png`
Panel trái: biểu đồ điểm thô vs điểm chuẩn hoá, tô màu theo nhóm tổ hợp — thấy rõ **cùng điểm thô
cho vị thế khác nhau**. Panel phải: mặt bằng điểm từng môn.

💡 **Rút ra**

> **Vì sao phải chuẩn hoá?**
> Điểm trung bình 3 môn thô **không so sánh được**: 8,0 của tổ hợp A00 (Toán–Lý–Hoá) và 8,0 của
> C00 (Văn–Sử–Địa) mang ý nghĩa khác nhau, vì mặt bằng điểm từng môn chênh nhau hơn 1 điểm
> (đã đo ở Giai đoạn 1).
>
> ✅ **Thống kê chỉ tính trên tập học** rồi áp dụng cho tập chấm điểm ⇒ **không rò rỉ**.

---

## Bước 7.2 — Xây 43 đặc trưng

🔧 **Cách làm** Ghép 6 nhóm đặc trưng, đảm bảo thứ tự cột hai tập giống hệt nhau.

📊 **Kết quả** — *Bảng 7.2*

| Nhóm | Số lượng | Ghi chú |
|---|:---:|---|
| 10 câu sở thích | 10 | Giữ nguyên thang 1–5 |
| 10 điểm thi thô | 10 | **Giữ ô trống** để XGBoost tự xử lý |
| Điểm chuẩn hoá | 3 | trung bình, cao nhất, thấp nhất |
| Giới tính & mục tiêu | 2 | |
| 15 tổ hợp | 15 | Đánh dấu 0/1 |
| 3 nhóm tổ hợp | 3 | Tự nhiên / Xã hội / Hỗn hợp |
| **TỔNG** | **43** | |

```
X_train (14.370 × 43)   |   X_test (102 × 43)
```

📈 **Hình minh hoạ** — thể hiện qua Hình 7.2

💡 **Rút ra**
Nhóm "3 nhóm tổ hợp" được thêm để xử lý phát hiện ở Giai đoạn 1 — **8 tổ hợp chỉ có ở khảo sát**.
Nhờ đó mô hình vẫn hiểu được tổ hợp hiếm thay vì coi chúng hoàn toàn xa lạ.

---

## Bước 7.3 — Mã hoá nhãn

🔧 **Cách làm**
Đổi 39 tên ngành thành số 0–38 bằng **bảng cố định**, tạo nhãn khối 0–6, dựng ma trận
"ngành nào thuộc khối nào" (39×7) cho Giai đoạn 8.

📊 **Kết quả** Mỗi ngành thuộc đúng 1 khối ✅

📈 **Hình minh hoạ** — không có

💡 **Rút ra**
Dùng **bảng cố định** thay vì để máy tự đánh số — đảm bảo số thứ tự không đổi giữa các lần chạy,
rất quan trọng khi đưa mô hình lên web.

---

## Bước 7.4 — Kiểm tra rò rỉ đáp án

🔧 **Cách làm** Ba tầng kiểm tra:
1. Không cột nào có tên chứa "khoi" hoặc "nganh"
2. Không đặc trưng nào mà **mọi giá trị đều chỉ ứng với đúng 1 khối**
3. Chẩn đoán: đặc trưng đơn lẻ nào dự đoán khối tốt nhất

📊 **Kết quả**

```
✔ Không cột nào mang thông tin khối ngành
✔ Không đặc trưng nào xác định hoàn toàn khối ngành
✔ Đặc trưng mạnh nhất chỉ đoán đúng khối 32,9%
  (đoán theo ngành phổ biến nhất đã được 27,4%)
✔ Số dòng trùng giữa hai tập: 0
✔ Nhãn hợp lệ: đủ 39 ngành, 7 khối ở cả hai tập
```

📈 **Hình minh hoạ** — `hinh_7_2_chat_luong_dac_trung.png`
Panel a xếp hạng sức dự đoán từng đặc trưng, có vạch mốc "đoán bừa" và vạch 100% "nếu bị rò rỉ".

💡 **Rút ra — đây là bước sửa lỗi phương pháp quan trọng nhất của cả pipeline**

> **Khối ngành suy trực tiếp ra từ ngành** (biết ngành là biết khối).
> Nếu đưa 7 cột khối ngành vào đặc trưng thì tương đương **mách trước 1/7 đáp án** —
> thu hẹp bài toán từ 39 lựa chọn xuống còn 2–14 lựa chọn.
>
> **Cách sửa:** hai tầng dùng **chung bộ đặc trưng gốc**; cấu trúc phân cấp chỉ áp dụng lúc **dự đoán**:
>
> $$P(\text{ngành}) \propto P_{\text{Tầng 2}}(\text{ngành}) \times P_{\text{Tầng 1}}(\text{khối})^{\beta}$$
>
> ⇒ **Rò rỉ = 0** và **lúc học khớp hoàn toàn với lúc chạy thật**.

Con số **32,9% so với mốc 27,4%** chứng minh không đặc trưng nào "biết" đáp án.

---

## ✅ Đánh giá Giai đoạn 7

| Tiêu chí | Đánh giá |
|---|---|
| Rò rỉ đáp án | ✅ **0** |
| Chuẩn hoá không rò rỉ | ✅ Thống kê chỉ từ tập học |
| Lúc học khớp lúc chạy | ✅ Hai tầng dùng chung đặc trưng |
| Xử lý ô trống | ✅ Giữ trống |
| Thứ tự cột hai tập | ✅ Kiểm tra bằng `assert` |

**Hạn chế:** 2 cột điểm rỗng hoàn toàn vẫn giữ lại · điểm cao nhất/thấp nhất chỉ tính trên 3 môn
nên ý nghĩa hạn chế.

> **Kết luận: ĐẠT.**

---

<div align="center">

# 8️⃣ GIAI ĐOẠN 8 — Huấn luyện và chấm điểm mô hình

</div>

> **Một câu:** Huấn luyện 2 mô hình XGBoost, chọn tham số bằng kiểm tra chéo, rồi mở tập chấm điểm
> đúng **một lần** để công bố kết quả.

## Kiến trúc hệ thống

```
   Học sinh nhập: 10 câu sở thích + điểm thi + tổ hợp + giới tính + mục tiêu
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
    ┌────────────────┐               ┌──────────────────┐
    │  TẦNG 1        │               │  TẦNG 2          │
    │  7 khối ngành  │               │  39 ngành        │
    └───────┬────────┘               └────────┬─────────┘
            │ P₁ = xác suất khối              │ P₂ = xác suất ngành
            └──────────────┬──────────────────┘
                           ▼
          P(ngành) = P₂(ngành) × P₁(khối chứa ngành)^0,6
                           ▼
                  Sắp xếp → Top-3 gợi ý
```

## Bước 8.1 — Dựng khung kiểm tra chéo

🔧 **Cách làm**
Hàm dựng dữ liệu mỗi fold: phần KIỂM TRA **chỉ gồm dòng thật**; dòng tổng hợp **chỉ vào phần HỌC**
và là bộ sinh riêng cho fold đó.

📊 **Kết quả**

```
Tập học   : 14.370 dòng  (574 thật + 13.796 tổng hợp), 43 đặc trưng
Tập chấm  : 102 dòng thật
Kiểm tra chéo : 15 fold  |  tìm tham số trên 5 fold
```

📈 **Hình minh hoạ** — đã minh hoạ ở `hinh_2_5` (Giai đoạn 2)

💡 **Rút ra**
Khung này đảm bảo **mọi chỉ số báo cáo đều đo trên dòng thật**, và dòng tổng hợp không bao giờ
"biết" về dòng dùng để kiểm tra.

---

## Bước 8.2 — Dựng mốc so sánh

🔧 **Cách làm** Tính hai mốc trên cùng 15 fold: đoán theo ngành phổ biến nhất, và đoán bừa.

📊 **Kết quả** — *Bảng 8.1*

| Cách đoán | Top-1 | Top-3 | Top-5 |
|---|---:|---:|---:|
| Khối ngành — phổ biến nhất | 25,4% | — | — |
| Khối ngành — đoán bừa | 14,3% | — | — |
| Ngành — phổ biến nhất | 7,0% | 17,4% | 25,8% |
| Ngành — đoán bừa | 2,6% | 7,7% | 12,8% |

📈 **Hình minh hoạ** — dùng làm mốc trong `hinh_8_5_ket_qua_test.png`

💡 **Rút ra**

> **Không có mốc so sánh thì con số "Top-3 = 39%" là vô nghĩa.**
> Mốc cho biết mô hình thực sự học được gì so với việc đoán bừa.

---

## Bước 8.3 — Tìm tham số tốt nhất

🔧 **Cách làm**
Bốc ngẫu nhiên **14 cấu hình** mỗi tầng, chấm điểm bằng kiểm tra chéo trên dòng thật,
có cơ chế dừng sớm để tự xác định số cây.

📊 **Kết quả**

```
Tầng 1 — điểm tốt nhất: 0,4654
Tầng 2 — điểm tốt nhất: 0,1345
Thời gian: 569 giây
```

*Bảng 8.2: Tham số được chọn*

| Tham số | Tầng 1 | Tầng 2 |
|---|---:|---:|
| Độ sâu cây | 6 | 4 |
| Tốc độ học | 0,08 | 0,03 |
| Tỷ lệ lấy mẫu | 0,80 | 0,70 |
| Tỷ lệ lấy cột | 1,00 | 0,60 |
| Số mẫu tối thiểu | 6 | 10 |
| Điều chuẩn L1 / L2 | 0,10 / 3,0 | 0,50 / 10,0 |

📈 **Hình minh hoạ** — `hinh_8_1_tim_sieu_tham_so.png`
14 cấu hình sắp theo điểm tăng dần, cấu hình được chọn **tô màu khác**.

💡 **Rút ra**
Tham số được **chọn bằng dữ liệu kiểm tra thật**, không gõ tay. Số cây cũng do máy tự quyết định
thay vì ấn định cứng.

---

## Bước 8.4 — So sánh các kiến trúc

🔧 **Cách làm**
Chạy kiểm tra chéo đầy đủ 15 fold, lưu lại kết quả để so nhiều kiến trúc mà không phải train lại.
Dò hệ số β từ 0 đến 2.

📊 **Kết quả**

```
β tối ưu = 0,6      (β = 0 nghĩa là bỏ Tầng 1)
```

*Bảng 8.3: Kết quả kiểm tra chéo (trung bình 15 fold, chỉ đo trên dòng thật)*

| Phương án | Top-1 | Top-3 | Top-5 | macro-F1 |
|---|---:|---:|---:|---:|
| Đoán ngành phổ biến nhất | 7,0% | 17,4% | 25,8% | 0,003 |
| Mô hình phẳng 39 lớp | 16,9% | 36,1% | 47,6% | 0,125 |
| **2 tầng (β = 0,6)** ✅ | **18,1%** | **36,9%** | **49,5%** | **0,137** |
| 2 tầng — chế độ tư vấn | 34,4% | 68,9% | 85,0% | 0,266 |

**Tầng 1 riêng:** Top-1 = 53,0% · Top-2 = 73,0% · Top-3 = 85,6%

📈 **Hình minh hoạ** — `hinh_8_2_so_sanh_kien_truc.png`
So top-k giữa các kiến trúc · đường dò β · độ ổn định qua 15 fold.

💡 **Rút ra**
β = 0,6 nghĩa là Tầng 1 đóng vai trò **điều chỉnh có trọng số**, không cắt cứng.
Trên kiểm tra chéo, kiến trúc 2 tầng thắng mô hình phẳng ở **cả 5 chỉ số**.

---

## Bước 8.5 — Kiểm tra học thuộc

🔧 **Cách làm** So độ chính xác trên dòng thật ở phần HỌC và phần KIỂM TRA của cùng fold.

📊 **Kết quả**

```
Trên phần HỌC (dòng thật)     : 94,6%
Trên phần KIỂM TRA (dòng thật): 16,9%
Khoảng cách                   : +77,7%
```

📈 **Hình minh hoạ** — không có

💡 **Rút ra**

> **Đây là dấu hiệu học thuộc, và tôi nêu thẳng ra.**
>
> Ví như học sinh làm lại đúng đề đã ôn thì gần đúng hết (94,6%), nhưng gặp đề mới thì chỉ 16,9%.
>
> **Nguyên nhân:** chỉ có ~460 dòng thật mang trọng số 24,03 — mô hình giảm sai số nhiều nhất
> bằng cách **học thuộc chúng**.
>
> ✅ **Nhưng chỉ số báo cáo vẫn trung thực**, vì luôn lấy trên phần kiểm tra / tập chấm điểm.

---

## Bước 8.6 — Thử nghiệm 1: Dữ liệu tổng hợp có ích không?

🔧 **Cách làm** Huấn luyện y hệt nhưng **bỏ hoàn toàn** 13.796 dòng tổng hợp.

📊 **Kết quả** — *Bảng 8.4*

| Chỉ số | Chỉ dòng thật | + tổng hợp | Thay đổi |
|---|---:|---:|---:|
| Khối ngành Top-1 | 51,4% | 52,4% | **+2,0%** |
| Ngành Top-1 | 17,4% | 18,6% | **+7,0%** |
| Ngành Top-3 | 35,7% | 35,5% | −0,5% |
| Ngành Top-5 | 48,1% | 49,1% | **+2,2%** |
| **Ngành macro-F1** | 0,122 | 0,144 | **+17,7%** |

📈 **Hình minh hoạ** — `hinh_8_3_ablation.png`

💡 **Rút ra**
Cải thiện rõ nhất ở **macro-F1 (+17,7%)** — nghĩa là dữ liệu tổng hợp giúp nhiều nhất cho các
**ngành hiếm**, đúng mục đích thiết kế.

> Giai đoạn 6 chứng minh dữ liệu tổng hợp **giống thật**; bước này chứng minh nó **có ích**.
> Hai chuyện khác nhau và cả hai đều cần chứng minh.

---

## Bước 8.7 — Thử nghiệm 2: Nhóm đặc trưng nào đóng góp?

> ### ⚠️ Đọc kỹ trước khi xem bảng: đây là THÍ NGHIỆM, không phải chế độ của sản phẩm
>
> Các dòng như *"KHÔNG có sở thích"*, *"Chỉ điểm thi"* là những mô hình tôi **cố tình huấn luyện
> trong phòng lab rồi vứt đi**, chỉ nhằm đo xem mỗi nhóm đặc trưng đáng giá bao nhiêu.
> **Không có dòng nào trong số đó được đưa lên web.**
>
> Ứng dụng thật **luôn luôn** chạy dòng cuối bảng — **Tất cả · 43 đặc trưng**, tức là
> **10 câu sở thích là BẮT BUỘC**, học sinh không thể bỏ qua.
>
> Đừng nhầm thí nghiệm này với **2 chế độ** của hệ thống. Hai chuyện nằm trên hai trục khác nhau:
>
> | | Cái gì thay đổi | Có trên web không? |
> |---|---|:---:|
> | **2 chế độ** (Khám phá / Tư vấn) | Học sinh **có chọn khối ngành hay không** | ✅ Có — chính là lý do chia 2 tầng |
> | **Thí nghiệm 8.7** | Mô hình **được cho xem nhóm đặc trưng nào** | ❌ Không — chỉ chạy để đo |
>
> **Vậy thí nghiệm này để làm gì?** Để trả lời câu hỏi mà hội đồng chắc chắn sẽ hỏi:
> *"Bắt học sinh trả lời 10 câu hỏi — có bõ công không, hay chỉ cần điểm thi là đủ?"*

🔧 **Cách làm** Huấn luyện lại Tầng 2 với từng nhóm đặc trưng riêng, trên cùng bộ fold.

📊 **Kết quả** — *Bảng 8.5*

| Nhóm đặc trưng | Có thật? | Số ĐT | Top-1 | Top-3 | Top-5 | macro-F1 |
|---|:---:|:---:|---:|---:|---:|---:|
| Chỉ 10 câu sở thích | thí nghiệm | 10 | 9,8% | **26,8%** | 39,9% | 0,084 |
| Chỉ điểm thi | thí nghiệm | 13 | 12,7% | 24,2% | 33,4% | 0,075 |
| Chỉ tổ hợp thi | thí nghiệm | 18 | 11,2% | 26,5% | 35,0% | 0,035 |
| Sở thích + điểm thi | thí nghiệm | 23 | 15,2% | 33,4% | 44,3% | 0,113 |
| **Bỏ 10 câu sở thích** | thí nghiệm | 33 | 14,3% | 25,6% | 36,1% | 0,079 |
| **TẤT CẢ 43** | ✅ **chạy thật** | **43** | **17,8%** | **36,1%** | **47,7%** | **0,134** |

<div align="center">

### 🌟 ĐÓNG GÓP RIÊNG CỦA 10 CÂU HỎI SỞ THÍCH

| Chỉ số | Không có → Có | Mức tăng |
|---|---|---|
| Top-1 | 14,3% → 17,8% | **+3,5 điểm** |
| **Top-3** | 25,6% → **36,1%** | **+10,4 điểm** |
| Top-5 | 36,1% → 47,7% | **+11,7 điểm** |
| macro-F1 | 0,079 → 0,134 | **+71%** |

</div>

📈 **Hình minh hoạ** — `hinh_8_4_dong_gop_dac_trung.png`

💡 **Rút ra — đây là bảng trả lời câu hỏi cốt lõi của đề tài**

> **Bộ 10 câu hỏi sở thích được chứng minh có giá trị thật.**
> Riêng 10 câu đứng một mình (Top-3 = 26,8%) đã **ngang ngửa** cả 13 đặc trưng điểm thi (24,2%).
>
> 👉 **Kết luận cho phần triển khai:** con số **+10,4 điểm** chính là **căn cứ để giữ bộ khảo sát
> là bắt buộc** trên ứng dụng. Bỏ 10 câu này đi để "cho nhanh" sẽ khiến Top-3 tụt từ 36,1%
> xuống 25,6% — mất gần **một phần ba** chất lượng gợi ý.
>
> ⚠️ **Lưu ý về phương pháp:** biểu đồ "độ quan trọng đặc trưng" của XGBoost **gây hiểu nhầm** —
> nó xếp các câu sở thích ở cuối bảng, nhưng thử nghiệm trực tiếp cho kết quả ngược lại.
> **Thử nghiệm bỏ đi mới là phép đo đúng.**

---

## Bước 8.8 — Mô hình cuối và chấm điểm

🔧 **Cách làm**
Huấn luyện lại trên **toàn bộ** dữ liệu với tham số tốt nhất, rồi mở tập chấm điểm —
**lần đầu và duy nhất**.

📊 **Kết quả**

<div align="center">

### 📝 KẾT QUẢ TRÊN 102 SINH VIÊN THẬT

</div>

**Tầng 1 — Khối ngành (7 lớp)**

| Chỉ số | Giá trị | Mốc so sánh |
|---|---:|---|
| Top-1 | **54,9%** | phổ biến nhất 25,4% · đoán bừa 14,3% |
| Top-2 | 76,5% | |
| Top-3 | **86,3%** | |
| macro-F1 | 0,456 | |

**Tầng 2 — Chế độ tự động (39 ngành)** ⭐ *đây là năng lực thật của hệ thống*

| Chỉ số | Giá trị | Gấp mấy lần đoán bừa |
|---|---:|---:|
| Top-1 | **17,6%** | 6,9× |
| **Top-3** | **39,2%** | **5,1×** |
| Top-5 | **52,9%** | 4,1× |
| macro-F1 | 0,145 | |

*Đối chứng — mô hình phẳng:* Top-1 = 19,6% · Top-3 = 38,2% · Top-5 = 55,9%

*Chế độ tư vấn (người dùng tự chọn khối):* Top-3 = 69,6% ⚠️ **chỉ số có điều kiện**

**Bảng 8.6 — Chi tiết Tầng 1**

| Khối ngành | Precision | Recall | F1 | Số mẫu |
|---|---:|---:|---:|---:|
| Kinh doanh & Quản lý | 0,704 | 0,704 | **0,704** | 27 |
| Du lịch, Khách sạn & Ẩm thực | 0,667 | 0,545 | 0,600 | 11 |
| Thực phẩm, Sinh học & Môi trường | 0,500 | 0,706 | 0,585 | 17 |
| Kỹ thuật & Công nghệ | 0,485 | 0,696 | 0,571 | 23 |
| Ngoại ngữ | 0,667 | 0,333 | 0,444 | 6 |
| Luật | 0,500 | 0,200 | 0,286 | 5 |
| **CNTT & Máy tính** | 0,000 | 0,000 | **0,000** | 13 |

**Điểm yếu (notebook tự phân tích):**

| Khối yếu | F1 | Thường bị nhầm sang |
|---|---:|---|
| CNTT & Máy tính | 0,00 | Kỹ thuật & Công nghệ (11 lần), Kinh doanh (2) |
| Luật | 0,29 | Kinh doanh (3), Du lịch (1) |
| Ngoại ngữ | 0,44 | Kinh doanh (1), Du lịch (1) |

📈 **Hình minh hoạ** — `hinh_8_5_ket_qua_test.png` (6 panel)
Ma trận nhầm lẫn · đường Top-K · so với các mốc · F1 từng khối · hai chế độ · đặc trưng quan trọng.

💡 **Rút ra**

> ⚠️ **Chế độ tư vấn giả định người dùng đã tự chọn đúng 1 trong 7 khối** — tức đã giải xong phần
> khó nhất. **Không được dùng con số 69,6% làm độ chính xác hệ thống.**
>
> **Nguyên nhân các khối yếu:** ít mẫu và ranh giới sở thích chồng lấn với khối lớn hơn bên cạnh,
> nên mô hình dồn dự đoán về khối đông hơn.

---

## Bước 8.9 — Bộ chỉ số đầy đủ: Accuracy · F1 · AUC-ROC

🔧 **Cách làm**
Tính thêm AUC-ROC theo cách "một chọi tất cả" cho cả 4 phương án, và đo xem ngành đúng nằm ở
vị trí thứ mấy trong danh sách xếp hạng.

📊 **Kết quả** — *Bảng 8.7*

| Mô hình | Accuracy | Top-3 | macro-F1 | **AUC** |
|---|---:|---:|---:|---:|
| Tầng 1 — Khối ngành | 54,9% | 86,3% | 0,456 | **0,832** |
| **Tầng 2 — Tự động** | 17,6% | 39,2% | 0,145 | **0,844** |
| Mô hình phẳng | 19,6% | 38,2% | 0,148 | 0,821 |
| Tầng 2 — Tư vấn | 35,3% | 69,6% | 0,286 | **0,950** |

**AUC theo từng khối:** Thực phẩm 0,886 · Ngoại ngữ 0,878 · Kỹ thuật 0,850 · Du lịch 0,844 ·
Kinh doanh 0,839 · CNTT 0,781 · **Luật 0,748** *(thấp nhất)*

📈 **Hình minh hoạ**
- `hinh_8_6_duong_roc_va_auc.png` — đường ROC 7 khối · AUC từng khối · so sánh 4 phương án
- `hinh_8_7_tong_hop_chi_so.png` — ba nhóm chỉ số · **biểu đồ thứ hạng** · F1 của cả 39 ngành

💡 **Rút ra — ba điều AUC làm lộ ra mà Accuracy che mất**

> **① Mô hình xếp hạng tốt hơn nhiều so với vẻ ngoài.**
> AUC = 0,844 trong khi Top-1 chỉ 17,6%. Lý do: **ngành đúng nằm ở vị trí trung vị 5/39**
> trong danh sách xếp hạng. Với hệ *gợi ý* thì đây mới là chỉ số phản ánh đúng năng lực.
>
> **② Kiến trúc 2 tầng thực sự có ích — chỉ thấy được qua AUC.**
> Xét Top-1 thì 2 tầng (17,6%) còn *thua* mô hình phẳng (19,6%), dễ kết luận nhầm là kiến trúc
> phân cấp vô dụng. Nhưng AUC cho thấy ngược lại: **0,844 vs 0,821**.
>
> **③ Nhưng 25/39 ngành có F1 = 0** — mô hình chưa bao giờ xếp chúng lên vị trí số 1.
> **AUC cao không xoá được sự thật này**, phải nêu song song.

⚠️ AUC của khối Luật (5 mẫu) và Ngoại ngữ (6 mẫu) **rất nhiễu** — không nên diễn giải sâu.

---

## ✅ Đánh giá Giai đoạn 8

| Tiêu chí | Đánh giá |
|---|---|
| Có mốc so sánh | ✅ Đoán bừa + đoán phổ biến + mô hình phẳng |
| Kiểm tra chéo đúng cách | ✅ 15 fold, phần kiểm tra chỉ dòng thật |
| Tìm tham số | ✅ Chọn bằng dữ liệu kiểm tra thật |
| Dừng sớm | ✅ Trên dữ liệu kiểm tra, không phải tập chấm điểm |
| Bộ chỉ số đầy đủ | ✅ Accuracy + macro-F1 + balanced-acc + AUC-ROC |
| Kiểm tra học thuộc | ✅ Có in và giải thích |
| Thử nghiệm | ✅ Hai loại: dữ liệu tổng hợp và nhóm đặc trưng |
| Báo cáo trung thực | ✅ Tách bạch "tự động" và "tư vấn có điều kiện" |
| Mở tập chấm điểm 1 lần | ✅ Ở cuối notebook |

**Hạn chế:** Top-1 chế độ tự động thấp (17,6%) · 25/39 ngành có F1 = 0 ·
khoảng cách học/kiểm tra 77,7% · AUC của khối ít mẫu rất nhiễu.

> **Kết luận: ĐẠT về phương pháp.**
> Kết quả tuyệt đối còn khiêm tốn, nhưng đó là **giới hạn của dữ liệu** chứ không phải lỗi quy trình —
> và pipeline đã đo đạc, giải thích trung thực điều đó.

---

<div align="center">

# 🏁 TỔNG KẾT

</div>

## Bảng tổng hợp 8 giai đoạn

| | Giai đoạn | Vào | Ra | Bước | Kiểm tra | Hình | |
|:---:|---|---|---|:---:|:---:|:---:|:---:|
| 1️⃣ | Làm sạch THPT | 18.024 hồ sơ | 15.888 *(88,1%)* | 7 | 4 | 6 | ✅ |
| 2️⃣ | Tách dữ liệu | 766 phiếu | 574 + 102 | 5 | 6 | 5 | ✅ |
| 3️⃣ | Học phân phối | 574 phiếu | 39 phân phối + 15 bộ | 5 | 5 | 3 | ✅ |
| 4️⃣ | GA sinh dữ liệu | 15.888 + phân phối | 13.796 dòng | 6 | 4 | 4 | ✅ |
| 5️⃣ | Gộp + trọng số | 574 + 13.796 | 14.370 dòng | 4 | 6 | 3 | ✅ |
| 6️⃣ | Kiểm định | dữ liệu tổng hợp | báo cáo 4 phép | 5 | — | 2 | ✅ |
| 7️⃣ | Tạo đặc trưng | 14.370 dòng | 43 đặc trưng | 4 | 5 | 2 | ✅ |
| 8️⃣ | Huấn luyện | X_train / X_test | 2 mô hình | 9 | — | 7 | ✅ |
| | **TỔNG** | | | **45** | **30** | **32** | |

## Kết quả chính

<div align="center">

| Chỉ số | Giá trị | Mốc so sánh |
|---|---|---|
| 🎯 Khối ngành Top-1 | **54,9%** | đoán bừa 14,3% |
| 🎯 Khối ngành Top-3 | **86,3%** | |
| ⭐ **Ngành Top-3 (tự động)** | **39,2%** | đoán bừa 7,7% · **gấp 5,1 lần** |
| ⭐ Ngành Top-5 (tự động) | **52,9%** | |
| 📈 AUC-ROC | **0,844** | đoán bừa 0,50 |
| 🌟 Đóng góp của 10 câu sở thích | **+10,4 điểm Top-3** | |
| ✅ Kiểm định dữ liệu tổng hợp | **AUC 0,620** | ngưỡng đạt < 0,65 |

</div>

## 💪 Năm điểm mạnh

**1. Chống rò rỉ dữ liệu triệt để**
Tập chấm điểm tách đầu tiên và chỉ mở 1 lần · dữ liệu tổng hợp chỉ vào phần học ·
sinh riêng 15 bộ theo fold · đặc trưng không chứa gì suy từ đáp án.

**2. Mọi khẳng định đều được đo, không nói suông**
Hai kiểu đột biến · hai cách sinh dữ liệu · sáu nhóm đặc trưng · có/không dữ liệu tổng hợp —
tất cả đều có **bảng đối chứng in ra trong notebook**.

**3. 30 lệnh kiểm tra tự động** dừng ngay khi phát hiện sai sót.

**4. Bộ chỉ số đầy đủ** — không chỉ Accuracy mà cả macro-F1, balanced accuracy, AUC-ROC.

**5. Báo cáo trung thực** — tách bạch "tự động" và "tư vấn có điều kiện"; nêu rõ 25/39 ngành
có F1 = 0 thay vì che bằng AUC cao.

## ⚠️ Mười hạn chế xếp theo mức nghiêm trọng

| # | Hạn chế | Mức | Xử lý |
|:---:|---|:---:|---|
| 1 | **Mẫu khảo sát là sinh viên đang học, không phải học sinh THPT đang chọn ngành.** Câu trả lời có thể bị ảnh hưởng bởi trải nghiệm học tập chứ không phản ánh sở thích lúc chọn ngành | 🔴 | Không khắc phục được — **phải thảo luận trong phần Hạn chế** |
| 2 | Chỉ 574 phiếu thật cho 39 ngành (~15 phiếu/ngành) | 🔴 | Giới hạn trần của bài toán; trình bày dạng gợi ý Top-3/Top-5 |
| 3 | 25/39 ngành có F1 = 0 | 🔴 | Nêu rõ; ưu tiên cải thiện Tầng 1 |
| 4 | 5/39 ngành không có hồ sơ điểm thật | 🟠 | Mượn điểm cùng khối; nêu độ tin cậy thấp |
| 5 | Khoảng cách học/kiểm tra 77,7% | 🟠 | Hệ quả của trọng số 24,03 |
| 6 | Ngành hiếm chỉ 1 phiếu chấm điểm | 🟠 | Tránh diễn giải sâu chỉ số từng ngành |
| 7 | Loại 11,7% phiếu khảo sát | 🟠 | Đánh đổi có cân nhắc |
| 8 | AUC phân biệt 0,620 chưa lý tưởng | 🟡 | Vẫn dưới ngưỡng 0,65 |
| 9 | Lệch tổ hợp giữa hai nguồn | 🟡 | Đã thêm "nhóm tổ hợp" |
| 10 | Nhiều tham số chọn theo kinh nghiệm | 🟡 | Chưa tối ưu bằng thực nghiệm |

## 📌 Việc còn lại

- [ ] `09_xai_shap.ipynb` — giải thích dự đoán bằng TreeSHAP
- [ ] Nối mô hình vào `backend/app/services/predict_service.py`
      *(hiện trả điểm giả cứng, và bảng mã ngành **lệch** với `label_encoder_mapping.json` —
      ví dụ Khoa học dữ liệu ghi `7480108` trong khi đúng là `7460108`)*

---

<div align="center">

## 📚 Bảng tra thuật ngữ

</div>

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| **Top-3** | Hiển thị 3 gợi ý, tính là đúng nếu ngành thật nằm trong 3 gợi ý đó |
| **Accuracy** | Tỷ lệ đoán đúng ngay lần đầu (= Top-1) |
| **macro-F1** | Điểm trung bình qua các ngành, **không thiên vị ngành đông** |
| **Balanced accuracy** | Độ chính xác đã cân bằng giữa các lớp |
| **AUC-ROC** | Đo năng lực **xếp hạng** — không phụ thuộc ngưỡng. 0,5 = đoán bừa, 1,0 = hoàn hảo |
| **Cross-Validation** | Chia dữ liệu nhiều phần, luân phiên lấy một phần ra kiểm tra |
| **Fold** | Một lần chia trong kiểm tra chéo |
| **Overfitting / học thuộc** | Làm tốt trên dữ liệu đã học nhưng kém trên dữ liệu mới |
| **Rò rỉ dữ liệu** | Mô hình vô tình "nhìn thấy" đáp án hoặc dữ liệu kiểm tra |
| **Ablation** | Bỏ bớt một thành phần để xem nó đóng góp bao nhiêu |
| **Ma trận hiệp phương sai** | Bảng ghi mức độ liên quan giữa từng cặp câu hỏi |
| **Bayesian Shrinkage** | Kéo ước lượng của nhóm ít mẫu về phía đặc trưng chung |
| **Straight-lining** | Điền cùng một mức cho mọi câu hỏi — dấu hiệu điền cho có |
| **Stratified** | Chia dữ liệu giữ đúng tỷ lệ của từng lớp |
