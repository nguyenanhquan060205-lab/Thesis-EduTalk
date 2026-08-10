# pyrefly: ignore [missing-import]
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str   # "user" hoặc "model"
    text: str   # Nội dung tin nhắn

class SendMessageRequest(BaseModel):
    message: str               # Tin nhắn mới của người dùng
    history: list[ChatMessage] = []  # Lịch sử hội thoại trước đó
