"""
News Service (Python)
Xử lý CRUD tin tức tuyển sinh từ MongoDB.
"""
from typing import List
from app.core.mongodb import get_db

class NewsService:
    def _get_collection(self):
        from app.core.mongodb import get_db
        return get_db()["news"]
        
    async def get_all_news(self, limit: int = 10) -> List[dict]:
        """Lấy danh sách tin tức đã xuất bản."""
        cursor = self._get_collection().find({"status": "published"}).sort("createdAt", -1).limit(limit)
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
        except Exception as e:
            print("Error getting news:", e)
            return None

    async def seed_news(self) -> None:
        """Thêm dữ liệu mẫu nếu collection trống."""
        collection = self._get_collection()
        count = await collection.count_documents({})
        if count == 0:
            mock_news = [
                {
                    "title": "HUIT công bố phương thức tuyển sinh đại học chính quy năm 2026",
                    "excerpt": "Trường Đại học Công Thương TP.HCM (HUIT) chính thức công bố 4 phương thức xét tuyển cho năm 2026, trong đó tăng nhẹ chỉ tiêu xét tuyển bằng điểm thi ĐGNL của ĐHQG-HCM.",
                    "image": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    "date": "20/07/2026",
                    "category": "Thông báo chính thức",
                    "isHot": True
                },
                {
                    "title": "Điểm chuẩn dự kiến các ngành Khối Công nghệ Thông tin có thể tăng nhẹ",
                    "excerpt": "Theo phân tích từ dữ liệu chuyên gia, sức hút của nhóm ngành Công nghệ (CNTT, ATTT, KTPM) tại HUIT vẫn tiếp tục duy trì ở mức cao.",
                    "image": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                    "date": "18/07/2026",
                    "category": "Phân tích xu hướng",
                    "isHot": False
                },
                {
                    "title": "Hướng dẫn nộp hồ sơ xét tuyển bằng học bạ THPT đợt 1",
                    "excerpt": "Thí sinh có thể bắt đầu nộp hồ sơ xét học bạ trực tuyến thông qua cổng thông tin tuyển sinh của HUIT từ ngày 01/08.",
                    "image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                    "date": "15/07/2026",
                    "category": "Hướng dẫn thủ tục",
                    "isHot": False
                },
                {
                    "title": "Cơ hội nhận Học bổng Tài năng lên đến 100% học phí",
                    "excerpt": "HUIT dành quỹ học bổng hàng tỷ đồng cho tân sinh viên có thành tích xuất sắc trong kỳ thi THPT Quốc gia hoặc đạt giải cao trong các kỳ thi Học sinh giỏi.",
                    "image": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                    "date": "10/07/2026",
                    "category": "Học bổng & Ưu đãi",
                    "isHot": False
                }
            ]
            
            # Thêm trường status = "published" và createdAt cho dữ liệu mẫu
            from datetime import datetime
            for news in mock_news:
                news["status"] = "published"
                news["createdAt"] = datetime.now().isoformat()
                
            await collection.insert_many(mock_news)
