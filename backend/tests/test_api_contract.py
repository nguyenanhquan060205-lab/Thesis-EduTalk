"""Ảnh chụp hợp đồng API — test quan trọng nhất của đợt dọn cấu trúc.

Web gọi 39 đường, mobile gọi 55. Bên trong backend đổi thế nào cũng được, nhưng đổi
một đường dẫn, một method hay một tên tham số là **gãy client trong khi backend vẫn
xanh** — không có gì báo cho tới lúc người dùng bấm.

Test này chụp lại toàn bộ bảng route và so sau mỗi bước refactor. Ảnh chụp nằm ở
`tests/snapshot_api.json`, commit kèm code.

Khi CỐ Ý thêm hoặc bỏ endpoint thì cập nhật ảnh chụp rồi **đọc lại diff của file
json** trước khi commit:

    EDUTALK_CAP_NHAT_ANH_CHUP=1 pytest tests/test_api_contract.py
"""

import json
import os
from pathlib import Path

import pytest
from conftest import iter_operations

F_ANH_CHUP = Path(__file__).parent / "snapshot_api.json"


def build_snapshot(app) -> dict:
    """Bảng route rút gọn: đường dẫn · method · tham số · có body hay không.

    Cố ý KHÔNG chụp schema response: tách file hay đổi tên class Pydantic không đổi
    hợp đồng thật, chụp vào chỉ tạo báo động giả rồi người ta quen tay cập nhật bừa.
    """
    snapshot = {}
    for method, path, operation in iter_operations(app):
        params = sorted(
            f"{p.get('in')}:{p.get('name')}" + ("*" if p.get("required") else "")
            for p in operation.get("parameters", [])
        )
        snapshot[f"{method.upper()} {path}"] = {
            "params": params,
            "body": bool(operation.get("requestBody")),
        }
    return snapshot


def test_hop_dong_api_khong_doi(app):
    current = build_snapshot(app)

    if os.getenv("EDUTALK_CAP_NHAT_ANH_CHUP") == "1" or not F_ANH_CHUP.exists():
        F_ANH_CHUP.write_text(
            json.dumps(current, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        pytest.skip(f"Đã ghi ảnh chụp mới ({len(current)} endpoint) — xem diff rồi chạy lại")

    goc = json.loads(F_ANH_CHUP.read_text(encoding="utf-8"))
    mat = sorted(set(goc) - set(current))
    them = sorted(set(current) - set(goc))
    doi = {k: (goc[k], current[k]) for k in set(goc) & set(current) if goc[k] != current[k]}

    assert not mat, f"MẤT {len(mat)} endpoint client đang gọi:\n  " + "\n  ".join(mat)
    assert not doi, "ĐỔI tham số:\n  " + "\n  ".join(
        f"{k}\n    cũ : {a}\n    mới: {b}" for k, (a, b) in doi.items()
    )
    assert not them, (
        f"THÊM {len(them)} endpoint ngoài dự kiến (cố ý thì cập nhật ảnh chụp):\n  "
        + "\n  ".join(them)
    )


def test_moi_route_deu_co_prefix_v1(app):
    """Trừ trang gốc, mọi route phải nằm dưới /api/v1 — tránh route lạc ra ngoài."""
    lac = [
        f"{m.upper()} {p}"
        for m, p, _ in iter_operations(app)
        if not p.startswith("/api/v1") and p != "/"
    ]
    assert not lac, f"Route nằm ngoài /api/v1: {lac}"
