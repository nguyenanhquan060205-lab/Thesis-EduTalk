"""Lịch sử tư vấn của toàn hệ thống, có phân trang và bộ lọc."""

from datetime import datetime

from fastapi import APIRouter, Depends

from app.api.deps import get_database

router = APIRouter()


@router.get("/consultations", summary="Lịch sử tư vấn (có phân trang và lọc)")
async def get_consultations(
    db=Depends(get_database),
    page: int = 1,
    size: int = 20,
    mode: str | None = None,
    subjectGroup: str | None = None,
    q: str | None = None
):
    """Toàn bộ phiên tư vấn đã thực hiện, mới nhất trước.

    `/admin/analytics` chỉ trả 10 lượt gần nhất để vẽ bảng tóm tắt; endpoint này
    mới là chỗ tra cứu đầy đủ.
    """

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
