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

import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np

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

# Trọng số cho ngành KHÔNG xét tổ hợp của thí sinh. Chọn bằng cross-validation
# trên 1.722 dự đoán out-of-fold (không đụng tập kiểm tra), rồi xác nhận một lần
# trên 102 em: Top-3 39,2% → 41,2%, Top-5 52,9% → 55,9%.
# Dùng lọc MỀM chứ không loại hẳn, vì HUIT còn xét học bạ / ĐGNL — thí sinh có
# thể đỗ ngành không khớp tổ hợp mình khai. Lọc cứng làm mất ngành đúng của 8/102 em.
TRONG_SO_NGOAI_TO_HOP = 0.5


def _model_dir() -> Path:
    """research/data/processed — đổi được qua biến môi trường EDUTALK_MODEL_DIR."""
    tu_env = os.getenv("EDUTALK_MODEL_DIR")
    if tu_env:
        return Path(tu_env)
    return Path(__file__).resolve().parents[3] / "research" / "data" / "processed"


class MajorPredictor:
    """Nạp mô hình một lần rồi tái sử dụng. Đừng tạo trực tiếp — dùng get_predictor()."""

    def __init__(self, thu_muc: Path | None = None) -> None:
        from xgboost import XGBClassifier  # nhập trong hàm để import module không cần xgboost

        goc = thu_muc or _model_dir()
        mr, md = goc / "07_model_ready", goc / "08_model"

        thieu = [
            p
            for p in (
                md / "model_stage1_khoinganh.json",
                md / "model_stage2_nganh.json",
                mr / "feature_names.json",
                mr / "label_encoder_mapping.json",
                mr / "diem_zscore_stats.json",
                mr / "M_nganh_khoi.npy",
            )
            if not p.exists()
        ]
        if thieu:
            raise FileNotFoundError(
                "Thiếu tệp mô hình: "
                + ", ".join(str(p) for p in thieu)
                + ". Đặt biến môi trường EDUTALK_MODEL_DIR trỏ tới research/data/processed."
            )

        self.m1 = XGBClassifier()
        self.m1.load_model(md / "model_stage1_khoinganh.json")
        self.m2 = XGBClassifier()
        self.m2.load_model(md / "model_stage2_nganh.json")

        fn = json.loads((mr / "feature_names.json").read_text(encoding="utf-8"))
        self.columns: list[str] = fn["features"]
        self.subject_groups: list[str] = fn["to_hop_list"]

        lb = json.loads((mr / "label_encoder_mapping.json").read_text(encoding="utf-8"))
        self.major_code = {int(k): v for k, v in lb["idx_to_label"].items()}
        self.major_name = {int(k): v for k, v in lb["idx_to_name"].items()}
        self.field_of_major = {int(k): int(v) for k, v in lb["idx_to_khoi"].items()}
        self.field_name = {int(k): v for k, v in lb["khoi_to_name"].items()}

        self.score_stats = json.loads(
            (mr / "diem_zscore_stats.json").read_text(encoding="utf-8")
        )
        self.M = np.load(mr / "M_nganh_khoi.npy")  # (39, 7) one-hot ngành → khối

        # Tổ hợp xét tuyển + điểm chuẩn 3 năm (Đề án tuyển sinh HUIT).
        # Thiếu tệp này thì vẫn chạy được, chỉ mất phần lọc tổ hợp và nhãn rủi ro.
        self.to_hop_xet_tuyen: dict[int, set[str]] = {}
        self.diem_chuan: dict[int, dict[str, float]] = {}
        ts = goc / "tuyen_sinh_huit_2026.json"
        if ts.exists():
            bang = json.loads(ts.read_text(encoding="utf-8"))["nganh"]
            for i in range(len(self.major_name)):
                muc = bang.get(str(self.major_code[i]))
                if muc:
                    self.to_hop_xet_tuyen[i] = set(muc["to_hop"])
                    self.diem_chuan[i] = {
                        y: v for y, v in muc["diem_chuan_thpt"].items() if v is not None
                    }

    # ── Dựng 43 đặc trưng ───────────────────────────────────────────────────
    def build_features(
        self,
        interests: list[int],
        subject_group: str,
        scores: list[float] | None,
        gender: str,
        goal: str,
    ) -> np.ndarray:
        if len(interests) != 10:
            raise ValueError("Cần đúng 10 câu Likert")
        if any(not (1 <= int(v) <= 5) for v in interests):
            raise ValueError("Mỗi câu Likert phải nằm trong 1..5")
        if subject_group not in TO_HOP_MAP:
            raise ValueError(
                f"Tổ hợp '{subject_group}' không hợp lệ. Hợp lệ: {sorted(TO_HOP_MAP)}"
            )
        if goal not in MUC_TIEU_MA:
            raise ValueError(
                f"Mục tiêu '{goal}' không hợp lệ. Hợp lệ: {list(MUC_TIEU_MA)}"
            )
        if scores and len(scores) != 3:
            raise ValueError("Phải nhập đúng 3 điểm, theo thứ tự môn của tổ hợp")

        gt = {}

        # (1) 10 câu Likert — giữ nguyên thang 1..5
        for c, v in zip(self.columns[:10], interests, strict=False):
            gt[c] = float(int(v))

        # (2) 10 cột điểm thô — CHỈ 3 môn của tổ hợp có giá trị, còn lại để trống
        #     (XGBoost tự học hướng rẽ cho giá trị thiếu — đừng điền 0)
        raw = {f"diem_{m}": np.nan for m in MON}
        if scores:
            for mon, d in zip(TO_HOP_MAP[subject_group], scores, strict=False):
                if not (0 <= float(d) <= 10):
                    raise ValueError(f"Điểm môn {mon} phải trong khoảng 0..10")
                raw[f"diem_{mon}"] = float(d)
        gt.update(raw)

        # (3) Chuẩn hoá z-score theo từng môn, dùng thống kê CỦA TẬP TRAIN.
        #     mean/max/min bỏ qua ô trống — giống pandas .mean(axis=1) lúc train.
        z = np.array(
            [
                (raw[f"diem_{m}"] - self.score_stats[f"diem_{m}"]["mean"])
                / self.score_stats[f"diem_{m}"]["std"]
                for m in MON
            ],
            dtype=float,
        )
        co_diem = ~np.isnan(z)
        if co_diem.any():
            gt["diem_tb_z"] = float(z[co_diem].mean())
            gt["diem_max_z"] = float(z[co_diem].max())
            gt["diem_min_z"] = float(z[co_diem].min())
        else:
            gt["diem_tb_z"] = gt["diem_max_z"] = gt["diem_min_z"] = np.nan

        # (4) Nhân khẩu học và định hướng
        gt["gioi_tinh_ma"] = 1.0 if str(gender).strip() == "Nam" else 0.0
        gt["muc_tieu_ma"] = float(MUC_TIEU_MA[goal])

        # (5) One-hot tổ hợp + one-hot nhóm môn
        for t in self.subject_groups:
            gt[f"to_hop_{t}"] = 1.0 if t == subject_group else 0.0
        nhom = NHOM_TO_HOP.get(subject_group, "HH")
        for g in ("TN", "XH", "HH"):
            gt[f"nhom_to_hop_{g}"] = 1.0 if g == nhom else 0.0

        thieu = set(self.columns) - set(gt)
        if thieu:
            raise RuntimeError(f"Dựng thiếu đặc trưng: {sorted(thieu)}")
        return np.array([[gt[c] for c in self.columns]], dtype=float)

    def _tuyen_sinh(self, j: int, tong_diem: float | None) -> dict | None:
        """Đối chiếu điểm thí sinh với điểm chuẩn 3 năm gần nhất.

        Dùng KHOẢNG min–max của 3 năm chứ không dùng một năm, vì điểm chuẩn HUIT
        dao động trung bình 2,26 điểm giữa các năm (cao nhất 4,25 ở ngành Điều
        khiển & TĐH). Một năm là một điểm dữ liệu, ba năm mới thành khoảng tin cậy.

        Phần này CHỈ để hiển thị, KHÔNG ảnh hưởng tới thứ hạng gợi ý — đo trên
        cross-validation cho thấy lọc theo điểm chuẩn làm giảm độ chính xác
        (36,8% → 36,2%), do nhiều thí sinh đỗ bằng học bạ / ĐGNL.
        """
        dc = self.diem_chuan.get(j)
        if not dc:
            return None
        nam = sorted(dc)
        gia_tri = [dc[y] for y in nam]
        thap, cao, moi_nhat = min(gia_tri), max(gia_tri), dc[nam[-1]]

        muc = None
        if tong_diem is not None:
            if tong_diem >= cao:
                muc = "an_toan"
            elif tong_diem >= thap:
                muc = "co_kha_nang"
            else:
                muc = "rui_ro_cao"

        if len(gia_tri) >= 2:
            chenh = gia_tri[-1] - gia_tri[0]
            xu_huong = "tang" if chenh >= 0.5 else "giam" if chenh <= -0.5 else "on_dinh"
        else:
            xu_huong = "khong_du_du_lieu"

        return {
            "cutoffs": dc,
            "min": round(thap, 2),
            "max": round(cao, 2),
            "latest": round(moi_nhat, 2),
            "trend": xu_huong,
            "level": muc,
            "gap": None if tong_diem is None else round(tong_diem - moi_nhat, 2),
        }

    # ── Suy diễn ────────────────────────────────────────────────────────────
    def recommend(
        self,
        interests: list[int],
        subject_group: str,
        gender: str,
        goal: str,
        scores: list[float] | None = None,
        field_id: int | None = None,
        limit: int = 5,
        n_fields: int = 3,
        soft_filter: float = 0.0,
        filter_subject_group: bool = True,
    ) -> dict:
        """
        field_id = None  → chế độ Khám phá (explore) — mô hình tự đoán khối
        field_id = 0..6  → chế độ Tư vấn  (guided)  — chỉ xếp hạng trong khối đã chọn

        soft_filter: 0.0 = lọc cứng, ngành ngoài khối bị loại hẳn (khớp số liệu khoá luận).
             0.15 = lọc mềm, ngành ngoài khối vẫn còn cơ hội nếu người dùng chọn sai khối.
        """
        X = self.build_features(interests, subject_group, scores, gender, goal)
        p1 = self.m1.predict_proba(X)[0]  # (7,)
        p2 = self.m2.predict_proba(X)[0]  # (39,)

        # Hạ trọng số ngành KHÔNG xét tổ hợp của thí sinh (lọc mềm, không loại hẳn)
        n_ngoai = 0
        if filter_subject_group and self.to_hop_xet_tuyen:
            trong_to_hop = np.array(
                [subject_group in self.to_hop_xet_tuyen.get(j, set()) for j in range(len(p2))]
            )
            n_ngoai = int((~trong_to_hop).sum())
            p2 = p2 * np.where(trong_to_hop, 1.0, TRONG_SO_NGOAI_TO_HOP)

        if field_id is None:
            mode = "explore"
            p = p2 * np.power(self.M @ p1, BETA)
        else:
            if not (0 <= field_id < len(self.field_name)):
                raise ValueError(f"Khối ngành phải trong 0..{len(self.field_name) - 1}")
            mode = "guided"
            in_field = self.M[:, field_id] == 1
            p = p2 * np.where(in_field, 1.0, soft_filter)

        total = p.sum()
        p = p / total if total > 0 else np.full_like(p, 1.0 / len(p))

        # Chỉ lấy ngành còn xác suất > 0. Nếu cắt thẳng `argsort(-p)[:limit]` thì khối
        # ít ngành hơn `limit` (Luật và Ngoại ngữ đều chỉ có 2 ngành) sẽ bị độn thêm
        # ngành xác suất 0 cho đủ chỗ — người dùng chọn khối Luật lại thấy Ngôn ngữ Anh.
        order = [int(j) for j in np.argsort(-p) if p[j] > 0][:limit]

        tong_diem = float(sum(scores)) if scores else None

        warnings: list[str] = []
        if not scores:
            warnings.append(
                "Chưa có điểm thi nên gợi ý kém chính xác hơn "
                "(Top-3 khoảng 28% thay vì 39%). Thi xong nên làm lại."
            )
        if filter_subject_group and n_ngoai:
            warnings.append(
                f"{n_ngoai}/{len(p2)} ngành không xét tổ hợp {subject_group} đã được hạ "
                "ưu tiên (không loại hẳn, vì có thể xét bằng học bạ hoặc ĐGNL)."
            )
        if mode == "guided" and soft_filter == 0.0:
            warnings.append(
                "Đang lọc cứng theo khối bạn chọn — nếu chọn sai khối thì "
                "ngành phù hợp sẽ không xuất hiện."
            )
        if len(order) < limit:
            warnings.append(
                f"Chỉ có {len(order)} ngành phù hợp nên không đủ {limit} gợi ý"
                + (
                    f" — nhóm ngành \"{self.field_name[field_id]}\" chỉ đào tạo "
                    f"{len(order)} ngành."
                    if mode == "guided"
                    else "."
                )
            )

        # Phân bố nhóm ngành CUỐI CÙNG = cộng xác suất các ngành trong cùng nhóm.
        # Phải dùng đại lượng này để hiển thị, không dùng p1: p1 là đầu ra thô của
        # tầng 1, còn danh sách ngành lại xếp theo p = p2 × (M@p1)^β. Hai đại lượng
        # khác nhau nên banner cũ (lấy argmax p1) có thể chỉ một nhóm, trong khi
        # ngành #1 bên dưới lại thuộc nhóm khác — 16/102 sinh viên thật bị vậy.
        p_field = self.M.T @ p

        return {
            "mode": mode,
            "fields": [
                {
                    "id": int(k),
                    "name": self.field_name[int(k)],
                    "probability": round(float(p_field[k]), 4),
                }
                for k in np.argsort(-p_field)[:n_fields]
            ],
            # Dự đoán thô của riêng tầng 1 — KHÔNG dùng để xếp hạng ở chế độ tư vấn.
            # Giữ lại để người dùng đối chiếu "mô hình tự đoán" với nhóm họ đã chọn.
            "fieldsStage1": [
                {
                    "id": int(k),
                    "name": self.field_name[int(k)],
                    "probability": round(float(p1[k]), 4),
                }
                for k in np.argsort(-p1)[:n_fields]
            ],
            "majors": [
                {
                    "rank": i + 1,
                    "code": str(self.major_code[int(j)]),
                    "name": self.major_name[int(j)],
                    "field": self.field_name[self.field_of_major[int(j)]],
                    "score": round(float(p[j]), 4),
                    "subjectGroups": sorted(self.to_hop_xet_tuyen.get(int(j), [])),
                    "admission": self._tuyen_sinh(int(j), tong_diem),
                }
                for i, j in enumerate(order)
            ],
            "totalScore": tong_diem,
            "warnings": warnings,
        }


@lru_cache(maxsize=1)
def get_predictor() -> MajorPredictor:
    """Nạp mô hình một lần duy nhất cho cả tiến trình."""
    return MajorPredictor()
