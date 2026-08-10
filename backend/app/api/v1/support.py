"""
Support Router (Python)
Migrate từ: mobile/lib/screens/support_request_screen.dart + support_screen.dart
Xử lý yêu cầu hỗ trợ (Support Tickets) từ người dùng.
Sử dụng MongoDB thay cho Firestore.
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.core.mongodb import get_db
from app.services.auth_service import AuthService
from datetime import datetime

router = APIRouter()
auth_service = AuthService()


from app.models.support_models import SupportRequest


async def get_current_uid(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")
    return decoded["uid"]


@router.post("/request")
async def send_support_request(body: SupportRequest, authorization: str = Header(...)):
    """
    Gửi yêu cầu hỗ trợ lên MongoDB.
    Migrate từ: support_request_screen.dart — sendSupportRequest().
    """
    uid = await get_current_uid(authorization)
    db = get_db()

    # Lấy thông tin user
    user_doc = await db["users"].find_one({"_id": uid})
    user_name = "Người dùng"
    user_email = ""
    if user_doc:
        user_name = user_doc.get("name", "Người dùng")
        user_email = user_doc.get("email", "")

    await db["support_requests"].insert_one({
        "userId": uid,
        "userName": user_name,
        "userEmail": user_email,
        "title": body.title,
        "message": body.message,
        "type": body.type,
        "status": "pending",
        "createdAt": datetime.now(),
    })
    return {"status": "success"}


@router.get("/")
async def get_my_support_requests(authorization: str = Header(...)):
    """
    Lấy danh sách yêu cầu hỗ trợ của người dùng hiện tại.
    Migrate từ: support_screen.dart.
    """
    uid = await get_current_uid(authorization)
    db = get_db()
    
    cursor = (
        db["support_requests"]
        .find({"userId": uid})
        .sort("createdAt", -1)
        .limit(20)
    )
    
    requests = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        requests.append(doc)
        
    return {"data": requests}
