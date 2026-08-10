# pyrefly: ignore [missing-import]

from pydantic import BaseModel


class CreatePostRequest(BaseModel):
    content: str
    authorId: str
    authorName: str
    imageUrl: str | None = None
    tags: list[str] | None = []

class EditPostRequest(BaseModel):
    content: str

class AddCommentRequest(BaseModel):
    text: str
    parentId: str | None = None  # None = comment trực tiếp, có ID = reply
