"""Yêu cầu hỗ trợ của người dùng."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.api.deps import get_database
from app.models.admin_models import (
    UpdateSupportRequest,
)

router = APIRouter()


@router.get("/support")
async def get_all_support_requests(db=Depends(get_database)):
    """
    Lấy tất cả yêu cầu hỗ trợ cho Admin.
    Migrate từ: support_management_screen.dart.
    """

    result = []
    async for doc in db["support_requests"].find().sort("createdAt", -1):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        result.append(doc)
    return {"data": result}

@router.put("/support/{request_id}")
async def update_support_request(
    request_id: str, body: UpdateSupportRequest,
    db=Depends(get_database)
):
    """
    Cập nhật trạng thái yêu cầu hỗ trợ và gửi thông báo cho user.
    Migrate từ: support_management_screen.dart.
    """

    update_data: dict = {"status": body.status}

    # Nếu resolve → lưu answer và gửi notification cho user
    if body.status == "resolved" and body.adminNote:
        update_data["answer"] = body.adminNote
        update_data["answeredAt"] = datetime.now(timezone.utc)

    try:
        await db["support_requests"].update_one(
            {"_id": ObjectId(request_id)}, {"$set": update_data}
        )

        # Gửi notification cho user nếu resolve
        if body.status == "resolved":
            req_doc = await db["support_requests"].find_one(
                {"_id": ObjectId(request_id)}
            )
            if req_doc:
                user_uid = req_doc.get("userId") or req_doc.get("uid")
                if user_uid:
                    await db["notifications"].insert_one(
                        {
                            "receiverId": user_uid,
                            "senderId": "admin",
                            "senderName": "Quản trị viên",
                            "type": "support",
                            "postId": request_id,
                            "isRead": False,
                            "createdAt": datetime.now(timezone.utc),
                        }
                    )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}
