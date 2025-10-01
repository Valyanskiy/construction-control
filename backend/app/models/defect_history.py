from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel

class DefectHistory(BaseModel):
    __tablename__ = "defect_history"
    __table_args__ = {'extend_existing': True}

    field_name = Column(String(50), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    defect = relationship("Defect", back_populates="history")
    user = relationship("User")
