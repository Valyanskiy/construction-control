from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel

class DefectImage(BaseModel):
    __tablename__ = "defect_images"
    __table_args__ = {'extend_existing': True}

    filename = Column(String(255), nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    defect_id = Column(Integer, ForeignKey("defects.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    defect = relationship("Defect", back_populates="images")
