"""Kho tri thức RAG — API cho trang quản trị.

VÌ SAO PHẢI TỰ LÀM API NÀY: Chroma đang chạy **nhúng trong tiến trình** backend
(`EphemeralClient`) — nó không phải một server, không mở cổng, nên **không có
giao diện web nào để vào xem**. Ba lựa chọn và lý do loại hai cái đầu:

    Chroma Cloud      dịch vụ trả phí, dữ liệu tuyển sinh của trường đi ra ngoài
    `chroma run`      thêm một tiến trình + ~150 MB RAM; backend đã ~390 MB, mà
                      gói Render free chỉ có 512 MB
    tự làm API này    dùng lại đúng Chroma đang chạy, tốn 0 MB thêm     ← chọn

Các endpoint, tất cả chỉ dành cho admin:

    GET  /thong-tin      kho có gì: bao nhiêu chunk, model nào, dựng lúc nào
    GET  /tai-lieu       kiểm kê nguồn: file nào đã nạp, chưa nạp, bị bỏ qua và vì sao
    GET  /chunks         duyệt từng chunk, tìm theo chữ, lọc theo loại
    POST /thu-truy-xuat  gõ một câu hỏi, xem HỆ THỐNG LẤY VỀ ĐOẠN NÀO và vì sao
    POST /do-truy-hoi    chạy nền bộ câu hỏi gán nhãn tay, đo Hit@k / MRR kèm đối chứng
    GET  /do-truy-hoi    tiến độ lượt đang chạy + kết quả các lượt trước
    POST /nap-lai        nạp lại index từ artifact trên đĩa

`/thu-truy-xuat` là cái đáng giá nhất. Nó phơi ra toàn bộ quyết định truy hồi:
khoảng cách từng đoạn, đoạn nào bị ngưỡng lạc đề chặn, đoạn nào rớt vì xa hơn biên
độ, và khối ngữ cảnh cuối cùng gửi cho model. Khi bot trả lời sai, đây là chỗ để
biết sai vì truy hồi hay sai vì sinh — mà không cần đọc log.
"""

# pyrefly: ignore [missing-import]
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import require_admin
from app.core.mongodb import get_db
from app.services.rag import tai_lieu as tai_lieu_mod
from app.services.rag.danh_gia import do_truy_hoi
from app.services.rag.kho import TOP_K, lay_kho
from app.services.rag.kiem_ke import kiem_ke
from app.services.rag.nguon_co_cau_truc import lay_nguon
from app.services.rag.tro_ly import BIEN_DO, NGUONG_LAC_DE, ghep_lich_su, lay_ngu_canh

log = logging.getLogger(__name__)
# Mọi endpoint dưới đây đòi quyền admin — gác ở cấp router để không thể quên
# một route mới. Handler nào cần uid thì vẫn khai Depends(require_admin).
router = APIRouter(dependencies=[Depends(require_admin)])

# Trạng thái lượt đo đang chạy. Giữ trong tiến trình là đủ: Dockerfile chạy một worker
# (WEB_CONCURRENCY mặc định 1). Kết quả thì ghi MongoDB để còn sau khi khởi động lại.
_DO = {"dang_chay": False, "xong": 0, "tong": 0, "bat_dau": None, "loi": None}
_TAC_VU: set[asyncio.Task] = set()  # giữ tham chiếu, không thì task bị dọn giữa chừng
_KET_QUA_BO_NHO: list[dict] = []    # dự phòng khi thiếu MONGO_URI


class ThuTruyXuatRequest(BaseModel):
    cau_hoi: str
    k: int = TOP_K
    # Cho phép thử đúng kịch bản đa lượt: người dùng hỏi một ngành rồi lượt sau
    # chỉ gõ "2026". Không có trường này thì trang quản trị không tái hiện được
    # loại lỗi đó.
    lich_su: list[dict] = []


# ==================== Endpoints ====================


