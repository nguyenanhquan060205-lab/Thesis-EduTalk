# pyrefly: ignore [missing-import]

from pydantic import BaseModel


class UpdatePremiumRequest(BaseModel):
    plan: str  # "monthly", "yearly", "lifetime", hoặc "none"
    isPremium: bool


class UpdateSupportRequest(BaseModel):
    status: str  # "pending", "processing", "resolved"
    adminNote: str | None = None
