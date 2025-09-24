from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import BaseModel
from app.models.association import project_users

class Project(BaseModel):
    __tablename__ = "projects"

    title = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    # Связь многие-ко-многим с пользователями
    users = relationship(
        "User",
        secondary=project_users,
        back_populates="projects",
        lazy="dynamic"  # Для возможности дополнительной фильтрации
    )