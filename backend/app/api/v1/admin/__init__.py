"""Khu vực quản trị — gom 8 nhóm endpoint dưới cùng tiền tố `/api/v1/admin`.

Trước đây tất cả nằm trong MỘT file 901 dòng trộn 7 việc không liên quan: thống kê,
đọc chỉ số mô hình từ đĩa, CRUD người dùng, kiểm duyệt diễn đàn, phiếu hỗ trợ, thông
báo. Tách ra theo mảng, đường dẫn giữ nguyên từng ký tự.

Quyền admin gác ở ĐÂY, một lần cho mọi route con — thêm file mới không thể quên.
"""

from fastapi import APIRouter, Depends

from app.api.deps import require_admin

from . import (
    analytics,
    consultations,
    dashboard,
    model_metrics,
    notifications,
    posts,
    support,
    users,
)

router = APIRouter(dependencies=[Depends(require_admin)])

for _mo_dun, _nhan in (
    (dashboard, "Admin · Tổng quan"),
    (analytics, "Admin · Thống kê"),
    (model_metrics, "Admin · Mô hình"),
    (consultations, "Admin · Lượt tư vấn"),
    (users, "Admin · Người dùng"),
    (posts, "Admin · Diễn đàn"),
    (support, "Admin · Hỗ trợ"),
    (notifications, "Admin · Thông báo"),
):
    router.include_router(_mo_dun.router, tags=[_nhan])
