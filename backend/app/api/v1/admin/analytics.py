"""Thống kê sử dụng, lấy từ nhật ký tư vấn thật trong MongoDB."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.api.deps import get_database

router = APIRouter()


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
async def get_analytics(days: int = 30, db=Depends(get_database)):
    """Thống kê từ dữ liệu THẬT trong MongoDB, không có số minh hoạ nào.

    Trọng tâm là `prediction_history` — nhật ký từng lượt tư vấn, thứ nói lên
    người dùng thật đang dùng hệ gợi ý ngành ra sao.

    Dữ liệu còn ít thì các mảng trả về sẽ rỗng; giao diện phải hiển thị trạng
    thái rỗng chứ không được độn số mẫu.
    """

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

    # ── Lượt tư vấn theo ngày (tách theo chế độ khám phá vs tư vấn định hướng) ──
    theo_ngay = [
        {
            "ngay": d["_id"],
            "soLuong": d["soLuong"],
            "khamPha": d.get("khamPha", 0),
            "tuVan": d.get("tuVan", 0),
        }
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
                        "khamPha": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$mode", "explore"]},
                                    1,
                                    0,
                                ]
                            }
                        },
                        "tuVan": {
                            "$sum": {
                                "$cond": [
                                    {"$ne": ["$mode", "explore"]},
                                    1,
                                    0,
                                ]
                            }
                        },
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    ]

    # ── Ngành / nhóm ngành theo chuẩn kiến trúc 2 tầng (Khám phá: Top-5, Tư vấn: Top-2) ──
    match_2_tang = {
        "$match": {
            "$or": [
                {"mode": "explore", "majors.rank": {"$lte": 5}},
                {"mode": {"$ne": "explore"}, "majors.rank": {"$lte": 2}},
            ]
        }
    }

    top_nganh = [
        {
            "ten": d["_id"],
            "soLuong": d["soLuong"],
            "khamPha": d.get("khamPha", 0),
            "tuVan": d.get("tuVan", 0),
        }
        async for d in db["prediction_history"].aggregate(
            [
                {"$unwind": "$majors"},
                match_2_tang,
                {
                    "$group": {
                        "_id": "$majors.name",
                        "soLuong": {"$sum": 1},
                        "khamPha": {
                            "$sum": {
                                "$cond": [{"$eq": ["$mode", "explore"]}, 1, 0]
                            }
                        },
                        "tuVan": {
                            "$sum": {
                                "$cond": [{"$ne": ["$mode", "explore"]}, 1, 0]
                            }
                        },
                    }
                },
                {"$sort": {"soLuong": -1}},
                {"$limit": 15},
            ]
        )
    ]
    theo_nhom = [
        {"ten": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$unwind": "$majors"},
                match_2_tang,
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
        mode_val = d.get("mode")
        majors_raw = d.get("majors") or []
        gioi_han_k = 5 if mode_val == "explore" else 2
        danh_sach_nganh = [
            {
                "name": m.get("name"),
                "field": m.get("field"),
                "rank": m.get("rank"),
                "code": m.get("code"),
            }
            for m in majors_raw[:gioi_han_k]
        ]
        dau = majors_raw[0] if majors_raw else {}
        vao = d.get("input") or {}
        diem = vao.get("scores")
        hoat_dong.append(
            {
                "thoiGian": d["createdAt"].isoformat()
                if isinstance(d.get("createdAt"), datetime)
                else None,
                "cheDo": mode_val,
                "toHop": vao.get("subjectGroup"),
                "tongDiem": round(sum(diem), 2) if diem else None,
                "nganh": dau.get("name"),
                "nhom": dau.get("field"),
                "danhSachNganh": danh_sach_nganh,
            }
        )

    # ── Đánh giá người dùng & Phản hồi trúng tuyển ───────────────────────────
    danh_gia_sao = [
        {"sao": d["_id"], "soLuong": d["soLuong"]}
        async for d in db["danh_gia_app"].aggregate(
            [
                {"$group": {"_id": "$sao", "soLuong": {"$sum": 1}}},
                {"$sort": {"_id": -1}},
            ]
        )
    ]
    tong_danh_gia = await db["danh_gia_app"].count_documents({})
    tb_sao = 0.0
    if tong_danh_gia > 0:
        agg_sao = await db["danh_gia_app"].aggregate(
            [{"$group": {"_id": None, "tb": {"$avg": "$sao"}}}]
        ).to_list(1)
        if agg_sao and agg_sao[0].get("tb") is not None:
            tb_sao = round(agg_sao[0]["tb"], 1)

    phan_hoi_huu_ich = [
        {"nhan": d["_id"] or "Chưa phản hồi", "soLuong": d["soLuong"]}
        async for d in db["prediction_history"].aggregate(
            [
                {"$match": {"phan_hoi.goiYHuuIch": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$phan_hoi.goiYHuuIch", "soLuong": {"$sum": 1}}},
                {"$sort": {"soLuong": -1}},
            ]
        )
    ]

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
        "danhGia": {
            "trungBinhSao": tb_sao,
            "tongDanhGia": tong_danh_gia,
            "phanBoSao": danh_gia_sao,
            "phanHoiHuuIch": phan_hoi_huu_ich,
        },
    }
