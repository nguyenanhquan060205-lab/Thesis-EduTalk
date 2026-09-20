"""Kiểm kê kho tri thức — nguồn nào đã vào kho, nguồn nào chưa, nguồn nào bị bỏ qua và vì sao.

Phục vụ trang quản trị. KHÔNG nhúng gì, KHÔNG gọi API: chỉ đọc file nguồn, chia chunk
đúng như lúc nạp rồi so BĂM từng chunk với artifact `data/kho_vector/kho.json`.

Vì sao cần: sửa một file `.md` mà quên chạy `scripts/nap_kho.py` thì chatbot vẫn trả
lời bằng nội dung cũ — không có lỗi nào báo. Tương tự, file thiếu `nam`/`nguon` hoặc
đặt sai thư mục bị `tai_lieu.doc_tat_ca()` bỏ qua và chỉ ghi một dòng log. Trang quản
trị phải thấy được cả hai tình huống đó bằng mắt.
"""

import hashlib
import json
from datetime import datetime

from app.services.rag import tai_lieu
from app.services.rag.kho import F_KHO, lay_kho
from app.services.rag.nguon_co_cau_truc import lay_nguon


def _bam(s: str) -> str:
    """Cùng công thức với `tai_lieu.doc_tat_ca()` và `scripts/nap_kho.py`."""
    return hashlib.sha256(" ".join(s.split()).encode()).hexdigest()[:16]


def _trang_thai(so_chunk: int, da_nap: int) -> str:
    if so_chunk == 0:
        return "rong"
    if da_nap == so_chunk:
        return "da_nap"
    return "chua_nap" if da_nap == 0 else "co_thay_doi"


def kiem_ke() -> dict:
    # ── Artifact trên đĩa và index đang chạy ─────────────────────────────────
    bam_kho: set[str] = set()
    theo_loai_kho: dict[str, int] = {}
    artifact = None
    if F_KHO.exists():
        d = json.loads(F_KHO.read_text(encoding="utf-8"))
        for c in d.get("chunk", []):
            bam_kho.add(c["meta"].get("bam"))
            loai = c["meta"].get("loai", "khong_ro")
            theo_loai_kho[loai] = theo_loai_kho.get(loai, 0) + 1
        artifact = {
            "so_chunk": d.get("so_chunk", len(d.get("chunk", []))),
            "tao_luc": d.get("tao_luc"),
            "model_nhung": d.get("model_nhung"),
            "so_chieu": d.get("so_chieu"),
            "dung_luong_kb": round(F_KHO.stat().st_size / 1024),
            "sua_luc": datetime.fromtimestamp(F_KHO.stat().st_mtime).isoformat(
                timespec="seconds"
            ),
        }

    kho = lay_kho()
    index = {"san_sang": kho.san_sang, **kho.thong_tin}
    # Artifact dựng lại sau khi backend đã nạp index → đang phục vụ bản cũ
    lech_index = bool(
        artifact and kho.san_sang and artifact["tao_luc"] != kho.thong_tin.get("tao_luc")
    )

    # ── Nguồn có cấu trúc: JSON tuyển sinh → văn xuôi sinh tự động ─────────────
    tb = lay_nguon()
    ds_ct = list(tb.tat_ca_mo_ta())
    da_nap_ct = sum(_bam(c) in bam_kho for _, c, _ in ds_ct)
    co_cau_truc = {
        "nguon": tb.nguon,
        "so_nganh": len(tb.nganh),
        "so_chunk": len(ds_ct),
        "da_nap": da_nap_ct,
        "trang_thai": _trang_thai(len(ds_ct), da_nap_ct),
    }

    # ── Tài liệu văn xuôi `.md` — đi đúng thứ tự và luật của doc_tat_ca() ─────
    tep: list[dict] = []
    da_thay: set[str] = set()
    so_tep_theo_loai: dict[str, int] = {}
    thu_muc = tai_lieu.THU_MUC
    if thu_muc.exists():
        for f in sorted(thu_muc.rglob("*.md")):
            if f.name.startswith("_") or f.name.lower() == "readme.md":
                continue
            tuong_doi = f.relative_to(thu_muc)
            loai = tuong_doi.parts[0] if len(tuong_doi.parts) > 1 else ""
            muc = {
                "tep": str(tuong_doi),
                "loai": loai,
                "sua_luc": datetime.fromtimestamp(f.stat().st_mtime).isoformat(
                    timespec="seconds"
                ),
            }
            if loai not in tai_lieu.LOAI_HOP_LE:
                tep.append({**muc, "trang_thai": "bi_bo_qua",
                            "ly_do": "Không nằm trong thư mục loại hợp lệ"})
                continue

            meta, than = tai_lieu.tach_dau_file(f.read_text(encoding="utf-8"))
            thieu = [t for t in tai_lieu.TRUONG_BAT_BUOC if t not in meta]
            muc["meta"] = {k: meta.get(k) for k in ("nam", "nguon", "link", "ngay_lay", "nganh")}
            if thieu:
                tep.append({**muc, "trang_thai": "bi_bo_qua",
                            "ly_do": "Thiếu trường bắt buộc: " + ", ".join(thieu)})
                continue

            so_tep_theo_loai[loai] = so_tep_theo_loai.get(loai, 0) + 1
            chunks = tai_lieu.chia_chunk(than)
            so_chunk = da_nap = trung = so_tu = 0
            for c, _ in chunks:
                b = _bam(c)
                if b in da_thay:
                    trung += 1  # doc_tat_ca() cũng bỏ chunk trùng — không tính là "chưa nạp"
                    continue
                da_thay.add(b)
                so_chunk += 1
                so_tu += len(c.split())
                da_nap += b in bam_kho
            tep.append({
                **muc,
                "so_chunk": so_chunk,
                "da_nap": da_nap,
                "chunk_trung": trung,
                "so_tu": so_tu,
                "trang_thai": _trang_thai(so_chunk, da_nap),
            })

    theo_loai = [
        {
            "loai": k,
            "mo_ta": v,
            "so_tep": so_tep_theo_loai.get(k, 0),
            "so_chunk_trong_kho": theo_loai_kho.get(k, 0),
        }
        for k, v in tai_lieu.LOAI_HOP_LE.items()
    ]

    can_nap_lai = any(t["trang_thai"] in ("chua_nap", "co_thay_doi") for t in tep) or (
        co_cau_truc["trang_thai"] in ("chua_nap", "co_thay_doi")
    )
    return {
        "artifact": artifact,
        "index": index,
        "lech_index": lech_index,
        "can_nap_lai": can_nap_lai,
        "co_cau_truc": co_cau_truc,
        "tai_lieu": tep,
        "theo_loai": theo_loai,
        "truong_bat_buoc": list(tai_lieu.TRUONG_BAT_BUOC),
    }
