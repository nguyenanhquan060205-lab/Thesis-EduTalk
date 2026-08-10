from app.api.v1 import (
    admin,
    auth,
    chat,
    majors,
    news,
    posts,
    predict,
    support,
    survey,
    users,
)
from app.core.firebase_admin_config import get_firebase_app
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="EduTalk HUIT API",
    description="API for EduTalk HUIT - University Major Prediction & Consulting",
    version="2.0.0",
)

from app.core.mongodb import close_mongo_connection, connect_to_mongo


# Khởi tạo Firebase Admin SDK và MongoDB khi server bắt đầu
@app.on_event("startup")
async def startup_event():
    get_firebase_app()
    print("✅ Firebase Admin SDK initialized successfully.")
    await connect_to_mongo()
    
    # Khởi tạo Scheduler cào tin tức tự động
    from app.services.crawler_service import CrawlerService
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    
    scheduler = AsyncIOScheduler()
    crawler_service = CrawlerService()
    
    # Chạy crawler vào lúc 08:00 và 20:00 mỗi ngày
    scheduler.add_job(crawler_service.scrape_news, 'cron', hour='8,20', minute=0)
    scheduler.start()
    print("✅ APScheduler initialized successfully (Crawler runs at 08:00 and 20:00).")

    # Lưu scheduler vào app state để có thể tắt khi shutdown
    app.state.scheduler = scheduler

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()
        print("🛑 APScheduler shut down.")
    await close_mongo_connection()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. In production, specify domains.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(predict.router, prefix="/api/v1/predict", tags=["Prediction"])
app.include_router(majors.router, prefix="/api/v1/majors", tags=["Majors"])
app.include_router(survey.router, prefix="/api/v1/survey", tags=["Survey"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(posts.router, prefix="/api/v1/posts", tags=["Posts"])  # 🆕 Mới thêm
app.include_router(support.router, prefix="/api/v1/support", tags=["Support"])  # 🆕 Mới thêm
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])    # 🆕 Mới thêm
from app.api.v1 import admin_news

app.include_router(admin_news.router, prefix="/api/v1/admin/news", tags=["Admin News"]) # API quản lý tin tức
app.include_router(news.router, prefix="/api/v1/news", tags=["News"])       # 🆕 Thêm trang news


@app.get("/")
def read_root():
    return {"message": "Welcome to EduTalk HUIT API v2.0"}

