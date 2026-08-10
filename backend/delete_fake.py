import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
uri = os.getenv('MONGO_URI')
client = AsyncIOMotorClient(uri)
db = client.get_default_database()

async def delete_fake():
    res = await db['news'].delete_many({'status': 'published'})
    print(f'Deleted {res.deleted_count} fake news articles.')

asyncio.run(delete_fake())
