from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class DocumentOut(BaseModel):
    id: str
    filename: str
    upload_date: datetime
    chunk_count: int
    status: str

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=5000)

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default=[], max_length=20)

class SourceChunk(BaseModel):
    text: str
    page: int

class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]