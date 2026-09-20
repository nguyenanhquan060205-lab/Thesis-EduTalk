"""Mốc neo đường dẫn — một chỗ duy nhất biết thư mục gốc nằm ở đâu.

VÌ SAO CẦN: trước đây 8 file tự tính đường dẫn bằng cách đếm thư mục cha
(`Path(__file__).resolve().parents[3]`). Cách đó buộc vị trí file phải đứng yên mãi
mãi — dời một module sang thư mục khác là mọi đường dẫn trong đó lệch đi một bậc,
mà trình biên dịch không hề báo gì: lỗi chỉ hiện ra lúc chạy, dưới dạng "không tìm
thấy gói mô hình" hoặc tệ hơn là đọc nhầm thư mục.

Gom về đây thì module nằm ở đâu cũng được, và đọc code là biết ngay đường dẫn trỏ
tới đâu thay vì phải ngồi đếm dấu `/`.

`app/core/` là chỗ neo vì nó là tầng hạ tầng, không thuộc miền nghiệp vụ nào nên
không có lý do gì để dời.
"""

from pathlib import Path

# app/core/paths.py → parents[0]=core · [1]=app · [2]=backend
BACKEND = Path(__file__).resolve().parents[2]

# Thư mục kho (Thesis-EduTalk/) — chứa research/, web/, mobile/ bên cạnh backend/
REPO = BACKEND.parent

# Dữ liệu đi theo ảnh Docker: `docker-compose.yml` khai `context: ./backend`, nên mọi
# thứ backend cần lúc chạy đều phải nằm dưới thư mục này.
DATA = BACKEND / "data"

MO_HINH = DATA / "mo_hinh"                 # gói mô hình XGBoost đã đóng gói
CO_CAU_TRUC = DATA / "co_cau_truc"         # bảng tuyển sinh, ánh xạ nhóm ngành
KHO_VECTOR = DATA / "kho_vector"           # artifact kho vector của RAG
KHO_TRI_THUC = DATA / "kho_tri_thuc"       # tài liệu .md nguồn cho RAG
KIEM_THU = DATA / "kiem_thu"               # bộ câu hỏi gán nhãn tay để đo truy hồi

FIREBASE_KEY = BACKEND / "serviceAccountKey.json"
