from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.models.base import Base


class PredictionHistory(Base):
    __tablename__ = "prediction_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    top_major = Column(String)
    similarity_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())