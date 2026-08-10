"""
Users Router (Python)
Các endpoint quản lý thông tin người dùng (profile, cập nhật, premium status...).
Sử dụng MongoDB thay cho Firestore.
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.core.mongodb import get_db
from app.services.auth_service import AuthService
from datetime import datetime
from bson import ObjectId

router = APIRouter()
auth_service = AuthService()


from app.models.user_models import UpdateProfileRequest

async def get_current_uid(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    return decoded["uid"]


@router.get("/")
def get_users_status():
    return {"message": "Users API status OK"}


@router.get("/{uid}")
async def get_user_profile(uid: str, authorization: str = Header(...)):
    """Lấy thông tin profile của người dùng."""
    await get_current_uid(authorization)
    db = get_db()
    user_doc = await db["users"].find_one({"_id": uid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    user_doc["id"] = user_doc.pop("_id")
    user_doc.pop("hashed_password", None)  # Không trả về password nếu có
    return user_doc


@router.put("/{uid}")
async def update_user_profile(uid: str, body: UpdateProfileRequest, authorization: str = Header(...)):
    """Cập nhật thông tin profile (tên, bật/tắt thông báo...)."""
    current_uid = await get_current_uid(authorization)
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Không có quyền chỉnh sửa tài khoản này.")

    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cần cập nhật.")

    db = get_db()
    await db["users"].update_one({"_id": uid}, {"$set": update_data})
    return {"status": "success"}


@router.get("/{uid}/premium")
async def get_premium_status(uid: str, authorization: str = Header(...)):
    """Kiểm tra trạng thái Premium của người dùng."""
    await get_current_uid(authorization)
    db = get_db()
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
async def get_notifications(uid: str, authorization: str = Header(...)):
    """Lấy danh sách thông báo của người dùng."""
    current_uid = await get_current_uid(authorization)
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Không có quyền xem thông báo này.")

    db = get_db()
    cursor = (
        db["notifications"]
        .find({"receiverId": uid})
        .sort("createdAt", -1)
        .limit(50)
    )
    
    notifications = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        notifications.append(doc)
    return {"data": notifications}


@router.put("/{uid}/notifications/{notif_id}/read")
async def mark_notification_read(uid: str, notif_id: str, authorization: str = Header(...)):
    """Đánh dấu một thông báo là đã đọc."""
    await get_current_uid(authorization)
    db = get_db()
    try:
        await db["notifications"].update_one(
            {"_id": ObjectId(notif_id)},
            {"$set": {"isRead": True}}
        )
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.put("/{uid}/notifications/read-all")
async def mark_all_notifications_read(uid: str, authorization: str = Header(...)):
    """Đánh dấu tất cả thông báo là đã đọc."""
    await get_current_uid(authorization)
    db = get_db()
    await db["notifications"].update_many(
        {"receiverId": uid, "isRead": False},
        {"$set": {"isRead": True}}
    )
    return {"status": "success"}
