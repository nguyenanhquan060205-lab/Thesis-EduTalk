"""Bảng tổng quan: số người dùng, doanh thu, thông báo chưa đọc."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_database

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(db=Depends(get_database)):
    """
    Tổng hợp thống kê cho màn hình Dashboard Admin.
    Migrate từ: dashboard_screen.dart — tính tổng user, premium, doanh thu.
    """

    # Lấy tổng số user
    total_users = await db["users"].count_documents({})
    premium_users = await db["users"].count_documents({"isPremium": True})

    # Lấy giao dịch thành công
    transactions = (
        await db["transactions"].find({"status": "success"}).to_list(length=None)
    )
    total_revenue = 0.0
    today_revenue = 0.0
    month_revenue = 0.0

    now = datetime.now(timezone.utc)
    for data in transactions:
        amount = float(data.get("amount", 0))
        total_revenue += amount
        ts = data.get("timestamp") or data.get("createdAt")
        if ts:
            try:
                # MongoDB motor có thể trả về datetime object
                ts_dt = (
                    ts.replace(tzinfo=timezone.utc)
                    if isinstance(ts, datetime)
                    else datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
                )
                if (now - ts_dt).days == 0:
                    today_revenue += amount
                if (now - ts_dt).days <= 30:
                    month_revenue += amount
            except Exception as e:  # noqa: BLE001
                print(f"Lỗi parse ngày tháng: {e}")

    # Admin notifications chưa đọc
    unread_notifs = await db["admin_notifications"].count_documents(
        {"status": "unread"}
    )

    return {
        "totalUsers": total_users,
        "premiumUsers": premium_users,
        "totalRevenue": total_revenue,
        "todayRevenue": today_revenue,
        "monthRevenue": month_revenue,
        "unreadNotifications": unread_notifs,
    }
