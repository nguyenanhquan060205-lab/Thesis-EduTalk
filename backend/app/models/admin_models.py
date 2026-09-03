# pyrefly: ignore [missing-import]

from pydantic import BaseModel


class UpdatePremiumRequest(BaseModel):
    plan: str  # "monthly", "yearly", "lifetime", hoặc "none"
    isPremium: bool


class UpdateSupportRequest(BaseModel):
    status: str  # "pending", "processing", "resolved"
    adminNote: str | None = None


class LockUserRequest(BaseModel):
    """Khoá / mở khoá tài khoản. `reason` để admin ghi lại vì sao khoá."""

    disabled: bool
    reason: str = ""
