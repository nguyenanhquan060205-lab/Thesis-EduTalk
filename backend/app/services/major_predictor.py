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

        # Booster thô dùng cho TreeSHAP. Lấy sẵn một lần vì get_booster() không rẻ.
        #
        # Dùng pred_contribs của XGBoost chứ KHÔNG dùng thư viện `shap`: shap 0.49
        # đọc base_score của mô hình đa lớp XGBoost 3.x sai kiểu (nó mong một số vô
        # hướng, XGBoost lưu vector mỗi lớp một phần tử) nên vỡ ở mọi cách gọi.
        # pred_contribs chạy đúng cùng thuật toán TreeSHAP, ngay trong xgboost.
        self._b1 = self.m1.get_booster()
        self._b2 = self.m2.get_booster()

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
    # ── Giải thích bằng SHAP ────────────────────────────────────────────────
    #
    # Điểm xếp hạng là tích hai xác suất: P(ngành) ∝ P₂(ngành) × P₁(khối)^β.
    # Nhân trong không gian xác suất là CỘNG trong không gian log, nên với một
    # thí sinh cố định:
    #
    #     s(ngành) = margin₂(ngành) + β·margin₁(khối) + C
    #              = [base] + Σᵢ [ φ₂ᵢ(ngành) + β·φ₁ᵢ(khối) ]
    #
    # C là hằng số chuẩn hoá softmax, giống nhau cho cả 39 ngành của thí sinh đó
    # nên không đổi thứ hạng. Vậy đóng góp hợp nhất của đặc trưng i là CHÍNH XÁC
    # φ₂ᵢ + β·φ₁ᵢ — Giai đoạn 10 đã kiểm chứng công thức này tái tạo đúng 100%
    # thứ hạng 39 ngành trên cả 102 mẫu kiểm tra.

    TEN_DEP = {
        "likert_nang_dong": "Năng động",
        "likert_huong_noi": "Hướng nội",
        "likert_sang_tao": "Sáng tạo",
        "likert_logic": "Tư duy logic",
        "likert_to_mo": "Tò mò",
        "likert_thi_nghiem": "Thích thí nghiệm",
        "likert_moi_truong": "Quan tâm môi trường",
        "likert_dinh_duong": "Quan tâm dinh dưỡng",
        "likert_tranh_luan": "Thích tranh luận",
        "likert_thiet_ke": "Thích thiết kế",
        # z-score: KHÔNG phải "điểm trung bình" mà là mặt bằng so với chung.
        # Dịch nhầm thì thí sinh thấy "Điểm trung bình: -0,34" sẽ hiểu sai hẳn.
        "diem_tb_z": "Mặt bằng điểm",
        "diem_max_z": "Môn mạnh nhất",
        "diem_min_z": "Môn yếu nhất",
        "gioi_tinh_ma": "Giới tính",
        # Giữ nhãn ngắn cho vừa cột bên trái — giá trị ("Nghiên cứu"/"Đi làm")
        # ngay bên dưới đã nói rõ đây là mục tiêu gì.
        "muc_tieu_ma": "Mục tiêu",
        "nhom_to_hop_TN": "Nhóm Tự nhiên",
        "nhom_to_hop_XH": "Nhóm Xã hội",
        "nhom_to_hop_HH": "Nhóm Hỗn hợp",
    }

    def _hien_voi_thi_sinh(self, cot: str, gia_tri: float) -> bool:
        """Đặc trưng này có được nêu trong phần giải thích cho THÍ SINH không?

        Dùng danh sách CHO PHÉP thay vì danh sách chặn: chỉ nêu những thứ thí
        sinh trực tiếp khai và hiểu được ý nghĩa.

        - 10 câu sở thích          → hiện
        - điểm các môn ĐÃ THI      → hiện
        - mục tiêu sau tốt nghiệp  → hiện
        - còn lại                  → gộp vào "yếu tố khác"

        Bốn nhóm bị gộp và lý do:

        * **Tổ hợp** (15 cột one-hot + 3 cột nhóm) — thí sinh chỉ chọn MỘT tổ hợp,
          bung ra 18 cột thì mỗi cột một mẩu nhỏ, hiện lên vừa rối vừa trùng
          thông tin với danh sách tổ hợp đã in ngay phía trên thẻ ngành.
        * **Môn KHÔNG thi** — vẫn có đóng góp hợp lệ vì XGBoost học một hướng rẽ
          riêng cho nhánh khuyết, nhưng dòng "Điểm Lý · không thi · +0,26" đọc như
          vô nghĩa, và cũng trùng thông tin với tổ hợp.
        * **z-score điểm** (mặt bằng / mạnh nhất / yếu nhất) — suy ra từ chính 3
          môn đã hiện ở trên, nêu thêm là đếm hai lần cùng một thứ.
        * **Giới tính** — lọt top 6 ở 41/102 thí sinh, đứng đầu ở 15 em. Nêu một
          đặc điểm không thể thay đổi vừa không giúp được gì, vừa củng cố định
          kiến. Vẫn tham gia dự đoán; trang quản trị và báo cáo thấy đầy đủ.
        """
        if cot.startswith("likert_"):
            return True
        if cot == "muc_tieu_ma":
            return True
        if cot.startswith("diem_") and not cot.endswith("_z"):
            return not np.isnan(gia_tri)  # chỉ môn thí sinh thật sự thi
        return False

    # Cột điểm lưu không dấu (diem_Toan) vì tên cột phải khớp lúc train.
    # Hiện ra cho người đọc thì phải có dấu.
    TEN_MON = {
        "Toan": "Toán", "Ly": "Lý", "Hoa": "Hóa", "Anh": "Tiếng Anh",
        "Van": "Ngữ văn", "Su": "Lịch sử", "Sinh": "Sinh học",
        "Dia": "Địa lý", "Gdktpl": "GD Kinh tế & Pháp luật", "Tin": "Tin học",
    }

    def _ten_dep(self, cot: str) -> str:
        if cot in self.TEN_DEP:
            return self.TEN_DEP[cot]
        if cot.startswith("diem_"):
            return "Điểm " + self.TEN_MON.get(cot[5:], cot[5:])
        if cot.startswith("to_hop_"):
            return "Tổ hợp " + cot[7:]
        return cot

    @staticmethod
    def muc_do(phan_tram: float) -> str:
        """Tỷ trọng → chữ mô tả mức độ.

        NƠI DUY NHẤT định nghĩa các mức này. Giao diện và prompt của trợ lý đều
        dùng lại chuỗi trả về từ đây — trước kia mỗi bên tự đặt ngưỡng riêng nên
        bảng ghi "mạnh" mà câu văn bên dưới lại nói "ảnh hưởng nhẹ thôi".
        """
        if phan_tram >= 25:
            return "rất mạnh"
        if phan_tram >= 10:
            return "mạnh"
        if phan_tram >= 3:
            return "vừa"
        return "không đáng kể"

    def _mo_ta_gia_tri(self, cot: str, v: float) -> str:
        """Chuỗi hiển thị của giá trị đặc trưng — xử lý riêng ô khuyết.

        Ô điểm khuyết vẫn có đóng góp SHAP hợp lệ vì XGBoost học một hướng rẽ
        riêng cho nhánh khuyết: "không thi môn này" tự nó đã là thông tin. Nhưng
        hiện ra "Điểm Hóa: nan" thì vô nghĩa với người đọc.
        """
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return "không thi" if cot.startswith("diem_") else "chưa có"
        if cot.startswith("likert_"):
            return f"{v:.0f}/5"
        if cot == "muc_tieu_ma":
            # Trả lại tên mục tiêu thay vì mã số — "2" không nói lên điều gì
            nguoc = {ma: ten for ten, ma in MUC_TIEU_MA.items()}
            return nguoc.get(int(v), str(int(v)))
        if cot == "gioi_tinh_ma":
            return "Nam" if int(v) == 1 else "Nữ"
        if cot.endswith("_z"):
            return f"{v:+.2f}"
        if cot.startswith(("to_hop_", "nhom_to_hop_")):
            return "có" if v else "không"
        return f"{v:.4g}"

    def _shap(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Giá trị SHAP của MỘT thí sinh cho mọi lớp, cả hai tầng.

        Tính một lần rồi dùng lại cho mọi ngành: SHAP của một thí sinh là như
        nhau, giải thích từng ngành chỉ khác ở chỉ số truy xuất. Gọi lại theo
        từng ngành là nhân đôi, nhân ba công việc mà không được gì.
        """
        from xgboost import DMatrix

        d = DMatrix(X, feature_names=self.columns)
        return (
            self._b1.predict(d, pred_contribs=True)[0],  # (7, n+1)
            self._b2.predict(d, pred_contribs=True)[0],  # (39, n+1)
        )

    def giai_thich(
        self,
        j_nganh: int,
        mode: str,
        c1: np.ndarray,
        c2: np.ndarray,
        X: np.ndarray,
        top_an: int = 8,
    ) -> dict:
        """Vì sao mô hình xếp `j_nganh` ở vị trí đó, cho một thí sinh.

        Trả **đủ** những gì thí sinh đã tự khai — 3 điểm môn đã thi, 10 câu sở
        thích, mục tiêu — chứ không cắt lấy vài mục mạnh nhất. Người dùng nhập
        14 thứ thì muốn thấy cả 14 thứ đó ảnh hưởng ra sao, kể cả những mục gần
        như bằng không.

        `top_an` giới hạn số mục BỊ ẨN gửi kèm (tổ hợp, z-score, giới tính, môn
        không thi) — chỉ trang quản trị dùng tới, nên lấy vài cái mạnh nhất là đủ.

        `c1`, `c2` lấy từ `_shap()` — truyền vào để không tính lại theo từng ngành.

        `mode` = "guided" thì P₁ bị ép bằng 1 nên tầng 1 KHÔNG tham gia xếp hạng,
        do đó cũng không được góp mặt trong phần giải thích.
        """
        k_khoi = self.field_of_major[int(j_nganh)]

        he_so_t1 = 0.0 if mode == "guided" else BETA
        phi = c2[j_nganh, :-1] + he_so_t1 * c1[k_khoi, :-1]

        tong_abs = float(np.abs(phi).sum()) or 1.0
        thu_tu = [int(k) for k in np.argsort(-np.abs(phi))]

        muc, chi_so_hien = [], []
        for k in thu_tu:
            cot = self.columns[k]
            gia_tri = float(X[0, k])
            an = not self._hien_voi_thi_sinh(cot, gia_tri)
            muc.append(
                {
                    "ten": self._ten_dep(cot),
                    "giaTri": self._mo_ta_gia_tri(cot, gia_tri),
                    "dongGop": round(float(phi[k]), 4),
                    "phanTram": round(abs(float(phi[k])) / tong_abs * 100, 1),
                    "mucDo": self.muc_do(abs(float(phi[k])) / tong_abs * 100),
                    "tang2": round(float(c2[j_nganh, k]), 4),
                    "tang1": round(float(he_so_t1 * c1[k_khoi, k]), 4),
                    "anVoiThiSinh": an,
                }
            )
            if not an:
                chi_so_hien.append(k)

        # Giữ đủ mục hiện, nhưng chỉ giữ vài mục ẩn mạnh nhất — gửi cả 29 mục ẩn
        # cho mỗi ngành chỉ làm phình payload mà không ai đọc.
        da_du_an = 0
        loc = []
        for m in muc:
            if m["anVoiThiSinh"]:
                if da_du_an >= top_an:
                    continue
                da_du_an += 1
            loc.append(m)
        muc = loc

        # Gộp MỌI thứ thí sinh không nhìn thấy: đặc trưng ngoài top, đặc trưng bị
        # ẩn (giới tính), và môn không thi. Tính bằng hiệu để các thanh trên màn
        # hình luôn cộng đúng bằng tổng — thiếu dòng này thì người xem tưởng 6
        # thanh là toàn bộ câu chuyện rồi đem so giữa các ngành, mà phép so đó
        # không hợp lệ vì mỗi ngành có điểm nền riêng.
        tong = float(phi.sum())
        con_lai = tong - float(sum(phi[k] for k in chi_so_hien))
        # Phần trăm của cụm "yếu tố khác" tính theo |φ| để cộng với các dòng hiện
        # ra đúng 100% — nếu lấy |tổng đã bù trừ| thì các phần trăm không khớp.
        pt_con_lai = (
            (tong_abs - float(sum(abs(phi[k]) for k in chi_so_hien))) / tong_abs * 100
        )

        return {
            "mode": mode,
            "base": round(float(c2[j_nganh, -1] + he_so_t1 * c1[k_khoi, -1]), 4),
            "features": muc,
            "soConLai": len(self.columns) - len(chi_so_hien),
            "dongGopConLai": round(con_lai, 4),
            "phanTramConLai": round(pt_con_lai, 1),
            "tongDongGop": round(tong, 4),
        }

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

        _c1, _c2 = self._shap(X)   # tính một lần, dùng lại cho mọi ngành

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
                    # Giải thích chỉ tính cho các ngành thật sự hiển thị. Toàn bộ
                    # 39 ngành cũng chỉ tốn ~4ms, nhưng không có gì để dùng tới.
                    "explain": self.giai_thich(int(j), mode, _c1, _c2, X),
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
