from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel

class DefectComment(BaseModel):
    __tablename__ = "defect_comments"
    __table_args__ = {'extend_existing': True}

    content = Column(Text, nullable=False)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    defect = relationship("Defect", back_populates="comments")
    user = relationship("User")
