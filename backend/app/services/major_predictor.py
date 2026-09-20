"""
Suy diễn gợi ý ngành học bằng mô hình XGBoost 2 tầng (Giai đoạn 8 của research/).

    Tầng 1: 43 đặc trưng  →  7 khối ngành
    Tầng 2: 43 đặc trưng  → 39 ngành
    Ghép  : P(ngành) ∝ P₂(ngành) × P₁(khối của ngành)^β        với β = 0,6

QUAN TRỌNG — cách dựng đặc trưng ở đây phải GIỐNG HỆT lúc huấn luyện
(notebook 01 và 07). Lệch một chi tiết thì mô hình vẫn chạy, vẫn trả về kết quả
trông hợp lý, nhưng sai âm thầm. Mọi hằng số dưới đây được chép nguyên từ
notebook, không gõ lại theo trí nhớ.
"""

from __future__ import annotations

import logging
import os
import threading
from pathlib import Path

from app.core import paths

log = logging.getLogger(__name__)

# ── Hằng số chép từ notebook 01 (TO_HOP_MAP, MON) ───────────────────────────
TO_HOP_MAP: dict[str, list[str]] = {
    "A00": ["Toan", "Ly", "Hoa"],
    "A01": ["Toan", "Ly", "Anh"],
    "B00": ["Toan", "Hoa", "Sinh"],
    "B08": ["Toan", "Sinh", "Anh"],
    "C00": ["Van", "Su", "Dia"],
    "C01": ["Van", "Toan", "Ly"],
    "C02": ["Van", "Toan", "Hoa"],
    "C03": ["Van", "Toan", "Su"],
    "D01": ["Toan", "Van", "Anh"],
    "D07": ["Toan", "Hoa", "Anh"],
    "D09": ["Toan", "Su", "Anh"],
    "D14": ["Van", "Anh", "Su"],
    "D15": ["Van", "Dia", "Anh"],
    "X01": ["Toan", "Van", "Gdktpl"],
    "X26": ["Toan", "Tin", "Anh"],
}
MON = ["Toan", "Ly", "Hoa", "Anh", "Van", "Su", "Sinh", "Dia", "Gdktpl", "Tin"]

# ── Hằng số chép từ notebook 04 và 07 ───────────────────────────────────────
MUC_TIEU_MA: dict[str, int] = {
    "Đi làm": 1,
    "Nghiên cứu": 2,
    "Kinh doanh": 3,
    "Chưa xác định": 4,
}
NHOM_TO_HOP: dict[str, str] = {
    "A00": "TN", "A01": "TN", "B00": "TN", "B08": "TN", "D07": "TN",
    "C00": "XH", "C03": "XH", "D09": "XH", "D14": "XH", "D15": "XH",
    "D01": "HH", "C01": "HH", "C02": "HH", "X01": "HH", "X26": "HH",
}

BETA = 0.6  # số mũ ghép 2 tầng, chọn bằng cross-validation ở Giai đoạn 8

