# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Header
from typing import List
from app.core.mongodb import get_db
from app.api.v1.admin import require_admin
# pyrefly: ignore [missing-import]
from bson import ObjectId   

router = APIRouter()

@router.get("/pending")
async def get_pending_news(authorization: str = Header(...)):
    """Lấy danh sách các bài viết đang chờ duyệt."""
    await require_admin(authorization)
    db = get_db()
    cursor = db["news"].find({"status": "pending"}).sort("createdAt", -1)
    news_list = await cursor.to_list(length=100)
    
    results = []
    for news in news_list:
        news["id"] = str(news["_id"])
        del news["_id"]
        results.append(news)
    return {"data": results}

@router.post("/{news_id}/approve")
async def approve_news(news_id: str, authorization: str = Header(...)):
    """Duyệt bài viết."""
    await require_admin(authorization)
    db = get_db()
    
    result = await db["news"].update_one(
        {"_id": ObjectId(news_id)},
        {"$set": {"status": "published"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết hoặc bài viết đã được duyệt.")
    
    return {"status": "success", "message": "Đã duyệt bài viết thành công."}

@router.delete("/{news_id}/reject")
async def reject_news(news_id: str, authorization: str = Header(...)):
    """Từ chối/Xóa bài viết."""
    await require_admin(authorization)
    db = get_db()
    
    result = await db["news"].delete_one({"_id": ObjectId(news_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")
        
    return {"status": "success", "message": "Đã xóa bài viết khỏi danh sách chờ."}
