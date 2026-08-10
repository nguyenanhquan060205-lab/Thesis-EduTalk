# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional

class UpdatePremiumRequest(BaseModel):
    plan: str          # "monthly", "yearly", "lifetime", hoặc "none"
    isPremium: bool

class UpdateSupportRequest(BaseModel):
    status: str       # "pending", "processing", "resolved"
    adminNote: Optional[str] = None
