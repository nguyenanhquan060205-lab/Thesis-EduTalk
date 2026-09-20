"""Cấu hình đọc từ biến môi trường — gom về MỘT chỗ.

Trước đây `os.getenv` rải rác 14 file, nên thiếu một biến thì lỗi nổ ở giữa lúc chạy:
người dùng bấm gửi OTP mới phát hiện chưa khai `EMAILJS_SERVICE_ID`. Gom về đây thì
đọc `.env.example` là biết cần những gì, và lúc khởi động có cảnh báo liệt kê đúng
tên biến còn thiếu.

Dùng `pydantic-settings` — thư viện đã nằm trong `requirements.txt` từ đầu nhưng chưa
được dùng ở đâu cả. Thứ tự ưu tiên của nó: **biến môi trường thắng file `.env`**, nhờ
vậy `tests/conftest.py` đặt `MONGO_URI=""` là chắc chắn không nối vào Atlas thật.

    from app.core.config import settings
    if not settings.MONGO_URI: ...

**Cố ý KHÔNG gom vào đây:** `EDUTALK_PIPELINE`, `EDUTALK_PHIEN_BAN`, `EDUTALK_MODEL_DIR`.
Ba biến đó phải đọc LÚC GỌI để đổi mô hình nóng và để script kiểm đặt được bằng
`os.environ` ngay trước khi nạp. Nhét vào `Settings` (đọc một lần lúc import) là mất
tính năng đó mà không có gì báo.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.paths import BACKEND

# Biến không có thì backend vẫn chạy, chỉ mất tính năng tương ứng — nên chỉ cảnh báo
# chứ không chặn khởi động. Quy ước này có từ `core/mongodb.py`: thiếu MONGO_URI thì
# app vẫn lên, tiện cho việc chạy thử phần mô hình mà không cần CSDL.
BAT_BUOC_DE_CHAY_DU = (
    "MONGO_URI",
    "GEMINI_API_KEY",
    "FIREBASE_WEB_API_KEY",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
)


class Settings(BaseSettings):
    """Toàn bộ biến môi trường backend đọc. Giá trị mặc định = đúng bản trong code cũ."""

    model_config = SettingsConfigDict(
        env_file=BACKEND / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # .env còn biến của web/mobile, đừng ném lỗi vì chúng
    )

    # ── Hạ tầng ──────────────────────────────────────────────────────────────
    MONGO_URI: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
    FIREBASE_WEB_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # ── Cloudinary (ảnh bài viết) ────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = "edutalk-app"
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── Gửi mã xác minh ──────────────────────────────────────────────────────
    EMAILJS_SERVICE_ID: str = "service_jz7he5o"
    EMAILJS_TEMPLATE_ID: str = "template_ntv9o9c"
    EMAILJS_PUBLIC_KEY: str = "Ezr_VkJnGkvD-1Ma0"
    SMS_API_KEY: str = ""
    # "true" = in mã ra log thay vì gửi SMS thật, dùng lúc phát triển
    SMS_DEV_MODE: str = ""

    # ── Vận hành ─────────────────────────────────────────────────────────────
    EDUTALK_LOG: str = "INFO"
    EDUTALK_CORS_ORIGINS: str = ""

    # ── Mô hình ngôn ngữ ─────────────────────────────────────────────────────
    EDUTALK_MODEL_CHAT: str = "gemini-flash-lite-latest"
    EDUTALK_MODEL_NHUNG: str = "models/gemini-embedding-2"
    # Gắn với model nhúng: đổi số chiều là phải dựng lại kho VÀ đo lại hai ngưỡng
    # trong `services/rag/tro_ly.py`. Xem chú thích ở đó.
    EDUTALK_SO_CHIEU: int = 768
    EDUTALK_RAG: str = "1"

    @property
    def cors_origins(self) -> list[str]:
        """Danh sách domain được gọi API. Rỗng = `*` (tiện lúc phát triển)."""
        ds = [x.strip() for x in self.EDUTALK_CORS_ORIGINS.split(",") if x.strip()]
        return ds or ["*"]

    @property
    def rag_enabled(self) -> bool:
        return self.EDUTALK_RAG.strip().lower() not in ("0", "off", "false")

    def missing_required(self) -> list[str]:
        """Tên các biến chưa khai. CHỈ trả về TÊN — không bao giờ trả giá trị."""
        return [t for t in BAT_BUOC_DE_CHAY_DU if not getattr(self, t, "")]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
