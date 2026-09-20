"""Dựng artifact kho vector: nguồn gốc → chunk → nhúng → `data/kho_vector/kho.json`.

    conda activate Edutalk
    cd backend
    python scripts/nap_kho.py            # chỉ nhúng lại phần đã đổi
    python scripts/nap_kho.py --lam-lai  # nhúng lại tất cả

Chạy khi nào: sửa/thêm file `.md` trong `data/kho_tri_thuc/`, hoặc cập nhật
`tuyen_sinh_huit_2026.json`. Không cần chạy lúc deploy — artifact đi theo git.

Nhúng lại theo BĂM NỘI DUNG: chunk nào không đổi thì dùng lại vector cũ. Sửa một
lỗi chính tả trong một file không kéo theo nhúng lại cả kho.
"""

import argparse
import hashlib
import json
import pathlib
import sys
import time
from datetime import datetime

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(GOC / ".env")

from app.services.rag import tai_lieu  # noqa: E402
from app.services.rag.nhung import MODEL_NHUNG, SO_CHIEU, nhung_tai_lieu  # noqa: E402
from app.services.rag.nguon_co_cau_truc import lay_nguon  # noqa: E402

F_RA = GOC / "data" / "kho_vector" / "kho.json"

# Vector 768 chiều ghi đủ 17 chữ số thì file phồng vô ích. 6 chữ số sau dấu phẩy
# là quá thừa cho cosine — sai số ~1e-6 không đổi được thứ hạng của bất kỳ đoạn nào.
LAM_TRON = 6


def bam(s: str) -> str:
    return hashlib.sha256(" ".join(s.split()).encode()).hexdigest()[:16]


def thu_thap() -> list[tuple[str, str, dict]]:
    """Gom mọi nguồn thành (id, nội dung, metadata).

    Hai nguồn đi vào Chroma:

    1. **39 ngành** sinh từ JSON có cấu trúc — KHÔNG qua bước làm sạch văn bản.
       Ép dữ liệu đã sạch qua bộ làm sạch văn bản thô là đi lùi: mất cấu trúc,
       dễ sinh lỗi. Chỉ PDF và HTML mới cần bước đó.
    2. **File `.md` văn xuôi** trong `data/kho_tri_thuc/`.

    Cả hai đều đi vào cùng một collection Chroma và được truy vấn y như nhau —
    không có đường tra cứu riêng nào cho dữ liệu điểm chuẩn.
    """
    ds = list(lay_nguon().tat_ca_mo_ta())
    print(f"  · {len(ds):3d} chunk từ tuyen_sinh_huit_2026.json (39 ngành)")

    md = tai_lieu.doc_tat_ca()
    print(f"  · {len(md):3d} chunk từ {tai_lieu.THU_MUC.name}/*.md")
    if not md:
        print("      (chưa có tài liệu văn xuôi nào — xem data/kho_tri_thuc/README.md)")
    return ds + md


