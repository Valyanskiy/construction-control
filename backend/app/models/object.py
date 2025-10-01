from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel

class Object(BaseModel):
    __tablename__ = "objects"
    __table_args__ = {'extend_existing': True}

    name = Column(String(100), nullable=False)
    description = Column(Text)
    address = Column(String(255))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Связь с проектом (многие к одному)
    project = relationship("Project", back_populates="objects")
    
    # Связь с дефектами (один ко многим)
    defects = relationship("Defect", back_populates="object", cascade="all, delete-orphan")