"""Suy diễn gợi ý ngành bằng mô hình Hướng 1 (`research/`) — mô hình đang phục vụ.

Hướng 1 gộp 676 phiếu khảo sát với 16.296 dòng dẫn xuất từ hồ sơ trúng tuyển thành một
bảng `train_final` (16.972 dòng), chia 70/15/15, rồi huấn luyện XGBoost. So với
`research3/`:

    giống   9 nhóm ngành (cùng mapping), hàm dựng 63 đặc trưng (so từng dòng code),
            15 tổ hợp, mã mục tiêu, mã giới tính
    khác    mô hình nhóm tên model_nhom{k}.json, KHÔNG có mô hình phân tầng,
            bộ số chuẩn hoá điểm tính trên toàn bộ train_final

    fieldId=None → model_nganh.json    xếp hạng cả 39 ngành     (khám phá, hiện 5)
    fieldId=k    → model_nhom{k}.json  chỉ ngành trong nhóm k   (tư vấn, hiện 2)

Mọi phần còn lại — dựng đặc trưng, SHAP, lọc mềm theo tổ hợp, định dạng phản hồi — dùng
lại nguyên vẹn của `MajorPredictorR3`, vì lớp này chỉ khác ở chỗ NẠP mô hình. Nên hai lớp
có cùng bề mặt công khai và router không cần biết đang chạy bản nào.

Mô hình nạp từ gói `backend/data/mo_hinh/huong1/`, sinh bởi
`backend/scripts/dong_goi_mo_hinh_huong1.py` từ `research/data/processed/10_ChotModel`.

Số liệu trên tập test 2.546 dòng (notebook Giai đoạn 10):

    tư vấn   Top-2   90,6%      đoán bừa 47,6%
    khám phá Top-5   81,8%      đoán bừa 12,8%

Trên phiếu khảo sát người thật mức kỳ vọng thấp hơn — khoảng 79% và 60% (Hướng 2, 676
phiếu niêm phong). Kiểm backend khớp notebook: `python backend/scripts/kiem_mo_hinh_huong1.py`.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import numpy as np

from app.core import paths
from app.services.major_predictor_r3 import MajorPredictorR3


def _model_dir_h1() -> Path:
    """Thư mục gói mô hình Hướng 1 — đổi được qua EDUTALK_MODEL_DIR.

    Tính theo thư mục `backend/` chứ không theo gốc repo, để chạy được cả trong ảnh
    Docker (chỉ chứa `backend/`).
    """
    tu_env = os.getenv("EDUTALK_MODEL_DIR")
    if tu_env:
        return Path(tu_env)
    return paths.MO_HINH / "huong1"


class MajorPredictorH1(MajorPredictorR3):
    """Nạp mô hình một lần rồi tái sử dụng. Đừng tạo trực tiếp — dùng get_predictor()."""

    def __init__(self, thu_muc: Path | None = None) -> None:  # noqa: D107
        from xgboost import XGBClassifier

        goc = thu_muc or _model_dir_h1()
        f_meta = goc / "mo_hinh.json"
        if not f_meta.exists():
            raise FileNotFoundError(
                f"Thiếu {f_meta}. Chạy `python backend/scripts/dong_goi_mo_hinh_huong1.py` "
                "để đóng gói mô hình từ research/data/processed/10_ChotModel."
            )
        M = json.loads(f_meta.read_text(encoding="utf-8"))

        # Chép thiếu hoặc lệch phiên bản thì mô hình vẫn nạp được và vẫn trả kết quả
        # trông hợp lý — nên kiểm mã băm ngay lúc khởi động thay vì tin tên file.
        for ten, ma in M["sha256"].items():
            f = goc / ten
            if not f.exists():
                raise FileNotFoundError(f"Gói mô hình thiếu {f}")
            if hashlib.sha256(f.read_bytes()).hexdigest() != ma:
                raise RuntimeError(
                    f"{f} không khớp mã băm trong mo_hinh.json — đóng gói lại bằng "
                    "backend/scripts/dong_goi_mo_hinh_huong1.py"
                )

        # ── Lược đồ đặc trưng ────────────────────────────────────────────────
        self.columns: list[str] = M["ten_dac_trung"]
        self.subject_groups: list[str] = M["to_hop"]
        self.mon: list[str] = [
            c[5:]
            for c in self.columns
            if c.startswith("diem_") and c not in ("diem_tb", "diem_lech")
        ]
        # Thống kê của TOÀN BỘ train_final (Giai đoạn 6), đã kiểm từng ô lúc đóng gói
        self.diem_mu = np.asarray(M["diem_mu"], dtype=float)
        self.diem_sd = np.asarray(M["diem_sd"], dtype=float)
        self.diem_van_hanh: dict[str, int] = M["diem_van_hanh"]

        # ── Lớp ngành và nhóm ────────────────────────────────────────────────
        nganh = [int(x) for x in M["nganh_theo_thu_tu_lop"]]
        self.major_code = dict(enumerate(nganh))
        self.i_nganh = {ma: i for i, ma in enumerate(nganh)}

        nganh_to_nhom = {int(k): int(v) for k, v in M["nganh_to_nhom"].items()}
        self.field_of_major = {i: nganh_to_nhom[ma] for i, ma in self.major_code.items()}
        self.field_name = {int(k): v for k, v in M["ten_nhom"].items()}
        self.major_name = {
            i: M["ma_to_ten"].get(str(ma), str(ma)) for i, ma in self.major_code.items()
        }

        # Mô hình nhóm k xuất xác suất theo mã ngành TĂNG DẦN trong nhóm
        self.lop_theo_khoi: dict[int, list[int]] = {
            int(k): [self.i_nganh[int(ma)] for ma in v]
            for k, v in M["lop_theo_khoi"].items()
        }

        # ── Mô hình ──────────────────────────────────────────────────────────
        self.m_nganh = XGBClassifier()
        self.m_nganh.load_model(goc / "model_nganh.json")
        self._b_nganh = self.m_nganh.get_booster()

        # Tên thuộc tính giữ như lớp cha (m_khoi, _b_khoi) để recommend() và _shap()
        # dùng lại được nguyên vẹn.
        self.m_khoi: dict[int, object] = {}
        self._b_khoi: dict[int, object] = {}
        for k in self.lop_theo_khoi:
            mk = XGBClassifier()
            mk.load_model(goc / f"model_nhom{k}.json")
            self.m_khoi[k] = mk
            self._b_khoi[k] = mk.get_booster()

        # Hướng 1 không có mô hình phân tầng
        self.phan_tang: dict[int, dict] = {}

        self._don_vi = self._dung_don_vi_hien()
        self._nap_bang_tuyen_sinh(goc)
