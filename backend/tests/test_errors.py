"""Lưới xử lý lỗi tập trung (`app/core/errors.py`).

Hai tính chất cần giữ:

1. Lỗi ngoài dự liệu KHÔNG được đẩy nội dung exception ra cho client. Bản cũ ở
   `news.py` ném `detail=str(e)`, tức là lộ đường dẫn máy chủ và tên thư viện.
2. Thiếu gói mô hình / artifact kho vector phải ra 503 kèm đúng câu hướng dẫn của
   script, chứ không phải 500 trống trơn.

Route thử nghiệm gắn với `include_in_schema=False` nên không lọt vào ảnh chụp
hợp đồng API.
"""

from fastapi.testclient import TestClient

BI_MAT = "/duong/dan/noi-bo/khong-duoc-lo.json"


def test_loi_ngoai_du_lieu_khong_ro_ri_chi_tiet(app):
    @app.get("/_thu_loi_bat_ngo", include_in_schema=False)
    def _no_tung():
        raise RuntimeError(f"Lỗi nội bộ tại {BI_MAT}")

    # raise_server_exceptions=False để đọc được response thay vì nhận lại exception
    r = TestClient(app, raise_server_exceptions=False).get("/_thu_loi_bat_ngo")
    assert r.status_code == 500
    assert BI_MAT not in r.text, "Chi tiết lỗi nội bộ bị đẩy ra cho client"
    assert "thử lại sau" in r.json()["detail"].lower()


def test_thieu_tep_tra_503_kem_huong_dan(app):
    @app.get("/_thu_thieu_tep", include_in_schema=False)
    def _no_tung():
        raise FileNotFoundError("Chưa có gói mô hình. Chạy scripts/dong_goi_mo_hinh_huong1.py")

    r = TestClient(app, raise_server_exceptions=False).get("/_thu_thieu_tep")
    assert r.status_code == 503
    # Câu của script viết cho người vận hành đọc — phải giữ nguyên
    assert "dong_goi_mo_hinh_huong1.py" in r.json()["detail"]
