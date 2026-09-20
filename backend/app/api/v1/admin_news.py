# pyrefly: ignore [missing-import]

# pyrefly: ignore [missing-import]
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_database, require_admin

# Mọi endpoint dưới đây đòi quyền admin — gác ở cấp router để không thể quên
# một route mới. Handler nào cần uid thì vẫn khai Depends(require_admin).
router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/pending")
async def get_pending_news(db=Depends(get_database)):
    """Lấy danh sách các bài viết đang chờ duyệt."""
    cursor = db["news"].find({"status": "pending"}).sort("createdAt", -1)
    news_list = await cursor.to_list(length=100)

    results = []
    for news in news_list:
        news["id"] = str(news["_id"])
        del news["_id"]
        results.append(news)
    return {"data": results}


@router.post("/{news_id}/approve")
async def approve_news(news_id: str, db=Depends(get_database)):
    """Duyệt bài viết."""

    result = await db["news"].update_one(
        {"_id": ObjectId(news_id)}, {"$set": {"status": "published"}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy bài viết hoặc bài viết đã được duyệt.",
        )

    return {"status": "success", "message": "Đã duyệt bài viết thành công."}


@router.delete("/{news_id}/reject")
async def reject_news(news_id: str, db=Depends(get_database)):
    """Từ chối/Xóa bài viết."""

    result = await db["news"].delete_one({"_id": ObjectId(news_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    return {"status": "success", "message": "Đã xóa bài viết khỏi danh sách chờ."}
