# pyrefly: ignore [missing-import]
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import (
    Caller,
    ensure_self_or_admin,
    get_caller,
    get_current_uid,
    get_database,
)
from app.models.predict_models import (
    CatalogResponse,
    RecommendRequest,
    RecommendResponse,
)

router = APIRouter()

DEFAULT_GENDER = "Nu"


async def resolve_gender(
    caller: Caller, fallback: str | None, db
) -> tuple[str, list[str]]:
    """Giới tính lấy theo thứ tự ưu tiên:

    1. Hồ sơ người dùng đã đăng ký (khi request có token hợp lệ)
    2. Trường `gender` trong body — chỉ dành cho lúc test không có token
    3. Mặc định, kèm cảnh báo

    Không chặn request khi thiếu — mô hình vẫn chạy được, chỉ kém chính xác đi chút.
    """
    warnings: list[str] = []

    if caller.sent_token:
        if caller.uid:
            try:
                doc = await db["users"].find_one({"_id": caller.uid})
                gender = (doc or {}).get("gender")
                if gender in ("Nam", "Nu"):
                    return gender, warnings
                warnings.append(
                    "Hồ sơ chưa có giới tính — hãy cập nhật trong phần tài khoản "
                    "để gợi ý chính xác hơn."
                )
            except Exception:  # noqa: BLE001 — thiếu hồ sơ không được làm hỏng gợi ý
                warnings.append("Không đọc được hồ sơ người dùng.")
        else:
            warnings.append("Token không hợp lệ nên không đọc được hồ sơ.")

    if fallback in ("Nam", "Nu"):
        return fallback, warnings
    return DEFAULT_GENDER, warnings


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    summary="Gợi ý ngành học (XGBoost, mô hình Hướng 1)",
)
async def recommend_majors(
    body: RecommendRequest,
    caller: Caller = Depends(get_caller),
    db=Depends(get_database),
):
    """Mô hình XGBoost Hướng 1 (`research/`, Giai đoạn 10) — 9 nhóm ngành, 63 đặc trưng.

    Đặt `EDUTALK_PIPELINE=r3` để quay về mô hình `research3/`.

    **Hai chế độ** — khác nhau ở chỗ người dùng có chọn nhóm ngành hay không:

    | Chế độ | Khi nào | Nên hiện | Trên tập test | Trên người thật | Đoán bừa |
    |---|---|---|---|---|---|
    | `explore` | `fieldId` bỏ trống | 5 ngành (`limit=5`) | Top-5 81,8% | ~60% | 12,8% |
    | `guided` | `fieldId` = 0..8 | 2 ngành (`limit=2`) | **Top-2 90,6%** | ~79% | 47,6% |

    Tập test gồm 2.546 dòng, phần lớn là hồ sơ trúng tuyển có phần sở thích do mô hình
    sinh; cột "người thật" đo trên phiếu khảo sát (Hướng 2), là mức nên kỳ vọng với
    người dùng. Số trên tập test đo khi tắt lọc mềm theo tổ hợp.

    Đây là hệ **gợi ý** — **không nên hiện `score`** cho người dùng cuối (xác suất
    thật thường thấp, hiện ra sẽ tưởng hệ thống hỏng).

    Gửi kèm `Authorization: Bearer <token>` để server tự lấy giới tính từ hồ sơ.
    """
    from app.services.major_predictor import get_predictor

    predictor = get_predictor()

    gender, warnings = await resolve_gender(caller, body.gender, db)

    try:
        result = predictor.recommend(
            interests=body.interests,
            subject_group=body.subjectGroup,
            gender=gender,
            goal=body.goal,
            scores=body.scores,
            field_id=body.fieldId,
            limit=body.limit,
            loai_bo_ngoai_to_hop=True,
            soft_filter=body.softFilter,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    result["warnings"] = warnings + result["warnings"]
    return result


@router.get(
    "/catalog",
    response_model=CatalogResponse,
    summary="Danh mục 9 nhóm ngành và 39 ngành",
)
def get_catalog():
    """Bảng tra khối ngành / ngành lấy thẳng từ mô hình.

    Frontend nên dựng dropdown từ đây thay vì gõ tay danh sách ngành — gõ tay
    chính là lý do bảng gõ tay cũ (đã xoá) lệch 9/39 mã so với mô hình.
    `id` trả về ở đây dùng được luôn cho `fieldId` khi gọi `/recommend`.
    """
    from app.services.major_predictor import get_predictor

    predictor = get_predictor()

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
    return {
        "fields": list(groups.values()),
        "soGoiY": {"tuVan": predictor.so_goi_y(0), "khamPha": predictor.so_goi_y(None)},
    }


# ĐÃ XOÁ: `POST /api/v1/predict/` (19/09/2026).
#
# Endpoint đó không dùng mô hình học máy nào — chỉ chấm cứng 0.85/0.45 theo việc tổ
# hợp có khớp hay không, và 10 điểm khảo sát người dùng nhập vào không hề được đụng
# tới. Nó đọc bảng 39 ngành gõ tay trong `predict_service.py`, bảng này lệch **9/39
# mã ngành** so với mô hình thật, nên client nào lấy mã từ đó rồi gọi sang
# `/recommend` đều không khớp được.
#
# Đã grep toàn bộ `web/src` và `mobile/lib`: không chỗ nào gọi. Thay thế là
# `POST /api/v1/predict/recommend`.


@router.get(
    "/explain/{prediction_id}",
    summary="Đọc lại giải thích SHAP của một lượt tư vấn đã lưu",
)
async def get_explain(
    prediction_id: str,
    uid: str = Depends(get_current_uid),
    db=Depends(get_database),
):
    """Trả về phần giải thích XAI đã lưu kèm lượt tư vấn.

    Chỉ **chính chủ** hoặc **admin** đọc được: bản ghi tư vấn gắn với hồ sơ cá
    nhân, để lộ là lộ luôn điểm thi và sở thích của người khác.

    Thí sinh nhận bản đã lọc bỏ các đặc trưng gắn cờ `anVoiThiSinh` (hiện là giới
    tính). Admin nhận đầy đủ — trang quản trị cần thấy đúng mô hình đã dựa vào gì.
    """
    from bson.errors import InvalidId

    try:
        doc = await db["prediction_history"].find_one({"_id": ObjectId(prediction_id)})
    except (InvalidId, TypeError) as e:
        raise HTTPException(status_code=400, detail="Mã lượt tư vấn không hợp lệ.") from e
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt tư vấn.")

    la_chu = doc.get("user_id") == uid
    await ensure_self_or_admin(
        doc.get("user_id"), uid, db, "Không có quyền xem lượt tư vấn này."
    )
    la_admin = not la_chu

    majors = []
    for m in doc.get("majors", []):
        gt = m.get("explain")
        if gt and not la_admin:
            gt = {
                **gt,
                "features": [f for f in gt["features"] if not f.get("anVoiThiSinh")],
            }
        majors.append({"rank": m.get("rank"), "name": m.get("name"),
                       "field": m.get("field"), "explain": gt})

    return {
        "id": str(doc["_id"]),
        "mode": doc.get("mode"),
        "thoiGian": doc.get("createdAt").isoformat() if doc.get("createdAt") else None,
        "dayDu": la_admin,
        "majors": majors,
    }

class DienGiaiRequest(BaseModel):
    """Bảng SHAP đã tính sẵn ở `/recommend`, gửi lại để diễn giải thành lời."""

    nganh: str
    features: list[dict]


@router.post(
    "/explain-text",
    summary="Diễn giải bảng SHAP thành 2–3 câu tiếng Việt",
    dependencies=[Depends(get_current_uid)],
)
async def explain_text(body: DienGiaiRequest):
    """Chuyển bảng số thành lời cho học sinh dễ đọc.

    LLM **chỉ được** diễn đạt lại những con số trong `features` — prompt cấm thêm
    lý do, cấm nói về việc làm / lương / điểm chuẩn. Không bao giờ hỏi LLM kiểu
    "đoán xem vì sao mô hình chọn ngành này": cách đó sinh ra lời giải thích nghe
    thuyết phục nhưng không dính gì tới mô hình, tệ hơn là không giải thích.

    Gọi theo yêu cầu (bấm nút) chứ không tự chạy mỗi lần dự đoán — mỗi lượt là một
    lần gọi Gemini, bật sẵn cho cả 5 ngành thì vừa chậm vừa tốn.
    """
    from app.services.xai_service import XAIService

    try:
        loi = await XAIService().dien_giai(body.nganh, body.features)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=503, detail=f"Không tạo được lời giải thích: {e!s}"
        ) from e
    if not loi:
        raise HTTPException(status_code=503, detail="Mô hình ngôn ngữ không trả lời.")
    return {"text": loi}
