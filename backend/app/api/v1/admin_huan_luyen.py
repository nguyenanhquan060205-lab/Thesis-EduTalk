"""Quản trị vòng lặp phản hồi và huấn luyện lại — chỉ admin.

    GET  /                              tổng quan: cấu hình, lịch, dữ liệu phản hồi, đánh giá
                                        app, các phiên bản, lịch sử chạy
    PUT  /cau-hinh                      đổi chu kỳ và cổng kiểm định, đặt lại lịch ngay
    POST /chay-ngay                     huấn luyện lại ngay (chạy nền, vẫn qua cổng kiểm định)
    POST /phien-ban/{ma}/phuc-vu        đưa một phiên bản vào phục vụ — "goc" = quay về mô
                                        hình trong gói

Router mỏng: toàn bộ nghiệp vụ ở `app/services/huan_luyen/`.
"""

import asyncio
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.api.deps import get_database, require_admin
from app.core.mongodb import get_db_dong_bo
from app.services.huan_luyen import du_lieu, lich, phien_ban, tien_trinh

# Mọi endpoint dưới đây đòi quyền admin — gác ở cấp router để không thể quên
# một route mới. Handler nào cần uid thì vẫn khai Depends(require_admin).
router = APIRouter(dependencies=[Depends(require_admin)])
_TAC_VU: set[asyncio.Task] = set()


class CauHinhRequest(BaseModel):
    chu_ky: Literal["tat", "hang_ngay", "hang_tuan", "hang_thang"]
    gio: int = Field(..., ge=0, le=23)
    thu: Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"] = "sun"
    ngay: int = Field(1, ge=1, le=28)  # 28 để tháng nào cũng có
    nhan_toi_thieu: int = Field(..., ge=1, le=100000)
    giu_lai_toi_thieu: int = Field(..., ge=5, le=100000)
    dung_sai_diem: float = Field(..., ge=0, le=10)
    tu_dong_phuc_vu: bool


def _sach(x):
    """ObjectId/datetime → chuỗi, đi sâu vào dict/list — để trả thẳng ra JSON."""
    if isinstance(x, ObjectId):
        return str(x)
    if isinstance(x, datetime):
        return x.replace(tzinfo=timezone.utc).isoformat() if x.tzinfo is None else x.isoformat()
    if isinstance(x, dict):
        return {k: _sach(v) for k, v in x.items() if k != "_id"} | (
            {"id": str(x["_id"])} if "_id" in x else {}
        )
    if isinstance(x, list):
        return [_sach(v) for v in x]
    return x


def _tong_hop_dong_bo() -> dict:
    """Phần đọc bằng pymongo + dựng đặc trưng — chạy trong luồng riêng."""
    from app.services.major_predictor import get_predictor, ma_phien_ban_dang_nap

    db = get_db_dong_bo()
    truoc = db[tien_trinh.COL_LICH_SU].find_one(
        {"ket_qua": {"$in": ["da_phuc_vu", "cho_duyet", "tu_choi"]}}, sort=[("bat_dau", -1)]
    )
    mau = du_lieu.lay_mau_phan_hoi(db, get_predictor(), moi_tu=truoc["bat_dau"] if truoc else None)
    meta = phien_ban.meta_goi()
    return {
        "cau_hinh": tien_trinh.doc_cau_hinh(db),
        "dang_chay": tien_trinh.dang_chay(db),
        "du_lieu_huan_luyen": mau.thong_ke,
        "phien_ban": phien_ban.danh_sach(),
        "phien_ban_dang_phuc_vu": phien_ban.ma_dang_phuc_vu(),
        "phien_ban_worker_dang_nap": ma_phien_ban_dang_nap(),
        "goc": {
            "ngay_chot": meta.get("ngay_chot"),
            "n_hoc": meta.get("du_lieu", {}).get("n_hoc"),
            "test": {t: (meta.get("chi_so", {}).get("test", {}).get(t) or {}).get(
                f"top{meta['diem_van_hanh'][t]}") for t in ("tu_van", "kham_pha")},
            "diem_van_hanh": meta["diem_van_hanh"],
            "hp": meta.get("hp"),
        },
        "lich_su": list(db[tien_trinh.COL_LICH_SU].find({}, {"chi_tiet": 0})
                        .sort("bat_dau", -1).limit(20)),
        "ti_le_giu_lai": 1 / du_lieu.TI_LE_GIU_LAI,
    }


