"""Thông báo gửi tới quản trị viên."""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.api.deps import get_database

router = APIRouter()


@router.get("/notifications")
async def get_admin_notifications(db=Depends(get_database)):
    """
    Lấy thông báo chưa đọc của Admin (báo cáo bài viết...).
    Migrate từ: admin_layout.dart — AdminService.getAdminNotificationsStream().
    """

    notifs = []
    async for doc in (
        db["admin_notifications"].find({"status": "unread"}).sort("createdAt", -1)
    ):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        notifs.append(doc)
    return {"data": notifs}

@router.put("/notifications/{notif_id}/resolve")
async def resolve_admin_notification(notif_id: str, db=Depends(get_database)):
    """Đánh dấu thông báo admin đã xử lý."""
    try:
        await db["admin_notifications"].update_one(
            {"_id": ObjectId(notif_id)}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}
