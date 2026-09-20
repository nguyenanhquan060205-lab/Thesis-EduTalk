"""
Support Router (Python)
Migrate từ: mobile/lib/screens/support_request_screen.dart + support_screen.dart
Xử lý yêu cầu hỗ trợ (Support Tickets) từ người dùng.
Sử dụng MongoDB thay cho Firestore.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_current_uid, get_database
from app.models.support_models import SupportRequest

router = APIRouter()


@router.post("/request")
async def send_support_request(
    body: SupportRequest,
    uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """
    Gửi yêu cầu hỗ trợ lên MongoDB.
    Migrate từ: support_request_screen.dart — sendSupportRequest().
    """
    # Lấy thông tin user
    user_doc = await db["users"].find_one({"_id": uid})
    user_name = "Người dùng"
    user_email = ""
    if user_doc:
        user_name = user_doc.get("name", "Người dùng")
        user_email = user_doc.get("email", "")

    await db["support_requests"].insert_one(
        {
            "userId": uid,
            "userName": user_name,
            "userEmail": user_email,
            "title": body.title,
            "message": body.message,
            "type": body.type,
            "status": "pending",
            "createdAt": datetime.now(timezone.utc),
        }
    )
    return {"status": "success"}


@router.get("/")
async def get_my_support_requests(
    uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """
    Lấy danh sách yêu cầu hỗ trợ của người dùng hiện tại.
    Migrate từ: support_screen.dart.
    """
    cursor = (
        db["support_requests"].find({"userId": uid}).sort("createdAt", -1).limit(20)
    )

    requests = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        requests.append(doc)

    return {"data": requests}
