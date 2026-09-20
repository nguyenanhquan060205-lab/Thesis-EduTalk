"""Một lượt huấn luyện lại: gom dữ liệu → huấn luyện → chấm → cổng kiểm định → phiên bản.

Chạy ĐỒNG BỘ trong luồng riêng (`asyncio.to_thread`), không chặn event loop. Chỉ một lượt
chạy một lúc trên toàn hệ thống, kể cả khi có nhiều worker: khoá nằm trong MongoDB.

Cổng kiểm định — ứng viên chỉ được đưa vào phục vụ khi qua CẢ HAI:

    tập test khoá (2.546 dòng)   tư vấn Top-2 và khám phá Top-5 không tụt quá `dung_sai_diem`
                                 so với mô hình ĐANG phục vụ, chấm ngay trong lượt này
    phiếu phản hồi giữ lại       như trên, nhưng chỉ xét khi có ≥ `giu_lai_toi_thieu` phiếu
                                 — ít hơn thì sai số quá rộng, không đủ căn cứ để chặn

Chấm KHÔNG có lọc mềm theo tổ hợp, đúng cách notebook đã chấm — để số trên trang quản trị
so được với số trong báo cáo.
"""

from __future__ import annotations

import logging
import time
import traceback
from datetime import datetime, timedelta, timezone

import numpy as np

from app.core.mongodb import get_db_dong_bo
from app.services.huan_luyen import du_lieu, phien_ban
from app.services.huan_luyen.mo_hinh import BoMoHinh

log = logging.getLogger(__name__)

COL_CAU_HINH, COL_KHOA, COL_LICH_SU = "cau_hinh", "khoa_tac_vu", "lich_su_huan_luyen"
KHOA = "huan_luyen"
HET_HAN_KHOA = timedelta(minutes=30)  # tiến trình chết giữa chừng thì khoá tự nhả

CAU_HINH_MAC_DINH = {
    "chu_ky": "hang_tuan",      # tat · hang_ngay · hang_tuan · hang_thang
    "gio": 2,                   # 02:00 giờ máy chủ — lúc ít người dùng nhất
    "thu": "sun",               # cho hang_tuan
    "ngay": 1,                  # cho hang_thang
    "nhan_toi_thieu": 30,       # lượt theo lịch bỏ qua nếu ít nhãn mới hơn
    "giu_lai_toi_thieu": 30,
    "dung_sai_diem": 1.0,       # ≈ nửa khoảng tin cậy 95% của Top-2 tư vấn trên tập test
    "tu_dong_phuc_vu": True,
}


def doc_cau_hinh(db=None) -> dict:
    db = db if db is not None else get_db_dong_bo()
    doc = (db[COL_CAU_HINH].find_one({"_id": KHOA}) if db is not None else None) or {}
    return {**CAU_HINH_MAC_DINH, **{k: v for k, v in doc.items() if k in CAU_HINH_MAC_DINH}}


# ── Khoá ─────────────────────────────────────────────────────────────────────
def _giu_khoa(db, lan_chay: str) -> bool:
    from pymongo.errors import DuplicateKeyError

    bay_gio = datetime.now(timezone.utc)
    try:
        db[COL_KHOA].find_one_and_update(
            {"_id": KHOA, "$or": [{"dang_chay": False}, {"het_han": {"$lt": bay_gio}}]},
            {"$set": {"dang_chay": True, "bat_dau": bay_gio, "het_han": bay_gio + HET_HAN_KHOA,
                      "lan_chay": lan_chay}},
            upsert=True,
        )
        return True
    except DuplicateKeyError:  # bản ghi khoá đã tồn tại và đang bị giữ
        return False


def _nha_khoa(db) -> None:
    db[COL_KHOA].update_one({"_id": KHOA}, {"$set": {"dang_chay": False}})


