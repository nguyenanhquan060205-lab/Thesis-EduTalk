# pyrefly: ignore [missing-import]

from pydantic import BaseModel


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    # `phone` được lưu lúc đăng ký nhưng trước đây không có ở đây nên người dùng
    # không thể tự sửa số điện thoại của mình.
    phone: str | None = None
    isNotificationEnabled: bool | None = None
    fcmToken: str | None = None  # FCM token để gửi push notification
    dob: str | None = None  # Ngày sinh (DD/MM/YYYY)
    school: str | None = None  # Trường học
    avatar: str | None = None  # URL ảnh đại diện
    gender: str | None = None  # "Nam" | "Nu" — dùng cho mô hình gợi ý ngành
