"""
Admin Router (Python)
Migrate từ: mobile/lib/screens/admin/ (toàn bộ màn hình admin)
Các endpoint chỉ dành cho admin: quản lý user, posts, premium, support, dashboard.
Sử dụng MongoDB thay cho Firestore.
"""

from datetime import datetime, timedelta, timezone

from app.core.mongodb import get_db
from app.services.auth_service import AuthService
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()
auth_service = AuthService()


# ==================== Helper ====================


async def require_admin(authorization: str) -> str:
    """Kiểm tra token và đảm bảo người dùng có role=admin."""
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")
    uid = decoded["uid"]
    db = get_db()
    user_doc = await db["users"].find_one({"_id": uid})
    if not user_doc or user_doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền truy cập.")
    return uid


# ==================== Dashboard ====================


@router.get("/dashboard")
async def get_dashboard(authorization: str = Header(...)):
    """
    Tổng hợp thống kê cho màn hình Dashboard Admin.
    Migrate từ: dashboard_screen.dart — tính tổng user, premium, doanh thu.
    """
    await require_admin(authorization)
    db = get_db()

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


# ==================== User Management ====================


@router.get("/users")
async def get_all_users(authorization: str = Header(...)):
    """
    Lấy danh sách tất cả người dùng.
    Migrate từ: user_management_screen.dart — AdminService.getUsersStream().
    """
    await require_admin(authorization)
    db = get_db()

    users = []
    async for doc in db["users"].find():
        doc["id"] = str(doc.pop("_id"))
        # Chuyển Timestamp
        for k in ["createdAt", "premiumExpiry", "premiumStart"]:
            if k in doc and isinstance(doc[k], datetime):
                doc[k] = doc[k].isoformat()
        users.append(doc)
    return {"data": users}


from app.models.admin_models import UpdatePremiumRequest, UpdateSupportRequest


@router.put("/users/{uid}/premium")
async def update_user_premium(
    uid: str, body: UpdatePremiumRequest, authorization: str = Header(...)
):
    """
    Cập nhật trạng thái Premium cho người dùng.
    Migrate từ: premium_management_screen.dart — AdminService.updatePremiumStatus().
    """
    await require_admin(authorization)
    db = get_db()

    updates = {
        "plan": None if body.plan == "none" else body.plan,
        "isPremium": body.isPremium,
        "subscriptionStatus": "active" if body.isPremium else "none",
    }

    now = datetime.now(timezone.utc)
    if body.isPremium:
        updates["premiumStart"] = now
        updates["premiumAt"] = now
        if body.plan == "monthly":
            updates["premiumExpiry"] = now + timedelta(days=30)
        elif body.plan == "yearly":
            updates["premiumExpiry"] = now + timedelta(days=365)
        else:  # lifetime
            updates["premiumExpiry"] = None
    else:
        updates["premiumStart"] = None
        updates["premiumExpiry"] = None
        updates["premiumAt"] = None

    await db["users"].update_one({"_id": uid}, {"$set": updates})
    return {"status": "success"}


@router.delete("/users/{uid}")
async def delete_user(uid: str, authorization: str = Header(...)):
    """
    Xóa người dùng khỏi hệ thống (Admin).
    Migrate từ: user_management_screen.dart — AdminService.deleteUser().
    """
    await require_admin(authorization)
    db = get_db()
    await db["users"].delete_one({"_id": uid})
    return {"status": "success"}


# ==================== Forum Management ====================


@router.get("/posts")
async def get_all_posts(authorization: str = Header(...)):
    """
    Lấy tất cả bài viết (kể cả đang pending) cho Admin quản lý.
    Migrate từ: forum_management_screen.dart — AdminService.getPostsStream().
    """
    await require_admin(authorization)
    db = get_db()

    posts = []
    async for doc in db["posts"].find().sort("createdAt", -1):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        posts.append(doc)
    return {"data": posts}


