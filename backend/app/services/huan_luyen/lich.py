"""Lịch huấn luyện lại theo chu kỳ + đồng bộ phiên bản đang phục vụ giữa các worker.

Gắn vào đúng APScheduler mà `main.py` đã dựng cho bộ cào tin. Giờ chạy tính theo giờ Việt
Nam, không theo giờ máy chủ (Render chạy UTC — "02:00" giờ máy chủ là 9 giờ sáng ở VN).

Hai job:

    huan_luyen_lai_dinh_ky   theo cấu hình admin chọn; lượt theo lịch tự bỏ qua nếu chưa
                             đủ nhãn mới, nên đặt lịch dày cũng không huấn luyện vô ích
    dong_bo_phien_ban        5 phút một lần: phiên bản đang phục vụ trong MongoDB khác bản
                             worker này đang nạp (worker khác vừa đưa bản mới vào) → nạp lại
"""

from __future__ import annotations

import asyncio
import logging

log = logging.getLogger(__name__)

JOB_HUAN_LUYEN = "huan_luyen_lai_dinh_ky"
JOB_DONG_BO = "dong_bo_phien_ban"
MUI_GIO = "Asia/Ho_Chi_Minh"


def _trigger(cfg: dict):
    from apscheduler.triggers.cron import CronTrigger

    gio = int(cfg["gio"])
    if cfg["chu_ky"] == "hang_ngay":
        return CronTrigger(hour=gio, minute=0, timezone=MUI_GIO)
    if cfg["chu_ky"] == "hang_tuan":
        return CronTrigger(day_of_week=cfg["thu"], hour=gio, minute=0, timezone=MUI_GIO)
    if cfg["chu_ky"] == "hang_thang":
        return CronTrigger(day=int(cfg["ngay"]), hour=gio, minute=0, timezone=MUI_GIO)
    return None  # "tat"


async def _chay_theo_lich():
    from app.services.huan_luyen.tien_trinh import chay_huan_luyen

    kq = await asyncio.to_thread(chay_huan_luyen, "lich")
    log.info("Huấn luyện lại theo lịch: %s — %s", kq.get("ket_qua"), kq.get("ly_do"))


async def _dong_bo():
    from app.services.huan_luyen import phien_ban
    from app.services.major_predictor import (
        ma_phien_ban_dang_nap,
        nap_lai_predictor,
        pipeline_dang_chay,
    )

    dang_nap = ma_phien_ban_dang_nap()
    if pipeline_dang_chay() != "h1" or dang_nap is None:
        return  # chưa ai gọi get_predictor() — lần nạp đầu sẽ tự lấy đúng bản
    ma = await asyncio.to_thread(phien_ban.ma_dang_phuc_vu)
    if ma != dang_nap:
        log.info("Phiên bản phục vụ đổi %s → %s, nạp lại", dang_nap, ma)
        await asyncio.to_thread(nap_lai_predictor, ma)


def ap_dung_lich(scheduler, cfg: dict) -> None:
    if scheduler.get_job(JOB_HUAN_LUYEN):
        scheduler.remove_job(JOB_HUAN_LUYEN)
    t = _trigger(cfg)
    if t is not None:
        scheduler.add_job(
            _chay_theo_lich, t, id=JOB_HUAN_LUYEN,
            max_instances=1, coalesce=True, misfire_grace_time=3600,
        )


def lich_tiep_theo(scheduler) -> str | None:
    j = scheduler.get_job(JOB_HUAN_LUYEN) if scheduler else None
    return j.next_run_time.isoformat() if j and j.next_run_time else None


async def khoi_dong(scheduler) -> None:
    """Gọi trong startup. Thiếu MONGO_URI thì không đặt lịch — không có nơi lưu phiên bản."""
    from app.core.mongodb import get_db_dong_bo
    from app.services.huan_luyen.tien_trinh import doc_cau_hinh

    if get_db_dong_bo() is None:
        log.warning("Thiếu MONGO_URI — không bật huấn luyện lại định kỳ")
        return
    try:
        cfg = await asyncio.to_thread(doc_cau_hinh)
    except Exception as e:  # noqa: BLE001 — Mongo tạm lỗi không được làm app không khởi động
        log.warning("Không đọc được cấu hình huấn luyện lại (%s) — tạm chưa đặt lịch", e)
        return
    ap_dung_lich(scheduler, cfg)
    from apscheduler.triggers.interval import IntervalTrigger

    scheduler.add_job(_dong_bo, IntervalTrigger(minutes=5), id=JOB_DONG_BO,
                      max_instances=1, coalesce=True, replace_existing=True)
    log.info("Huấn luyện lại: chu kỳ %s · lần tới %s", cfg["chu_ky"], lich_tiep_theo(scheduler))
