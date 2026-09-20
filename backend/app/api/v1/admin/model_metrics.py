"""Chỉ số hiệu suất của mô hình ĐANG PHỤC VỤ, đọc từ gói trên đĩa."""

import json

from fastapi import APIRouter, HTTPException

router = APIRouter()


def _chi_so_huong1(m: dict, meta: dict, doc_neu_co) -> dict:
    """metrics.json của Hướng 1 → cùng hình dạng phản hồi với research3, cộng thêm các khối
    riêng của Hướng 1: `diemVanHanh`, `doanBua`, `chiSoXepHang`, `nguoiThat`.

    Mọi số lấy nguyên từ file — không tính lại, không làm tròn thêm. Top-k và chỉ số xếp
    hạng ưu tiên bản ĐỦ ĐỘ CHÍNH XÁC trong `mo_hinh.json` (chép từ CSV lúc đóng gói):
    metrics.json đã làm tròn 4 chữ số, giao diện làm tròn thêm lần nữa sẽ sai ở số tận
    cùng bằng 5.
    """
    dl = meta.get("du_lieu", {})
    cs = meta.get("chi_so") or {}
    te = cs.get("test") or m.get("test", {})
    tv = cs.get("train_val") or m.get("train_val", {})
    lop = cs.get("lop") or m.get("chi_so_lop", {})
    bua = m.get("doan_bua", {})
    k_tv = m.get("diem_van_hanh", {}).get("tu_van", 2)
    k_kp = m.get("diem_van_hanh", {}).get("kham_pha", 5)
    f1 = lambda t: (lop.get(t) or {}).get("f1_macro")  # noqa: E731
    n_hoc, n_that = dl.get("n_hoc"), dl.get("n_hoc_that")

    return {
        "pipeline": "h1",
        "ngayChay": meta.get("ngay_chot"),
        "seed": meta.get("seed"),
        "duLieu": {
            "train_that": n_that,
            "train_tong_hop": (n_hoc - n_that) if n_hoc is not None and n_that is not None
            else None,
            "test_that": dl.get("n_test"),
            "n_dac_trung": dl.get("n_dac_trung"),
            "n_lop_nganh": dl.get("n_nganh"),
            "n_lop_khoi": dl.get("n_nhom"),
        },
        "cv": None,  # chốt bằng tập val rồi mở tập test khoá một lần, không có CV
        "sieuThamSo": m.get("hp"),
        "cvMacroF1": None,
        # Cùng quy ước với research3: Top-1 tư vấn trên train+val so với trên test
        "overfit": {
            "train_top1": (tv.get("tu_van") or {}).get("top1"),
            "val_top1": (te.get("tu_van") or {}).get("top1"),
        },
        "test": {
            "tu_van": (te.get("tu_van") or {}) | {"macro_f1": f1("tư vấn · TEST")},
            "kham_pha": (te.get("kham_pha") or {}) | {"macro_f1": f1("khám phá · TEST")},
            "tren_train_tu_van": tv.get("tu_van") or {},
            "tren_train_kham_pha": tv.get("kham_pha") or {},
        },
        # Mốc đối chứng ở đúng điểm vận hành, kèm khoá top3 cũ cho giao diện hiện tại
        "baseline": {
            f"doan_bua_tu_van_top{k_tv}": (bua.get("tu_van_trong_nhom") or {}).get(f"top{k_tv}"),
            f"doan_bua_kham_pha_top{k_kp}": (bua.get("kham_pha") or {}).get(f"top{k_kp}"),
            f"nganh_dong_nhat_tu_van_top{k_tv}":
                (bua.get("tu_van_nganh_dong_nhat") or {}).get(f"top{k_tv}"),
            "doan_bua_tu_van_top3": (bua.get("tu_van_trong_nhom") or {}).get("top3"),
            "doan_bua_kham_pha_top3": (bua.get("kham_pha") or {}).get("top3"),
            "ba_nganh_pho_bien_top3": (bua.get("tu_van_nganh_dong_nhat") or {}).get("top3"),
        },
        "aucRoc": {"auto_macro": (lop.get("khám phá · TEST") or {}).get("auc_ovr")},
        "canhBao": m.get("han_che"),
        "theoKhoi": None,
        "cachNhom": meta.get("ten_cach_nhom"),
        "diemVanHanh": {"tu_van": k_tv, "kham_pha": k_kp},
        "doanBua": bua,
        "chiSoXepHang": cs.get("xep_hang") or m.get("chi_so_xep_hang"),
        "kyNang": m.get("ky_nang"),
        "saiSo95": m.get("sai_so_95"),
        # Mức trên người thật do Hướng 2 đo (cùng cấu hình, chưa học các phiếu đó)
        "nguoiThat": meta.get("nguoi_that"),
        "baselineRandomForest": doc_neu_co("baseline_random_forest.json"),
        "lichSuHuanLuyen": doc_neu_co("lich_su_huan_luyen.json"),
    }

