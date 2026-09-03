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


from app.models.post_models import (
    AddCommentRequest,
    CreatePostRequest,
    EditCommentRequest,
    EditPostRequest,
    ReportRequest,
)

# ==================== Helper ====================


async def yeu_cau_duoc_phep(uid: str) -> None:
    """Chặn tạo nội dung khi tài khoản bị khoá hoặc email chưa xác minh.

    Kiểm tra ở đây là thứ chặn **ngay lập tức** với tài khoản vừa bị khoá: ID
    token đã cấp vẫn hợp lệ tối đa 1 giờ nên `disabled` bên Firebase chưa kịp
    có tác dụng với phiên đang mở.

    Tài khoản cũ (chưa có trường `emailVerified`) coi như đã xác minh, để không
    khoá nhầm người đang dùng từ trước.
    """
    # pyrefly: ignore [missing-import]
    from app.core.mongodb import get_db

    doc = await get_db()["users"].find_one({"_id": uid})
    if doc is None:
        return

    if doc.get("disabled") is True:
        ly_do = doc.get("disabledReason") or ""
        raise HTTPException(
            status_code=403,
            detail="Tài khoản của bạn đã bị khoá."
            + (f" Lý do: {ly_do}" if ly_do else "")
            + " Liên hệ quản trị viên để được hỗ trợ.",
        )

    if doc.get("emailVerified") is False:
        raise HTTPException(
            status_code=403,
            detail="Bạn cần xác minh email trước khi đăng bài hoặc bình luận. "
            "Vào trang Hồ sơ để nhận lại mã xác minh.",
        )


async def get_current_uid(authorization: str) -> str:
    """Lấy UID từ Authorization header (Bearer token)."""
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(
            status_code=401, detail="Token không hợp lệ hoặc đã hết hạn."
        )
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
    await yeu_cau_duoc_phep(uid)
    post_data = body.model_dump()
    post_data["authorId"] = uid  # Dùng UID từ token, không tin vào body
    post_id = await post_service.create_post(post_data)
    return {
        "status": "success",
        "postId": post_id,
        "message": "Đã gửi bài. Bài sẽ hiển thị sau khi quản trị viên duyệt.",
    }


@router.get("/mine", summary="Bài viết của tôi (gồm cả bài chờ duyệt)")
async def get_my_posts(authorization: str = Header(...)):
    """Trả về mọi bài của người đang đăng nhập, kể cả `pending` và `rejected`.

    `GET /api/v1/posts/` chỉ trả bài đã duyệt nên tác giả không thấy bài mình
    vừa gửi — endpoint này để họ theo dõi, xoá, hoặc nhắc admin duyệt.
    """
    uid = await get_current_uid(authorization)
    return {"data": await post_service.get_my_posts(uid)}


@router.post("/{post_id}/remind", summary="Nhắc admin duyệt bài")
async def remind_admin(post_id: str, authorization: str = Header(...)):
    """Tác giả nhắc duyệt bài đang chờ. Giới hạn 1 lần mỗi 12 giờ."""
    uid = await get_current_uid(authorization)
    result = await post_service.remind_admin(post_id=post_id, uid=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


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


@router.put("/{post_id}", summary="Sửa bài viết (chỉ khi đã được duyệt)")
async def edit_post(
    post_id: str,
    body: EditPostRequest,
    authorization: str = Header(...),
):
    """Chỉ tác giả sửa được, và chỉ khi bài đã qua duyệt. Bài còn chờ duyệt thì
    xoá đi đăng lại — tránh việc sửa đi sửa lại trong lúc admin đang xem."""
    uid = await get_current_uid(authorization)
    result = await post_service.edit_post(
        post_id=post_id, author_id=uid, new_content=body.content
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
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


@router.post("/{post_id}/report", summary="Báo cáo bài viết")
async def report_post(
    post_id: str,
    body: ReportRequest | None = None,
    authorization: str = Header(...),
):
    """Không thể báo cáo bài của chính mình, và mỗi người chỉ báo được một lần."""
    uid = await get_current_uid(authorization)
    result = await post_service.report_post(post_id=post_id, uid=uid)
    LOI = {
        "not_found": (404, "Bài viết không tồn tại."),
        "own_content": (400, "Bạn không thể báo cáo bài viết của chính mình."),
        "already_reported": (400, "Bạn đã báo cáo bài viết này rồi."),
        "error": (500, "Không gửi được báo cáo."),
    }
    if result in LOI:
        ma, tin = LOI[result]
        raise HTTPException(status_code=ma, detail=tin)
    return {"status": "success", "message": "Đã gửi báo cáo tới quản trị viên."}


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
    await yeu_cau_duoc_phep(uid)
    comment_data = {"text": body.text, "parentId": body.parentId}
    result = await post_service.add_comment(
        post_id=post_id,
        comment_data=comment_data,
        author_id=uid,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.put("/{post_id}/comments/{comment_id}", summary="Sửa bình luận")
async def edit_comment(
    post_id: str,
    comment_id: str,
    body: EditCommentRequest,
    authorization: str = Header(...),
):
    """Chỉ tác giả bình luận sửa được."""
    uid = await get_current_uid(authorization)
    result = await post_service.edit_comment(
        comment_id=comment_id, author_id=uid, new_text=body.text
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.delete("/{post_id}/comments/{comment_id}", summary="Xóa bình luận")
async def delete_comment(
    post_id: str, comment_id: str, authorization: str = Header(...)
):
    """Tác giả bình luận hoặc admin. Xóa kèm mọi trả lời của bình luận đó."""
    uid = await get_current_uid(authorization)
    result = await post_service.delete_comment(comment_id=comment_id, uid=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/{post_id}/comments/{comment_id}/upvote", summary="Thích bình luận")
async def upvote_comment(
    post_id: str, comment_id: str, authorization: str = Header(...)
):
    """Bật/tắt thích. Ai cũng thích được, kể cả bình luận của chính mình."""
    uid = await get_current_uid(authorization)
    result = await post_service.upvote_comment(comment_id=comment_id, uid=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/{post_id}/comments/{comment_id}/report", summary="Báo cáo bình luận")
async def report_comment(
    post_id: str,
    comment_id: str,
    body: ReportRequest | None = None,
    authorization: str = Header(...),
):
    """Không thể báo cáo bình luận của chính mình. Từ 5 báo cáo thì tự ẩn."""
    uid = await get_current_uid(authorization)
    result = await post_service.report_comment(
        comment_id=comment_id, uid=uid, reason=(body.reason if body else "")
    )
    LOI = {
        "not_found": (404, "Bình luận không tồn tại."),
        "own_content": (400, "Bạn không thể báo cáo bình luận của chính mình."),
        "already_reported": (400, "Bạn đã báo cáo bình luận này rồi."),
        "error": (500, "Không gửi được báo cáo."),
    }
    if result in LOI:
        ma, tin = LOI[result]
        raise HTTPException(status_code=ma, detail=tin)
    return {"status": "success", "message": "Đã gửi báo cáo tới quản trị viên."}
