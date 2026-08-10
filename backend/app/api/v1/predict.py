# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from app.services.predict_service import predict_major

router = APIRouter()


from app.models.predict_models import SurveySubmit, PredictionResponse, PredictionResult


@router.post(
    "/",
    response_model=PredictionResponse,
    summary="Predict suitable majors",
)
def predict_user_majors(survey: SurveySubmit):
    """
    Nhận 10 điểm khảo sát của user và trả về danh sách các ngành học phù hợp
    được sắp xếp theo độ tương đồng giảm dần.
    """
    results = predict_major(survey.scores)
    return {"results": results}
