"""
Posts Router (Python)
Migrate từ: mobile/lib/services/post_service.dart
Định nghĩa các API Endpoints cho chức năng bài viết cộng đồng.
"""
# pyrefly: ignore [missing-import]
# pyrefly: ignore [missing-import]

from app.services.auth_service import AuthService
from app.services.post_service import PostService
from fastapi import APIRouter, File, Header, HTTPException, UploadFile

router = APIRouter()
post_service = PostService()
auth_service = AuthService()


from app.models.post_models import AddCommentRequest, CreatePostRequest, EditPostRequest

# ==================== Helper ====================

async def get_current_uid(authorization: str) -> str:
    """Lấy UID từ Authorization header (Bearer token)."""
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn.")
    return decoded["uid"]


# ==================== Endpoints ====================

@router.get("/")
async def get_posts(limit: int = 20):
    """
    Lấy danh sách bài viết.
    Tương đương: PostService.getPostsStream() trong Dart.
    """
    posts = await post_service.get_posts(limit=limit)
    return {"data": posts}


@router.post("/")
async def create_post(
    body: CreatePostRequest,
    authorization: str = Header(...),
):
    """
    Tạo bài viết mới.
    Tương đương: PostService.createPost() trong Dart.
    """
    uid = await get_current_uid(authorization)
    post_data = body.model_dump()
    post_data["authorId"] = uid  # Dùng UID từ token, không tin vào body
    post_id = await post_service.create_post(post_data)
    return {"status": "success", "postId": post_id}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),  # noqa: B008
    authorization: str = Header(...),
):
    """
    Upload ảnh bài viết lên Cloudinary.
    Tương đương: PostService.uploadPostImage() trong Dart.
    """
    await get_current_uid(authorization)
    file_bytes = await file.read()
    url = await post_service.upload_post_image(file_bytes, file.filename or "image")
    if not url:
        raise HTTPException(status_code=500, detail="Lỗi upload ảnh.")
    return {"status": "success", "imageUrl": url}


@router.put("/{post_id}")
async def edit_post(
    post_id: str,
    body: EditPostRequest,
    authorization: str = Header(...),
):
    """
    Sửa bài viết.
    Tương đương: PostService.editPost() trong Dart.
    """
    uid = await get_current_uid(authorization)
    result = await post_service.edit_post(post_id=post_id, new_content=body.content, author_id=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=403, detail=result["message"])
    return result


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    authorization: str = Header(...),
):
    """
    Xóa bài viết.
    Tương đương: PostService.deletePost() trong Dart.
    """
    uid = await get_current_uid(authorization)
    result = await post_service.delete_post(post_id=post_id, author_id=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=403, detail=result["message"])
    return result


@router.post("/{post_id}/report")
async def report_post(
    post_id: str,
    authorization: str = Header(...),
):
    """
    Báo cáo bài viết.
    Tương đương: PostService.reportPost() trong Dart.
    """
    uid = await get_current_uid(authorization)
    result = await post_service.report_post(post_id=post_id, uid=uid)
    if result == "already_reported":
        raise HTTPException(status_code=409, detail="Bạn đã báo cáo bài viết này rồi.")
    return {"status": result}


@router.post("/{post_id}/upvote")
async def upvote_post(
    post_id: str,
    authorization: str = Header(...),
):
    """
    Like / Unlike bài viết (Toggle).
    Tương đương: PostService.upvotePost() trong Dart.
    """
    uid = await get_current_uid(authorization)
    result = await post_service.upvote_post(post_id=post_id, uid=uid)
    return result


@router.get("/{post_id}/comments")
async def get_comments(post_id: str):
    """
    Lấy danh sách bình luận.
    Tương đương: PostService.getCommentsStream() trong Dart.
    """
    comments = await post_service.get_comments(post_id=post_id)
    return {"data": comments}


@router.post("/{post_id}/comments")
async def add_comment(
    post_id: str,
    body: AddCommentRequest,
    authorization: str = Header(...),
):
    """
    Thêm bình luận vào bài viết.
    Tương đương: PostService.addComment() trong Dart.
    """
    uid = await get_current_uid(authorization)
    comment_data = {"text": body.text, "parentId": body.parentId}
    result = await post_service.add_comment(
        post_id=post_id,
        comment_data=comment_data,
        author_id=uid,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])
    return result
