# pyrefly: ignore [missing-import]

from pydantic import BaseModel


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    isNotificationEnabled: bool | None = None
    fcmToken: str | None = None   # FCM token để gửi push notification
    dob: str | None = None        # Ngày sinh (DD/MM/YYYY)
    school: str | None = None     # Trường học
    avatar: str | None = None     # URL ảnh đại diện
