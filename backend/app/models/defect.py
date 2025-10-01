from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Enum, LargeBinary, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel
from app.models.association import defect_users
import enum

class DefectStatus(enum.Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    UNDER_REVIEW = "UNDER_REVIEW"
    CLOSED = "CLOSED"

class DefectPriority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Defect(BaseModel):
    __tablename__ = "defects"
    __table_args__ = {'extend_existing': True}

    title = Column(String(100), nullable=False)
    description = Column(Text)
    photo = Column(LargeBinary)
    status = Column(Enum(DefectStatus), default=DefectStatus.NEW)
    priority = Column(Enum(DefectPriority), default=DefectPriority.MEDIUM)
    due_date = Column(Date)
    object_id = Column(Integer, ForeignKey("objects.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    object = relationship("Object", back_populates="defects")
    assigned_users = relationship("User", secondary=defect_users, back_populates="assigned_defects")
    comments = relationship("DefectComment", back_populates="defect", cascade="all, delete-orphan")
    history = relationship("DefectHistory", back_populates="defect", cascade="all, delete-orphan")
    images = relationship("DefectImage", back_populates="defect", cascade="all, delete-orphan")
