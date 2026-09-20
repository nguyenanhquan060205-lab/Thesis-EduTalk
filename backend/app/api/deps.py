"""Phụ thuộc dùng chung cho tầng router — xác thực, phân quyền, CSDL.

**Đây là đường DUY NHẤT** để lấy uid, kiểm quyền admin và lấy handle MongoDB trong
`api/v1/`. Trước đợt dọn này mỗi router tự chép lại: 4 bản `get_current_uid` giống
nhau nhưng hai thông điệp lỗi khác nhau, 11 chỗ tự cắt chuỗi `"Bearer "`, 3 router
phải import ngược vào `admin.py` chỉ để mượn `require_admin`, và 34/37 chỗ gọi
`get_db()` không kiểm `None` nên thiếu MongoDB là trả 500 thay vì 503.

Cách dùng:

    @router.get("/vi-du")
    async def vi_du(uid: str = Depends(get_current_uid), db=Depends(get_database)):
        ...

    @router.get("/chi-admin")
    async def chi_admin(uid: str = Depends(require_admin)):
        ...

Dùng `Depends` chứ không tự gọi hàm trong thân handler vì FastAPI nhờ đó biết
endpoint cần header `Authorization`, sinh đúng schema ở `/docs` và trả 422 khi thiếu
header — thay vì để handler tự ném lỗi mỗi nơi một kiểu.
"""

from typing import NamedTuple

from fastapi import Depends, Header, HTTPException

from app.core.mongodb import get_db
from app.services.auth import TokenExpired, auth_service

# Một thông điệp duy nhất cho mọi lỗi token. Token HẾT HẠN là chuyện khác: `verify_token`
# ném `TokenExpired` và ở đây dịch thành 401 kèm `expired: True` — client dựa vào cờ đó
# để tự xin token mới rồi gửi lại, thay vì bắt người dùng đăng nhập lại.
LOI_TOKEN = "Token không hợp lệ hoặc đã hết hạn."
LOI_HET_HAN = {"message": "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.", "expired": True}
LOI_ADMIN = "Chỉ Admin mới có quyền truy cập."
LOI_THIEU_DB = "Cơ sở dữ liệu chưa sẵn sàng."


async def _giai_ma(authorization: str) -> dict | None:
    """Đổi header `Authorization` thành thông tin token, dịch lỗi miền sang lỗi HTTP."""
    try:
        return await auth_service.verify_token(authorization.replace("Bearer ", ""))
    except TokenExpired:
        raise HTTPException(status_code=401, detail=LOI_HET_HAN) from None


async def get_current_uid(
    authorization: str = Header(..., description="Bearer <Firebase ID token>"),
) -> str:
    """UID của người gọi. Thiếu header → 422; token hỏng → 401."""
    decoded = await _giai_ma(authorization)
    if not decoded:
        raise HTTPException(status_code=401, detail=LOI_TOKEN)
    return decoded["uid"]


class Caller(NamedTuple):
    """Kết quả xác thực KHÔNG bắt buộc.

    `sent_token` để phân biệt "khách vãng lai" với "có gửi token nhưng token hỏng" —
    trường hợp sau cần báo cho người dùng biết vì sao gợi ý kém chính xác đi.
    """

    uid: str | None
    sent_token: bool


async def get_caller(
    authorization: str | None = Header(None, description="Bearer <Firebase ID token>"),
) -> Caller:
    """Xác thực không bắt buộc — endpoint vẫn chạy khi chưa đăng nhập.

    Quy ước đã áp dụng ở `predict.py`: thiếu thông tin phụ thì đừng chặn request, mô
    hình vẫn chạy được, chỉ kém chính xác đi chút. Token HẾT HẠN cũng nuốt luôn ở
    đây — chặn người đang xin gợi ý chỉ vì token vừa hết hạn là đánh đổi tệ.
    """
    if not authorization:
        return Caller(None, False)
    try:
        decoded = await auth_service.verify_token(authorization.replace("Bearer ", ""))
    except TokenExpired:
        return Caller(None, True)
    return Caller(decoded["uid"] if decoded else None, True)


class _ChuaCoDB:
    """Đứng thay handle Mongo khi chưa kết nối được.

    Ném 503 lúc code CHẠM tới collection, cố ý không ném lúc FastAPI đang giải phụ
    thuộc. Ném sớm thì một request thiếu token sẽ nhận 503 thay vì 401: FastAPI giải
    hết các phụ thuộc rồi mới gom lỗi kiểm tra đầu vào, nên lỗi hạ tầng bắn ra trước
    sẽ che mất lỗi xác thực — client tưởng server sập trong khi thật ra là chưa đăng
    nhập. (Chính bộ test bắt được chuyện này.)
    """

    def __getitem__(self, ten_collection: str):
        raise HTTPException(status_code=503, detail=LOI_THIEU_DB)

    def __bool__(self) -> bool:
        return False


def get_database():
    """Handle MongoDB; chưa kết nối được thì trả vật thay thế ném 503 khi dùng tới.

    Thiếu `MONGO_URI` thì app vẫn khởi động (cố ý — xem `core/mongodb.py`). Không có
    bước chặn này thì truy vấn ném `TypeError` và client nhận 500 không rõ nguyên nhân.
    """
    db = get_db()
    return _ChuaCoDB() if db is None else db


async def require_admin(uid: str = Depends(get_current_uid), db=Depends(get_database)) -> str:
    """UID của người gọi, kèm bảo đảm `role == "admin"`."""
    nguoi_goi = await db["users"].find_one({"_id": uid}, {"role": 1})
    if not nguoi_goi or nguoi_goi.get("role") != "admin":
        raise HTTPException(status_code=403, detail=LOI_ADMIN)
    return uid


async def ensure_self_or_admin(target_uid: str, uid: str, db, message: str) -> None:
    """Chỉ chính chủ hoặc admin được xem/sửa dữ liệu của `target_uid`.

    Không phải `Depends` vì cần biết uid nằm trong đường dẫn của từng endpoint.
    `message` truyền vào để mỗi chỗ giữ được câu báo lỗi nói đúng việc người dùng
    đang làm ("Không có quyền xem lịch sử này." khác "Không có quyền xem hồ sơ này.").
    """
    if target_uid == uid:
        return
    nguoi_goi = await db["users"].find_one({"_id": uid}, {"role": 1})
    if (nguoi_goi or {}).get("role") != "admin":
        raise HTTPException(status_code=403, detail=message)
