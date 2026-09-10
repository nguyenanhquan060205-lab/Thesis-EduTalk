"""Suy diễn gợi ý ngành bằng mô hình của `research3/` — 9 nhóm ngành chia lại.

Kiến trúc KHÁC HẲN pipeline cũ ở `research/`:

    research/   2 tầng  : P(ngành) ∝ P₂(ngành) × P₁(khối)^β,  43 đặc trưng
    research3/  1 + 9   : fieldId=None → model_nganh.json  (39 lớp)
                          fieldId=k    → model_khoi{k}.json (chỉ ngành trong nhóm k)
                          63 đặc trưng

Chuỗi `cach_dung` trong `lop_va_dac_trung.json` chính là hợp đồng đó, do notebook
Giai đoạn 10 ghi ra.

QUAN TRỌNG — cách dựng 63 đặc trưng dưới đây phải GIỐNG HỆT hàm `dac_trung()` trong
`research3/scripts/nbgen.py` (khối `DU_LIEU`). Lệch một chi tiết thì mô hình vẫn chạy,
vẫn trả kết quả trông hợp lý, nhưng sai âm thầm. Mọi công thức được chép nguyên, không
gõ lại theo trí nhớ. Bốn chỗ dễ sai nhất đã ghi chú tại chỗ.

Đánh đổi đã biết khi thay pipeline cũ (đo trên cùng 102 em kiểm tra, cùng seed 42):

    chế độ khám phá  Top-3   39,2%  →  35,3%   (kém đi 3,9đ)
    chế độ tư vấn    Top-3   69,6%  →  86,3%   (hơn 16,7đ)
    điểm kỹ năng             40,2%  →  53,4%   (hơn thật 13,2đ, đã trừ đoán bừa)

Lùi về pipeline cũ: đặt biến môi trường EDUTALK_PIPELINE=legacy
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np

from app.services.major_predictor import (
    MUC_TIEU_MA,
    TO_HOP_MAP,
    TRONG_SO_NGOAI_TO_HOP,
    MajorPredictor,
)


def _goc_repo() -> Path:
    return Path(__file__).resolve().parents[3]


def _model_dir_r3() -> Path:
    """Thư mục chứa model_nganh.json và model_khoi*.json."""
    tu_env = os.getenv("EDUTALK_MODEL_DIR")
    if tu_env:
        return Path(tu_env)
    return _goc_repo() / "research3" / "data" / "processed" / "10_ChotModel"


class MajorPredictorR3:
    """Nạp mô hình một lần rồi tái sử dụng. Đừng tạo trực tiếp — dùng get_predictor()."""

    def __init__(self, thu_muc: Path | None = None) -> None:
        from xgboost import XGBClassifier

        goc = thu_muc or _model_dir_r3()
        f_meta = goc / "lop_va_dac_trung.json"
        thieu = [p for p in (f_meta, goc / "model_nganh.json") if not p.exists()]
        if thieu:
            raise FileNotFoundError(
                "Thiếu tệp mô hình: "
                + ", ".join(str(p) for p in thieu)
                + ". Đặt EDUTALK_MODEL_DIR trỏ tới research3/data/processed/10_ChotModel, "
                "hoặc EDUTALK_PIPELINE=legacy để dùng lại pipeline cũ."
            )

        M = json.loads(f_meta.read_text(encoding="utf-8"))
        self.columns: list[str] = M["ten_dac_trung"]
        self.subject_groups: list[str] = M["to_hop"]

        # Thứ tự 10 cột điểm PHẢI lấy từ file, không hằng số hoá: research3 xếp
        # Van, Dia, Anh, Toan… còn pipeline cũ xếp Toan, Ly, Hoa… Hai bên khác thứ tự,
        # mà diem_mu/diem_sd bên dưới đi theo đúng thứ tự này.
        self.mon: list[str] = [
            c[5:]
            for c in self.columns
            if c.startswith("diem_") and c not in ("diem_tb", "diem_lech")
        ]
        self.diem_mu = np.asarray(M["diem_mu"], dtype=float)
        self.diem_sd = np.asarray(M["diem_sd"], dtype=float)

        # ── Lớp ngành và nhóm ────────────────────────────────────────────────
        nganh = [int(x) for x in M["nganh_theo_thu_tu_lop"]]
        self.major_code = dict(enumerate(nganh))
        self.i_nganh = {ma: i for i, ma in enumerate(nganh)}

        nganh_to_nhom = {int(k): int(v) for k, v in M["nganh_to_nhom"].items()}
        self.field_of_major = {i: nganh_to_nhom[ma] for i, ma in self.major_code.items()}
        self.field_name = {int(k): v for k, v in M["ten_nhom"].items()}

        # Lớp cục bộ của từng model nhóm: model_khoi{k} xuất ra len(lop_theo_khoi[k])
        # xác suất, theo đúng thứ tự mã ngành trong danh sách này.
        self.lop_theo_khoi: dict[int, list[int]] = {
            int(k): [self.i_nganh[int(ma)] for ma in v]
            for k, v in M["lop_theo_khoi"].items()
        }

        # Tên ngành không nằm trong file mô hình — đọc từ bảng ánh xạ của Giai đoạn 1.
        self.major_name = {i: str(ma) for i, ma in self.major_code.items()}
        f_map = goc.parent / "01_LamSachKhaoSat" / "mapping.json"
        if f_map.exists():
            ten = json.loads(f_map.read_text(encoding="utf-8"))["ma_to_ten"]
            self.major_name = {
                i: ten.get(str(ma), str(ma)) for i, ma in self.major_code.items()
            }

        # ── Mô hình ──────────────────────────────────────────────────────────
        self.m_nganh = XGBClassifier()
        self.m_nganh.load_model(goc / "model_nganh.json")
        self._b_nganh = self.m_nganh.get_booster()

        self.m_khoi: dict[int, object] = {}
        self._b_khoi: dict[int, object] = {}
        for k in self.lop_theo_khoi:
            f = goc / f"model_khoi{k}.json"
            if not f.exists():
                continue
            mk = XGBClassifier()
            mk.load_model(f)
            self.m_khoi[k] = mk
            self._b_khoi[k] = mk.get_booster()

        # ── Phân tầng: nhóm nghẽn cổ chai đoán lĩnh vực con trước ────────────
        # P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con). Đây là hướng cải
        # tiến DUY NHẤT có tác dụng trong 10 hướng đã thử (+4,8đ). Bỏ qua khối này
        # thì Top-3 tư vấn tụt 86,3% → 83,3%, tức backend chạy khác báo cáo.
        self.phan_tang: dict[int, dict] = {}
        for gs, muc in M.get("phan_tang", {}).items():
            g = int(gs)
            f_sub = goc / f"model_tang{g}_sub.json"
            if not f_sub.exists():
                continue
            m_sub = XGBClassifier()
            m_sub.load_model(f_sub)
            con: dict[int, tuple[object | None, list[int]]] = {}
            for ks, c in muc["con"].items():
                k = int(ks)
                js = [self.i_nganh[int(ma)] for ma in c["nganh"]]
                mc = None
                if c["co_model"]:
                    f_c = goc / f"model_tang{g}_{k}.json"
                    if not f_c.exists():
                        con = {}
                        break
                    mc = XGBClassifier()
                    mc.load_model(f_c)
                con[k] = (mc, js)
            if con:
                self.phan_tang[g] = {"sub": m_sub, "con": con}

        # Bản đồ gộp cột → đơn vị hiển thị, dựng một lần vì không đổi theo thí sinh.
        self._don_vi = self._dung_don_vi_hien()

        # ── Tổ hợp xét tuyển + điểm chuẩn ────────────────────────────────────
        # Bảng tuyển sinh nằm ở pipeline cũ và dùng chung cho mọi cách nhóm — nó là
        # dữ liệu của trường, không phải kết quả huấn luyện.
        self.to_hop_xet_tuyen: dict[int, set[str]] = {}
        self.diem_chuan: dict[int, dict[str, float]] = {}
        for ts in (
            goc / "tuyen_sinh_huit_2026.json",
            _goc_repo() / "research" / "data" / "processed" / "tuyen_sinh_huit_2026.json",
        ):
            if not ts.exists():
                continue
            bang = json.loads(ts.read_text(encoding="utf-8"))["nganh"]
            for i, ma in self.major_code.items():
                muc = bang.get(str(ma))
                if muc:
                    self.to_hop_xet_tuyen[i] = set(muc["to_hop"])
                    self.diem_chuan[i] = {
                        y: v for y, v in muc["diem_chuan_thpt"].items() if v is not None
                    }
            break

    # ── Dựng 63 đặc trưng ───────────────────────────────────────────────────
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

        gt: dict[str, float] = {}
        cot_likert = [c for c in self.columns[:10]]
        Lk = np.array([float(int(v)) for v in interests], dtype=float)

        # (1) 10 câu Likert thô
        for c, v in zip(cot_likert, Lk, strict=False):
            gt[c] = float(v)

        # (2) Likert chuẩn hoá theo người: notebook chỉ TRỪ TRUNG BÌNH, KHÔNG chia
        #     độ lệch. Chia thêm là một mô hình khác hẳn.
        mu = float(np.nanmean(Lk))
        sd = float(np.nanstd(Lk))          # ddof = 0, giống np.nanstd của notebook
        sd = 1.0 if (sd == 0 or np.isnan(sd)) else sd
        for c, v in zip(cot_likert, Lk, strict=False):
            gt[f"ips_{c}"] = float(v) - mu
        # `likert_dolech` lưu giá trị ĐÃ THAY THẾ (1.0 khi độ lệch bằng 0), vì notebook
        # gán lại `sd` trước khi đưa vào bảng.
        gt["likert_tb"] = mu
        gt["likert_dolech"] = sd

        # (3) 10 cột điểm thô — chỉ 3 môn của tổ hợp có giá trị, còn lại để trống.
        #     XGBoost tự học hướng rẽ cho ô khuyết, đừng điền 0.
        raw = {m: np.nan for m in self.mon}
        if scores:
            for mon, d in zip(TO_HOP_MAP[subject_group], scores, strict=False):
                if not (0 <= float(d) <= 10):
                    raise ValueError(f"Điểm môn {mon} phải trong khoảng 0..10")
                raw[mon] = float(d)
        Dm = np.array([raw[m] for m in self.mon], dtype=float)
        for m, v in zip(self.mon, Dm, strict=False):
            gt[f"diem_{m}"] = float(v)

        # (4) z-score từng môn, dùng thống kê CỦA TẬP TRAIN
        z = (Dm - self.diem_mu) / self.diem_sd
        for m, v in zip(self.mon, z, strict=False):
            gt[f"z_diem_{m}"] = float(v)

        # (5) Phái sinh. `diem_lech` là MAX − MIN của điểm THÔ (không phải độ lệch
        #     chuẩn), còn `z_max` là MAX của z — không có `z_min` trong lược đồ.
        with np.errstate(invalid="ignore"):
            co = ~np.isnan(Dm)
            if co.any():
                gt["diem_tb"] = float(np.nanmean(Dm))
                gt["diem_lech"] = float(np.nanmax(Dm) - np.nanmin(Dm))
                gt["z_tb"] = float(np.nanmean(z))
                gt["z_max"] = float(np.nanmax(z))
            else:
                gt["diem_tb"] = gt["diem_lech"] = np.nan
                gt["z_tb"] = gt["z_max"] = np.nan

        # (6) One-hot tổ hợp. research3 KHÔNG có 3 cột nhom_to_hop_* như pipeline cũ.
        for t in self.subject_groups:
            gt[f"th_{t}"] = 1.0 if t == subject_group else 0.0

        # (7) Nhân khẩu học và định hướng
        gt["gioi_tinh_nam"] = 1.0 if str(gender).strip() == "Nam" else 0.0
        gt["muc_tieu"] = float(MUC_TIEU_MA[goal])

        thieu = set(self.columns) - set(gt)
        if thieu:
            raise RuntimeError(f"Dựng thiếu đặc trưng: {sorted(thieu)}")
        return np.array([[gt[c] for c in self.columns]], dtype=float)

    # Dùng lại nguyên vẹn từ pipeline cũ — chỉ cần self.diem_chuan, không phụ thuộc
    # kiến trúc mô hình. Đây là phần hiển thị điểm chuẩn, không tham gia xếp hạng.
    _tuyen_sinh = MajorPredictor._tuyen_sinh
    # `muc_do` là staticmethod — truy cập qua lớp trả về hàm trần, gán thẳng sẽ biến nó
    # thành phương thức thường và `self` chiếm mất tham số đầu.
    muc_do = staticmethod(MajorPredictor.muc_do)
    TEN_MON = MajorPredictor.TEN_MON

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
        "likert_tb": "Mức chấm trung bình",
        "likert_dolech": "Độ dao động khi chấm",
        "diem_tb": "Điểm trung bình 3 môn",
        "diem_lech": "Chênh môn cao nhất − thấp nhất",
        "z_tb": "Mặt bằng điểm",
        "z_max": "Môn mạnh nhất",
        "gioi_tinh_nam": "Giới tính",
        "muc_tieu": "Mục tiêu",
    }

    def _ten_dep(self, cot: str) -> str:
        if cot in self.TEN_DEP:
            return self.TEN_DEP[cot]
        if cot.startswith("ips_likert_"):
            goc = self.TEN_DEP.get(cot[4:], cot[4:])
            return f"{goc} (tương đối)"
        if cot.startswith("z_diem_"):
            return "Mặt bằng " + self.TEN_MON.get(cot[7:], cot[7:])
        if cot.startswith("diem_"):
            return "Điểm " + self.TEN_MON.get(cot[5:], cot[5:])
        if cot.startswith("th_"):
            return "Tổ hợp " + cot[3:]
        return cot

    def _dung_don_vi_hien(self) -> list[tuple[str, list[int]]]:
        """Gom 63 cột thành các ĐƠN VỊ HIỂN THỊ, mỗi đơn vị là một thứ thí sinh đã khai.

        research3 tách mỗi câu trả lời thành hai cột: bản thô (`likert_logic`) và bản
        chuẩn hoá theo người (`ips_likert_logic`); điểm cũng vậy (`diem_Toan` và
        `z_diem_Toan`). Đó là **cùng một dữ liệu người dùng nhập**, chỉ khác cách mã
        hoá. Hiện cột thô rồi giấu cột chuẩn hoá làm mất phần lớn đóng góp thật — đo
        thử cho thấy 79% rơi vào cụm "yếu tố khác", nghĩa là bảng giải thích gần như
        không nói được gì.

        Vì SHAP cộng tính, đóng góp của một câu trả lời chính là TỔNG đóng góp của các
        cột mã hoá nó. Gộp lại vừa đúng toán, vừa cho ra đúng 14 dòng khớp với 14 thứ
        thí sinh thật sự nhập vào biểu mẫu.
        """
        vi_tri = {c: i for i, c in enumerate(self.columns)}
        don_vi: list[tuple[str, list[int]]] = []
        for c in self.columns:
            if c.startswith("likert_") and c not in ("likert_tb", "likert_dolech"):
                don_vi.append((c, [i for i in (vi_tri.get(c), vi_tri.get(f"ips_{c}"))
                                   if i is not None]))
            elif c.startswith("diem_") and c not in ("diem_tb", "diem_lech"):
                don_vi.append((c, [i for i in (vi_tri.get(c), vi_tri.get(f"z_{c}"))
                                   if i is not None]))
            elif c == "muc_tieu":
                don_vi.append((c, [vi_tri[c]]))
        return don_vi

    def _hien_voi_thi_sinh(self, cot: str, gia_tri: float) -> bool:
        """Đơn vị này có được nêu cho THÍ SINH không?

        Danh sách CHO PHÉP: 10 câu sở thích, các môn ĐÃ THI, và mục tiêu sau tốt
        nghiệp. Gộp vào "yếu tố khác": thống kê Likert và phái sinh từ điểm (suy ra
        từ chính những mục đã hiện, nêu thêm là đếm hai lần), 15 cột tổ hợp one-hot
        (trùng thông tin với danh sách tổ hợp in ngay trên thẻ ngành), môn không thi,
        và giới tính — nêu một đặc điểm không thể thay đổi vừa không giúp được gì vừa
        củng cố định kiến. Giới tính vẫn tham gia dự đoán, trang quản trị vẫn thấy.
        """
        if cot.startswith("likert_") and cot not in ("likert_tb", "likert_dolech"):
            return True
        if cot == "muc_tieu":
            return True
        if cot.startswith("diem_") and cot not in ("diem_tb", "diem_lech"):
            return not np.isnan(gia_tri)  # chỉ môn thí sinh thật sự thi
        return False

    def _mo_ta_gia_tri(self, cot: str, v: float) -> str:
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return "không thi" if cot.startswith("diem_") else "chưa có"
        if cot.startswith("likert_") and cot not in ("likert_tb", "likert_dolech"):
            return f"{v:.0f}/5"
        if cot == "muc_tieu":
            nguoc = {ma: ten for ten, ma in MUC_TIEU_MA.items()}
            return nguoc.get(int(v), str(int(v)))
        if cot == "gioi_tinh_nam":
            return "Nam" if int(v) == 1 else "Nữ"
        if cot.startswith(("z_", "ips_")) or cot in ("z_tb", "z_max"):
            return f"{v:+.2f}"
        if cot.startswith("th_"):
            return "có" if v else "không"
        return f"{v:.4g}"

    # ── Giải thích bằng SHAP ────────────────────────────────────────────────
    #
    # Ở đây chỉ có MỘT mô hình tham gia xếp hạng cho mỗi chế độ, nên đóng góp của
    # đặc trưng i chính là φᵢ của mô hình đó — không phải cộng hai tầng như pipeline
    # cũ. Khoá `tang1`/`tang2` vẫn giữ trong payload để giao diện không phải sửa:
    # `tang2` mang toàn bộ đóng góp, `tang1` luôn bằng 0.
    def _shap(self, X: np.ndarray, field_id: int | None) -> dict[int, np.ndarray]:
        """Đóng góp SHAP theo từng ngành: {chỉ số ngành → vector (n_đặc_trưng + 1)}.

        Phần tử cuối là giá trị nền. Với nhóm phân tầng, điểm xếp hạng là TÍCH hai
        xác suất, mà nhân trong không gian xác suất là CỘNG trong không gian log:

            s(ngành) = margin_sub(lĩnh vực con) + margin_con(ngành | lĩnh vực con)

        nên đóng góp hợp nhất của đặc trưng i đúng bằng φ_sub,i + φ_con,i. Không cộng
        thì bảng giải thích nói một đằng còn thứ hạng xếp một nẻo.
        """
        from xgboost import DMatrix

        d = DMatrix(X, feature_names=self.columns)

        if field_id is None:
            c = self._b_nganh.predict(d, pred_contribs=True)[0]
            return {j: c[j] for j in range(len(self.major_code))}

        bo = self.phan_tang.get(field_id)
        if bo is None:
            c = self._b_khoi[field_id].predict(d, pred_contribs=True)[0]
            return {j: c[i] for i, j in enumerate(self.lop_theo_khoi[field_id])}

        c_sub = bo["sub"].get_booster().predict(d, pred_contribs=True)[0]
        ra: dict[int, np.ndarray] = {}
        for k, (mc, js) in bo["con"].items():
            if mc is None:
                for j in js:
                    ra[j] = c_sub[k]
                continue
            c_con = mc.get_booster().predict(d, pred_contribs=True)[0]
            for i, j in enumerate(js):
                ra[j] = c_sub[k] + c_con[i]
        return ra

    def giai_thich(
        self,
        mode: str,
        dong: np.ndarray,
        X: np.ndarray,
        top_an: int = 8,
    ) -> dict:
        """Vì sao mô hình xếp một ngành ở vị trí đó, cho một thí sinh.

        `dong` là vector đóng góp của đúng ngành đó, lấy từ `_shap()`.

        Trả **đủ** những gì thí sinh đã tự khai — 10 câu sở thích, các môn đã thi, mục
        tiêu — chứ không cắt lấy vài mục mạnh nhất. Người dùng nhập 14 thứ thì muốn
        thấy cả 14 thứ ảnh hưởng ra sao, kể cả mục gần như bằng không. `top_an` giới
        hạn số mục BỊ ẨN gửi kèm; chỉ trang quản trị dùng tới.
        """
        phi = dong[:-1]
        tong_abs = float(np.abs(phi).sum()) or 1.0

        # Đóng góp của một đơn vị = TỔNG đóng góp các cột mã hoá nó (SHAP cộng tính).
        gop: list[tuple[str, float, float, list[int]]] = []
        for cot, cot_ids in self._don_vi:
            v = float(phi[cot_ids].sum())
            gop.append((cot, v, float(X[0, cot_ids[0]]), cot_ids))

        # Cột không thuộc đơn vị hiển thị nào (thống kê Likert, phái sinh điểm, tổ hợp
        # one-hot, giới tính) không xuất hiện trong `gop`, nên tự động rơi vào cụm
        # "yếu tố khác" qua phép hiệu ở cuối hàm.
        muc, id_hien = [], []
        for cot, v, gia_tri, cot_ids in sorted(gop, key=lambda t: -abs(t[1])):
            an = not self._hien_voi_thi_sinh(cot, gia_tri)
            pt = abs(v) / tong_abs * 100
            muc.append(
                {
                    "ten": self._ten_dep(cot),
                    "giaTri": self._mo_ta_gia_tri(cot, gia_tri),
                    "dongGop": round(v, 4),
                    "phanTram": round(pt, 1),
                    "mucDo": self.muc_do(pt),
                    "tang2": round(v, 4),
                    "tang1": 0.0,
                    "anVoiThiSinh": an,
                }
            )
            if not an:
                id_hien.extend(cot_ids)

        da_du_an, loc = 0, []
        for m in muc:
            if m["anVoiThiSinh"]:
                if da_du_an >= top_an:
                    continue
                da_du_an += 1
            loc.append(m)
        muc = loc

        # Cụm "yếu tố khác" tính bằng HIỆU để các thanh trên màn hình luôn cộng đúng
        # bằng tổng — thiếu nó thì người xem tưởng vài thanh là toàn bộ câu chuyện.
        tong = float(phi.sum())
        con_lai = tong - float(phi[id_hien].sum()) if id_hien else tong
        pt_con_lai = (
            (tong_abs - float(np.abs(phi[id_hien]).sum())) / tong_abs * 100
            if id_hien
            else 100.0
        )

        return {
            "mode": mode,
            "base": round(float(dong[-1]), 4),
            "features": muc,
            "soConLai": len(self.columns) - len(id_hien),
            "dongGopConLai": round(con_lai, 4),
            "phanTramConLai": round(pt_con_lai, 1),
            "tongDongGop": round(tong, 4),
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
        field_id = None  → Khám phá — model_nganh.json xếp hạng cả 39 ngành
        field_id = 0..8  → Tư vấn   — model_khoi{k}.json chỉ xếp hạng ngành trong nhóm

        `soft_filter` không còn ý nghĩa ở chế độ tư vấn: mô hình nhóm hoàn toàn không
        biết tới ngành ngoài nhóm nên không thể cho chúng điểm. Giữ tham số để chữ ký
        không đổi; truyền giá trị khác 0 sẽ được cảnh báo.
        """
        n_nganh = len(self.major_code)
        X = self.build_features(interests, subject_group, scores, gender, goal)

        # Luôn chạy mô hình phẳng: ở chế độ khám phá nó là bộ xếp hạng, ở chế độ tư vấn
        # nó cung cấp "mô hình tự đoán nhóm nào" để người dùng đối chiếu với nhóm đã chọn.
        p_flat = self.m_nganh.predict_proba(X)[0]

        if field_id is None:
            mode = "explore"
            p = p_flat.copy()
        else:
            if field_id not in self.lop_theo_khoi:
                raise ValueError(
                    f"Nhóm ngành phải trong 0..{len(self.lop_theo_khoi) - 1}"
                )
            if field_id not in self.m_khoi:
                raise FileNotFoundError(f"Thiếu model_khoi{field_id}.json")
            mode = "guided"
            p = np.zeros(n_nganh, dtype=float)
            bo = self.phan_tang.get(field_id)
            if bo is not None:
                # P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con)
                p_sub = bo["sub"].predict_proba(X)[0]
                for k, (mc, js) in bo["con"].items():
                    if mc is None:
                        for j in js:
                            p[j] = float(p_sub[k])
                        continue
                    pr = mc.predict_proba(X)[0]
                    for i_cb, j in enumerate(js):
                        p[j] = float(p_sub[k]) * float(pr[i_cb])
            else:
                cuc_bo = self.m_khoi[field_id].predict_proba(X)[0]
                for i_cb, j in enumerate(self.lop_theo_khoi[field_id]):
                    p[j] = float(cuc_bo[i_cb])

        # Hạ trọng số ngành KHÔNG xét tổ hợp của thí sinh (lọc mềm, không loại hẳn):
        # HUIT còn xét học bạ và ĐGNL nên thí sinh có thể đỗ ngành không khớp tổ hợp.
        n_ngoai = 0
        if filter_subject_group and self.to_hop_xet_tuyen:
            trong = np.array(
                [
                    subject_group in self.to_hop_xet_tuyen.get(j, set())
                    for j in range(n_nganh)
                ]
            )
            n_ngoai = int((~trong).sum())
            p = p * np.where(trong, 1.0, TRONG_SO_NGOAI_TO_HOP)

        tong_p = p.sum()
        p = p / tong_p if tong_p > 0 else np.full_like(p, 1.0 / n_nganh)

        # Chỉ lấy ngành còn xác suất > 0 — nhóm ít ngành hơn `limit` mà cắt thẳng
        # argsort thì sẽ độn thêm ngành xác suất 0 cho đủ chỗ.
        order = [int(j) for j in np.argsort(-p) if p[j] > 0][:limit]
        tong_diem = float(sum(scores)) if scores else None

        # Phân bố nhóm = cộng xác suất các ngành cùng nhóm, tính trên p CUỐI CÙNG.
        n_nhom = len(self.field_name)
        p_field = np.zeros(n_nhom, dtype=float)
        p_flat_field = np.zeros(n_nhom, dtype=float)
        for j in range(n_nganh):
            p_field[self.field_of_major[j]] += p[j]
            p_flat_field[self.field_of_major[j]] += p_flat[j]

        warnings: list[str] = []
        if not scores:
            warnings.append(
                "Chưa có điểm thi nên gợi ý kém chính xác hơn. Thi xong nên làm lại."
            )
        if filter_subject_group and n_ngoai:
            warnings.append(
                f"{n_ngoai}/{n_nganh} ngành không xét tổ hợp {subject_group} đã được hạ "
                "ưu tiên (không loại hẳn, vì có thể xét bằng học bạ hoặc ĐGNL)."
            )
        if mode == "guided":
            warnings.append(
                f"Đang xếp hạng bằng mô hình riêng của nhóm \"{self.field_name[field_id]}\" "
                "— ngành ngoài nhóm không xuất hiện, nếu chọn sai nhóm thì ngành phù hợp "
                "sẽ không được gợi ý."
            )
            if soft_filter:
                warnings.append(
                    "Tham số soft_filter không có tác dụng ở pipeline này: mô hình nhóm "
                    "không đánh giá được ngành ngoài nhóm."
                )
        else:
            warnings.append(
                "Chế độ khám phá chọn trong cả 39 ngành nên khó hơn nhiều — "
                "chọn nhóm ngành trước sẽ cho gợi ý chính xác hơn hẳn."
            )
        if len(order) < limit:
            warnings.append(
                f"Chỉ có {len(order)} ngành phù hợp nên không đủ {limit} gợi ý"
                + (
                    f" — nhóm \"{self.field_name[field_id]}\" chỉ đào tạo "
                    f"{len(order)} ngành."
                    if mode == "guided"
                    else "."
                )
            )

        contribs = self._shap(X, field_id)   # tính một lần, dùng lại cho mọi ngành

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
            # Pipeline này không có tầng 1 riêng. Đây là dự đoán nhóm suy ra từ mô hình
            # phẳng 39 ngành — vẫn đúng ý nghĩa "mô hình tự đoán nhóm nào" để người dùng
            # đối chiếu với nhóm họ đã chọn.
            "fieldsStage1": [
                {
                    "id": int(k),
                    "name": self.field_name[int(k)],
                    "probability": round(float(p_flat_field[k]), 4),
                }
                for k in np.argsort(-p_flat_field)[:n_fields]
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
                    "explain": self.giai_thich(mode, contribs[int(j)], X),
                }
                for i, j in enumerate(order)
            ],
            "totalScore": tong_diem,
            "warnings": warnings,
        }
