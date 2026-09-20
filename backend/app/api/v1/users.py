"""
Users Router (Python)
Các endpoint quản lý thông tin người dùng (profile, cập nhật, premium status...).
Sử dụng MongoDB thay cho Firestore.
"""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import ensure_self_or_admin, get_current_uid, get_database
from app.core.privacy import che_email, che_ho_so
from app.models.user_models import UpdateProfileRequest

router = APIRouter()


@router.get("/{uid}")
async def get_user_profile(
    uid: str,
    current_uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """Lấy hồ sơ của **chính mình** (hoặc bất kỳ ai, nếu là admin).

    Bản trước gọi `get_current_uid()` rồi **vứt kết quả đi**, không so với `uid`
    trên URL — nghĩa là bất kỳ ai đăng nhập cũng đọc được email, số điện thoại,
    ngày sinh của người khác chỉ bằng cách đổi uid trên đường dẫn.
    """
    await ensure_self_or_admin(uid, current_uid, db, "Không có quyền xem hồ sơ này.")

    user_doc = await db["users"].find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    user_doc["id"] = user_doc.pop("_id")
    user_doc.pop("hashed_password", None)  # Không trả về password nếu có

    if current_uid != uid:
        return che_ho_so(user_doc)

    # Chính chủ cũng chỉ thấy email đã che, để người ngồi cạnh hay ảnh chụp màn
    # hình không đọc được địa chỉ đầy đủ. Muốn đổi email thì phải gõ lại đúng
    # địa chỉ hiện tại — xem luồng /auth/email-change/*.
    #
    # CHỈ che `email`. Không che `phone` và `dob`: hai trường đó nằm trong
    # UpdateProfileRequest và được form sửa hồ sơ nạp thẳng vào ô nhập, nên trả
    # bản đã che về sẽ bị ghi ngược chuỗi sao xuống cơ sở dữ liệu ngay lần lưu
    # kế tiếp. `email` không ghi được qua PUT nên che là an toàn.
    user_doc["email"] = che_email(user_doc.get("email"))
    user_doc["emailDaChe"] = True
    return user_doc


@router.put("/{uid}")
async def update_user_profile(
    uid: str,
    body: UpdateProfileRequest,
    current_uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """Cập nhật thông tin profile (tên, bật/tắt thông báo...)."""
    if current_uid != uid:
        raise HTTPException(
            status_code=403, detail="Không có quyền chỉnh sửa tài khoản này."
        )

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cần cập nhật.")

    await db["users"].update_one({"_id": uid}, {"$set": update_data})
    return {"status": "success"}


@router.get("/{uid}/premium", dependencies=[Depends(get_current_uid)])
async def get_premium_status(uid: str, db=Depends(get_database)):
    """Kiểm tra trạng thái Premium của người dùng.

    ⚠️ Chỉ đòi "đã đăng nhập", KHÔNG so `uid` trên URL với người gọi — giữ đúng hành vi
    cũ để không phá client. Trả về chỉ có trạng thái gói, không có dữ liệu cá nhân.
    """
    user_doc = await db["users"].find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    is_premium = user_doc.get("isPremium", False)
    plan = user_doc.get("plan")
    expiry = user_doc.get("premiumExpiry")

    if not is_premium:
        return {"isPremium": False}
    if plan == "lifetime":
        return {"isPremium": True, "plan": "lifetime"}
    if expiry:
        expiry_dt = expiry.isoformat() if hasattr(expiry, "isoformat") else str(expiry)
        return {"isPremium": True, "plan": plan, "premiumExpiry": expiry_dt}

    return {"isPremium": False}


@router.get("/{uid}/notifications")
async def get_notifications(
    uid: str,
    current_uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """Lấy danh sách thông báo của người dùng."""
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Không có quyền xem thông báo này.")

    cursor = (
        db["notifications"].find({"receiverId": uid}).sort("createdAt", -1).limit(50)
    )

    notifications = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        notifications.append(doc)
    return {"data": notifications}


@router.put("/{uid}/notifications/{notif_id}/read", dependencies=[Depends(get_current_uid)])
async def mark_notification_read(uid: str, notif_id: str, db=Depends(get_database)):
    """Đánh dấu một thông báo là đã đọc.

    ⚠️ Như `/premium`: chỉ đòi đã đăng nhập, không so `uid` với người gọi — hành vi cũ,
    giữ nguyên trong đợt dọn cấu trúc này.
    """
    try:
        await db["notifications"].update_one(
            {"_id": ObjectId(notif_id)}, {"$set": {"isRead": True}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}


@router.put("/{uid}/notifications/read-all", dependencies=[Depends(get_current_uid)])
async def mark_all_notifications_read(uid: str, db=Depends(get_database)):
    """Đánh dấu tất cả thông báo là đã đọc. (Cùng lưu ý quyền như hai endpoint trên.)"""
    await db["notifications"].update_many(
        {"receiverId": uid, "isRead": False}, {"$set": {"isRead": True}}
    )
    return {"status": "success"}
