"""Tầng lọc ngữ cảnh của chatbot RAG — chạy offline, không gọi API Gemini.

`lay_ngu_canh` nhận sẵn tham số `lay_ve` (kết quả truy xuất) nên kiểm được phần quyết
định — ngưỡng lạc đề và biên độ — mà không nhúng câu hỏi, không tốn hạn mức API.

Chất lượng truy hồi thật (Precision@k, Recall@k...) đo bằng `scripts/kiem_truy_hoi.py`
với kho và mô hình nhúng thật; ở đây chỉ chốt phần logic.
"""

import pytest
from app.services.rag.tro_ly import BIEN_DO, NGUONG_LAC_DE, ghep_lich_su, lay_ngu_canh


def doan(khoang_cach: float, nganh: str = "Công nghệ thông tin", muc: str | None = None):
    return {
        "khoang_cach": khoang_cach,
        "noi_dung": f"Thông tin ngành {nganh}.",
        "meta": {"nguon": "Đề án tuyển sinh HUIT 2026", "muc": muc, "nganh": nganh},
    }


def test_cau_dung_chu_de_thi_lay_duoc_ngu_canh():
    nc = lay_ngu_canh("Ngành CNTT xét tổ hợp nào?", lay_ve=[doan(0.20)])
    assert nc and len(nc.doan) == 1
    assert "Công nghệ thông tin" in nc.van_ban()


def test_cau_lac_de_thi_khong_kem_ngu_canh():
    """Vượt ngưỡng thì trả rỗng, để model nói không có dữ liệu thay vì bịa theo đoạn
    gần nhất — dù đoạn đó chẳng liên quan."""
    nc = lay_ngu_canh("Giá bitcoin hôm nay?", lay_ve=[doan(NGUONG_LAC_DE + 0.01)])
    assert not nc
    assert nc.van_ban() == ""


def test_doan_xa_hon_bien_do_bi_cat():
    """Giữ đủ top-k cứng sẽ nhồi cả đoạn không liên quan vào prompt và dụ model trả
    lời nhầm ngành."""
    lay_ve = [doan(0.20), doan(0.20 + BIEN_DO - 0.01, "An toàn thông tin"), doan(0.20 + BIEN_DO + 0.01, "Luật")]
    nc = lay_ngu_canh("Ngành CNTT thế nào?", lay_ve=lay_ve)
    assert len(nc.doan) == 2
    assert "Luật" not in nc.van_ban()


def test_nguon_gop_trung_theo_muc():
    """Hai chunk cùng một mục chỉ được hiện một dòng nguồn."""
    lay_ve = [doan(0.20, muc="Điều kiện xét tuyển"), doan(0.22, muc="Điều kiện xét tuyển")]
    assert len(lay_ngu_canh("Điều kiện xét tuyển?", lay_ve=lay_ve).nguon()) == 1


def test_ngu_canh_ghi_ro_nguon_de_truy_nguoc():
    nc = lay_ngu_canh("Hỏi gì đó", lay_ve=[doan(0.20, muc="Học phí")])
    assert "Đề án tuyển sinh HUIT 2026 — Học phí" in nc.van_ban()


@pytest.mark.parametrize(
    ("cau_hoi", "lich_su", "mong_doi"),
    [
        ("2026", [{"role": "user", "text": "Ngành CNTT thế nào?"}], "Ngành CNTT thế nào? 2026"),
        # Câu dài đã tự đủ nghĩa — ghép thêm chỉ kéo vector về chủ đề cũ.
        (
            "Em muốn biết ngành Luật kinh tế xét những tổ hợp nào ạ",
            [{"role": "user", "text": "Ngành CNTT thế nào?"}],
            "Em muốn biết ngành Luật kinh tế xét những tổ hợp nào ạ",
        ),
        ("2026", None, "2026"),
    ],
)
def test_ghep_lich_su_chi_cho_cau_ngan(cau_hoi, lich_su, mong_doi):
    assert ghep_lich_su(cau_hoi, lich_su) == mong_doi


def test_nguong_van_la_bo_so_da_do():
    """Hai hằng số này gắn với gemini-embedding-2 ở 768 chiều; đổi mà quên đo lại là
    hỏng âm thầm."""
    assert (NGUONG_LAC_DE, BIEN_DO) == (0.35, 0.12)
