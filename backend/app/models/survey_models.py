# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class SurveySubmitRequest(BaseModel):
    scores: list[int] = Field(
        ...,
        min_length=10,
        max_length=10,
        description="10 điểm khảo sát từ màn hình DuLieu",
    )
    userId: str
