from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/", summary="Danh sách 39 ngành đào tạo của HUIT")
def get_all_majors():
    """Danh mục ngành dựng từ đúng nguồn mà mô hình đang dùng.

    Trước đây endpoint này trả bảng `HUIT_MAJORS` gõ tay trong `predict_service.py`.
    Bảng đó lệch với mô hình **9/39 mã ngành** (Khoa học dữ liệu ghi 7480108 thay vì
    7460108, Trí tuệ nhân tạo 7480109 thay vì 7480107, Công nghệ chế tạo máy 7510201
    thay vì 7510202...) và sai tổ hợp xét tuyển của 2 ngành. Client nào tra cứu theo
    mã lấy từ đây rồi gọi sang `/predict/recommend` đều không khớp được.

    Giữ nguyên hình dạng cũ `{ "majors": { "<tên ngành>": {code, blocks} } }` để không
    phá client đang chạy, chỉ đổi nguồn dữ liệu bên dưới.
    """
    from app.services.major_predictor import get_predictor

    try:
        predictor = get_predictor()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    return {
        "majors": {
            predictor.major_name[i]: {
                "code": str(predictor.major_code[i]),
                "blocks": sorted(predictor.to_hop_xet_tuyen.get(i, [])),
                "field": predictor.field_name[predictor.field_of_major[i]],
                "fieldId": predictor.field_of_major[i],
                "cutoffs": predictor.diem_chuan.get(i, {}),
            }
            for i in range(len(predictor.major_name))
        }
    }
