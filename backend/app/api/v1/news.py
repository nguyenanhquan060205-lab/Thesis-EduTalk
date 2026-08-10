from app.services.crawler_service import CrawlerService
from app.services.news_service import NewsService
from fastapi import APIRouter, HTTPException

router = APIRouter()
news_service = NewsService()
crawler_service = CrawlerService()


@router.post("/crawl")
async def trigger_manual_crawl():
    """
    Kích hoạt cào tin tức thủ công (Dành cho Admin)
    """
    try:
        await crawler_service.scrape_news()
        return {"status": "success", "message": "Đã cập nhật tin tức mới nhất từ HUIT"}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_all_news(limit: int = 10):
    """
    Lấy danh sách tin tức tuyển sinh
    """
    news = await news_service.get_all_news(limit=limit)
    return {"data": news}


@router.get("/{news_id}")
async def get_news_detail(news_id: str):
    """
    Lấy chi tiết một bài viết tin tức
    """
    news = await news_service.get_news_by_id(news_id)
    if not news:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return {"data": news}