@router.get("/model-metrics", summary="Chỉ số hiệu suất mô hình")
async def get_model_metrics():
    """Đọc kết quả huấn luyện của **đúng pipeline đang phục vụ dự đoán**.

    Đây là **số liệu đánh giá mô hình**, khác hẳn `/admin/analytics` (số liệu sử
    dụng thực tế). Tất cả lấy nguyên từ file do notebook xuất ra — không tính lại,
    không làm tròn thêm.

    Hai bố cục file khác nhau tuỳ pipeline, nên phải chọn đúng nguồn: đọc nhầm thì
    trang quản trị hiện chỉ số của mô hình KHÔNG chạy, mà số vẫn trông hợp lý nên
    không ai phát hiện.

        h1 (mặc định)  backend/data/mo_hinh/huong1/metrics.json  (Hướng 1, research/)
        r3             research3/…/10_ChotModel/metrics.json

    Hai phần trong đề cương chưa có dữ liệu, trả `null` chứ không bịa:
    - `baselineRandomForest`: chưa train Random Forest để so sánh
    - `lichSuHuanLuyen`: mô hình mới train một lần, chưa có chu kỳ retrain
    """

    # pyrefly: ignore [missing-import]
    from app.services.major_predictor import pipeline_dang_chay, thu_muc_mo_hinh

    pipeline = pipeline_dang_chay()
    thu_muc = thu_muc_mo_hinh(pipeline)
    f_metrics = thu_muc / "metrics.json"

    if not f_metrics.exists():
        huong_dan = {
            "r3": "Chạy research3/scripts/chay.py 10 trước.",
            "h1": "Chạy backend/scripts/dong_goi_mo_hinh_huong1.py trước.",
        }[pipeline]
        raise HTTPException(
            status_code=503,
            detail=f"Chưa có file kết quả huấn luyện tại {f_metrics}. {huong_dan}",
        )

    with open(f_metrics, encoding="utf-8") as fp:
        m = json.load(fp)

    def doc_neu_co(ten: str):
        f = thu_muc / ten
        if not f.exists():
            return None
        with open(f, encoding="utf-8") as fp:
            return json.load(fp)

    if pipeline == "h1":
        return _chi_so_huong1(m, doc_neu_co("mo_hinh.json") or {}, doc_neu_co)

    # ── research3 → cùng hình dạng phản hồi, giao diện không phải sửa ────────
    dl, te = m.get("du_lieu", {}), m.get("test", {})

    def bo(g: dict | None, **them) -> dict:
        """{"1": .38, "3": .86} → {top1: .38, top3: .86} theo lược đồ BoChiSo."""
        if not g:
            return {}
        return {f"top{k}": v for k, v in g.items()} | them

    tr = m.get("tren_train", {})
    return {
        "ngayChay": m.get("ngay_chay"),
        "seed": m.get("seed"),
        "duLieu": {
            "train_that": dl.get("train_that"),
            "train_tong_hop": dl.get("train_tang_cuong"),
            "test_that": dl.get("test"),
            "n_dac_trung": dl.get("n_dac_trung"),
            "n_lop_nganh": dl.get("n_nganh"),
            "n_lop_khoi": dl.get("n_nhom"),
        },
        "cv": None,  # research3 chốt bằng tập test khoá, không báo cáo lại CV ở đây
        "sieuThamSo": m.get("sieu_tham_so", {}).get("hp"),
        "cvMacroF1": None,
        # Chênh train − test đo trên CÙNG chế độ tư vấn, đây là chỉ số nhớ vẹt
        "overfit": {
            "train_top1": (tr.get("tu_van") or {}).get("1"),
            "val_top1": (te.get("tu_van", {}).get("top") or {}).get("1"),
        },
        "test": {
            "tu_van": bo(te.get("tu_van", {}).get("top"),
                         macro_f1=te.get("guided_macro_f1")),
            "kham_pha": bo(te.get("kham_pha", {}).get("top"),
                           macro_f1=te.get("auto_macro_f1"),
                           balanced_acc=te.get("auto_balanced_acc")),
            "tren_train_tu_van": bo(tr.get("tu_van")),
            "tren_train_kham_pha": bo(tr.get("kham_pha")),
        },
        # Mốc đối chứng — bảng chỉ số nào cũng phải kèm, nếu không một con số 86%
        # có thể chỉ hơn đoán bừa vài điểm.
        "baseline": {
            "doan_bua_tu_van_top3": (te.get("tu_van", {}).get("bua") or {}).get("3"),
            "doan_bua_kham_pha_top3": (te.get("kham_pha", {}).get("bua") or {}).get("3"),
            "ba_nganh_pho_bien_top3": (te.get("bua_pho_bien") or {}).get("3"),
            "hon_pho_bien_top3": (te.get("hon_pho_bien") or {}).get("3"),
            "model_phang_top3": (te.get("phang") or {}).get("3"),
            "lop_dong_nhat_top3": (te.get("dong_nhat") or {}).get("3"),
        },
        "aucRoc": None,  # research3 không xuất ROC/AUC
        "canhBao": m.get("canh_bao"),
        "theoKhoi": m.get("theo_khoi"),
        "cachNhom": m.get("cach_nhom"),
        "baselineRandomForest": doc_neu_co("baseline_random_forest.json"),
        "lichSuHuanLuyen": doc_neu_co("lich_su_huan_luyen.json"),
    }
