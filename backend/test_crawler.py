import asyncio
import os
import sys
from dotenv import load_dotenv

# Đảm bảo đường dẫn import đúng
sys.path.append(os.getcwd())
load_dotenv()

from app.services.crawler_service import CrawlerService
from app.core.mongodb import connect_to_mongo, close_mongo_connection

async def main():
    await connect_to_mongo()
    crawler = CrawlerService()
    await crawler.scrape_news()
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
