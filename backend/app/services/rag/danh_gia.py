"""Đo TẦNG TRUY HỒI — một bản duy nhất, dùng chung cho trang quản trị và script dòng lệnh.

Đo bằng bộ câu hỏi gán nhãn tay `data/kiem_thu/truy_hoi.json`: mỗi câu biết chắc mã ngành
đúng, nên chấm trực tiếp — không cần LLM chấm, kết quả tất định, không tốn lượt API nào
cho việc chấm (chỉ tốn lượt nhúng câu hỏi, và lượt đó có nhớ đệm).

Kèm hai mốc đối chứng, đúng luật "mọi bảng chỉ số phải có cột đoán bừa" của dự án:

    từ khoá  TF-IDF trên cùng 39 đoạn mô tả ngành — không có vector nào cả. Vector
             không hơn được mốc này thì cả tầng nhúng là thừa.
    bừa      rút ngẫu nhiên k ngành (seed 42).

Script `scripts/kiem_truy_hoi.py` gọi lại đúng hàm `do_truy_hoi()` ở đây, để con số
trên trang quản trị và con số chạy tay không bao giờ lệch nhau.
"""

import json
import random
import time
from collections import defaultdict
from datetime import datetime

from app.core import paths
from app.services.rag.kho import TOP_K, lay_kho
from app.services.rag.nguon_co_cau_truc import bo_dau, lay_nguon
from app.services.rag.tro_ly import HE_SO_UNG_VIEN, lay_ngu_canh

F_BO = paths.KIEM_THU / "truy_hoi.json"


class TimTuKhoa:
    """Đối chứng: tìm bằng TỪ KHOÁ thuần tuý (TF-IDF), không có vector nào cả."""

    def __init__(self, ids: list[str], noi_dung: list[str]):
        from sklearn.feature_extraction.text import TfidfVectorizer

        self.ids = ids
        # `bo_dau` cho cả kho lẫn câu hỏi, nếu không thì câu gõ không dấu sẽ trượt
        # sạch và bài đối chứng thành ra bị dìm cho dễ thắng.
        self.vec = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
        self.M = self.vec.fit_transform(bo_dau(c) for c in noi_dung)

    def tim(self, cau_hoi: str, k: int) -> list[str]:
        import numpy as np

        s = (self.M @ self.vec.transform([bo_dau(cau_hoi)]).T).toarray().ravel()
        return [self.ids[i] for i in np.argsort(-s)[:k]]


def doc_bo_cau_hoi() -> dict:
    return json.loads(F_BO.read_text(encoding="utf-8"))


def _tong_hop(r: list[dict], k: int) -> dict:
    """Trung bình theo câu. Tên và công thức bám đúng báo cáo tuần của đề tài:

        precision@k       số đoạn liên quan trong top-k / k                 (tuần 1, CT 7)
        recall@k          số đoạn liên quan trong top-k / tổng số liên quan (tuần 1, CT 8)
        context_precision trong các đoạn THẬT SỰ đưa vào prompt, phần liên quan (tuần 2)
        context_recall    trong các đoạn cần có, phần đã vào prompt         (tuần 2)

    "Liên quan" = đoạn thuộc một trong các mã ngành đáp án. Biết chắc đáp án nên chấm
    thẳng, không cần LLM chấm như RAGAS — kết quả tất định.
    """
    n = len(r)
    if n == 0:
        return {"n": 0}
    tb = lambda khoa: sum(x[khoa] for x in r) / n  # noqa: E731
    return {
        "n": n,
        "precision_k": tb("precision_k"),
        "recall_k": tb("recall_k"),
        "context_precision": tb("prec"),
        "context_recall": tb("ctx_recall"),
        "hit1": sum(x["hang"] == 1 for x in r) / n,
        "hitk": sum(x["hang"] > 0 for x in r) / n,
        "mrr": sum(1 / x["hang"] if x["hang"] else 0 for x in r) / n,
        "tu_khoa_recall_k": tb("recall_tk"),
        "tu_khoa_hit1": sum(x["hang_tk"] == 1 for x in r) / n,
        "tu_khoa_hitk": sum(x["hang_tk"] > 0 for x in r) / n,
        "bua_recall_k": tb("recall_bua"),
        "bua_hit1": sum(x["hang_bua"] == 1 for x in r) / n,
    }


