"""Cấu hình chung cho pytest — dựng app sạch, KHÔNG chạm vào dịch vụ thật.

Hai chốt an toàn, đừng gỡ:

1. `MONGO_URI` bị đặt rỗng **trước** khi import `app`. `load_dotenv()` không ghi đè
   biến môi trường đã có sẵn, nên dù `.env` có chuỗi kết nối Atlas thật thì test cũng
   không nối vào đó. Thiếu chốt này, một test lỡ tay có thể ghi vào CSDL đang chạy.
2. `TestClient` cố ý **không** dùng trong `with`. Starlette chỉ chạy `lifespan` khi vào
   context manager, nên bỏ `with` nghĩa là: không kết nối Mongo, không dựng scheduler,
   không khởi động vòng lặp huấn luyện lại.

Chạy:

    conda activate Edutalk
    cd backend && pytest -q
"""

import os
import sys
from pathlib import Path

GOC = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

os.environ["MONGO_URI"] = ""  # chốt 1 — xem docstring
# Ép dùng mô hình trong gói `data/mo_hinh/huong1/`, bỏ qua phiên bản trên GridFS: test
# phải đo đúng mô hình đã cam kết trong khoá luận, không phụ thuộc lần huấn luyện lại.
os.environ["EDUTALK_PHIEN_BAN"] = "goc"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

METHODS = ("get", "post", "put", "patch", "delete")


@pytest.fixture(scope="session")
def app():
    from app.main import app as fastapi_app

    return fastapi_app


@pytest.fixture(scope="session")
def client(app):
    return TestClient(app)  # cố ý không `with` — xem chốt 2


def iter_operations(app):
    """Duyệt mọi (method, path, mô tả) mà FastAPI đang phục vụ."""
    for path, item in app.openapi()["paths"].items():
        for method, operation in item.items():
            if method in METHODS:
                yield method, path, operation


def needs_token(operation) -> bool:
    """Endpoint có bắt buộc header `Authorization` không."""
    return any(
        p.get("in") == "header"
        and p.get("name", "").lower() == "authorization"
        and p.get("required")
        for p in operation.get("parameters", [])
    )
