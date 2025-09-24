from sqlalchemy import Table, Column, Integer, ForeignKey, DateTime, String, UniqueConstraint
from sqlalchemy.sql import func
from app.db.database import Base

# Ассоциативная таблица для связи многие-ко-многим
project_users = Table(
    'project_users',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), nullable=False),
    Column('project_id', Integer, ForeignKey('projects.id'), nullable=False),
    Column('joined_at', DateTime, server_default=func.now()),

    # Уникальный constraint - пользователь может быть в проекте только один раз
    UniqueConstraint('user_id', 'project_id', name='uq_user_project')
)