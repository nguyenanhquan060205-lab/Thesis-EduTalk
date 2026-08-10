import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    email = "nguyenanhquan060205@gmail.com"
    client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
    db = client.get_default_database()
    result = await db["users"].delete_many({"email": email})
    print(f"Deleted {result.deleted_count} users from MongoDB.")

if __name__ == "__main__":
    asyncio.run(main())
