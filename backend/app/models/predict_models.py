# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

SUBJECT_GROUPS = [
    "A00", "A01", "B00", "B08", "C00", "C01", "C02", "C03",
    "D01", "D07", "D09", "D14", "D15", "X01", "X26",
]
GOALS = ["Đi làm", "Nghiên cứu", "Kinh doanh", "Chưa xác định"]
GENDERS = ["Nam", "Nu"]


class RecommendRequest(BaseModel):
    """Đầu vào cho mô hình XGBoost 2 tầng.

    `gender` KHÔNG nằm ở đây — server tự lấy từ hồ sơ người dùng đã đăng ký.
    """

    interests: list[int] = Field(
        ...,
        min_length=10,
        max_length=10,
        description=(
            "10 câu sở thích, mỗi câu 1..5, ĐÚNG thứ tự: nangDong, huongNoi, "
            "sangTao, logic, toMo, thiNghiem, moiTruong, dinhDuong, tranhLuan, thietKe"
        ),
    )
    subjectGroup: str = Field(..., description=f"Tổ hợp thi, một trong {SUBJECT_GROUPS}")
    scores: list[float] | None = Field(
        None,
        min_length=3,
        max_length=3,
        description=(
            "Điểm 3 môn theo ĐÚNG thứ tự môn của tổ hợp (vd A00 → Toán, Lý, Hoá). "
            "Bỏ trống nếu chưa thi — độ chính xác sẽ giảm."
        ),
    )
    goal: str = Field("Chưa xác định", description=f"Một trong {GOALS}")
    fieldId: int | None = Field(
        None,
        ge=0,
        le=6,
        description=(
            "Bỏ trống = chế độ explore (mô hình tự đoán khối). "
            "Điền 0..6 = chế độ guided (chỉ xếp hạng trong khối đã chọn)."
        ),
    )
    limit: int = Field(5, ge=1, le=39, description="Số ngành muốn hiển thị")
    softFilter: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description=(
            "Chỉ dùng ở chế độ guided. 0 = lọc cứng (khớp số liệu khoá luận). "
            "0.15 = lọc mềm, ngành ngoài khối vẫn còn cơ hội nếu chọn sai khối."
        ),
    )
    gender: str | None = Field(
        None,
        description=(
            "Chỉ dùng khi gọi KHÔNG kèm token (vd test ở localhost). "
            "Khi có token, server luôn ưu tiên giới tính trong hồ sơ đăng ký."
        ),
    )


class FieldSuggestion(BaseModel):
    id: int
    name: str
    probability: float


class AdmissionInfo(BaseModel):
    """Đối chiếu điểm thí sinh với điểm chuẩn 3 năm. CHỈ để hiển thị —
    không ảnh hưởng tới thứ hạng gợi ý."""

    cutoffs: dict[str, float] = Field(..., description="Điểm chuẩn THPT theo năm")
    min: float
    max: float
    latest: float
    trend: str = Field(..., description="'tang' | 'giam' | 'on_dinh' | 'khong_du_du_lieu'")
    level: str | None = Field(
        None,
        description=(
            "'an_toan' (≥ cao nhất 3 năm) · 'co_kha_nang' (trong khoảng) · "
            "'rui_ro_cao' (< thấp nhất). null khi thí sinh chưa nhập điểm."
        ),
    )
    gap: float | None = Field(None, description="Điểm thí sinh − điểm chuẩn năm mới nhất")


class MajorSuggestion(BaseModel):
    rank: int
    code: str
    name: str
    field: str
    score: float
    subjectGroups: list[str] = Field(
        default_factory=list, description="Tổ hợp ngành này xét tuyển"
    )
    admission: AdmissionInfo | None = None


class RecommendResponse(BaseModel):
    mode: str = Field(..., description="'explore' hoặc 'guided'")
    fields: list[FieldSuggestion] = Field(
        ...,
        description="Phân bố nhóm ngành cuối cùng — cộng xác suất các ngành cùng nhóm. "
        "Dùng cái này để hiển thị vì nó nhất quán với danh sách `majors`.",
    )
    fieldsStage1: list[FieldSuggestion] = Field(
        default_factory=list,
        description="Dự đoán thô của riêng tầng 1. Ở chế độ guided nó KHÔNG tham gia "
        "xếp hạng — chỉ để đối chiếu với nhóm ngành người dùng đã chọn.",
    )
    majors: list[MajorSuggestion]
    totalScore: float | None = Field(None, description="Tổng điểm 3 môn của thí sinh")
    warnings: list[str]


class MajorItem(BaseModel):
    code: str
    name: str
    subjectGroups: list[str] = Field(default_factory=list)
    cutoffs: dict[str, float] = Field(
        default_factory=dict, description="Điểm chuẩn thi THPT các năm"
    )


class FieldGroup(BaseModel):
    id: int
    name: str
    subjectGroups: list[str] = Field(
        default_factory=list, description="Hợp các tổ hợp mà ngành trong khối này xét tuyển"
    )
    majors: list[MajorItem]


class CatalogResponse(BaseModel):
    fields: list[FieldGroup]


# ── Schema cũ, giữ để không phá client đang chạy ─────────────────────────────


class SurveySubmit(BaseModel):
    scores: list[int] = Field(..., min_length=10, max_length=10)


class PredictionResult(BaseModel):
    major: str
    similarity: float


class PredictionResponse(BaseModel):
    results: list[PredictionResult]
