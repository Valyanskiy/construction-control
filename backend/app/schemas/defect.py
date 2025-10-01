from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.models.defect import DefectStatus, DefectPriority

class DefectBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[DefectStatus] = DefectStatus.NEW
    priority: Optional[DefectPriority] = DefectPriority.MEDIUM
    due_date: Optional[date] = None

class DefectCreate(DefectBase):
    object_id: int
    assigned_user_ids: Optional[List[int]] = []

class DefectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[DefectStatus] = None
    priority: Optional[DefectPriority] = None
    due_date: Optional[date] = None
    assigned_user_ids: Optional[List[int]] = None

class DefectCommentCreate(BaseModel):
    content: str

class DefectCommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    user_nickname: str
    created_at: datetime

    class Config:
        from_attributes = True

class DefectHistoryResponse(BaseModel):
    id: int
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    user_id: int
    user_nickname: str
    created_at: datetime

    class Config:
        from_attributes = True

class DefectResponse(DefectBase):
    id: int
    object_id: int
    created_at: datetime
    updated_at: datetime
    assigned_user_ids: List[int] = []
    has_photo: bool = False
    comments: List[DefectCommentResponse] = []
    history: List[DefectHistoryResponse] = []
    image_count: int = 0

    class Config:
        from_attributes = True
