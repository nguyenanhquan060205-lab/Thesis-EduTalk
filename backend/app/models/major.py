from sqlalchemy import Column, Integer, String
from app.models.base import Base


class Major(Base):
    __tablename__ = "majors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, nullable=True)
    description = Column(String, nullable=True)