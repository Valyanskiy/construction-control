from sqlalchemy import Column, String, Enum, DateTime, func
from sqlalchemy.orm import relationship

from app.models.association import project_users
from app.models.base import BaseModel
import enum

class RoleEnum(enum.Enum):
    MANAGER = "MANAGER"
    ENGINEER = "ENGINEER"
    OBSERVER = "OBSERVER"

class User(BaseModel):
    __tablename__ = "users"

    nickname: str = Column(String, nullable=False)
    password: str = Column(String, nullable=False)
    role = Column(Enum(RoleEnum, name='roleenum', create_constraint=True), nullable=False, default=RoleEnum.OBSERVER)
    created_at = Column(DateTime, server_default=func.now())

    # Связь многие-ко-многим с проектами
    projects = relationship(
        "Project",
        secondary=project_users,
        back_populates="users",
        lazy="dynamic"
    )