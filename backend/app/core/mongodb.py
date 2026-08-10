import os
from motor.motor_asyncio import AsyncIOMotorClient

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("CẢNH BÁO: Không tìm thấy MONGO_URI trong .env. Ứng dụng sẽ không thể kết nối tới cơ sở dữ liệu.")
        return
        
    print(f"Đang kết nối tới MongoDB Atlas...")
    db.client = AsyncIOMotorClient(mongo_uri)
    db.db = db.client.get_default_database()
    print("Kết nối MongoDB thành công!")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Đã đóng kết nối MongoDB.")

def get_db():
    return db.db
