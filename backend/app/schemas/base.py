from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional

class BaseSchema(BaseModel):
    id: Optional[int] = None
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    nickname: str = Field(
        ...,
        min_length=2,
        max_length=50,
        examples=["Иванов"]
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=50,
        examples=["StrongPassword123"],
        json_schema_extra={
            "description": "Пароль должен содержать минимум 8 символов, 1 заглавную букву и 1 цифру"
        }
    )