# Trọng số cho ngành KHÔNG xét tổ hợp của thí sinh (theo bảng tổ hợp 2026).
#
# ⚠️ ĐỪNG DÙNG LÝ LẼ "còn học bạ / ĐGNL" ĐỂ BIỆN MINH CHO LỌC MỀM. Tính năng này
# CHỈ biết phương thức thi tốt nghiệp THPT, đã kiểm 20/09/2026:
#   · đầu vào là tổ hợp thi + 3 điểm thi THPT
#   · 63 đặc trưng của mô hình có 12 đặc trưng điểm, toàn bộ là `diem_<môn>` THPT —
#     không một đặc trưng nào về học bạ hay ĐGNL
#   · `tuyen_sinh_huit_2026.json` chỉ có `diem_chuan_thpt`, và tự ghi
#     "Điểm thi tốt nghiệp THPT (chỉ phương thức này)"
# Nói "ngành này vẫn vào được bằng học bạ" là phát biểu mà hệ thống KHÔNG có dữ liệu
# để kiểm chứng — nó chỉ để bào chữa cho việc gợi ý ngành không khớp đầu vào.
#
# Pipeline đời đầu chọn 0,5 bằng cross-validation (Top-3 39,2% → 41,2% trên 102 em).
# Kiểm lại với mô hình Hướng 1 (17/09/2026), GIỮ 0,5:
#
#   Tập test (2.546 dòng) — lọc kéo số xuống nhẹ: tư vấn Top-2 90,6% → 90,5%,
#     khám phá Top-5 81,8% → 81,3%. KHÔNG phải lỗi: nhãn là hồ sơ trúng tuyển các
#     năm trước, 12,9% dòng có ngành đúng không còn xét tổ hợp đó theo bảng 2026
#     (theo bảng mọi năm 2024–2026 thì 0,0%). Bộ lọc phạt oan đúng những dòng này,
#     còn thí sinh 2026 thì bị ràng buộc bởi chính bảng 2026.
#   Người thật (676 phiếu, Hướng 2) — lọc có ích: tư vấn Top-2 78,6% → 79,4%, khám phá
#     Top-5 59,9% → 61,2%; gợi ý ngành không xét tổ hợp của em giảm 27,4% → 19,4%.
#   Lọc cứng (0) là sai: 20,6% học sinh thật đang ở ngành không xét tổ hợp họ khai;
#     tư vấn Top-2 trên người thật tụt còn 74,0%.
#
# Không chỉnh 0,5 theo tập người thật (mức 0,25 nhỉnh hơn một chút) — đó là tập niêm
# phong để ĐO, dùng nó để chọn tham số thì con số người thật mất giá trị.
#
# ⚠️ HẰNG SỐ NÀY LÀ THAM SỐ CỦA BÀI ĐO, KHÔNG PHẢI HÀNH VI THÍ SINH THẤY.
# Từ 20/09/2026 hai router `predict.py` và `survey.py` truyền `loai_bo_ngoai_to_hop=True`,
# tức LỌC CỨNG: ngành không xét tổ hợp thí sinh khai bị loại hẳn khỏi danh sách.
#
# Vì sao đổi: chế độ khám phá chọn B08 vẫn hiện Công nghệ thông tin ở hạng #2 kèm chính
# dòng chữ "Không xét tổ hợp B08". Hạ một nửa không đủ dìm ngành có xác suất gốc cao,
# và một gợi ý tự mâu thuẫn như vậy làm thí sinh mất tin vào cả danh sách.
#
# Con số 74,0% (tư vấn Top-2 trên người thật, so với 78,6% khi lọc mềm) KHÔNG phải lý do
# để giữ lọc mềm. Nhãn của tập đó là "ngành sinh viên thực sự đang học", mà 20,6% trong
# số họ vào bằng phương thức tính năng này không hề mô hình hoá. Đếm những ca đó là
# "trượt" của một bộ gợi ý dựa trên tổ hợp thi THPT là đo sai việc. Chỉ cần nhớ: báo cáo
# nào ghi độ chính xác KHI BẬT lọc thì phải ghi 74,0%, đừng ghi 78,6%.
#
# Bộ lọc tự nhường về lọc mềm khi CẢ phạm vi đều ngoài tổ hợp (nếu không thì rỗng).
#
# Số của khoá luận KHÔNG đổi: `kiem_mo_hinh_huong1.py` so với notebook khi TẮT lọc
# (`filter_subject_group=False`), không đi qua nhánh này.
TRONG_SO_NGOAI_TO_HOP = 0.5


def _model_dir() -> Path:
    """research/data/processed — đổi được qua biến môi trường EDUTALK_MODEL_DIR."""
    tu_env = os.getenv("EDUTALK_MODEL_DIR")
    if tu_env:
        return Path(tu_env)
    return paths.REPO / "research" / "data" / "processed"




def pipeline_dang_chay() -> str:
    """`h1` (mặc định) · `r3` — đọc từ EDUTALK_PIPELINE.

    Trang quản trị dùng chung hàm này để đọc chỉ số của ĐÚNG mô hình đang phục vụ.

    Từng có nhánh thứ ba `legacy` (pipeline 2 tầng của `research/`, Giai đoạn 8). Đã
    xoá 20/09/2026: thư mục mô hình của nó `research/data/processed/08_model` không
    còn tồn tại, nên nhánh đó ném FileNotFoundError ngay khi nạp. Ba thành phần mà
    `major_predictor_r3.py` còn mượn (`TEN_MON`, `_tuyen_sinh`, `muc_do`) đã chuyển
    hẳn sang file đó.
    """
    ten = os.getenv("EDUTALK_PIPELINE", "h1").strip().lower()
    return ten if ten in ("h1", "r3") else "h1"


