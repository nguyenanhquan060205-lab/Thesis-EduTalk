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
    # Chặn trên 8 = 9 nhóm ngành của mô hình đang phục vụ, khớp RecommendRequest. Để
    # `le=6` như thời 7 khối thì người đã đăng nhập chọn nhóm 7 hoặc 8 nhận 422.
    fieldId: int | None = Field(
        None, ge=0, le=8, description="Bỏ trống = explore, điền = guided"
    )
    limit: int | None = Field(
        None,
        ge=1,
        le=39,
        description="Bỏ trống = số gợi ý chuẩn của mô hình (tư vấn 2, khám phá 5)",
    )
