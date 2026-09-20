# Quy Chuẩn Dự Án EduTalk HUIT (Workspace Rules)

## 1. Quy Chuẩn Font Chữ & Typography (BẮT BUỘC)
- **Duy Nhất 1 Font Chữ Toàn Bộ Dự Án:** Toàn bộ website từ giao diện người dùng thí sinh (`/(main)/*`) cho đến bảng điều khiển quản trị viên (`/dashboard/*`) **CHỈ ĐƯỢC PHÉP SỬ DỤNG DUY NHẤT 1 FONT CHỮ**: `Plus Jakarta Sans` (được cấu hình qua biến `--font-sans`).
- **Nghiêm Cấm:**
  - Tuyệt đối không import thêm font chữ thứ hai (như Inter, Roboto, Arial, Times New Roman, v.v.).
  - Không sử dụng font monospace hoặc font serif làm vỡ tính thẩm mỹ đồng bộ.
  - Mọi phần tử: thẻ văn bản, tiêu đề, nút bấm (`button`), ô nhập liệu (`input`, `textarea`, `select`), bảng biểu (`table`, `th`, `td`), khối code/pre, nhãn badge, modal đều phải kế thừa và sử dụng thống nhất font `var(--font-sans)`.
- **Hỗ Trợ Tiếng Việt:** Font `Plus Jakarta Sans` phải luôn nạp subset `latin` và `vietnamese` với `display: swap` để hiển thị sắc nét, chuẩn dấu tiếng Việt không bị giật hay lỗi font.

## 2. Quy Chuẩn Giao Diện, Icon & Thẩm Mỹ (UI/UX) - Nghiêm Cấm AI Slop
- **Nghiêm Cấm Tuyệt Đối Emoji Ký Tự (Raw Unicode Emojis - Đặc biệt là `✨`):**
  - Tuyệt đối cấm sử dụng các emoji ký tự Unicode như `✨` (sparkles / lấp lánh AI slop), `🔒`, `🤖`, `🚀`, `💡`, `🔥`, `🎉` trong văn bản, tiêu đề, nút bấm hay tin nhắn của bot.
  - Không bao giờ thêm emoji `✨` vào sau tên "Trợ lý EduTalk AI" hay bất kỳ lời chào, thông báo nào. Mọi thành phần giao diện phải giữ phong cách tối giản, học thuật và trang trọng của cổng thông tin tuyển sinh Đại học chính quy.
- **Nghiêm Cấm Tuyệt Đối Icon & Asset Do AI Tự Sinh (No AI-Generated Slop):**
  - Không tự viết mã SVG icon, không dùng icon 3D bóng bẩy kiểu AI rẻ tiền, không dùng hình minh họa hoạt hình AI sến súa.
  - Sử dụng thống nhất 1 thư viện icon chính thức: **`lucide-react`** (hoặc SVG chuẩn thương hiệu chính hãng đối với logo Google/Facebook).
- **Hạn Chế Dùng & Giữ Thiết Kế Tối Giản (Minimal & Purposeful):**
  - Chỉ dùng icon khi thực sự có giá trị hỗ trợ thao tác hoặc nhận diện rõ rệt. Không cắm icon bừa bãi vào mọi tiêu đề hay dòng chữ.
  - Thiết kế phẳng, tinh tế, hiện đại, chuẩn nhận diện thương hiệu Trường Đại học Công Thương TP.HCM (HUIT).
- **Hệ Thống Màu Sắc & Dark/Light Mode:**
  - Dark Mode & Light Mode phải đồng bộ qua hệ thống biến CSS Tokens (`--dash-bg`, `--dash-surface`, `--dash-text`, `--dash-accent`,...).
  - Không hardcode các class như `bg-white`, `text-slate-900` trong các trang dashboard để tránh lỗi mất màu / tương phản khi chuyển chế độ tối.
- **Dữ Liệu Thật:** Dữ liệu hiển thị phải là số liệu thật từ backend / pipeline ML và dữ liệu tuyển sinh HUIT, không dùng số liệu giả lập tùy tiện.
