from app.services.predict_service import HUIT_MAJORS
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_all_majors():
    """
    Trả về danh sách 39 ngành học HUIT chuẩn 2026
    """
    return {"majors": HUIT_MAJORS}
