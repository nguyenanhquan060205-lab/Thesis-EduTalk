# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional

class CreatePostRequest(BaseModel):
    content: str
    authorId: str
    authorName: str
    imageUrl: Optional[str] = None
    tags: Optional[list[str]] = []

class EditPostRequest(BaseModel):
    content: str

class AddCommentRequest(BaseModel):
    text: str
    parentId: Optional[str] = None  # None = comment trực tiếp, có ID = reply
