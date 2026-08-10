# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    isNotificationEnabled: Optional[bool] = None
    fcmToken: Optional[str] = None   # FCM token để gửi push notification
    dob: Optional[str] = None        # Ngày sinh (DD/MM/YYYY)
    school: Optional[str] = None     # Trường học
    avatar: Optional[str] = None     # URL ảnh đại diện
