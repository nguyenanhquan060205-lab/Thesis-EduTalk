"""Huấn luyện và chấm bộ mô hình Hướng 1 — chép NGUYÊN logic `MoHinhNganh` của pipeline.

Nguồn đối chiếu: `research/scripts/nbgen.py`, khối `MO_HINH` (hàm `mo_hinh`, `_fit1`, `fit`,
`diem`). Lệch một tham số mặc định thì mô hình vẫn huấn luyện được, vẫn cho số trông hợp
lý, nhưng KHÔNG còn là mô hình đã báo cáo. `scripts/kiem_huan_luyen_lai.py` huấn luyện lại
trên đúng dữ liệu gốc và bắt buộc ra kết quả trùng từng dòng với mô hình trong gói.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

# `mo_hinh()` trong nbgen.py. hp của Giai đoạn 9 ghi đè lên bộ này.
MAC_DINH = dict(
    max_depth=5,
    n_estimators=400,
    learning_rate=0.06,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.6,
    reg_lambda=5.0,
    tree_method="hist",
    n_jobs=-1,
    verbosity=0,
)


@dataclass
class BoMoHinh:
    """Một mô hình chung 39 ngành + mỗi nhóm một mô hình. `co` = mã ngành theo thứ tự lớp."""

    nganh: list[int]
    nganh_to_nhom: dict[int, int]
    chung: object = None
    co_chung: np.ndarray | None = None
    nhom: dict[int, tuple[object, np.ndarray]] = field(default_factory=dict)

    # ── Huấn luyện ────────────────────────────────────────────────────────────
    @staticmethod
    def _fit1(X, y, hp: dict, seed: int):
        """XGBoost 3.x bắt mã lớp liền mạch 0..n-1 → đánh số lại bằng np.unique."""
        from xgboost import XGBClassifier

        co = np.unique(y)
        m = XGBClassifier(**{**MAC_DINH, "random_state": seed, **hp})
        m.fit(X, np.searchsorted(co, y))
        return m, co

    def huan_luyen(self, X: np.ndarray, y: np.ndarray, hp: dict, seed: int) -> "BoMoHinh":
        X, y = np.asarray(X, dtype=float), np.asarray(y)
        self.chung, self.co_chung = self._fit1(X, y, hp, seed)
        # Đúng thứ tự và điều kiện bỏ qua của MoHinhNganh.fit(rieng_nhom=True)
        for g in sorted(set(self.nganh_to_nhom.values())):
            ds = [n for n in self.nganh if self.nganh_to_nhom[n] == g]
            sel = np.isin(y, ds)
            if len(ds) < 2 or sel.sum() < 5 or len(np.unique(y[sel])) < 2:
                continue
            self.nhom[g] = self._fit1(X[sel], y[sel], hp, seed)
        return self

    # ── Nạp từ file của gói hoặc của phiên bản đã lưu ─────────────────────────
    @classmethod
    def tu_thu_muc(cls, thu_muc, nganh: list[int], nganh_to_nhom: dict[int, int]) -> "BoMoHinh":
        from xgboost import XGBClassifier

        bo = cls(nganh=nganh, nganh_to_nhom=nganh_to_nhom)
        bo.chung = XGBClassifier()
        bo.chung.load_model(thu_muc / "model_nganh.json")
        bo.co_chung = np.array(sorted(nganh))
        for g in sorted(set(nganh_to_nhom.values())):
            f = thu_muc / f"model_nhom{g}.json"
            if f.exists():
                m = XGBClassifier()
                m.load_model(f)
                bo.nhom[g] = (m, np.array(sorted(n for n in nganh if nganh_to_nhom[n] == g)))
        return bo

    def luu(self, thu_muc) -> list[str]:
        thu_muc.mkdir(parents=True, exist_ok=True)
        self.chung.save_model(str(thu_muc / "model_nganh.json"))
        tep = ["model_nganh.json"]
        for g, (m, _) in self.nhom.items():
            m.save_model(str(thu_muc / f"model_nhom{g}.json"))
            tep.append(f"model_nhom{g}.json")
        return tep

    # ── Chấm điểm: đúng MoHinhNganh.diem(), KHÔNG có lọc mềm theo tổ hợp ─────
    def _rai(self, pr: np.ndarray, co: np.ndarray, n: int) -> np.ndarray:
        vi_tri = {m: i for i, m in enumerate(self.nganh)}
        S = np.zeros((n, len(self.nganh)))
        for c, ma in enumerate(co):
            S[:, vi_tri[int(ma)]] = pr[:, c]
        return S

    def diem(self, X: np.ndarray, nhom_biet: np.ndarray | None = None) -> np.ndarray:
        X = np.asarray(X, dtype=float)
        S = self._rai(self.chung.predict_proba(X), self.co_chung, len(X))
        if nhom_biet is None:
            return S
        nhom_biet = np.asarray(nhom_biet)
        for g, (m, co) in self.nhom.items():
            sel = nhom_biet == g
            if sel.any():
                S[sel] = self._rai(m.predict_proba(X[sel]), co, int(sel.sum()))
        mat_na = np.array(
            [[self.nganh_to_nhom[n] == int(g) for n in self.nganh] for g in nhom_biet], float
        )
        return S * mat_na

    def top_k(self, X, y, k: int, nhom_biet=None) -> float:
        if len(y) == 0:
            return float("nan")
        o = np.argsort(-self.diem(X, nhom_biet), axis=1)[:, :k]
        NG = np.asarray(self.nganh)
        return float(np.mean([y[i] in NG[o[i]] for i in range(len(y))]))
