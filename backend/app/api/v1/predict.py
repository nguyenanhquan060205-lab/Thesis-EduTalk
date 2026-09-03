# pyrefly: ignore [missing-import]
from app.core.mongodb import get_db
from app.models.predict_models import (
    CatalogResponse,
    PredictionResponse,
    RecommendRequest,
    RecommendResponse,
    SurveySubmit,
)
from app.services.auth_service import AuthService
from app.services.predict_service import predict_major
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()
auth_service = AuthService()

DEFAULT_GENDER = "Nu"


async def resolve_gender(
    authorization: str | None, fallback: str | None
) -> tuple[str, list[str]]:
    """Giới tính lấy theo thứ tự ưu tiên:

    1. Hồ sơ người dùng đã đăng ký (khi request có token hợp lệ)
    2. Trường `gender` trong body — chỉ dành cho lúc test không có token
    3. Mặc định, kèm cảnh báo

    Không chặn request khi thiếu — mô hình vẫn chạy được, chỉ kém chính xác đi chút.
    """
    warnings: list[str] = []

    if authorization:
        try:
            decoded = await auth_service.verify_token(
                authorization.replace("Bearer ", "")
            )
            if decoded:
                doc = await get_db()["users"].find_one({"_id": decoded["uid"]})
                gender = (doc or {}).get("gender")
                if gender in ("Nam", "Nu"):
                    return gender, warnings
                warnings.append(
                    "Hồ sơ chưa có giới tính — hãy cập nhật trong phần tài khoản "
                    "để gợi ý chính xác hơn."
                )
            else:
                warnings.append("Token không hợp lệ nên không đọc được hồ sơ.")
        except Exception:  # noqa: BLE001 — thiếu hồ sơ không được làm hỏng gợi ý
            warnings.append("Không đọc được hồ sơ người dùng.")

    if fallback in ("Nam", "Nu"):
        return fallback, warnings
    return DEFAULT_GENDER, warnings


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    summary="Gợi ý ngành học (XGBoost 2 tầng)",
)
async def recommend_majors(
    body: RecommendRequest, authorization: str | None = Header(None)
):
    """Mô hình XGBoost 2 tầng của Giai đoạn 8 (research/).

    **Hai chế độ** — khác nhau ở chỗ người dùng có chọn khối ngành hay không:

    | Chế độ | Khi nào | Top-3 trên tập kiểm tra |
    |---|---|---|
    | `explore` | `fieldId` bỏ trống | 39,2% |
    | `guided` | `fieldId` = 0..6 | 69,6% |

    Chưa có điểm thi (`scores` bỏ trống) thì Top-3 chế độ explore còn ~28,4%.

    Đo trên 102 sinh viên thật chưa từng dùng để huấn luyện. Đây là hệ **gợi ý** —
    nên hiển thị 3–5 lựa chọn, và **không nên hiện `score`** cho người dùng cuối
    (giá trị thật chỉ quanh 10–15%, hiện ra sẽ tưởng hệ thống hỏng).

    Gửi kèm `Authorization: Bearer <token>` để server tự lấy giới tính từ hồ sơ.
    """
    from app.services.major_predictor import get_predictor

    try:
        predictor = get_predictor()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    gender, warnings = await resolve_gender(authorization, body.gender)

    try:
        result = predictor.recommend(
            interests=body.interests,
            subject_group=body.subjectGroup,
            gender=gender,
            goal=body.goal,
            scores=body.scores,
            field_id=body.fieldId,
            limit=body.limit,
            soft_filter=body.softFilter,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    result["warnings"] = warnings + result["warnings"]
    return result


@router.get(
    "/catalog",
    response_model=CatalogResponse,
    summary="Danh mục 7 khối ngành và 39 ngành",
)
def get_catalog():
    """Bảng tra khối ngành / ngành lấy thẳng từ mô hình.

    Frontend nên dựng dropdown từ đây thay vì gõ tay danh sách ngành — gõ tay
    chính là lý do bảng cứng trong `predict_service.py` lệch 9/39 mã so với mô hình.
    `id` trả về ở đây dùng được luôn cho `fieldId` khi gọi `/recommend`.
    """
    from app.services.major_predictor import get_predictor

    try:
        predictor = get_predictor()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    groups: dict[int, dict] = {
        k: {"id": k, "name": v, "subjectGroups": set(), "majors": []}
        for k, v in predictor.field_name.items()
    }
    for i in range(len(predictor.major_name)):
        to_hop = sorted(predictor.to_hop_xet_tuyen.get(i, []))
        g = groups[predictor.field_of_major[i]]
        g["subjectGroups"].update(to_hop)
        g["majors"].append(
            {
                "code": str(predictor.major_code[i]),
                "name": predictor.major_name[i],
                "subjectGroups": to_hop,
                "cutoffs": predictor.diem_chuan.get(i, {}),
            }
        )
    # subjectGroups của khối = hợp của các ngành trong khối. Frontend dùng cái này
    # để chỉ cho chọn tổ hợp thật sự xét tuyển vào khối người dùng đã chọn.
    for g in groups.values():
        g["subjectGroups"] = sorted(g["subjectGroups"])
    return {"fields": list(groups.values())}


@router.post(
    "/",
    response_model=PredictionResponse,
    summary="[NGƯNG DÙNG] Xếp ngành theo tổ hợp, không dùng mô hình",
    deprecated=True,
)
def predict_user_majors(survey: SurveySubmit):
    """Endpoint cũ — **không có mô hình học máy nào**, chỉ chấm 0.85/0.45 theo
    tổ hợp có khớp hay không, và 10 điểm khảo sát không hề được dùng.

    Trước đây còn lỗi `AttributeError` vì truyền `list` vào tham số kiểu `dict`.
    Giữ lại để không phá client cũ. Hãy chuyển sang `POST /api/v1/predict/recommend`.
    """
    return {"results": predict_major({"scores": survey.scores, "block": "D01"})}
