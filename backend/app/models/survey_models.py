# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class SurveySubmitRequest(BaseModel):
    """Cùng bộ trường với `RecommendRequest` để mobile và web dùng chung một form.

    Không có `gender` — server lấy từ hồ sơ người dùng đã đăng ký.
    """

    interests: list[int] = Field(
        ...,
        min_length=10,
        max_length=10,
        description="10 câu sở thích, mỗi câu 1..5",
    )
    subjectGroup: str = Field(..., description="Tổ hợp thi, vd 'A00'")
    scores: list[float] | None = Field(
        None,
        min_length=3,
        max_length=3,
        description="Điểm 3 môn theo đúng thứ tự môn của tổ hợp. Bỏ trống nếu chưa thi.",
    )
    goal: str = Field("Chưa xác định")
    fieldId: int | None = Field(
        None, ge=0, le=6, description="Bỏ trống = explore, điền = guided"
    )
    limit: int = Field(5, ge=1, le=39)
