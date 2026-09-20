"""Quản lý tài khoản: xem, nâng cấp Premium, khoá, xoá."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_database, require_admin
from app.models.admin_models import (
    LockUserRequest,
    UpdatePremiumRequest,
)
from app.services.auth import auth_service

router = APIRouter()


@router.get("/users")
async def get_all_users(db=Depends(get_database)):
    """
    Lấy danh sách tất cả người dùng.
    Migrate từ: user_management_screen.dart — AdminService.getUsersStream().
    """

    # Trang quản trị hiện email đầy đủ: admin cần tra đúng tài khoản khi xử lý
    # khiếu nại hay hỗ trợ, che đi thì không đối chiếu được. Người dùng thường
    # thì ngược lại — kể cả xem hồ sơ của chính mình cũng chỉ thấy bản đã che.
    users = []
    async for doc in db["users"].find():
        doc["id"] = str(doc.pop("_id"))
        for k in ["createdAt", "premiumExpiry", "premiumStart"]:
            if k in doc and isinstance(doc[k], datetime):
                doc[k] = doc[k].isoformat()
        # Token thiết bị không phục vụ hiển thị, mà lộ ra thì gửi được thông báo giả
        doc.pop("fcmToken", None)
        doc.pop("hashed_password", None)
        users.append(doc)
    return {"data": users}

@router.put("/users/{uid}/premium")
async def update_user_premium(
    uid: str, body: UpdatePremiumRequest,
    db=Depends(get_database)
):
    """
    Cập nhật trạng thái Premium cho người dùng.
    Migrate từ: premium_management_screen.dart — AdminService.updatePremiumStatus().
    """

    updates = {
        "plan": None if body.plan == "none" else body.plan,
        "isPremium": body.isPremium,
        "subscriptionStatus": "active" if body.isPremium else "none",
    }

    now = datetime.now(timezone.utc)
    if body.isPremium:
        updates["premiumStart"] = now
        updates["premiumAt"] = now
        if body.plan == "monthly":
            updates["premiumExpiry"] = now + timedelta(days=30)
        elif body.plan == "yearly":
            updates["premiumExpiry"] = now + timedelta(days=365)
        else:  # lifetime
            updates["premiumExpiry"] = None
    else:
        updates["premiumStart"] = None
        updates["premiumExpiry"] = None
        updates["premiumAt"] = None

    await db["users"].update_one({"_id": uid}, {"$set": updates})
    return {"status": "success"}

@router.put("/users/{uid}/lock", summary="Khoá / mở khoá tài khoản")
async def lock_user(uid: str, body: LockUserRequest, admin_uid: str = Depends(require_admin), db=Depends(get_database)):
    """Khoá tài khoản: chặn đăng nhập và chặn mọi thao tác tạo nội dung.

    Làm ba việc cùng lúc:
    1. `disabled` trên Firebase Auth → lần đăng nhập tới bị từ chối ngay
    2. Thu hồi refresh token → phiên ở thiết bị khác hết hạn sớm
    3. Cờ `disabled` trong MongoDB → backend chặn thao tác của phiên còn sống

    Bước 3 mới là thứ chặn được **ngay lập tức**: ID token đã cấp vẫn hợp lệ tối đa
    1 giờ, không có cờ trong DB thì người bị khoá còn đăng bài thêm được một lúc.
    """
    if admin_uid == uid:
        raise HTTPException(
            status_code=400, detail="Không thể tự khoá tài khoản của chính mình."
        )

    muc_tieu = await db["users"].find_one({"_id": uid})
    if not muc_tieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if muc_tieu.get("role") == "admin" and body.disabled:
        raise HTTPException(
            status_code=400, detail="Không thể khoá tài khoản quản trị viên khác."
        )

    try:
        auth_service.auth.update_user(uid, disabled=body.disabled)
        if body.disabled:
            auth_service.auth.revoke_refresh_tokens(uid)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Không cập nhật được trên Firebase: {e!s}"
        ) from e

    await db["users"].update_one(
        {"_id": uid},
        {
            "$set": {
                "disabled": body.disabled,
                "disabledReason": body.reason if body.disabled else "",
                "disabledAt": datetime.now(timezone.utc) if body.disabled else None,
            }
        },
    )
    return {"status": "success", "disabled": body.disabled}

@router.delete("/users/{uid}")
async def delete_user(uid: str, db=Depends(get_database)):
    """
    Xóa người dùng khỏi hệ thống (Admin).
    Migrate từ: user_management_screen.dart — AdminService.deleteUser().
    """
    await db["users"].delete_one({"_id": uid})
    return {"status": "success"}