@router.get("", summary="Tổng quan huấn luyện lại và phản hồi")
async def tong_quan(request: Request, db=Depends(get_database)):
    if db is None or get_db_dong_bo() is None:
        raise HTTPException(503, "Thiếu MONGO_URI — vòng lặp phản hồi cần MongoDB.")

    dong_bo = await asyncio.to_thread(_tong_hop_dong_bo)

    # ── Phản hồi gợi ý và đánh giá app (motor, không chặn event loop) ────────
    ph = db["prediction_history"]
    huu_ich = {d["_id"]: d["n"] async for d in ph.aggregate([
        {"$match": {"phan_hoi.goi_y_huu_ich": {"$ne": None}}},
        {"$group": {"_id": "$phan_hoi.goi_y_huu_ich", "n": {"$sum": 1}}}])}
    theo_sao = {d["_id"]: d["n"] async for d in db["danh_gia_app"].aggregate([
        {"$group": {"_id": "$sao", "n": {"$sum": 1}}}])}
    so_danh_gia = sum(theo_sao.values())
    y_kien = [
        _sach(d) async for d in db["danh_gia_app"]
        .find({"y_kien": {"$nin": [None, ""]}}, {"user_id": 0})
        .sort("updatedAt", -1).limit(20)
    ]

    return _sach({
        **dong_bo,
        "lich_tiep_theo": lich.lich_tiep_theo(getattr(request.app.state, "scheduler", None)),
        "phan_hoi": {
            "so_luot_tu_van": await ph.count_documents({}),
            "co_danh_gia_goi_y": sum(huu_ich.values()),
            "goi_y_huu_ich": huu_ich,
        },
        "danh_gia_app": {
            "so_luot": so_danh_gia,
            "trung_binh": (sum(k * v for k, v in theo_sao.items()) / so_danh_gia)
            if so_danh_gia else None,
            "theo_sao": {str(s): theo_sao.get(s, 0) for s in range(1, 6)},
            "y_kien_gan_day": y_kien,
        },
    })


@router.put("/cau-hinh", summary="Đổi chu kỳ và cổng kiểm định")
async def cap_nhat_cau_hinh(body: CauHinhRequest, request: Request, uid: str = Depends(require_admin), db=Depends(get_database)):
    if db is None:
        raise HTTPException(503, "Thiếu MONGO_URI.")
    cfg = body.model_dump()
    await db[tien_trinh.COL_CAU_HINH].update_one(
        {"_id": tien_trinh.KHOA},
        {"$set": {**cfg, "cap_nhat_luc": datetime.now(timezone.utc), "cap_nhat_boi": uid}},
        upsert=True,
    )
    sch = getattr(request.app.state, "scheduler", None)
    if sch is not None:
        lich.ap_dung_lich(sch, cfg)
    return {"cau_hinh": cfg, "lich_tiep_theo": lich.lich_tiep_theo(sch)}


@router.post("/chay-ngay", summary="Huấn luyện lại ngay")
async def chay_ngay(uid: str = Depends(require_admin)):
    if get_db_dong_bo() is None:
        raise HTTPException(503, "Thiếu MONGO_URI.")
    if await asyncio.to_thread(tien_trinh.dang_chay):
        raise HTTPException(409, "Đang có một lượt huấn luyện chạy — đợi xong rồi chạy lại.")
    t = asyncio.create_task(asyncio.to_thread(tien_trinh.chay_huan_luyen, "thu_cong", uid))
    _TAC_VU.add(t)
    t.add_done_callback(_TAC_VU.discard)
    return {"batDau": datetime.now(timezone.utc).isoformat()}


@router.post("/phien-ban/{ma}/phuc-vu", summary="Đưa một phiên bản vào phục vụ / quay lại")
async def dua_vao_phuc_vu(ma: str, uid: str = Depends(require_admin)):
    from app.services.major_predictor import nap_lai_predictor

    try:
        await asyncio.to_thread(phien_ban.dat_phuc_vu, ma, uid)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e)) from e
    except (ValueError, RuntimeError) as e:
        raise HTTPException(400, str(e)) from e
    await asyncio.to_thread(nap_lai_predictor, ma)
    return {"dangPhucVu": ma}