def dang_chay(db=None) -> dict | None:
    db = db if db is not None else get_db_dong_bo()
    if db is None:
        return None
    k = db[COL_KHOA].find_one({"_id": KHOA})
    if not k or not k.get("dang_chay"):
        return None
    if k["het_han"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return k


# ── Chấm ─────────────────────────────────────────────────────────────────────
def _cham(bo: BoMoHinh, X, y, g, k_tv: int, k_kp: int) -> dict:
    if len(y) == 0:
        return {"n": 0, "tu_van": None, "kham_pha": None}
    return {"n": int(len(y)), "tu_van": bo.top_k(X, y, k_tv, g), "kham_pha": bo.top_k(X, y, k_kp)}


def _khong_tut(ung: dict, ht: dict, dung_sai: float) -> bool:
    return all(ung[t] >= ht[t] - dung_sai / 100 for t in ("tu_van", "kham_pha"))


# ── Một lượt ─────────────────────────────────────────────────────────────────
def chay_huan_luyen(kich_hoat: str, nguoi: str | None = None) -> dict:
    """`kich_hoat`: "lich" (theo chu kỳ) hoặc "thu_cong" (admin bấm). Trả về bản ghi lịch sử."""
    from app.services.major_predictor import get_predictor, nap_lai_predictor

    db = get_db_dong_bo()
    if db is None:
        raise RuntimeError("Thiếu MONGO_URI — không chạy được vòng lặp phản hồi.")

    bat_dau = datetime.now(timezone.utc)
    lan = {"bat_dau": bat_dau, "kich_hoat": kich_hoat, "nguoi_kich_hoat": nguoi,
           "ket_qua": "dang_chay", "buoc": "khoi_dong"}
    lan_id = db[COL_LICH_SU].insert_one(lan).inserted_id
    if not _giu_khoa(db, str(lan_id)):
        db[COL_LICH_SU].update_one({"_id": lan_id}, {"$set": {
            "ket_qua": "bo_qua", "ly_do": "Đang có một lượt huấn luyện khác chạy.",
            "ket_thuc": datetime.now(timezone.utc)}})
        return db[COL_LICH_SU].find_one({"_id": lan_id})

    def buoc(ten: str, **them):
        db[COL_LICH_SU].update_one({"_id": lan_id}, {"$set": {"buoc": ten, **them}})

    def ket_thuc(ket_qua: str, ly_do: str, **them):
        db[COL_LICH_SU].update_one({"_id": lan_id}, {"$set": {
            "ket_qua": ket_qua, "ly_do": ly_do, "ket_thuc": datetime.now(timezone.utc),
            "giay": round(time.time() - t0, 1), **them}})
        return db[COL_LICH_SU].find_one({"_id": lan_id})

    t0 = time.time()
    try:
        cfg = doc_cau_hinh(db)
        meta = phien_ban.meta_goi()
        k_tv, k_kp = meta["diem_van_hanh"]["tu_van"], meta["diem_van_hanh"]["kham_pha"]
        nganh = [int(x) for x in meta["nganh_theo_thu_tu_lop"]]
        n2n = {int(a): int(b) for a, b in meta["nganh_to_nhom"].items()}

        # ── 1. Dữ liệu ───────────────────────────────────────────────────────
        buoc("gom_du_lieu")
        truoc = db[COL_LICH_SU].find_one(
            {"ket_qua": {"$in": ["da_phuc_vu", "cho_duyet", "tu_choi"]}}, sort=[("bat_dau", -1)]
        )
        predictor = get_predictor()
        mau = du_lieu.lay_mau_phan_hoi(db, predictor, moi_tu=truoc["bat_dau"] if truoc else None)
        tk = mau.thong_ke
        buoc("gom_du_lieu", du_lieu=tk)

        if len(mau.y_hoc) == 0:
            return ket_thuc("bo_qua", "Chưa có phiếu phản hồi nào dùng được để học thêm — "
                                      "mô hình ứng viên sẽ trùng mô hình đang phục vụ.")
        if kich_hoat == "lich" and tk["nhan_moi"] < cfg["nhan_toi_thieu"]:
            return ket_thuc("bo_qua", f"Mới có {tk['nhan_moi']} nhãn mới kể từ lần huấn luyện "
                                      f"trước, cần ít nhất {cfg['nhan_toi_thieu']}.")
        if kich_hoat == "thu_cong" and truoc is not None and tk["nhan_moi"] == 0:
            # Cùng dữ liệu + cùng seed → ứng viên trùng từng byte phiên bản lần trước
            return ket_thuc("bo_qua", "Không có nhãn mới kể từ lần huấn luyện trước — mô hình "
                                      "ứng viên sẽ trùng phiên bản đã có.")

        goc = du_lieu.doc_du_lieu_goc(phien_ban.thu_muc_goi(), meta["ten_dac_trung"])

        # ── 2. Huấn luyện ứng viên — đúng cấu hình đã chốt ───────────────────
        buoc("huan_luyen")
        X = np.vstack([goc.X_hoc, mau.X_hoc])
        y = np.concatenate([goc.y_hoc, mau.y_hoc])
        ung = BoMoHinh(nganh, n2n).huan_luyen(X, y, meta["hp"], meta["seed"])

        # ── 3. Chấm cả hai mô hình trên cùng dữ liệu ─────────────────────────
        buoc("cham")
        ma_ht = phien_ban.ma_dang_phuc_vu()
        ht = BoMoHinh.tu_thu_muc(phien_ban.thu_muc_phien_ban(ma_ht), nganh, n2n)
        chi_so = {
            "phien_ban_so_sanh": ma_ht,
            "hien_tai": {
                "test": _cham(ht, goc.X_test, goc.y_test, goc.g_test, k_tv, k_kp),
                "giu_lai": _cham(ht, mau.X_giu, mau.y_giu, mau.g_giu, k_tv, k_kp),
            },
            "ung_vien": {
                "test": _cham(ung, goc.X_test, goc.y_test, goc.g_test, k_tv, k_kp),
                "giu_lai": _cham(ung, mau.X_giu, mau.y_giu, mau.g_giu, k_tv, k_kp),
            },
            "k": {"tu_van": k_tv, "kham_pha": k_kp},
        }

        # ── 4. Cổng kiểm định ────────────────────────────────────────────────
        ds = cfg["dung_sai_diem"]
        qua_test = _khong_tut(chi_so["ung_vien"]["test"], chi_so["hien_tai"]["test"], ds)
        du_giu_lai = len(mau.y_giu) >= cfg["giu_lai_toi_thieu"]
        qua_giu_lai = (_khong_tut(chi_so["ung_vien"]["giu_lai"], chi_so["hien_tai"]["giu_lai"], ds)
                       if du_giu_lai else None)
        cong = {"dung_sai_diem": ds, "qua_test": qua_test, "qua_giu_lai": qua_giu_lai,
                "du_phieu_giu_lai": du_giu_lai, "dat": qua_test and qua_giu_lai is not False}

        # ── 5. Lưu phiên bản (kể cả bản trượt, để xem lại) ───────────────────
        buoc("luu_phien_ban")
        import tempfile
        from pathlib import Path

        ma = phien_ban.tao_ma()
        with tempfile.TemporaryDirectory() as tmp:
            tep = ung.luu(Path(tmp))
            trang_thai = ("dang_phuc_vu_tam" if cong["dat"] and cfg["tu_dong_phuc_vu"]
                          else "cho_duyet" if cong["dat"] else "tu_choi")
            phien_ban.luu_phien_ban(ma, Path(tmp), tep, {
                "lan_chay": lan_id,
                "trang_thai": "cho_duyet" if trang_thai == "dang_phuc_vu_tam" else trang_thai,
                "du_lieu": {"n_goc": int(len(goc.y_hoc)), "n_phan_hoi_hoc": int(len(mau.y_hoc)),
                            "n_phan_hoi_giu_lai": int(len(mau.y_giu))},
                "chi_so": chi_so, "cong": cong,
                "cau_hinh_mo_hinh": {"hp": meta["hp"], "seed": meta["seed"]},
            })

        if not cong["dat"]:
            ly_do = ("Tụt quá dung sai trên tập test khoá." if not qua_test
                     else "Tụt quá dung sai trên phiếu phản hồi giữ lại.")
            return ket_thuc("tu_choi", ly_do, phien_ban=ma, chi_so=chi_so, cong=cong)
        if not cfg["tu_dong_phuc_vu"]:
            return ket_thuc("cho_duyet", "Qua cổng kiểm định — chờ admin đưa vào phục vụ.",
                            phien_ban=ma, chi_so=chi_so, cong=cong)

        buoc("dua_vao_phuc_vu")
        phien_ban.dat_phuc_vu(ma, nguoi or f"tu_dong_{kich_hoat}")
        nap_lai_predictor()
        return ket_thuc("da_phuc_vu", "Qua cổng kiểm định và đã đưa vào phục vụ.",
                        phien_ban=ma, chi_so=chi_so, cong=cong)

    except Exception as e:  # noqa: BLE001 — lỗi phải nằm trong lịch sử, không được mất
        log.exception("Huấn luyện lại lỗi")
        return ket_thuc("loi", f"{type(e).__name__}: {e}", chi_tiet=traceback.format_exc()[-2000:])
    finally:
        _nha_khoa(db)
