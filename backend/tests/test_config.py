"""Cấu hình tập trung (`app/core/config.py`).

Test quan trọng nhất ở đây là chốt an toàn: `conftest.py` đặt `MONGO_URI=""` trước khi
import app, và `pydantic-settings` ưu tiên biến môi trường hơn file `.env`. Nếu thứ tự
đó đổi, test sẽ chạy trên **CSDL Atlas thật** — hỏng dữ liệu đang phục vụ mà không có
gì báo. Nên nó phải có test canh.
"""

from app.core import paths
from app.core.config import settings


def test_test_khong_bao_gio_noi_vao_csdl_that():
    """Biến môi trường phải thắng file .env. Xem docstring đầu file."""
    assert not settings.MONGO_URI, (
        "MONGO_URI bị đọc từ .env dù conftest đã đặt rỗng — test đang trỏ vào CSDL thật"
    )


def test_bao_thieu_bien_chi_tra_ve_ten():
    """Không bao giờ được lộ GIÁ TRỊ biến môi trường ra log hay thông báo lỗi."""
    thieu = settings.missing_required()
    assert "MONGO_URI" in thieu
    assert all(t.isupper() and " " not in t for t in thieu)


def test_cors_mac_dinh_cho_phat_trien():
    assert settings.cors_origins == ["*"]


def test_moc_neo_duong_dan_tro_dung_backend():
    """`core/paths.py` là mốc để mọi module khỏi phải đếm `parents[n]`."""
    assert paths.BACKEND.name == "backend"
    assert (paths.BACKEND / "app" / "main.py").exists()
    assert paths.DATA == paths.BACKEND / "data"
    assert (paths.MO_HINH / "huong1" / "mo_hinh.json").exists()
