"""Xử lý lỗi tập trung cho toàn bộ API.

Trước đợt dọn này mỗi router tự bắt lỗi theo kiểu riêng:

* 4 khối `try/except FileNotFoundError` giống hệt nhau quanh `get_predictor()`
  (survey, predict ×2, majors) — cùng ném 503 với cùng một câu.
* `news.py` bắt `Exception` rồi ném `500, detail=str(e)`, tức là **đẩy nguyên văn lỗi
  nội bộ ra cho client**: tên thư viện, đường dẫn file trên máy chủ, có khi cả chuỗi
  kết nối. Đó là rò rỉ thông tin, và với người dùng thì câu đó cũng vô nghĩa.
* Lỗi không ai bắt thì Starlette trả 500 rỗng, log không có traceback đầy đủ.

Gom về đây thì router chỉ còn lo phần nghiệp vụ, và mọi lỗi bất ngờ đều được ghi
traceback ở một chỗ.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

# Câu trả cho người dùng khi lỗi nằm ngoài dự liệu. Cố ý KHÔNG kèm `str(exc)`:
# chi tiết đi vào log của máy chủ, nơi người phát triển đọc được.
LOI_CHUNG = "Máy chủ gặp sự cố khi xử lý yêu cầu. Bạn thử lại sau ít phút nhé."


def register_handlers(app: FastAPI) -> None:
    """Gắn các bộ xử lý lỗi vào app. Gọi một lần lúc tạo app."""

    @app.exception_handler(FileNotFoundError)
    async def _thieu_tep(_: Request, exc: FileNotFoundError) -> JSONResponse:
        """Thiếu gói mô hình hoặc artifact kho vector.

        503 chứ không phải 500: máy chủ chạy bình thường, chỉ là tài nguyên chưa sẵn
        sàng — thường vì quên chạy `scripts/dong_goi_mo_hinh_huong1.py` hoặc
        `scripts/nap_kho.py`. Giữ nguyên `str(exc)` vì thông điệp của hai script đó
        viết sẵn cho người vận hành đọc, có nêu đúng lệnh cần chạy.
        """
        log.error("Thiếu tệp cần thiết: %s", exc)
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def _loi_ngoai_du_lieu(request: Request, exc: Exception) -> JSONResponse:
        """Lưới cuối. Ghi traceback đầy đủ, trả cho client một câu chung chung."""
        log.exception("Lỗi không bắt được ở %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": LOI_CHUNG})
