import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
uri = os.getenv('MONGO_URI')
client = AsyncIOMotorClient(uri)
db = client.get_default_database()

async def approve_all():
    res = await db['news'].update_many({'status': 'pending'}, {'$set': {'status': 'published'}})
    print(f'Approved {res.modified_count} pending news articles.')

asyncio.run(approve_all())
