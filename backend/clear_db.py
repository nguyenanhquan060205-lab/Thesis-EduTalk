import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

from app.core.mongodb import connect_to_mongo, close_mongo_connection, get_db

async def clear():
    await connect_to_mongo()
    db = get_db()
    await db["news"].delete_many({})
    print("Cleared news collection")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(clear())
