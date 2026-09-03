# pyrefly: ignore [missing-import]

from pydantic import BaseModel, Field


class CreatePostRequest(BaseModel):
    """Bài viết mới. `authorId` gửi lên chỉ để hợp lệ schema — server luôn
    lấy lại từ token, không tin giá trị client gửi."""

    content: str = Field(..., min_length=10)
    authorId: str
    authorName: str
    imageUrl: str | None = None
    tags: list[str] | None = []


class EditPostRequest(BaseModel):
    content: str = Field(..., min_length=10)


class RejectPostRequest(BaseModel):
    """Lý do từ chối — hiện lại cho tác giả biết vì sao bài không được duyệt."""

    reason: str = Field("", max_length=500)


class AddCommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    parentId: str | None = None  # None = comment trực tiếp, có ID = reply


class EditCommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class ReportRequest(BaseModel):
    """Lý do báo cáo, để trống cũng được."""

    reason: str = Field("", max_length=300)
