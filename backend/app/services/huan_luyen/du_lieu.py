"""Dữ liệu cho huấn luyện lại: dữ liệu gốc trong gói + phiếu phản hồi có nhãn.

Một phiếu phản hồi = một lượt tư vấn đã lưu (`prediction_history`) mà người dùng quay lại
cho biết ngành mình ĐÃ CHỌN hoặc ĐÃ ĐỖ (`phan_hoi.nganh_da_chon`). Đầu vào lúc tư vấn nằm
sẵn trong bản ghi, nên dựng lại đúng 63 đặc trưng bằng chính `build_features()` của
backend — cùng hàm đã được kiểm khớp notebook từng dòng.

Luật lọc, mỗi luật chặn một kiểu nhiễu cụ thể:

    có điểm thi 3 môn     dữ liệu gốc dòng nào cũng có điểm; phiếu không điểm là một
                          phân phối khác hẳn, trộn vào làm lệch mô hình
    có giới tính thật     hồ sơ thiếu giới tính bị điền mặc định "Nu" lúc tư vấn — đưa
                          vào huấn luyện là dạy mô hình một giá trị bịa
    mỗi người một phiếu   lấy phiếu cập nhật gần nhất; một người bấm tư vấn 20 lần và gắn
                          cùng một nhãn không được nặng gấp 20 lần người khác

Tách ~20% làm phần GIỮ LẠI để đo, theo băm mã lượt tư vấn — cố định giữa các lần chạy, nên
một phiếu đã dùng để đo thì không bao giờ lọt sang phần học ở lần sau.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

TI_LE_GIU_LAI = 5  # 1/5 = 20%


@dataclass
class DuLieuGoc:
    X_hoc: np.ndarray
    y_hoc: np.ndarray
    X_test: np.ndarray
    y_test: np.ndarray
    g_test: np.ndarray


@dataclass
class MauPhanHoi:
    X_hoc: np.ndarray
    y_hoc: np.ndarray
    X_giu: np.ndarray
    y_giu: np.ndarray
    g_giu: np.ndarray
    thong_ke: dict = field(default_factory=dict)


def doc_du_lieu_goc(thu_muc: Path, cot: list[str]) -> DuLieuGoc:
    hoc = pd.read_csv(thu_muc / "du_lieu_hoc.csv.gz")
    te = pd.read_csv(thu_muc / "test_khoa.csv.gz")
    return DuLieuGoc(
        X_hoc=hoc[cot].to_numpy(float),
        y_hoc=hoc.ma_nganh.to_numpy(),
        X_test=te[cot].to_numpy(float),
        y_test=te.ma_nganh.to_numpy(),
        g_test=te.ma_nhom.to_numpy(),
    )


def la_giu_lai(ma_luot: str) -> bool:
    return int(hashlib.sha256(ma_luot.encode()).hexdigest()[:8], 16) % TI_LE_GIU_LAI == 0


def truy_van_co_nhan() -> dict:
    return {"phan_hoi.nganh_da_chon": {"$nin": [None, ""]}}


def lay_mau_phan_hoi(db, predictor, moi_tu=None) -> MauPhanHoi:
    """Gom phiếu phản hồi có nhãn thành ma trận đặc trưng. `moi_tu` để đếm nhãn mới."""
    from app.services.major_predictor import MUC_TIEU_MA

    ma_hop_le = set(predictor.major_code.values())
    nhom_cua = {ma: predictor.field_of_major[i] for i, ma in predictor.major_code.items()}
    tk = {"tong_nhan": 0, "loai_khong_diem": 0, "loai_thieu_gioi_tinh": 0,
          "loai_trung_nguoi": 0, "loai_khong_hop_le": 0, "nhan_moi": 0,
          "theo_trang_thai": {}}

    moi_nguoi: dict[str, dict] = {}
    for d in db["prediction_history"].find(truy_van_co_nhan()).sort("phan_hoi.cap_nhat_luc", -1):
        tk["tong_nhan"] += 1
        ph, vao = d.get("phan_hoi") or {}, d.get("input") or {}
        tt = ph.get("trang_thai_nganh") or "khong_ro"
        tk["theo_trang_thai"][tt] = tk["theo_trang_thai"].get(tt, 0) + 1
        if not vao.get("scores") or len(vao["scores"]) != 3:
            tk["loai_khong_diem"] += 1
            continue
        if vao.get("genderMissing") or vao.get("gender") not in ("Nam", "Nu"):
            tk["loai_thieu_gioi_tinh"] += 1
            continue
        uid = str(d.get("user_id"))
        if uid in moi_nguoi:  # đã sort mới nhất trước → phiếu sau là phiếu cũ hơn
            tk["loai_trung_nguoi"] += 1
            continue
        moi_nguoi[uid] = d

    X_h, y_h, X_g, y_g, g_g = [], [], [], [], []
    for d in moi_nguoi.values():
        vao, ph = d["input"], d["phan_hoi"]
        try:
            ma = int(ph["nganh_da_chon"])
            if ma not in ma_hop_le or vao.get("goal") not in MUC_TIEU_MA:
                raise ValueError
            x = predictor.build_features(
                vao["interests"], vao["subjectGroup"], vao["scores"], vao["gender"], vao["goal"]
            )[0]
        except (ValueError, KeyError, TypeError):
            tk["loai_khong_hop_le"] += 1
            continue
        if moi_tu is not None and ph.get("cap_nhat_luc") and ph["cap_nhat_luc"].replace(
            tzinfo=None
        ) > moi_tu.replace(tzinfo=None):
            tk["nhan_moi"] += 1
        if la_giu_lai(str(d["_id"])):
            X_g.append(x), y_g.append(ma), g_g.append(nhom_cua[ma])
        else:
            X_h.append(x), y_h.append(ma)

    n = len(predictor.columns)
    tk.update(dung_duoc=len(X_h) + len(X_g), hoc=len(X_h), giu_lai=len(X_g))
    if moi_tu is None:
        tk["nhan_moi"] = tk["dung_duoc"]
    return MauPhanHoi(
        X_hoc=np.array(X_h).reshape(-1, n),
        y_hoc=np.array(y_h, dtype=int),
        X_giu=np.array(X_g).reshape(-1, n),
        y_giu=np.array(y_g, dtype=int),
        g_giu=np.array(g_g, dtype=int),
        thong_ke=tk,
    )
