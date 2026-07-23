from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.predict_service import predict_major

router = APIRouter()


class SurveySubmit(BaseModel):
    scores: list[int] = Field(
        ...,
        min_length=10,
        max_length=10,
        description="10 scores from survey",
    )


class PredictionResult(BaseModel):
    major: str
    similarity: float


class PredictionResponse(BaseModel):
    results: list[PredictionResult]


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
