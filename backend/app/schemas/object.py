from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ObjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None

class ObjectCreate(ObjectBase):
    project_id: int

class ObjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None

class ObjectResponse(ObjectBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True
