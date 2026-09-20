"""Kiểm duyệt diễn đàn: duyệt, từ chối, xoá bài, bỏ qua báo cáo."""

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_database
from app.models.post_models import RejectPostRequest

router = APIRouter()


@router.get("/posts")
async def get_all_posts(db=Depends(get_database)):
    """
    Lấy tất cả bài viết (kể cả đang pending) cho Admin quản lý.
    Migrate từ: forum_management_screen.dart — AdminService.getPostsStream().
    """

    posts = []
    async for doc in db["posts"].find().sort("createdAt", -1):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        posts.append(doc)
    return {"data": posts}

@router.get("/posts/pending", summary="Bài viết đang chờ duyệt")
async def get_pending_posts(db=Depends(get_database)):
    """Hàng chờ kiểm duyệt, cũ nhất lên trước để không ai bị bỏ quên."""

    posts = []
    async for doc in db["posts"].find({"status": "pending"}).sort("createdAt", 1):
        doc["id"] = str(doc.pop("_id"))
        for k in ("createdAt", "remindedAt"):
            if isinstance(doc.get(k), datetime):
                doc[k] = doc[k].isoformat()
        posts.append(doc)
    return {"data": posts}

@router.put("/posts/{post_id}/approve", summary="Duyệt bài viết")
async def approve_post(post_id: str):
    """Sau khi duyệt, bài mới hiện ở `GET /api/v1/posts/` cho cộng đồng."""
    from app.services.post_service import PostService

    result = await PostService().review_post(post_id=post_id, duyet=True)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.put("/posts/{post_id}/reject", summary="Từ chối bài viết")
async def reject_post(
    post_id: str, body: RejectPostRequest
):
    """Từ chối kèm lý do — tác giả nhìn thấy lý do này ở mục bài viết của mình."""
    from app.services.post_service import PostService

    result = await PostService().review_post(
        post_id=post_id, duyet=False, reason=body.reason
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.delete("/posts/{post_id}")
async def admin_delete_post(post_id: str, db=Depends(get_database)):
    """
    Admin xóa bài viết và đánh dấu thông báo liên quan đã đọc.
    Migrate từ: forum_management_screen.dart — AdminService.deletePost().
    """

    try:
        await db["posts"].delete_one({"_id": ObjectId(post_id)})
        # Đánh dấu thông báo liên quan đã xử lý
        await db["admin_notifications"].update_many(
            {"postId": post_id, "status": "unread"}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}

@router.put("/posts/{post_id}/dismiss-report")
async def dismiss_post_report(post_id: str, db=Depends(get_database)):
    """
    Bỏ báo cáo bài viết (duyệt bài an toàn).
    Migrate từ: forum_management_screen.dart — AdminService.dismissPostReports().
    """

    try:
        await db["posts"].update_one(
            {"_id": ObjectId(post_id)},
            {
                "$set": {
                    "reportCount": 0,
                    "isPending": False,
                    "reportedBy": [],
                }
            },
        )
        await db["admin_notifications"].update_many(
            {"postId": post_id, "status": "unread"}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}
