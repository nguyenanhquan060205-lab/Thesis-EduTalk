"""RAG cho Trợ lý EduTalk — truy xuất ngữ nghĩa thuần, một đường duy nhất.

    ① THU THẬP    nguon_co_cau_truc.py  JSON tuyển sinh → viết thành văn xuôi
                  tai_lieu.py           đọc .md trong data/kho_tri_thuc/
    ② LÀM SẠCH    tai_lieu.py           tách metadata, khử trùng bằng băm SHA-256
    ③ CHUNKING    tai_lieu.py           theo đơn vị ngữ nghĩa, chồng lấn 25 từ
    ④ EMBEDDING   nhung.py              gemini-embedding-2 · 768 chiều
                                        chỗ DUY NHẤT trong dự án gọi API nhúng
    ⑤ LƯU TRỮ     kho.py                Chroma, dựng lại từ data/kho_vector/kho.json
    ⑥ TRUY XUẤT   tro_ly.py             top-k + ngưỡng lạc đề + ghép lịch sử
    ⑦ SINH        ../gemini_service.py  prompt chống ảo giác + bắt trích nguồn

Đánh giá: scripts/kiem_truy_hoi.py (tầng ⑥) · scripts/kiem_rag.py (tầng ⑦) ·
scripts/do_lo_hong.py (kho còn thiếu chủ đề nào).
"""

from app.services.rag.tro_ly import NguCanh, lay_ngu_canh

__all__ = ["NguCanh", "lay_ngu_canh"]