@router.delete("/posts/{post_id}")
async def admin_delete_post(post_id: str, authorization: str = Header(...)):
    """
    Admin xóa bài viết và đánh dấu thông báo liên quan đã đọc.
    Migrate từ: forum_management_screen.dart — AdminService.deletePost().
    """
    await require_admin(authorization)
    db = get_db()

    try:
        await db["posts"].delete_one({"_id": ObjectId(post_id)})
        # Đánh dấu thông báo liên quan đã xử lý
        await db["admin_notifications"].update_many(
            {"postId": post_id, "status": "unread"}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}


@router.put("/posts/{post_id}/dismiss-report")
async def dismiss_post_report(post_id: str, authorization: str = Header(...)):
    """
    Bỏ báo cáo bài viết (duyệt bài an toàn).
    Migrate từ: forum_management_screen.dart — AdminService.dismissPostReports().
    """
    await require_admin(authorization)
    db = get_db()

    try:
        await db["posts"].update_one(
            {"_id": ObjectId(post_id)},
            {
                "$set": {
                    "reportCount": 0,
                    "isPending": False,
                    "reportedBy": [],
                }
            },
        )
        await db["admin_notifications"].update_many(
            {"postId": post_id, "status": "unread"}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}


# ==================== Support Management ====================


@router.get("/support")
async def get_all_support_requests(authorization: str = Header(...)):
    """
    Lấy tất cả yêu cầu hỗ trợ cho Admin.
    Migrate từ: support_management_screen.dart.
    """
    await require_admin(authorization)
    db = get_db()

    result = []
    async for doc in db["support_requests"].find().sort("createdAt", -1):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        result.append(doc)
    return {"data": result}


@router.put("/support/{request_id}")
async def update_support_request(
    request_id: str, body: UpdateSupportRequest, authorization: str = Header(...)
):
    """
    Cập nhật trạng thái yêu cầu hỗ trợ và gửi thông báo cho user.
    Migrate từ: support_management_screen.dart.
    """
    await require_admin(authorization)
    db = get_db()

    update_data: dict = {"status": body.status}

    # Nếu resolve → lưu answer và gửi notification cho user
    if body.status == "resolved" and body.adminNote:
        update_data["answer"] = body.adminNote
        update_data["answeredAt"] = datetime.now(timezone.utc)

    try:
        await db["support_requests"].update_one(
            {"_id": ObjectId(request_id)}, {"$set": update_data}
        )

        # Gửi notification cho user nếu resolve
        if body.status == "resolved":
            req_doc = await db["support_requests"].find_one(
                {"_id": ObjectId(request_id)}
            )
            if req_doc:
                user_uid = req_doc.get("userId") or req_doc.get("uid")
                if user_uid:
                    await db["notifications"].insert_one(
                        {
                            "receiverId": user_uid,
                            "senderId": "admin",
                            "senderName": "Quản trị viên",
                            "type": "support",
                            "postId": request_id,
                            "isRead": False,
                            "createdAt": datetime.now(timezone.utc),
                        }
                    )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}


# ==================== Admin Notifications ====================


@router.get("/notifications")
async def get_admin_notifications(authorization: str = Header(...)):
    """
    Lấy thông báo chưa đọc của Admin (báo cáo bài viết...).
    Migrate từ: admin_layout.dart — AdminService.getAdminNotificationsStream().
    """
    await require_admin(authorization)
    db = get_db()

    notifs = []
    async for doc in (
        db["admin_notifications"].find({"status": "unread"}).sort("createdAt", -1)
    ):
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
            doc["createdAt"] = doc["createdAt"].isoformat()
        notifs.append(doc)
    return {"data": notifs}


@router.put("/notifications/{notif_id}/resolve")
async def resolve_admin_notification(notif_id: str, authorization: str = Header(...)):
    """Đánh dấu thông báo admin đã xử lý."""
    await require_admin(authorization)
    db = get_db()
    try:
        await db["admin_notifications"].update_one(
            {"_id": ObjectId(notif_id)}, {"$set": {"status": "read"}}
        )
        return {"status": "success"}
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}
