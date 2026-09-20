"""Nhúng văn bản thành vector bằng Gemini embedding.

Chỗ duy nhất trong dự án gọi API nhúng. Mọi nơi khác đi qua đây, để cách gọi
không trôi lệch mỗi chỗ một kiểu — đúng bài học `chung.py` bên research.
"""

import logging
import math
import time
from functools import lru_cache

import google.generativeai as genai
from dotenv import load_dotenv

from app.core.config import settings

load_dotenv()

log = logging.getLogger(__name__)

# `gemini-embedding-2` gốc 3072 chiều, rút xuống 768 bằng Matryoshka. Đo trên 39
# ngành thật: 768 chiều vẫn Top-1 5/5, mà nhẹ hơn 4 lần khi lưu và khi tìm.
MODEL_NHUNG = settings.EDUTALK_MODEL_NHUNG
SO_CHIEU = settings.EDUTALK_SO_CHIEU

# BẮT BUỘC, không phải tuỳ chọn. Thiếu timeout thì SDK treo VÔ HẠN khi kết nối
# đứng giữa chừng — đã dính đúng lỗi này lúc chạy thử, script đứng im không báo
# gì. Trên server đó là một worker chết cứng, không tự phục hồi.
GIAY_CHO = 60
SO_LAN_THU = 3

# Gói free của Gemini tính hạn mức theo SỐ ĐOẠN nhúng mỗi phút, không phải số lệnh
# gọi: gửi một lô 100 đoạn là dùng hết sạch lượt của phút đó. Nạp 257 đoạn một mạch
# thì lô thứ hai chắc chắn bị chặn — đã dính thật:
#     RESOURCE_EXHAUSTED · EmbedContentRequestsPerMinutePerUserPerProjectPerModel
#     quota_value: 100
# Hỏng giữa chừng còn tệ hơn chậm: artifact ghi ra dở dang, backend khởi động lên
# với kho thiếu đoạn mà không có gì báo.
LUOT_MOI_PHUT = 100
_da_gui: list[tuple[float, int]] = []  # (thời điểm gửi, số đoạn) trong 60 giây qua

_da_cau_hinh = False


def _cau_hinh():
    global _da_cau_hinh
    if _da_cau_hinh:
        return
    key = settings.GEMINI_API_KEY
    if not key:
        raise RuntimeError("Thiếu GEMINI_API_KEY trong backend/.env")
    genai.configure(api_key=key)
    _da_cau_hinh = True


def _chuan_hoa(v: list[float]) -> list[float]:
    """Đưa vector về độ dài 1.

    Gemini chỉ chuẩn hoá sẵn ở 3072 chiều; rút xuống 768 thì không còn. Cosine
    vốn không quan tâm độ dài nên xếp hạng vẫn đúng, nhưng chuẩn hoá làm con số
    khoảng cách đọc được và cho phép sau này thay Chroma bằng một phép nhân ma
    trận numpy mà không đổi kết quả.
    """
    n = math.sqrt(sum(x * x for x in v))
    return v if n == 0 else [x / n for x in v]


def _cho_den_luot(n: int) -> None:
    """Chặn tới khi gửi thêm `n` đoạn nữa vẫn nằm trong hạn mức mỗi phút."""
    while True:
        gio = time.time()
        _da_gui[:] = [(t, c) for t, c in _da_gui if gio - t < 60]
        if sum(c for _, c in _da_gui) + n <= LUOT_MOI_PHUT:
            return
        cho = 60 - (gio - _da_gui[0][0]) + 0.5
        log.info("Chạm hạn mức nhúng, chờ %.0f giây", cho)
        time.sleep(cho)


def _giay_cho_lai(e: Exception, lan: int) -> float:
    """Máy chủ nói sẵn phải chờ bao lâu khi chạm hạn mức — dùng số đó, đừng đoán."""
    if giay := getattr(getattr(e, "retry_delay", None), "seconds", 0):
        return giay + 1
    return 2 * (lan + 1)


def _goi(noi_dung, loai: str):
    _cau_hinh()
    for lan in range(SO_LAN_THU):
        try:
            r = genai.embed_content(
                model=MODEL_NHUNG,
                content=noi_dung,
                task_type=loai,
                output_dimensionality=SO_CHIEU,
                request_options={"timeout": GIAY_CHO},
            )
            return r["embedding"]
        except Exception as e:  # noqa: BLE001
            if lan == SO_LAN_THU - 1:
                raise
            cho = _giay_cho_lai(e, lan)
            log.warning(
                "Nhúng lỗi (%s), chờ %.0f giây rồi thử lại %d/%d",
                type(e).__name__, cho, lan + 2, SO_LAN_THU,
            )
            time.sleep(cho)
    raise RuntimeError("không tới được")  # pragma: no cover


def nhung_tai_lieu(ds: list[str], lo: int = 50) -> list[list[float]]:
    """Nhúng tài liệu để NẠP vào kho, có rải nhịp theo hạn mức mỗi phút.

    Lô 50 thay vì 100: chạm đúng trần thì chỉ cần một đoạn nào đó bị đếm lệch là
    cả lô hỏng, mà lô càng to thì mất càng nhiều công khi phải làm lại.
    """
    ra: list[list[float]] = []
    for i in range(0, len(ds), lo):
        phan = ds[i : i + lo]
        _cho_den_luot(len(phan))
        _da_gui.append((time.time(), len(phan)))
        ra.extend(_chuan_hoa(v) for v in _goi(phan, "retrieval_document"))
    return ra


@lru_cache(maxsize=512)
def _nhung_cau_hoi_cache(cau: str) -> tuple[float, ...]:
    return tuple(_chuan_hoa(_goi(cau, "retrieval_query")))


def nhung_cau_hoi(cau: str) -> list[float]:
    """Nhúng câu hỏi để TRUY XUẤT.

    Phải khác `retrieval_document`: bộ nhúng đưa câu hỏi và tài liệu về cùng một
    không gian nhưng bằng hai phép biến đổi khác nhau. Dùng nhầm loại thì kết quả
    vẫn ra, chỉ kém chính xác đi — kiểu lỗi âm thầm khó thấy nhất.

    CÓ NHỚ ĐỆM 512 câu gần nhất. Đo thật: nhúng mất **768 ms**, còn Chroma tìm chỉ
    **0.83 ms** — nghĩa là 99,9% thời gian truy xuất nằm ở lệnh gọi API này. Thí
    sinh hay hỏi trùng nhau ("điểm chuẩn ngành CNTT"), và lúc demo trước hội đồng
    thì cùng một câu bị gõ đi gõ lại nhiều lần.
    Nhớ đệm là an toàn: cùng một chuỗi luôn cho cùng một vector, model nhúng không
    đổi giữa chừng. 512 câu × 768 số thực ≈ 3 MB.
    """
    return list(_nhung_cau_hoi_cache(cau))
