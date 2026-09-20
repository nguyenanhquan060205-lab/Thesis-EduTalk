"""Mô hình gợi ý ngành — điểm vận hành và đầu ra phải đứng yên qua đợt refactor.

Đây là lưới cho "bẫy chí mạng" của dự án: dựng đặc trưng lệch một hằng số thì mô hình
**vẫn chạy, vẫn trả kết quả trông hợp lý**, không exception nào báo. Nên test khoá cứng
đầu ra của một hồ sơ cố định: lệch là biết ngay.

Test này KHÔNG thay `scripts/kiem_mo_hinh_huong1.py` (chạy đủ 2.546 dòng test, chậm).
Nó chỉ là chốt nhanh chạy sau mỗi lần sửa; trước khi commit vẫn phải chạy script kia.
"""

import pytest

# Một hồ sơ cố định — thiên về tư duy logic, tổ hợp A00, tổng 22,5 điểm.
HO_SO = {
    "interests": [4, 3, 5, 4, 3, 2, 3, 2, 4, 3],
    "subjectGroup": "A00",
    "scores": [8.0, 7.5, 7.0],
    "goal": "Đi làm",
    "gender": "Nam",  # gửi kèm vì test gọi không có token
}

# Đầu ra của đúng hồ sơ trên, đo ngày 18/09/2026 với mô hình trong gói
# `data/mo_hinh/huong1/` (EDUTALK_PHIEN_BAN=goc). Đổi số ở đây chỉ khi CỐ Ý đổi mô hình.
#
# Cập nhật 20/09/2026 — bật LỌC CỨNG tổ hợp (`loai_bo_ngoai_to_hop=True` ở router).
# Hồ sơ này khai A00, mà 11/39 ngành không xét A00 nên bị loại; xác suất 28 ngành còn
# lại chuẩn hoá lại nên nhích lên. THỨ TỰ VÀ MÃ NGÀNH KHÔNG ĐỔI — đó là dấu hiệu bộ lọc
# chỉ cắt đuôi chứ không xáo trộn xếp hạng. Chế độ tư vấn giữ nguyên từng chữ số vì cả
# 4 ngành nhóm "CNTT & Máy tính" đều xét A00, không ngành nào bị loại.
VANG_KHAM_PHA = [
    ("7340201", 0.2503), ("7340101", 0.2235), ("7480201", 0.1725),
    ("7340120", 0.1080), ("7340115", 0.0564),
]
VANG_TU_VAN = [("7480201", 0.7720), ("7480202", 0.2184)]


def goi_y(client, **them):
    r = client.post("/api/v1/predict/recommend", json={**HO_SO, **them})
    assert r.status_code == 200, r.text
    return r.json()


def test_catalog_du_9_nhom_39_nganh(client):
    d = client.get("/api/v1/predict/catalog").json()
    assert len(d["fields"]) == 9
    assert sum(len(f["majors"]) for f in d["fields"]) == 39


def test_catalog_bao_dung_diem_van_hanh(client):
    """Web dựng giao diện từ đây thay vì gõ cứng số 2 và 5."""
    assert client.get("/api/v1/predict/catalog").json()["soGoiY"] == {"tuVan": 2, "khamPha": 5}


def test_kham_pha_hien_5_nganh(client):
    d = goi_y(client)
    assert d["mode"] == "explore"
    assert len(d["majors"]) == 5


def test_tu_van_hien_2_nganh_va_dung_nhom(client):
    d = goi_y(client, fieldId=0)
    assert d["mode"] == "guided"
    assert len(d["majors"]) == 2
    # Đã chọn nhóm thì mọi gợi ý phải nằm trong nhóm đó, không được lạc sang nhóm khác.
    ten_nhom = {m["field"] for m in d["majors"]}
    assert len(ten_nhom) == 1, f"Gợi ý lạc sang nhóm khác: {ten_nhom}"


def test_limit_do_client_gui_duoc_ton_trong(client):
    assert len(goi_y(client, limit=3)["majors"]) == 3


@pytest.mark.parametrize(("field_id", "vang"), [(None, VANG_KHAM_PHA), (0, VANG_TU_VAN)])
def test_dau_ra_khop_gia_tri_vang(client, field_id, vang):
    """Khoá cứng mã ngành, thứ hạng và xác suất — xem docstring đầu file."""
    d = goi_y(client, fieldId=field_id)
    assert [m["code"] for m in d["majors"]] == [c for c, _ in vang]
    for m, (_, diem) in zip(d["majors"], vang, strict=True):
        assert m["score"] == pytest.approx(diem, abs=1e-4), f"{m['code']} lệch xác suất"


def test_khong_goi_y_nganh_ngoai_to_hop(client):
    """Ngành không xét tổ hợp thí sinh khai thì KHÔNG được xuất hiện.

    Lỗi thật đã gặp trên web 20/09/2026: chọn khám phá với tổ hợp B08, danh sách vẫn
    hiện Công nghệ thông tin ở hạng #2 kèm đúng dòng chữ "Không xét tổ hợp B08". Lúc đó
    bộ lọc chỉ HẠ MỘT NỬA xác suất, không đủ dìm ngành có xác suất gốc cao.

    B08 là tổ hợp tốt để khoá: chỉ 6/39 ngành xét, đủ lấp 5 chỗ khám phá nhưng loại tới
    33 ngành — sai sót gì ở bộ lọc cũng lộ ra ngay.
    """
    import json
    import pathlib

    from app.core import paths

    bang = json.loads(
        (paths.CO_CAU_TRUC / "tuyen_sinh_huit_2026.json").read_text(encoding="utf-8")
    )["nganh"]
    assert pathlib.Path(paths.CO_CAU_TRUC).exists()

    d = goi_y(client, subjectGroup="B08", fieldId=None)
    for m in d["majors"]:
        assert "B08" in bang[m["code"]]["to_hop"], (
            f"{m['code']} {bang[m['code']]['ten']} không xét B08 mà vẫn được gợi ý"
        )
    assert any("B08" in w for w in d["warnings"]), "phải nói rõ đã loại ngành nào"


def test_tong_diem_tinh_dung(client):
    assert goi_y(client)["totalScore"] == pytest.approx(22.5)


@pytest.mark.parametrize(
    "hong",
    [
        {"interests": [4, 3, 5, 4, 3, 2, 3, 2, 4]},  # thiếu 1 câu sở thích
        {"fieldId": 9},  # chỉ có 9 nhóm: 0..8
        {"limit": 0},
        {"scores": [8.0, 7.5]},  # tổ hợp phải đủ 3 môn
    ],
)
def test_du_lieu_hong_bi_chan_o_tang_kiem_tra(client, hong):
    r = client.post("/api/v1/predict/recommend", json={**HO_SO, **hong})
    assert r.status_code == 422, f"Đáng lẽ 422, nhận {r.status_code}: {r.text[:200]}"