@router.get("/thong-tin", summary="Kho vector đang có gì")
async def thong_tin():
    kho = lay_kho()
    tb = lay_nguon()

    loai: dict[str, int] = {}
    if kho.san_sang:
        ds, _ = kho.liet_ke(lay=100000)
        for c in ds:
            k = c["meta"].get("loai", "khong_ro")
            loai[k] = loai.get(k, 0) + 1

    return {
        "san_sang": kho.san_sang,
        **kho.thong_tin,
        "theo_loai": loai,
        "nguon_co_cau_truc": {"so_nganh": len(tb.nganh), "so_nhom": len(tb.ten_nhom),
                              "nguon": tb.nguon},
        "nguong": {"lac_de": NGUONG_LAC_DE, "bien_do": BIEN_DO, "top_k": TOP_K},
        # Hằng số chia chunk đọc thẳng từ code, để trang quản trị không gõ lại số
        "chunking": {"tu_toi_da": tai_lieu_mod.TU_TOI_DA,
                     "tu_toi_thieu": tai_lieu_mod.TU_TOI_THIEU,
                     "tu_chong_lan": tai_lieu_mod.TU_CHONG_LAN},
    }


@router.get(
    "/tai-lieu",
    summary="Kiểm kê nguồn: đã nạp, chưa nạp, bị bỏ qua",
)
async def tai_lieu():
    """So từng file nguồn với artifact bằng băm chunk — không nhúng, không gọi API.

    Bắt được hai lỗi âm thầm: sửa `.md` mà chưa chạy `nap_kho.py` (bot trả lời bằng
    nội dung cũ), và file bị bỏ qua vì thiếu `nam`/`nguon` hoặc sai thư mục loại.
    """
    return await asyncio.to_thread(kiem_ke)


@router.get(
    "/chunks",
    summary="Duyệt các đoạn trong kho",
)
async def danh_sach_chunk(
    tim: str = "",
    loai: str = "",
    trang: int = 1,
    moi_trang: int = 20
):
    kho = lay_kho()
    if not kho.san_sang:
        raise HTTPException(503, "Kho vector chưa dựng. Chạy `python scripts/nap_kho.py`.")

    moi_trang = max(1, min(moi_trang, 100))
    trang = max(1, trang)
    ds, tong = kho.liet_ke(tim, loai, (trang - 1) * moi_trang, moi_trang)
    return {"tong": tong, "trang": trang, "moi_trang": moi_trang, "chunk": ds}


@router.post(
    "/thu-truy-xuat",
    summary="Thử một câu hỏi, xem lấy về đoạn nào",
)
async def thu_truy_xuat(body: ThuTruyXuatRequest):
    kho = lay_kho()
    if not kho.san_sang:
        raise HTTPException(503, "Kho vector chưa dựng. Chạy `python scripts/nap_kho.py`.")

    cau = body.cau_hoi.strip()
    if not cau:
        raise HTTPException(400, "Thiếu câu hỏi.")

    k = max(1, min(body.k, 20))
    truy_van = ghep_lich_su(cau, body.lich_su)
    lay_ve = kho.truy_xuat(truy_van, k)

    # Trả về CẢ đoạn bị loại, kèm lý do loại. Chỉ trả về đoạn được chọn thì
    # không ai biết đoạn thứ 4 rớt vì cả câu lạc đề hay vì riêng nó quá xa.
    gan_nhat = lay_ve[0]["khoang_cach"] if lay_ve else None
    lac_de = gan_nhat is not None and gan_nhat > NGUONG_LAC_DE
    tran = None if gan_nhat is None else gan_nhat + BIEN_DO

    nc = lay_ngu_canh(cau, k, lay_ve=lay_ve, lich_su=body.lich_su)
    da_chon = {d["noi_dung"] for d in nc.doan}

    thoo = []
    for d in lay_ve:
        vao = d["noi_dung"] in da_chon
        if vao:
            ly_do = "được chọn"
        elif lac_de:
            ly_do = f"cả câu bị coi là lạc đề (gần nhất {gan_nhat:.3f} > {NGUONG_LAC_DE})"
        else:
            ly_do = f"xa hơn biên độ (> {tran:.3f})"
        thoo.append({
            "noi_dung": d["noi_dung"],
            "meta": d["meta"],
            "khoang_cach": round(d["khoang_cach"], 4),
            "vao_ngu_canh": vao,
            "ly_do": ly_do,
        })

    return {
        "cau_hoi": cau,
        "truy_van_thuc_te": truy_van,
        "co_ghep_lich_su": truy_van != cau,
        "lac_de": lac_de,
        "so_doan_vao_ngu_canh": len(nc.doan),
        "truy_xuat": thoo,
        "nguon": nc.nguon(),
        "ngu_canh_gui_cho_model": nc.van_ban(),
    }