def do_truy_hoi(
    ds: list[dict] | None = None,
    k: int = TOP_K,
    nghi: float = 0.35,
    bao_tien_do=None,
) -> dict:
    """Chạy bộ câu hỏi qua kho vector đang nạp.

    `ds` bỏ trống = bộ gán nhãn tay. `nghi` giãn cách giữa hai câu: gói free của Gemini
    có trần lượt/phút, đã chạm một lần khi chạy liền 117 câu. `bao_tien_do(i, n, cau)`
    được gọi sau mỗi câu.
    """
    kho = lay_kho()
    if not kho.san_sang:
        raise RuntimeError("Kho vector chưa dựng — chạy `python scripts/nap_kho.py` trước.")

    bo = doc_bo_cau_hoi()
    ds = ds if ds is not None else bo["cau_hoi"]

    tb = lay_nguon()
    ma_tat_ca = sorted(tb.nganh)
    tu_khoa = TimTuKhoa(ma_tat_ca, [tb.mo_ta(m) for m in ma_tat_ca])
    rng = random.Random(42)

    theo_muc: dict[str, list[dict]] = defaultdict(list)
    so_loi_nhung = 0
    for i, c in enumerate(ds, 1):
        # Lấy đúng cỡ ứng viên mà backend dùng thật (`lay_ngu_canh` nới ra k×HE_SO
        # rồi mới lọc theo loại). Chỉ lấy k ở đây thì phần nới không chạy, bài đo
        # phản ánh một hệ thống KHÁC với hệ thống đang phục vụ.
        ung_vien = kho.truy_xuat(c["hoi"], k * HE_SO_UNG_VIEN)
        lay_ve = ung_vien[:k]  # P@k · R@k · Hit@1 vẫn tính trên đúng k đoạn đầu
        if not lay_ve:
            # truy_xuat() nuốt lỗi mạng và trả rỗng — không đếm riêng thì câu đó
            # thành "trượt" và bài đo tụt mà không ai biết là do mạng.
            so_loi_nhung += 1
        ids = [d["meta"].get("ma_nganh") for d in lay_ve]
        vang = set(c["dap_an"])

        hang = next((j + 1 for j, m in enumerate(ids) if m in vang), 0)
        ids_tk = tu_khoa.tim(c["hoi"], k)
        hang_tk = next((j + 1 for j, m in enumerate(ids_tk) if m in vang), 0)
        ids_bua = rng.sample(ma_tat_ca, k)
        hang_bua = next((j + 1 for j, m in enumerate(ids_bua) if m in vang), 0)
        # Truyền lại `lay_ve` để khỏi nhúng câu hỏi lần hai.
        nc = lay_ngu_canh(c["hoi"], k, lay_ve=ung_vien)
        ma_nc = [d["meta"].get("ma_nganh") for d in nc.doan]

        theo_muc[c["muc"]].append({
            "hoi": c["hoi"],
            "muc": c["muc"],
            "hang": hang,
            "hang_tk": hang_tk,
            "hang_bua": hang_bua,
            "lay_duoc": ids,
            "khoang_cach_dau": round(lay_ve[0]["khoang_cach"], 4) if lay_ve else None,
            "dap_an": sorted(vang),
            "precision_k": sum(m in vang for m in ids) / k,
            "recall_k": len(set(ids) & vang) / len(vang),
            "recall_tk": len(set(ids_tk) & vang) / len(vang),
            "recall_bua": len(set(ids_bua) & vang) / len(vang),
            "prec": (sum(m in vang for m in ma_nc) / len(ma_nc)) if ma_nc else 0.0,
            "ctx_recall": len(set(ma_nc) & vang) / len(vang),
        })
        if bao_tien_do:
            bao_tien_do(i, len(ds), c)
        if nghi and i < len(ds):
            time.sleep(nghi)

    tong = [x for muc in sorted(theo_muc) for x in theo_muc[muc]]
    ten = lambda m: tb.nganh.get(m, {}).get("ten") if m else None  # noqa: E731
    return {
        "tao_luc": datetime.now().isoformat(timespec="seconds"),
        "k": k,
        "so_cau": len(tong),
        "so_loi_nhung": so_loi_nhung,
        "kho": dict(kho.thong_tin),
        "muc_do": bo.get("muc_do", {}),
        "theo_muc": [
            {"muc": m, "mo_ta": bo.get("muc_do", {}).get(m, ""), **_tong_hop(theo_muc[m], k)}
            for m in sorted(theo_muc)
        ],
        "tong": _tong_hop(tong, k),
        "cau_truot": [
            {
                "hoi": x["hoi"],
                "muc": x["muc"],
                "hang": x["hang"],
                "dap_an": [{"ma": m, "ten": ten(m)} for m in x["dap_an"]],
                "lay_ve_dau": {"ma": x["lay_duoc"][0], "ten": ten(x["lay_duoc"][0])}
                if x["lay_duoc"] else None,
                "khoang_cach_dau": x["khoang_cach_dau"],
            }
            for x in tong
            if x["hang"] != 1
        ],
    }
