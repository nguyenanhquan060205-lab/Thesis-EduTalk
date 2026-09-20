from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


db = MongoDB()


async def connect_to_mongo():
    mongo_uri = settings.MONGO_URI
    if not mongo_uri:
        print(
            "CẢNH BÁO: Không tìm thấy MONGO_URI trong .env. Ứng dụng sẽ không thể kết nối tới cơ sở dữ liệu."
        )
        return

    print("Đang kết nối tới MongoDB Atlas...")
    db.client = AsyncIOMotorClient(mongo_uri)
    db.db = db.client.get_default_database()
    print("Kết nối MongoDB thành công!")


async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Đã đóng kết nối MongoDB.")


def get_db():
    return db.db


_db_dong_bo = None


def get_db_dong_bo():
    """Kết nối ĐỒNG BỘ (pymongo) cho code chạy ngoài event loop.

    Huấn luyện lại chạy trong luồng riêng (`asyncio.to_thread`) và việc nạp mô hình xảy
    ra bên trong `get_predictor()` đồng bộ — hai chỗ đó không `await` được motor. Dùng
    chung một client cho cả tiến trình; thiếu MONGO_URI thì trả None chứ không ném lỗi,
    để backend vẫn phục vụ bằng mô hình trong gói.
    """
    global _db_dong_bo
    if _db_dong_bo is None:
        uri = settings.MONGO_URI
        if not uri:
            return None
        from pymongo import MongoClient

        _db_dong_bo = MongoClient(uri, serverSelectionTimeoutMS=5000).get_default_database()
    return _db_dong_bo
