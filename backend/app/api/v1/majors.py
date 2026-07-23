from fastapi import APIRouter
from app.services.predict_service import HUIT_MAJORS

router = APIRouter()


@router.get("/")
def get_all_majors():
    """
    Trả về danh sách 39 ngành học HUIT chuẩn 2026
    """
    return {"majors": HUIT_MAJORS}