def kem_ban_sao():
    """Đồng bộ bản ánh xạ nhóm ngành từ `research/` (Hướng 1 — mô hình đang phục vụ) sang
    `backend/data/co_cau_truc/`. Nội dung trùng khít bản của research3 (cùng 9 nhóm ngành).

    `docker-compose.yml` khai `context: ./backend`, nên image chỉ chứa thư mục
    `backend/`. Không có bản sao này thì trong container kho dựng ra thiếu tên nhóm
    ngành — mà chatbot vẫn chạy, vẫn trả lời. Đúng kiểu hỏng âm thầm cần chặn.

    `tuyen_sinh_huit_2026.json` KHÔNG còn trong danh sách này: thư mục `research/`
    đã bị xoá, và `backend/data/co_cau_truc/` giờ là nhà chính thức của nó. Nó là
    dữ liệu tuyển sinh của trường, không phải kết quả của pipeline nào — sửa thẳng
    tại chỗ, không cần chép từ đâu sang.
    """
    cap = [
        (GOC.parent / "research" / "data" / "processed" / "01_LamSachKhaoSat"
         / "mapping.json",
         GOC / "data" / "co_cau_truc" / "mapping_nhom_nganh.json"),
    ]
    for goc, sao in cap:
        if not goc.exists():
            print(f"  · ⚠️  không thấy {goc.name} ở nguồn gốc, giữ bản sao cũ")
            continue
        moi = goc.read_bytes()
        if sao.exists() and sao.read_bytes() == moi:
            print(f"  · {sao.name} đã khớp bản gốc")
            continue
        sao.parent.mkdir(parents=True, exist_ok=True)
        sao.write_bytes(moi)
        print(f"  · cập nhật {sao.name} ({len(moi) / 1024:.0f} KB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lam-lai", action="store_true", help="nhúng lại toàn bộ")
    args = ap.parse_args()

    print("═" * 72)
    print("  DỰNG KHO VECTOR")
    print("═" * 72)

    print("\n⓪ Kèm bản sao nguồn vào backend/data (để image Docker có đủ)")
    kem_ban_sao()

    print("\n① ② Thu thập nguồn")
    ds = thu_thap()
    if not ds:
        sys.exit("Không có nguồn nào để nạp.")

    print("\n③ Chia chunk")
    dai = [len(c.split()) for _, c, _ in ds]
    print(f"  · {len(ds)} chunk · ngắn nhất {min(dai)} từ · dài nhất {max(dai)} từ")

    # ── Dùng lại vector cũ cho chunk không đổi ──────────────────────────
    cu: dict[str, list[float]] = {}
    if F_RA.exists() and not args.lam_lai:
        d = json.loads(F_RA.read_text(encoding="utf-8"))
        if d.get("model_nhung") == MODEL_NHUNG and d.get("so_chieu") == SO_CHIEU:
            cu = {c["meta"]["bam"]: c["vector"] for c in d["chunk"]}
            print(f"  · artifact cũ có {len(cu)} vector dùng lại được")
        else:
            # Đổi model hoặc đổi số chiều thì vector cũ nằm ở KHÔNG GIAN KHÁC.
            # Trộn chung sẽ cho khoảng cách vô nghĩa mà không có lỗi nào báo.
            print("  · artifact cũ dùng model/số chiều khác — nhúng lại toàn bộ")

    can_nhung = [(i, c) for i, (_, c, _) in enumerate(ds) if bam(c) not in cu]
    print(f"\n④ Nhúng bằng {MODEL_NHUNG} ({SO_CHIEU} chiều)")
    print(f"  · {len(can_nhung)} chunk cần nhúng · {len(ds) - len(can_nhung)} dùng lại")

    vec: dict[int, list[float]] = {}
    if can_nhung:
        t = time.time()
        kq = nhung_tai_lieu([c for _, c in can_nhung])
        vec = {i: v for (i, _), v in zip(can_nhung, kq, strict=True)}
        print(f"  · xong sau {time.time() - t:.1f}s")

    print("\n⑤ Ghi artifact")
    chunk = []
    for i, (cid, noi_dung, meta) in enumerate(ds):
        b = bam(noi_dung)
        v = vec.get(i) or cu[b]
        chunk.append({
            "id": cid,
            "noi_dung": noi_dung,
            "meta": {**meta, "bam": b},
            "vector": [round(x, LAM_TRON) for x in v],
        })

    F_RA.parent.mkdir(parents=True, exist_ok=True)
    F_RA.write_text(
        json.dumps(
            {
                "model_nhung": MODEL_NHUNG,
                "so_chieu": SO_CHIEU,
                "tao_luc": datetime.now().isoformat(timespec="seconds"),
                "so_chunk": len(chunk),
                "chunk": chunk,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    mb = F_RA.stat().st_size / 1024 / 1024
    print(f"  · {F_RA.relative_to(GOC)} · {len(chunk)} chunk · {mb:.2f} MB")
    print("\nXong. Khởi động lại backend để nạp kho mới.")


if __name__ == "__main__":
    main()
