"""Phản hồi của người dùng — đầu vào của vòng lặp huấn luyện lại.

Hai loại, cố ý tách riêng vì phục vụ hai mục đích khác nhau:

    đánh giá app      số sao + ý kiến về EduTalk nói chung. Hỏi sau lần dự đoán ĐẦU TIÊN,
                      một người một bản ghi (gửi lại thì ghi đè). Chỉ để thống kê trải
                      nghiệm, KHÔNG dùng để huấn luyện.
    phản hồi gợi ý    gắn vào MỘT lượt tư vấn đã lưu: gợi ý có hữu ích không, và ngành
                      người dùng đã chọn / đã đỗ. Nhãn ngành chính là dữ liệu mới cho vòng
                      lặp huấn luyện lại — thường chỉ biết sau kỳ xét tuyển, nên người dùng
                      cập nhật được bất cứ lúc nào từ trang lịch sử.

Tất cả cần đăng nhập: lượt tư vấn của khách không được lưu nên không có gì để gắn phản hồi.
"""

from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_uid, get_database

router = APIRouter()


class DanhGiaAppRequest(BaseModel):
    sao: int = Field(..., ge=1, le=5)
    yKien: str | None = Field(None, max_length=1000)
    predictionId: str | None = Field(None, description="Lượt tư vấn ngay trước khi đánh giá")
    nguon: Literal["web", "mobile"] = "web"


class PhanHoiDuDoanRequest(BaseModel):
    """Gửi trường nào cập nhật trường đó. `nganhDaChon: null` = xoá nhãn đã gửi."""

    goiYHuuIch: Literal["co", "mot_phan", "khong"] | None = None
    nganhDaChon: str | None = Field(None, description="Mã ngành, lấy từ /predict/catalog")
    trangThaiNganh: Literal["da_do", "dang_hoc", "du_dinh"] | None = Field(
        None, description="da_do = đã trúng tuyển · dang_hoc = đang học · du_dinh = dự định"
    )


@router.get("/trang-thai", summary="Có nên hỏi người dùng đánh giá app không")
async def trang_thai(uid: str = Depends(get_current_uid), db=Depends(get_database)):
    so_luot = await db["prediction_history"].count_documents({"user_id": uid})
    dg = await db["danh_gia_app"].find_one({"user_id": uid}, {"sao": 1})
    return {
        "soLuotDuDoan": so_luot,
        "daDanhGiaApp": dg is not None,
        "saoDaCho": dg.get("sao") if dg else None,
        # Hỏi đúng sau lần dự đoán đầu: đã có ít nhất một lượt và chưa từng đánh giá
        "canHoiDanhGia": so_luot >= 1 and dg is None,
    }


@router.post("/danh-gia-app", summary="Gửi đánh giá EduTalk")
async def danh_gia_app(
    body: DanhGiaAppRequest,
    uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    bay_gio = datetime.now(timezone.utc)
    await db["danh_gia_app"].update_one(
        {"user_id": uid},
        {
            "$set": {
                "sao": body.sao,
                "y_kien": (body.yKien or "").strip() or None,
                "prediction_id": body.predictionId,
                "nguon": body.nguon,
                "updatedAt": bay_gio,
            },
            "$setOnInsert": {"createdAt": bay_gio},
        },
        upsert=True,
    )
    return {"thanhCong": True}


@router.put("/du-doan/{prediction_id}", summary="Phản hồi cho một lượt tư vấn đã lưu")
async def phan_hoi_du_doan(
    prediction_id: str,
    body: PhanHoiDuDoanRequest,
    uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    try:
        oid = ObjectId(prediction_id)
    except (InvalidId, TypeError) as e:
        raise HTTPException(400, "Mã lượt tư vấn không hợp lệ.") from e

    doc = await db["prediction_history"].find_one({"_id": oid, "user_id": uid}, {"_id": 1})
    if not doc:
        raise HTTPException(404, "Không tìm thấy lượt tư vấn này trong lịch sử của bạn.")

    gui = body.model_fields_set
    if not gui:
        raise HTTPException(400, "Không có gì để cập nhật.")

    dat: dict = {}
    if "goiYHuuIch" in gui:
        dat["phan_hoi.goi_y_huu_ich"] = body.goiYHuuIch
    if "nganhDaChon" in gui:
        ma = (body.nganhDaChon or "").strip() or None
        if ma is not None:
            # Nhãn sai mã sẽ lọt thẳng vào dữ liệu huấn luyện — chặn ngay ở cửa
            from app.services.major_predictor import get_predictor

            if ma not in {str(m) for m in get_predictor().major_code.values()}:
                raise HTTPException(422, f"Mã ngành {ma} không thuộc 39 ngành của trường.")
        dat["phan_hoi.nganh_da_chon"] = ma
    if "trangThaiNganh" in gui:
        dat["phan_hoi.trang_thai_nganh"] = body.trangThaiNganh
    dat["phan_hoi.cap_nhat_luc"] = datetime.now(timezone.utc)

    await db["prediction_history"].update_one({"_id": oid}, {"$set": dat})
    moi = await db["prediction_history"].find_one({"_id": oid}, {"phan_hoi": 1})
    ph = dict(moi.get("phan_hoi") or {})
    if isinstance(ph.get("cap_nhat_luc"), datetime):
        ph["cap_nhat_luc"] = ph["cap_nhat_luc"].isoformat()
    return {"phanHoi": ph}
