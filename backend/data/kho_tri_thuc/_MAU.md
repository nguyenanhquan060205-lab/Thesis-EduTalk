---
nam: 2026
nguon: Đề án tuyển sinh HUIT 2026
link: https://ts.huit.edu.vn/THAY-BANG-LINK-THAT
ngay_lay: 2026-09-10
nganh: null
---

# ĐÂY LÀ FILE MẪU — chép ra tên mới rồi điền nội dung thật

**Chép vào ĐÚNG THƯ MỤC LOẠI**, không để ở thư mục gốc — file nằm ngoài thư mục
loại sẽ bị bỏ qua khi nạp:

```
xet_tuyen/    phương thức và điều kiện xét tuyển
ho_so/        hồ sơ, thủ tục, thời gian nộp và nhập học
ho_tro/       học bổng, miễn giảm học phí, vay vốn
hoc_phi/      học phí toàn khoá — mỗi ngành một file
quy_che/      quy chế đào tạo, điều kiện tốt nghiệp
nghe_nghiep/  cơ hội việc làm — mỗi ngành một file
ctdt/         chương trình đào tạo — mỗi ngành một file
```

Không cần ghi `loai:` trong phần đầu file — hệ thống lấy theo tên thư mục, để khỏi
có chuyện thư mục ghi một đằng phần đầu ghi một nẻo.

Xoá hết phần dưới, dán nội dung thật vào. Giữ nguyên khối `---` ở đầu và sửa cho đúng.

## Cách viết nội dung

Mỗi ý một đoạn, viết thành **câu văn hoàn chỉnh**, đừng viết kiểu gạch đầu dòng cụt ngủn.

Bộ nhúng học từ văn bản tự nhiên, nên câu văn đầy đủ cho vector sát nghĩa hơn nhiều so
với chuỗi khô như `A00|A01|D01|20.5`.

**Viết thế này** — tự chứa đủ nghĩa, đọc một đoạn là hiểu:

> Thí sinh xét tuyển vào Trường Đại học Công Thương TP.HCM năm 2026 bằng kết quả thi tốt
> nghiệp THPT cần có tổng điểm ba môn trong tổ hợp đạt từ ngưỡng đảm bảo chất lượng đầu
> vào do trường công bố. Thí sinh phải tốt nghiệp THPT và không trong thời gian bị truy
> cứu trách nhiệm hình sự.

**Đừng viết thế này** — mất ngữ cảnh, tách khỏi tiêu đề là vô nghĩa:

> - Tốt nghiệp THPT
> - Đủ điểm sàn
> - Không bị truy cứu

Lý do: mỗi đoạn sẽ bị tách thành một chunk riêng và nhúng độc lập. Chunk *"Đủ điểm sàn"*
đứng một mình thì không ai — kể cả mô hình — biết nó nói về trường nào, năm nào.

## Lặp lại chủ ngữ ở mỗi đoạn

Đoạn nào cũng nên nhắc lại *"HUIT"*, *"năm 2026"*, hoặc tên ngành nếu đoạn đó nói về một
ngành cụ thể. Nghe thừa khi đọc cả file, nhưng lúc truy xuất thì chunk đứng một mình.

## Độ dài mỗi đoạn

Khoảng **80–300 từ**. Ngắn quá thì thiếu ngữ cảnh, dài quá thì một chunk ôm nhiều chủ đề
làm vector bị nhoè, truy xuất kém chính xác.

Giới hạn cứng của bộ nhúng là 8.192 token, nhưng đừng bao giờ chạm tới mức đó.
