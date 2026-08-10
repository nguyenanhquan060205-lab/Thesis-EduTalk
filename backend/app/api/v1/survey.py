"""
Survey Router (Python)
Migrate từ: màn hình DuLieu.dart / PhanTich.dart trong mobile
Xử lý bài khảo sát đánh giá sở thích để gợi ý ngành học phù hợp.
Kết hợp với predict_service.py (ML model đã có sẵn).
Sử dụng MongoDB thay cho Firestore.
"""
from datetime import datetime, timezone

from app.core.mongodb import get_db
from app.services.auth_service import AuthService
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()
auth_service = AuthService()


from app.models.survey_models import SurveySubmitRequest


async def get_current_uid(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    return decoded["uid"]


@router.get("/")
def get_survey_status():
    return {"message": "Survey API status OK"}


@router.post("/submit")
async def submit_survey(body: SurveySubmitRequest, authorization: str = Header(...)):
    """
    Nhận điểm khảo sát, gọi API ML model để dự đoán ngành,
    tăng usageCount (nếu ko premium), và lưu kết quả vào MongoDB.
    """
    uid = await get_current_uid(authorization)
    db = get_db()

    # 1. Gọi API ML model cũ
    import httpx
    ml_url = "https://edutalk-7ndf.onrender.com/api/prediction/predict"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                ml_url,
                json={"scores": body.scores, "userId": uid},
                timeout=30.0
            )
            ml_data = resp.json()
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"Lỗi kết nối ML API: {e!s}")

    if not ml_data.get("success"):
        raise HTTPException(status_code=400, detail="Lỗi dự đoán từ mô hình")

    # 2. Tăng usageCount trên MongoDB TRƯỚC (chỉ khi không phải Premium)
    user_doc = await db["users"].find_one({"_id": uid})
    if user_doc:
        is_premium = user_doc.get("isPremium", False)
        if not is_premium:
            await db["users"].update_one({"_id": uid}, {"$inc": {"usageCount": 1}})

    # 3. Lưu lịch sử dự đoán
    major = ml_data.get("predicted_major", "")
    unis = ml_data.get("recommendations", [])
    user_scores = ml_data.get("user_scores", [])
    major_reqs = ml_data.get("major_requirements", [])
    
    history_data = {
        "user_id": uid,
        "predicted_major": major,
        "user_scores": user_scores,
        "major_requirements": major_reqs,
        "recommendations": unis,
        "input_scores": body.scores,
        "createdAt": datetime.now(timezone.utc),
    }
    await db["prediction_history"].insert_one(history_data)

    return {"status": "success", "results": ml_data}



@router.get("/history/{uid}")
async def get_survey_history(uid: str, authorization: str = Header(...)):
    """Lấy lịch sử các bài khảo sát đã làm của người dùng."""
    current_uid = await get_current_uid(authorization)
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Không có quyền xem lịch sử này.")

    db = get_db()
    cursor = (
        db["prediction_history"]
        .find({"user_id": uid})
        .sort("createdAt", -1)
        .limit(20)
    )
    
    history = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        history.append(doc)
        
    return {"data": history}
