"""
News Service (Python)
Xử lý CRUD tin tức tuyển sinh từ MongoDB.
"""

from app.core.mongodb import get_db


class NewsService:
    def _get_collection(self):
        return get_db()["news"]

    async def get_all_news(self, limit: int = 10) -> list[dict]:
        """Lấy danh sách tin tức đã xuất bản."""
        cursor = (
            self._get_collection()
            .find({"status": "published"})
            .sort("createdAt", -1)
            .limit(limit)
        )
        news_list = await cursor.to_list(length=limit)

        # Format lại ObjectId thành string
        results = []
        for news in news_list:
            news["id"] = str(news["_id"])
            del news["_id"]
            results.append(news)

        return results

    async def get_news_by_id(self, news_id: str) -> dict:
        from bson import ObjectId

        try:
            news = await self._get_collection().find_one({"_id": ObjectId(news_id)})
            if news:
                news["id"] = str(news["_id"])
                del news["_id"]
            return news
        except Exception as e:  # noqa: BLE001
            print("Error getting news:", e)
            return None

# ĐÃ XOÁ `seed_news` (19/09/2026): sinh 3 tin mẫu vào CSDL, không nơi nào gọi.
# Tin thật do `crawler_service` cào từ trang HUIT hai lần mỗi ngày.
