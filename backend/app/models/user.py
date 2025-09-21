from sqlalchemy import Column, String
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"

    nickname: str = Column(String, nullable=False)
    password: str = Column(String, nullable=False)