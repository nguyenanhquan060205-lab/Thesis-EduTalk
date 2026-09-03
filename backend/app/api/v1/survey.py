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
        raise HTTPException(
            status_code=401, detail="Token không hợp lệ hoặc đã hết hạn."
        )
    return decoded["uid"]


@router.get("/")
def get_survey_status():
    return {"message": "Survey API status OK"}


@router.post("/submit")
async def submit_survey(body: SurveySubmitRequest, authorization: str = Header(...)):
    """Chạy mô hình XGBoost 2 tầng ngay trong tiến trình này, tăng usageCount
    (nếu không phải Premium), rồi lưu lịch sử vào MongoDB.

    Trước đây hàm này gọi ra `edutalk-7ndf.onrender.com` (mô hình cũ). Đã bỏ:
    mô hình hiện nằm luôn trong backend nên không còn phụ thuộc mạng, không còn
    độ trễ vòng ngoài, và kết quả khớp đúng số liệu đã báo cáo trong khoá luận.
    """
    from app.services.major_predictor import get_predictor

    uid = await get_current_uid(authorization)
    db = get_db()

    try:
        predictor = get_predictor()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    # 1. Giới tính lấy từ hồ sơ đăng ký, không hỏi lại người dùng
    user_doc = await db["users"].find_one({"_id": uid})
    gender = (user_doc or {}).get("gender")
    warnings: list[str] = []
    # Ghi lại việc hồ sơ THIẾU giới tính. Không có cờ này thì bản ghi lưu "Nu"
    # y hệt một nữ thật, và về sau không cách nào đếm được bao nhiêu lượt tư vấn
    # chạy ở trạng thái kém chính xác.
    thieu_gioi_tinh = gender not in ("Nam", "Nu")
    if thieu_gioi_tinh:
        gender = "Nu"
        warnings.append(
            "Hồ sơ chưa có giới tính — hãy cập nhật trong phần tài khoản "
            "để gợi ý chính xác hơn."
        )

    # 2. Chạy mô hình
    try:
        result = predictor.recommend(
            interests=body.interests,
            subject_group=body.subjectGroup,
            gender=gender,
            goal=body.goal,
            scores=body.scores,
            field_id=body.fieldId,
            limit=body.limit,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    result["warnings"] = warnings + result["warnings"]

    # 3. Tăng usageCount (chỉ khi không phải Premium)
    if user_doc and not user_doc.get("isPremium", False):
        await db["users"].update_one({"_id": uid}, {"$inc": {"usageCount": 1}})

    # 4. Lưu lịch sử — giữ cả đầu vào để sau này dùng cho vòng lặp phản hồi
    await db["prediction_history"].insert_one(
        {
            "user_id": uid,
            "mode": result["mode"],
            "predicted_major": result["majors"][0]["name"] if result["majors"] else "",
            "fields": result["fields"],
            "majors": result["majors"],
            "input": {
                "interests": body.interests,
                "subjectGroup": body.subjectGroup,
                "scores": body.scores,
                "goal": body.goal,
                "gender": gender,
                "genderMissing": thieu_gioi_tinh,
                "fieldId": body.fieldId,
            },
            "createdAt": datetime.now(timezone.utc),
        }
    )

    return {"status": "success", "results": result}


@router.get("/history/{uid}")
async def get_survey_history(uid: str, authorization: str = Header(...)):
    """Lấy lịch sử các bài khảo sát đã làm của người dùng."""
    current_uid = await get_current_uid(authorization)
    if current_uid != uid:
        raise HTTPException(status_code=403, detail="Không có quyền xem lịch sử này.")

    db = get_db()
    cursor = (
        db["prediction_history"].find({"user_id": uid}).sort("createdAt", -1).limit(20)
    )

    history = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        history.append(doc)

    return {"data": history}