async def _chay_do_truy_hoi(k: int):
    def tien_do(i, n, _c):
        _DO["xong"], _DO["tong"] = i, n

    # Chạy NGOÀI vòng đời request nên không nhận được `Depends(get_database)`; lấy
    # thẳng handle và tự xử lý trường hợp chưa có Mongo (giữ kết quả trong bộ nhớ).
    db = get_db()
    try:
        kq = await asyncio.to_thread(do_truy_hoi, None, k, 0.35, tien_do)
        if db is not None:
            await db["rag_danh_gia"].insert_one({**kq, "createdAt": datetime.now(timezone.utc)})
        else:
            _KET_QUA_BO_NHO.insert(0, kq)
            del _KET_QUA_BO_NHO[10:]
        log.info("Đo truy hồi xong · Hit@1 %.3f", kq["tong"].get("hit1", 0))
    except Exception as e:  # noqa: BLE001 — lỗi phải hiện lên trang, không được mất
        log.exception("Đo truy hồi lỗi")
        _DO["loi"] = f"{type(e).__name__}: {e}"
    finally:
        _DO["dang_chay"] = False


@router.post(
    "/do-truy-hoi",
    summary="Chạy nền bộ đo tầng truy hồi",
)
async def bat_dau_do_truy_hoi(k: int = TOP_K):
    """Mỗi câu hỏi tốn một lượt nhúng (có nhớ đệm), nên chạy nền và chỉ cho một lượt
    một lúc — bấm hai lần liền trên gói free của Gemini là dễ chạm trần tần suất."""
    if _DO["dang_chay"]:
        raise HTTPException(409, "Đang có một lượt đo chạy — đợi xong rồi chạy lại.")
    if not lay_kho().san_sang:
        raise HTTPException(503, "Kho vector chưa dựng. Chạy `python scripts/nap_kho.py`.")

    k = max(1, min(k, 10))
    _DO.update(dang_chay=True, xong=0, tong=0, loi=None,
               bat_dau=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    t = asyncio.create_task(_chay_do_truy_hoi(k))
    _TAC_VU.add(t)
    t.add_done_callback(_TAC_VU.discard)
    return {"bat_dau": _DO["bat_dau"], "k": k}


@router.get(
    "/do-truy-hoi",
    summary="Tiến độ và kết quả đo tầng truy hồi",
)
async def ket_qua_do_truy_hoi():
    # Mongo ở đây là TUỲ CHỌN — chưa có thì đọc kết quả giữ tạm trong bộ nhớ tiến
    # trình. Vì vậy dùng thẳng `get_db()` chứ không `Depends(get_database)`: cái đó
    # ném 503 ngay khi chạm tới, làm mất đường lùi này.
    db = get_db()
    if db is not None:
        ds = [
            {k: v for k, v in d.items() if k != "_id"}
            async for d in db["rag_danh_gia"].find().sort("createdAt", -1).limit(10)
        ]
    else:
        ds = list(_KET_QUA_BO_NHO)
    for d in ds:
        if "createdAt" in d and hasattr(d["createdAt"], "isoformat"):
            d["createdAt"] = d["createdAt"].isoformat()
    return {
        "dang_chay": dict(_DO),
        "gan_nhat": ds[0] if ds else None,
        # Lịch sử chỉ trả phần tổng để so các lần đo với nhau, không kéo cả danh sách câu
        "lich_su": [
            {"tao_luc": d.get("tao_luc"), "k": d.get("k"), "so_cau": d.get("so_cau"),
             "so_chunk": (d.get("kho") or {}).get("so_chunk"), "tong": d.get("tong"),
             "so_loi_nhung": d.get("so_loi_nhung")}
            for d in ds
        ],
    }


@router.post(
    "/nap-lai",
    summary="Nạp lại index từ artifact trên đĩa",
)
async def nap_lai():
    """Nạp lại từ `data/kho_vector/kho.json`. KHÔNG nhúng lại gì cả.

    Sinh artifact là việc của `scripts/nap_kho.py` chạy ngoài, cố ý không cho bấm
    từ web: nhúng vài trăm chunk là một loạt lệnh gọi Gemini, bấm nhầm hai lần
    trên gói free là bị chặn tần suất và kho đang phục vụ thì hỏng giữa chừng.
    """
    kho = lay_kho()
    kho._col = None  # buộc dựng lại từ đầu thay vì cộng dồn lên index cũ
    if not kho.nap():
        raise HTTPException(503, "Không nạp được — thiếu hoặc rỗng data/kho_vector/kho.json")
    return {"thanh_cong": True, **kho.thong_tin}
