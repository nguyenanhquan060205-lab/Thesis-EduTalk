"""Mọi endpoint đòi token phải CHẶN được người lạ, và chặn bằng lỗi đúng nghĩa.

Vì sao cần: xác thực đang được chép tay ở 69 endpoint, mỗi bản một kiểu. Bỏ sót một
chỗ thì endpoint đó mở toang mà Swagger vẫn hiện ổ khoá. Test này duyệt bảng route
thật nên endpoint mới thêm cũng tự bị kiểm, không phải nhớ bổ sung test.

500 bị coi là trượt: lỗi xác thực mà trả 500 nghĩa là code vỡ ở đâu đó chứ không phải
từ chối có chủ đích, và client không phân biệt được "token hỏng" với "server sập".
"""

import re

import pytest
from app.main import app as fastapi_app
from conftest import iter_operations, needs_token

# Dựng danh sách lúc import để `parametrize` thấy — fixture chạy sau bước thu thập test.
ROUTES = [(m, p) for m, p, op in iter_operations(fastapi_app) if needs_token(op)]
CHAN_DUOC = (401, 403, 422)


def fill_params(path: str) -> str:
    """`/users/{uid}` → `/users/khong-ton-tai`. Giá trị không quan trọng: phải trượt
    ở cửa xác thực trước khi tới tầng dữ liệu."""
    return re.sub(r"\{[^}]+\}", "khong-ton-tai", path)


def test_co_endpoint_de_kiem():
    """Chốt chặn cho chính test này: lọc sai thì danh sách rỗng và mọi test dưới đều
    'xanh' một cách vô nghĩa."""
    assert len(ROUTES) >= 60, f"Chỉ tìm thấy {len(ROUTES)} endpoint cần token — nghi lọc sai"


@pytest.mark.parametrize(("method", "path"), ROUTES, ids=[f"{m.upper()} {p}" for m, p in ROUTES])
def test_khong_token_thi_khong_vao_duoc(client, method, path):
    r = client.request(method.upper(), fill_params(path))
    assert r.status_code in CHAN_DUOC, (
        f"{method.upper()} {path} trả {r.status_code} khi KHÔNG có token "
        f"(chờ {CHAN_DUOC}) — body: {r.text[:200]}"
    )


@pytest.mark.parametrize(("method", "path"), ROUTES, ids=[f"{m.upper()} {p}" for m, p in ROUTES])
def test_token_rac_thi_khong_vao_duoc(client, method, path):
    r = client.request(
        method.upper(), fill_params(path), headers={"Authorization": "Bearer khong-phai-token"}
    )
    assert r.status_code in CHAN_DUOC, (
        f"{method.upper()} {path} trả {r.status_code} với token rác "
        f"(chờ {CHAN_DUOC}) — body: {r.text[:200]}"
    )


def test_route_cong_khai_van_mo(client):
    """Vài route không cần token — dọn dẹp mà lỡ tay khoá chúng lại thì web gãy."""
    for path in ("/", "/api/v1/predict/catalog", "/api/v1/majors/"):
        r = client.get(path)
        assert r.status_code == 200, f"{path} trả {r.status_code}, đáng lẽ mở công khai"
