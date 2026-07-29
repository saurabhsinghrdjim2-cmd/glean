from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

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
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: list[ChatMessage] = []

class SourceChunk(BaseModel):
    text: str
    page: int

class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]