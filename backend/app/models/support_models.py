# pyrefly: ignore [missing-import]
from pydantic import BaseModel

class SupportRequest(BaseModel):
    title: str
    message: str
    type: str  # "Lỗi hệ thống", "Thanh toán", "Tài khoản", "Góp ý", "Khác"
