"""Phiên bản mô hình — lưu trong MongoDB GridFS, không lưu đĩa.

Vì sao không ghi file cạnh gói: Render xoá đĩa sau mỗi lần deploy hoặc khởi động lại.
Mô hình huấn luyện lại mà nằm trên đĩa thì sáng hôm sau đã quay về bản cũ, không lỗi nào
báo. MongoDB thì còn nguyên.

    "goc"            mô hình trong gói backend/data/mo_hinh/huong1 — luôn có, không nằm
                     trong MongoDB, là đường lùi cuối cùng
    "v20260917-1530" phiên bản huấn luyện lại, 10 file mô hình trong GridFS bucket "mo_hinh"

Trạng thái một phiên bản:

    dang_phuc_vu   đúng MỘT bản (hoặc không bản nào → đang dùng "goc")
    cho_duyet      qua cổng kiểm định nhưng cấu hình không cho tự đưa vào phục vụ
    luu_tru        từng phục vụ hoặc từng chờ duyệt, bấm "Đưa vào phục vụ" để quay lại
    tu_choi        trượt cổng kiểm định — giữ lại để xem, không cho đưa vào phục vụ

`EDUTALK_PHIEN_BAN=goc` ép dùng bản trong gói bất kể MongoDB nói gì — script kiểm tính khớp
với notebook cần đúng điều đó.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from app.core.mongodb import get_db_dong_bo

log = logging.getLogger(__name__)

GOC = "goc"
BUCKET = "mo_hinh"
COL = "mo_hinh_phien_ban"


def thu_muc_goi() -> Path:
    from app.services.major_predictor import thu_muc_mo_hinh

    return thu_muc_mo_hinh("h1")


def meta_goi() -> dict:
    return json.loads((thu_muc_goi() / "mo_hinh.json").read_text(encoding="utf-8"))


def ma_dang_phuc_vu() -> str:
    """Mã phiên bản đang phục vụ. Mọi lỗi (thiếu URI, mạng) → "goc", có ghi log."""
    ep = os.getenv("EDUTALK_PHIEN_BAN")
    if ep:
        return ep
    db = get_db_dong_bo()
    if db is None:
        return GOC
    try:
        doc = db[COL].find_one({"trang_thai": "dang_phuc_vu"}, {"ma": 1})
    except Exception as e:  # noqa: BLE001
        log.warning("Không đọc được phiên bản đang phục vụ (%s) — dùng mô hình gốc", type(e).__name__)
        return GOC
    return doc["ma"] if doc else GOC


def tao_ma() -> str:
    return datetime.now(timezone.utc).strftime("v%Y%m%d-%H%M%S")


def luu_phien_ban(ma: str, thu_muc: Path, tep: list[str], thong_tin: dict) -> dict:
    """Đẩy file mô hình lên GridFS rồi ghi bản ghi phiên bản. Trả về bản ghi."""
    import gridfs

    db = get_db_dong_bo()
    if db is None:
        raise RuntimeError("Thiếu MONGO_URI — không có nơi lưu phiên bản mô hình.")
    fs = gridfs.GridFSBucket(db, bucket_name=BUCKET)
    ids, sha = {}, {}
    for f in tep:
        du_lieu = (thu_muc / f).read_bytes()
        sha[f] = hashlib.sha256(du_lieu).hexdigest()
        ids[f] = fs.upload_from_stream(f"{ma}/{f}", du_lieu, metadata={"ma": ma})
    doc = {"ma": ma, "tao_luc": datetime.now(timezone.utc), "tep": ids, "sha256": sha, **thong_tin}
    db[COL].insert_one(doc)
    return doc


def thu_muc_phien_ban(ma: str) -> Path:
    """Tải phiên bản về thư mục tạm (có đệm) và dựng mo_hinh.json để MajorPredictorH1 nạp.

    Kiểm SHA-256 từng file lúc tải. `mo_hinh.json` lấy lược đồ đặc trưng từ gói gốc — đặc
    trưng và bộ số chuẩn hoá điểm KHÔNG đổi khi huấn luyện lại, chỉ có trọng số cây đổi.
    """
    if ma == GOC:
        return thu_muc_goi()
    dich = Path(tempfile.gettempdir()) / "edutalk_mo_hinh" / ma
    if (dich / "mo_hinh.json").exists():
        return dich

    import gridfs

    db = get_db_dong_bo()
    if db is None:
        raise RuntimeError("Thiếu MONGO_URI — không tải được phiên bản mô hình.")
    doc = db[COL].find_one({"ma": ma})
    if not doc:
        raise FileNotFoundError(f"Không có phiên bản {ma}")

    fs = gridfs.GridFSBucket(db, bucket_name=BUCKET)
    tam = dich.with_name(dich.name + ".dang_tai")
    shutil.rmtree(tam, ignore_errors=True)
    tam.mkdir(parents=True)
    for f, fid in doc["tep"].items():
        du_lieu = fs.open_download_stream(fid).read()
        if hashlib.sha256(du_lieu).hexdigest() != doc["sha256"][f]:
            shutil.rmtree(tam, ignore_errors=True)
            raise RuntimeError(f"{ma}/{f} tải về sai mã băm")
        (tam / f).write_bytes(du_lieu)

    meta = meta_goi()
    meta.update(
        ten=f"Hướng 1 — huấn luyện lại {ma}",
        phien_ban=ma,
        ngay_chot=doc["tao_luc"].strftime("%Y-%m-%d %H:%M"),
        sha256=doc["sha256"],
    )
    (tam / "mo_hinh.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    shutil.rmtree(dich, ignore_errors=True)
    tam.rename(dich)  # đổi tên nguyên khối — không có lúc nào thư mục đích dở dang
    return dich


def dat_phuc_vu(ma: str, nguoi: str | None) -> None:
    """Đưa một phiên bản vào phục vụ (hoặc "goc" để quay về mô hình trong gói)."""
    db = get_db_dong_bo()
    if db is None:
        raise RuntimeError("Thiếu MONGO_URI.")
    bay_gio = datetime.now(timezone.utc)
    if ma != GOC:
        doc = db[COL].find_one({"ma": ma}, {"trang_thai": 1})
        if not doc:
            raise FileNotFoundError(f"Không có phiên bản {ma}")
        if doc["trang_thai"] == "tu_choi":
            raise ValueError("Phiên bản này trượt cổng kiểm định — không được đưa vào phục vụ.")
        thu_muc_phien_ban(ma)  # tải và kiểm băm TRƯỚC khi đổi trạng thái
    db[COL].update_many(
        {"trang_thai": "dang_phuc_vu", "ma": {"$ne": ma}},
        {"$set": {"trang_thai": "luu_tru", "ngung_phuc_vu_luc": bay_gio}},
    )
    if ma != GOC:
        db[COL].update_one(
            {"ma": ma},
            {"$set": {"trang_thai": "dang_phuc_vu", "phuc_vu_luc": bay_gio, "phuc_vu_boi": nguoi}},
        )


def danh_sach(gioi_han: int = 30) -> list[dict]:
    db = get_db_dong_bo()
    if db is None:
        return []
    ra = []
    for d in db[COL].find({}, {"tep": 0}).sort("tao_luc", -1).limit(gioi_han):
        d.pop("_id", None)
        ra.append(d)
    return ra
