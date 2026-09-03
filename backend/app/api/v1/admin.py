"""
Admin Router (Python)
Migrate từ: mobile/lib/screens/admin/ (toàn bộ màn hình admin)
Các endpoint chỉ dành cho admin: quản lý user, posts, premium, support, dashboard.
Sử dụng MongoDB thay cho Firestore.
"""

import json
from datetime import datetime, timedelta, timezone

from app.core.mongodb import get_db
from app.core.privacy import che_ho_so
from app.models.post_models import RejectPostRequest
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


# ==================== Thống kê ====================


async def _dem_theo(db, khoa: str, gioi_han: int = 0, loc: dict | None = None):
    """Đếm số bản ghi `prediction_history` theo một trường, nhiều nhất xếp trước.

    Gộp bằng aggregation pipeline của MongoDB thay vì kéo hết về Python rồi đếm —
    cách cũ ở phần doanh thu dùng `.to_list(length=None)`, tải toàn bộ collection
    lên RAM, dữ liệu lớn là gãy.
    """
    pipeline: list[dict] = []
    if loc:
        pipeline.append({"$match": loc})
    pipeline += [
        {"$match": {khoa: {"$ne": None}}},
        {"$group": {"_id": f"${khoa}", "soLuong": {"$sum": 1}}},
        {"$sort": {"soLuong": -1}},
    ]
    if gioi_han:
        pipeline.append({"$limit": gioi_han})
    return [
        {"ten": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(pipeline)
    ]


@router.get("/analytics", summary="Số liệu thống kê cho khu vực quản trị")
async def get_analytics(days: int = 30, authorization: str = Header(...)):
    """Thống kê từ dữ liệu THẬT trong MongoDB, không có số minh hoạ nào.

    Trọng tâm là `prediction_history` — nhật ký từng lượt tư vấn, thứ nói lên
    người dùng thật đang dùng hệ gợi ý ngành ra sao.

    Dữ liệu còn ít thì các mảng trả về sẽ rỗng; giao diện phải hiển thị trạng
    thái rỗng chứ không được độn số mẫu.
    """
    await require_admin(authorization)
    db = get_db()

    moc = datetime.now(timezone.utc) - timedelta(days=days)

    # ── Tổng quan ────────────────────────────────────────────────────────────
    tong_nguoi_dung = await db["users"].count_documents({})
    chua_xac_minh = await db["users"].count_documents({"emailVerified": False})
    tong_luot = await db["prediction_history"].count_documents({})
    luot_gan_day = await db["prediction_history"].count_documents(
        {"createdAt": {"$gte": moc}}
    )
    bai_cho_duyet = await db["posts"].count_documents({"status": "pending"})
    bai_bi_bao_cao = await db["posts"].count_documents({"isPending": True})
    ho_tro_ton = await db["support_requests"].count_documents({"status": "pending"})
    thong_bao_chua_doc = await db["admin_notifications"].count_documents(
        {"status": "unread"}
    )

    # ── Lượt tư vấn theo ngày ────────────────────────────────────────────────
    theo_ngay = [
        {"ngay": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$match": {"createdAt": {"$gte": moc}}},
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%d/%m",
                                "date": "$createdAt",
                            }
                        },
                        "soLuong": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    ]

    # ── Ngành / nhóm ngành / tổ hợp / mục tiêu ───────────────────────────────
    top_nganh = [
        {"ten": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$unwind": "$majors"},
                {"$match": {"majors.rank": 1}},
                {"$group": {"_id": "$majors.name", "soLuong": {"$sum": 1}}},
                {"$sort": {"soLuong": -1}},
                {"$limit": 10},
            ]
        )
    ]
    theo_nhom = [
        {"ten": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$unwind": "$majors"},
                {"$match": {"majors.rank": 1}},
                {"$group": {"_id": "$majors.field", "soLuong": {"$sum": 1}}},
                {"$sort": {"soLuong": -1}},
            ]
        )
    ]
    top_to_hop = await _dem_theo(db, "input.subjectGroup", gioi_han=10)
    muc_tieu = await _dem_theo(db, "input.goal")
    che_do = await _dem_theo(db, "mode")

    # ── Chất lượng đầu vào — phần phục vụ đánh giá mô hình ───────────────────
    thieu_diem = await db["prediction_history"].count_documents(
        {"$or": [{"input.scores": None}, {"input.scores": {"$size": 0}}]}
    )
    # Chỉ đếm được từ khi `genderMissing` được ghi. Bản ghi cũ lưu "Nu" y hệt nữ
    # thật nên không phân biệt được — báo riêng số bản ghi chưa có cờ này.
    thieu_gioi_tinh = await db["prediction_history"].count_documents(
        {"input.genderMissing": True}
    )
    khong_ro_gioi_tinh = await db["prediction_history"].count_documents(
        {"input.genderMissing": {"$exists": False}}
    )

    # ── Phổ tổng điểm ───────────────────────────────────────────────────────
    pho_diem = [
        {"ten": f"{d['_id']}–{d['_id'] + 3}", "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$match": {"input.scores": {"$type": "array", "$ne": []}}},
                {"$project": {"tong": {"$sum": "$input.scores"}}},
                {
                    "$group": {
                        "_id": {
                            "$multiply": [
                                {"$floor": {"$divide": ["$tong", 3]}},
                                3,
                            ]
                        },
                        "soLuong": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    ]

    # ── So sánh với kỳ liền trước (để hiện mũi tên tăng/giảm) ───────────────
    moc_truoc = moc - timedelta(days=days)
    luot_ky_truoc = await db["prediction_history"].count_documents(
        {"createdAt": {"$gte": moc_truoc, "$lt": moc}}
    )
    nguoi_moi = await db["users"].count_documents({"createdAt": {"$gte": moc}})
    nguoi_moi_truoc = await db["users"].count_documents(
        {"createdAt": {"$gte": moc_truoc, "$lt": moc}}
    )

    def phan_tram(nay: int, truoc: int) -> float | None:
        """None = kỳ trước không có dữ liệu, không thể tính phần trăm.

        Trả 0 trong trường hợp đó sẽ hiện '0%' như thể không đổi, trong khi thực
        tế là chưa có gì để so.
        """
        if truoc == 0:
            return None
        return round((nay - truoc) / truoc * 100, 1)

    # ── Hoạt động gần đây ───────────────────────────────────────────────────
    hoat_dong = []
    async for d in (
        db["prediction_history"].find().sort("createdAt", -1).limit(10)
    ):
        dau = (d.get("majors") or [{}])[0]
        vao = d.get("input") or {}
        diem = vao.get("scores")
        hoat_dong.append(
            {
                "thoiGian": d["createdAt"].isoformat()
                if isinstance(d.get("createdAt"), datetime)
                else None,
                "cheDo": d.get("mode"),
                "toHop": vao.get("subjectGroup"),
                "tongDiem": round(sum(diem), 2) if diem else None,
                "nganh": dau.get("name"),
                "nhom": dau.get("field"),
            }
        )

    return {
        "tongQuan": {
            "nguoiDung": tong_nguoi_dung,
            "chuaXacMinhEmail": chua_xac_minh,
            "tongLuotTuVan": tong_luot,
            "luotGanDay": luot_gan_day,
            "baiChoDuyet": bai_cho_duyet,
            "baiBiBaoCao": bai_bi_bao_cao,
            "hoTroTonDong": ho_tro_ton,
            "thongBaoChuaDoc": thong_bao_chua_doc,
        },
        "soNgay": days,
        "theoNgay": theo_ngay,
        "topNganh": top_nganh,
        "theoNhomNganh": theo_nhom,
        "topToHop": top_to_hop,
        "mucTieu": muc_tieu,
        "cheDo": che_do,
        "phoDiem": pho_diem,
        "chatLuongDauVao": {
            "thieuDiemThi": thieu_diem,
            "thieuGioiTinh": thieu_gioi_tinh,
            "khongRoGioiTinh": khong_ro_gioi_tinh,
        },
        "soSanh": {
            "luotKyTruoc": luot_ky_truoc,
            "luotThayDoi": phan_tram(luot_gan_day, luot_ky_truoc),
            "nguoiMoi": nguoi_moi,
            "nguoiMoiKyTruoc": nguoi_moi_truoc,
            "nguoiMoiThayDoi": phan_tram(nguoi_moi, nguoi_moi_truoc),
        },
        "hoatDongGanDay": hoat_dong,
    }


@router.get("/model-metrics", summary="Chỉ số hiệu suất mô hình")
async def get_model_metrics(authorization: str = Header(...)):
    """Đọc kết quả huấn luyện từ `research/data/processed/08_model/`.

    Đây là **số liệu đánh giá mô hình**, khác hẳn `/admin/analytics` (số liệu sử
    dụng thực tế). Tất cả lấy nguyên từ file do notebook `08_train_xgboost.ipynb`
    xuất ra — không tính lại, không làm tròn thêm.

    Hai phần trong đề cương chưa có dữ liệu, trả `null` chứ không bịa:
    - `baselineRandomForest`: chưa train Random Forest để so sánh
    - `lichSuHuanLuyen`: mô hình mới train một lần, chưa có chu kỳ retrain
    """
    await require_admin(authorization)

    # pyrefly: ignore [missing-import]
    from app.services.major_predictor import _model_dir

    thu_muc = _model_dir() / "08_model"
    f_metrics = thu_muc / "metrics_summary.json"
    if not f_metrics.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Chưa có file kết quả huấn luyện tại {f_metrics}. "
            "Chạy notebook 08_train_xgboost.ipynb trước.",
        )

    with open(f_metrics, encoding="utf-8") as fp:
        m = json.load(fp)

    def doc_neu_co(ten: str):
        f = thu_muc / ten
        if not f.exists():
            return None
        with open(f, encoding="utf-8") as fp:
            return json.load(fp)

    return {
        "ngayChay": m.get("ngay_chay"),
        "seed": m.get("seed"),
        "duLieu": m.get("du_lieu"),
        "cv": m.get("cv"),
        "sieuThamSo": m.get("sieu_tham_so"),
        "cvMacroF1": m.get("cv_macro_f1"),
        "overfit": m.get("cv_overfit"),
        "test": m.get("test"),
        "baseline": m.get("baseline"),
        "aucRoc": m.get("auc_roc"),
        "canhBao": m.get("canh_bao"),
        # Chưa có — giao diện phải hiện "chưa có dữ liệu", không được vẽ số giả
        "baselineRandomForest": doc_neu_co("baseline_random_forest.json"),
        "lichSuHuanLuyen": doc_neu_co("lich_su_huan_luyen.json"),
    }


@router.get("/consultations", summary="Lịch sử tư vấn (có phân trang và lọc)")
async def get_consultations(
    authorization: str = Header(...),
    page: int = 1,
    size: int = 20,
    mode: str | None = None,
    subjectGroup: str | None = None,
    q: str | None = None,
):
    """Toàn bộ phiên tư vấn đã thực hiện, mới nhất trước.

    `/admin/analytics` chỉ trả 10 lượt gần nhất để vẽ bảng tóm tắt; endpoint này
    mới là chỗ tra cứu đầy đủ.
    """
    await require_admin(authorization)
    db = get_db()

    size = max(1, min(size, 100))
    page = max(1, page)

    loc: dict = {}
    if mode in ("explore", "guided"):
        loc["mode"] = mode
    if subjectGroup:
        loc["input.subjectGroup"] = subjectGroup.upper()
    if q:
        # Khớp theo tên ngành được gợi ý, không phân biệt hoa thường
        loc["majors.name"] = {"$regex": q.strip(), "$options": "i"}

    tong = await db["prediction_history"].count_documents(loc)

    ds = []
    cursor = (
        db["prediction_history"]
        .find(loc)
        .sort("createdAt", -1)
        .skip((page - 1) * size)
        .limit(size)
    )
    async for d in cursor:
        vao = d.get("input") or {}
        diem = vao.get("scores")
        nguoi = await db["users"].find_one({"_id": d.get("user_id")})
        ds.append(
            {
                "id": str(d["_id"]),
                "thoiGian": d["createdAt"].isoformat()
                if isinstance(d.get("createdAt"), datetime)
                else None,
                # Chỉ trả tên, không trả email — tra cứu vận hành không cần
                # danh tính đầy đủ của người dùng
                "nguoiDung": (nguoi or {}).get("name") or "Không rõ",
                "cheDo": d.get("mode"),
                "toHop": vao.get("subjectGroup"),
                "tongDiem": round(sum(diem), 2) if diem else None,
                "mucTieu": vao.get("goal"),
                "thieuGioiTinh": vao.get("genderMissing"),
                "goiY": [
                    {
                        "rank": x.get("rank"),
                        "ten": x.get("name"),
                        "nhom": x.get("field"),
                    }
                    for x in (d.get("majors") or [])
                ],
            }
        )

    return {
        "data": ds,
        "tong": tong,
        "trang": page,
        "soTrang": max(1, -(-tong // size)),
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

    # Danh sách quản trị chỉ cần đủ để nhận ra tài khoản, không cần email và số
    # điện thoại đầy đủ của từng người. Bản trước trả nguyên vẹn mọi trường.
    users = []
    async for doc in db["users"].find():
        doc["id"] = str(doc.pop("_id"))
        for k in ["createdAt", "premiumExpiry", "premiumStart"]:
            if k in doc and isinstance(doc[k], datetime):
                doc[k] = doc[k].isoformat()
        users.append(che_ho_so(doc))
    return {"data": users}


from app.models.admin_models import (
    LockUserRequest,
    UpdatePremiumRequest,
    UpdateSupportRequest,
)


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


@router.put("/users/{uid}/lock", summary="Khoá / mở khoá tài khoản")
async def lock_user(uid: str, body: LockUserRequest, authorization: str = Header(...)):
    """Khoá tài khoản: chặn đăng nhập và chặn mọi thao tác tạo nội dung.

    Làm ba việc cùng lúc:
    1. `disabled` trên Firebase Auth → lần đăng nhập tới bị từ chối ngay
    2. Thu hồi refresh token → phiên ở thiết bị khác hết hạn sớm
    3. Cờ `disabled` trong MongoDB → backend chặn thao tác của phiên còn sống

    Bước 3 mới là thứ chặn được **ngay lập tức**: ID token đã cấp vẫn hợp lệ tối đa
    1 giờ, không có cờ trong DB thì người bị khoá còn đăng bài thêm được một lúc.
    """
    admin_uid = await require_admin(authorization)
    if admin_uid == uid:
        raise HTTPException(
            status_code=400, detail="Không thể tự khoá tài khoản của chính mình."
        )

    db = get_db()
    muc_tieu = await db["users"].find_one({"_id": uid})
    if not muc_tieu:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if muc_tieu.get("role") == "admin" and body.disabled:
        raise HTTPException(
            status_code=400, detail="Không thể khoá tài khoản quản trị viên khác."
        )

    try:
        auth_service.auth.update_user(uid, disabled=body.disabled)
        if body.disabled:
            auth_service.auth.revoke_refresh_tokens(uid)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Không cập nhật được trên Firebase: {e!s}"
        ) from e

    await db["users"].update_one(
        {"_id": uid},
        {
            "$set": {
                "disabled": body.disabled,
                "disabledReason": body.reason if body.disabled else "",
                "disabledAt": datetime.now(timezone.utc) if body.disabled else None,
            }
        },
    )
    return {"status": "success", "disabled": body.disabled}


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


@router.get("/posts/pending", summary="Bài viết đang chờ duyệt")
async def get_pending_posts(authorization: str = Header(...)):
    """Hàng chờ kiểm duyệt, cũ nhất lên trước để không ai bị bỏ quên."""
    await require_admin(authorization)
    db = get_db()

    posts = []
    async for doc in db["posts"].find({"status": "pending"}).sort("createdAt", 1):
        doc["id"] = str(doc.pop("_id"))
        for k in ("createdAt", "remindedAt"):
            if isinstance(doc.get(k), datetime):
                doc[k] = doc[k].isoformat()
        posts.append(doc)
    return {"data": posts}


@router.put("/posts/{post_id}/approve", summary="Duyệt bài viết")
async def approve_post(post_id: str, authorization: str = Header(...)):
    """Sau khi duyệt, bài mới hiện ở `GET /api/v1/posts/` cho cộng đồng."""
    await require_admin(authorization)
    from app.services.post_service import PostService

    result = await PostService().review_post(post_id=post_id, duyet=True)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.put("/posts/{post_id}/reject", summary="Từ chối bài viết")
async def reject_post(
    post_id: str, body: RejectPostRequest, authorization: str = Header(...)
):
    """Từ chối kèm lý do — tác giả nhìn thấy lý do này ở mục bài viết của mình."""
    await require_admin(authorization)
    from app.services.post_service import PostService

    result = await PostService().review_post(
        post_id=post_id, duyet=False, reason=body.reason
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


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
