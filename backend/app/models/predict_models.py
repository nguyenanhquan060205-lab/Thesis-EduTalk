# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

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
