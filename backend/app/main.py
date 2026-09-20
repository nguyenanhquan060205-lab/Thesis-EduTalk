"""Điểm khởi tạo ứng dụng FastAPI của EduTalk.

Cấu hình logging đặt TRƯỚC mọi import khác — xem chú thích ngay dưới.
"""

import logging

from app.core.config import settings

# Cấu hình logging TRƯỚC khi import các router, vì import là lúc module con lấy
# logger của nó.
#
# Vì sao cần: uvicorn chỉ cấu hình logger của riêng nó (`uvicorn.*`), KHÔNG đụng
# root logger. Thiếu dòng dưới thì mọi `log.info(...)` trong `app/` rơi vào hư vô —
# chỉ WARNING trở lên mới lọt ra qua bộ xử lý dự phòng của Python. Hệ quả là
# terminal im lặng hoàn toàn về việc RAG lấy được đoạn nào, chunk nào bị ngưỡng
# chặn, hay vì sao một request trả 503. Đã mất thời gian đi dò đúng vì chuyện này.
#
# `EDUTALK_LOG=DEBUG` khi cần xem chi tiết hơn.
logging.basicConfig(
    level=settings.EDUTALK_LOG.upper(),
    format="%(asctime)s %(levelname)-7s %(name)-34s %(message)s",
    datefmt="%H:%M:%S",
)
# Mấy thư viện này log rất nhiều ở mức INFO và che hết dòng của mình.
for _on in ("httpx", "httpcore", "chromadb", "urllib3", "google", "apscheduler"):
    logging.getLogger(_on).setLevel(logging.WARNING)

from contextlib import asynccontextmanager  # noqa: E402

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.api.v1 import (  # noqa: E402
    admin,
    admin_huan_luyen,
    admin_news,
    auth,
    chat,
    kho_tri_thuc,
    majors,
    news,
    phan_hoi,
    posts,
    predict,
    support,
    survey,
    users,
)
from app.core.errors import register_handlers  # noqa: E402
from app.core.firebase_admin_config import get_firebase_app  # noqa: E402
from app.core.mongodb import close_mongo_connection, connect_to_mongo  # noqa: E402
from app.services.crawler_service import CrawlerService  # noqa: E402
from app.services.huan_luyen.lich import khoi_dong as khoi_dong_huan_luyen  # noqa: E402

log = logging.getLogger(__name__)

# Bảng router — thêm endpoint mới thì thêm MỘT dòng ở đây.
#
# Tiền tố trộn tiếng Anh (`/posts`, `/predict`) và tiếng Việt (`/kho-tri-thuc`,
# `/phan-hoi`) vì client đang gọi đúng các đường này: web 39 đường, mobile 55 đường.
# Đổi cho "nhất quán" là gãy cả hai, nên giữ nguyên.
#
# Nhóm `admin` không khai nhãn ở đây: mỗi router con trong `api/v1/admin/` tự mang
# nhãn riêng ("Admin · Người dùng", "Admin · Diễn đàn"…) cho trang /docs dễ đọc.
ROUTERS = [
    (auth.router, "/api/v1/auth", ["Auth"]),
    (users.router, "/api/v1/users", ["Users"]),
    (predict.router, "/api/v1/predict", ["Prediction"]),
    (majors.router, "/api/v1/majors", ["Majors"]),
    (survey.router, "/api/v1/survey", ["Survey"]),
    (chat.router, "/api/v1/chat", ["Chat"]),
    (posts.router, "/api/v1/posts", ["Posts"]),
    (support.router, "/api/v1/support", ["Support"]),
    (news.router, "/api/v1/news", ["News"]),
    (phan_hoi.router, "/api/v1/phan-hoi", ["Phản hồi người dùng"]),
    (admin.router, "/api/v1/admin", None),
    (admin_news.router, "/api/v1/admin/news", ["Admin · Tin tức"]),
    (admin_huan_luyen.router, "/api/v1/admin/huan-luyen", ["Admin · Huấn luyện lại"]),
    (kho_tri_thuc.router, "/api/v1/kho-tri-thuc", ["Kho tri thức (RAG)"]),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Vòng đời ứng dụng: mở kết nối và dựng lịch chạy nền, đóng lại khi tắt.

    Dùng `lifespan` thay cho `@app.on_event` (đã bị FastAPI khai tử). Khác biệt
    quan trọng cho việc kiểm thử: `TestClient` chỉ chạy phần này khi được dùng
    trong `with`, nên test gọi API mà không cần MongoDB hay Firebase thật.
    """
    # Báo NGAY lúc khởi động nếu thiếu biến môi trường, thay vì để người dùng bấm
    # nút rồi mới lòi ra. Chỉ liệt kê TÊN biến — không bao giờ in giá trị.
    if thieu := settings.missing_required():
        log.warning("Thiếu biến môi trường: %s — tính năng liên quan sẽ không chạy",
                    ", ".join(thieu))

    get_firebase_app()
    log.info("Firebase Admin SDK đã sẵn sàng")
    await connect_to_mongo()

    scheduler = AsyncIOScheduler()
    # Cào tin tuyển sinh 2 lần/ngày
    scheduler.add_job(CrawlerService().scrape_news, "cron", hour="8,20", minute=0)
    scheduler.start()
    log.info("APScheduler đã chạy (cào tin lúc 08:00 và 20:00)")

    # Huấn luyện lại theo chu kỳ + đồng bộ phiên bản mô hình giữa các worker
    await khoi_dong_huan_luyen(scheduler)
    app.state.scheduler = scheduler

    yield

    scheduler.shutdown()
    log.info("APScheduler đã dừng")
    await close_mongo_connection()


def create_app() -> FastAPI:
    """Dựng app. Tách thành hàm để test dựng được bản sạch, không dính trạng thái."""
    app = FastAPI(
        title="EduTalk HUIT API",
        description="API for EduTalk HUIT - University Major Prediction & Consulting",
        version="2.0.0",
        lifespan=lifespan,
    )
    register_handlers(app)

    # Mặc định `*` cho tiện lúc phát triển. Khai domain cụ thể qua
    # `EDUTALK_CORS_ORIGINS` thì mới bật `allow_credentials` — cặp `*` + credentials
    # là cấu hình trình duyệt từ chối thẳng, để vậy vừa vô dụng vừa gây hiểu nhầm.
    nguon_goc = settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=nguon_goc,
        allow_credentials=nguon_goc != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router, tien_to, nhan in ROUTERS:
        app.include_router(router, prefix=tien_to, **({"tags": nhan} if nhan else {}))

    @app.get("/", tags=["Hệ thống"])
    def read_root():
        return {"message": "Welcome to EduTalk HUIT API v2.0"}

    return app


app = create_app()