def thu_muc_mo_hinh(pipeline: str | None = None) -> Path:
    """Thư mục chứa gói mô hình của pipeline đang phục vụ (hoặc pipeline chỉ định).

    Có hàm này để nơi khác không phải import hàm riêng tư của ba module predictor.
    Trang quản trị và `huan_luyen/phien_ban.py` từng làm đúng vậy — `_model_dir`,
    `_model_dir_h1`, `_model_dir_r3` đều có gạch dưới ở đầu, nghĩa là "nội bộ, có
    thể đổi bất cứ lúc nào", mà lại bị hai chỗ ngoài phụ thuộc vào.
    """
    ten = pipeline or pipeline_dang_chay()
    if ten == "r3":
        from app.services.major_predictor_r3 import _model_dir_r3

        return _model_dir_r3()
    from app.services.major_predictor_h1 import _model_dir_h1

    return _model_dir_h1()


_predictor = None
_ma_dang_nap: str | None = None
_khoa_nap = threading.RLock()


def get_predictor():
    """Nạp mô hình một lần duy nhất cho cả tiến trình, rồi tái sử dụng.

    Mặc định dùng mô hình Hướng 1 (`research/`, gói ở `backend/data/mo_hinh/huong1/`):
    9 nhóm ngành, 63 đặc trưng, tư vấn hiện 2 gợi ý, khám phá hiện 5. Nếu vòng lặp phản
    hồi đã đưa một phiên bản huấn luyện lại vào phục vụ (MongoDB), nạp phiên bản đó.

    Đường lùi qua biến môi trường EDUTALK_PIPELINE:
        r3  → `research3/` (mô hình phục vụ trước Hướng 1). CHỈ CHẠY ĐƯỢC Ở MÁY DEV:
              gói mô hình nằm ở `research3/`, ngoài `context: ./backend` của Docker,
              nên ảnh không có nó. Muốn đường lùi dùng được thật thì phải đóng gói vào
              `backend/data/mo_hinh/r3/` giống cách Hướng 1 đã làm.

    Trước đây là `@lru_cache`; đổi sang biến toàn cục + khoá để đổi phiên bản NÓNG được
    (`nap_lai_predictor`) mà không phải khởi động lại tiến trình.

    Các lớp có cùng bề mặt công khai (`recommend`, `build_features`, `major_name`,
    `field_name`, `to_hop_xet_tuyen`, `diem_chuan`…) nên router không cần biết đang
    chạy bản nào.
    """
    if _predictor is None:
        with _khoa_nap:
            if _predictor is None:
                nap_lai_predictor()
    return _predictor


def ma_phien_ban_dang_nap() -> str | None:
    return _ma_dang_nap


def nap_lai_predictor(ma: str | None = None):
    """Dựng predictor MỚI xong rồi mới tráo vào — request đang chạy vẫn dùng bản cũ.

    Phiên bản huấn luyện lại tải hỏng hoặc sai mã băm thì ghi log và lùi về mô hình trong
    gói, chứ không để backend không có mô hình nào.
    """
    global _predictor, _ma_dang_nap
    with _khoa_nap:
        ten = pipeline_dang_chay()
        if ten == "r3":
            from app.services.major_predictor_r3 import MajorPredictorR3

            moi, ma_moi = MajorPredictorR3(), "r3"
        else:
            from app.services.huan_luyen import phien_ban
            from app.services.major_predictor_h1 import MajorPredictorH1

            ma_moi = ma or phien_ban.ma_dang_phuc_vu()
            try:
                moi = MajorPredictorH1(
                    None if ma_moi == phien_ban.GOC else phien_ban.thu_muc_phien_ban(ma_moi)
                )
            except Exception:  # noqa: BLE001
                if ma_moi == phien_ban.GOC:
                    raise
                log.exception("Không nạp được phiên bản %s — lùi về mô hình gốc", ma_moi)
                moi, ma_moi = MajorPredictorH1(), phien_ban.GOC
        _predictor, _ma_dang_nap = moi, ma_moi
        log.info("Mô hình đang phục vụ: %s (%s)", ma_moi, ten)
        return moi
