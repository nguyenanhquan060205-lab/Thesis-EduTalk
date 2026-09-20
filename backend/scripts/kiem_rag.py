"""Đo RAG có tác dụng thật không — chạy cùng bộ câu hỏi hai lần, BẬT và TẮT.

    conda activate Edutalk
    cd backend
    python scripts/kiem_rag.py                 # 20 câu, cả hai chế độ
    python scripts/kiem_rag.py --so-cau 40
    python scripts/kiem_rag.py --che-do rag    # chỉ chạy một chế độ

Đây là cột "đoán bừa" của phần RAG. Cả dự án đã theo luật *mọi bảng chỉ số phải
có cột đối chứng*; thiếu mốc TẮT-RAG thì con số "95% đúng" chẳng nói lên điều gì,
vì biết đâu model tự trả lời đúng 95% mà không cần kho nào cả.

Đáp án lấy THẲNG từ `tuyen_sinh_huit_2026.json`, không ai chấm tay, nên chạy lại
lúc nào cũng ra cùng cách chấm.
"""

import argparse
import asyncio
import pathlib
import random
import re
import sys
import time

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(GOC / ".env")

from app.services.gemini_service import GeminiService  # noqa: E402
from app.services.rag.nguon_co_cau_truc import lay_nguon  # noqa: E402

NAM = "2026"


def dung_bo_cau_hoi(so_cau: int, seed: int = 42) -> list[dict]:
    """Sinh câu hỏi kèm đáp án chuẩn từ chính file dữ liệu."""
    tb = lay_nguon()
    rng = random.Random(seed)
    ma_ds = sorted(tb.nganh)
    rng.shuffle(ma_ds)

    bo = []
    for ma in ma_ds:
        v = tb.nganh[ma]
        dc = v.get("diem_chuan_thpt", {}).get(NAM)
        if dc is not None:
            bo.append({
                "hoi": f"Điểm chuẩn ngành {v['ten']} của HUIT năm {NAM} là bao nhiêu?",
                "loai": "diem",
                "dap_an": dc,
                "nganh": v["ten"],
            })
        bo.append({
            "hoi": f"Ngành {v['ten']} của HUIT xét những tổ hợp nào?",
            "loai": "to_hop",
            "dap_an": v["to_hop"],
            "nganh": v["ten"],
        })
    rng.shuffle(bo)
    return bo[:so_cau]


SO = re.compile(r"\d+(?:[.,]\d+)?")


def cham(cau: dict, tra_loi: str) -> bool:
    """Chấm bằng máy, không chấm bằng cảm tính.

    ĐIỂM — so bằng GIÁ TRỊ SỐ, không so chuỗi. Bản đầu so chuỗi và chấm sai:
    đáp án 21.0 rút gọn thành "21", model viết "21.0", biểu thức chính quy có
    `(?![\\d.,])` nên gặp dấu chấm là loại — đánh trượt một câu trả lời đúng.
    Giờ rút mọi số trong câu trả lời rồi so số với số, nên "21", "21.0" và
    "21,0" đều được tính như nhau.

    Thêm ràng buộc phải nằm GẦN chữ "2026": câu trả lời thường liệt kê cả điểm
    2024 và 2025. Không ràng buộc thì bot nêu nhầm số của năm khác vẫn được
    chấm đúng — đúng kiểu sai â
    m thầm mà cả dự án đang tránh.

    TỔ HỢP — mọi mã trong đáp án phải có mặt. Thiếu một mã là trả lời sót, thí
    sinh mất một cửa xét tuyển.
    """
    t = tra_loi.lower()
    if cau["loai"] != "diem":
        return all(re.search(rf"\b{re.escape(m.lower())}\b", t) for m in cau["dap_an"])

    dich = float(cau["dap_an"])
    for m in SO.finditer(t):
        try:
            if abs(float(m.group().replace(",", ".")) - dich) > 1e-9:
                continue
        except ValueError:
            continue
        # Cửa sổ ±90 ký tự quanh con số phải nhắc tới năm cần hỏi
        if NAM in t[max(0, m.start() - 90) : m.end() + 90]:
            return True
    return False


async def chay(bo: list[dict], dung_rag: bool, nghi: float) -> list[dict]:
    sv = GeminiService()
    ra = []
    nhan = "BẬT RAG " if dung_rag else "TẮT RAG "
    for i, cau in enumerate(bo, 1):
        # Thử lại khi bị chặn tần suất. Lần chạy đầu có 2 câu trả về
        # [LỖI RuntimeError] rồi bị tính là SAI — làm hỏng con số báo cáo bằng
        # một lỗi mạng chứ không phải bằng chất lượng hệ thống.
        tl = ""
        for lan in range(3):
            try:
                tl = (await sv.send_message(cau["hoi"], [], dung_rag=dung_rag))["response"]
                break
            except Exception as e:  # noqa: BLE001
                tl = f"[LỖI {type(e).__name__}]"
                if lan < 2:
                    print(f"      ⚠️  {type(e).__name__}, nghỉ {5 * (lan + 1)}s rồi thử lại")
                    time.sleep(5 * (lan + 1))
        dung = cham(cau, tl)
        ra.append({**cau, "tra_loi": tl, "dung": dung})
        print(f"  {nhan} {i:3d}/{len(bo)}  {'✓' if dung else '✗'}  {cau['hoi'][:58]}")
        if nghi:
            time.sleep(nghi)
    return ra


def bang(ten: str, kq: list[dict]):
    for loai, nhan in (("diem", "Điểm chuẩn"), ("to_hop", "Tổ hợp")):
        p = [r for r in kq if r["loai"] == loai]
        if p:
            d = sum(r["dung"] for r in p)
            print(f"  {ten:10} {nhan:12} {d:3d}/{len(p):<3d}  {100 * d / len(p):5.1f}%")
    d = sum(r["dung"] for r in kq)
    print(f"  {ten:10} {'TỔNG':12} {d:3d}/{len(kq):<3d}  {100 * d / len(kq):5.1f}%")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so-cau", type=int, default=20)
    ap.add_argument("--che-do", choices=["ca-hai", "rag", "khong"], default="ca-hai")
    # Gói free của Gemini có trần lượt gọi mỗi phút. Nghỉ giữa các câu cho khỏi
    # bị chặn giữa chừng rồi báo cáo ra một con số sai vì lỗi mạng.
    ap.add_argument("--nghi", type=float, default=1.0, help="giây nghỉ giữa 2 câu")
    a = ap.parse_args()

    bo = dung_bo_cau_hoi(a.so_cau)
    print("═" * 74)
    print(f"  ĐO RAG — {len(bo)} câu hỏi, đáp án lấy từ tuyen_sinh_huit_2026.json")
    print("═" * 74)

    kq = {}
    if a.che_do in ("ca-hai", "khong"):
        print("\n▸ Mốc đối chứng — TẮT RAG (model tự trả lời)")
        kq["TẮT RAG"] = await chay(bo, False, a.nghi)
    if a.che_do in ("ca-hai", "rag"):
        print("\n▸ BẬT RAG")
        kq["BẬT RAG"] = await chay(bo, True, a.nghi)

    print("\n" + "═" * 74)
    print("  KẾT QUẢ")
    print("═" * 74)
    for ten, v in kq.items():
        bang(ten, v)
    if len(kq) == 2:
        a_, b_ = (sum(r["dung"] for r in v) / len(v) for v in kq.values())
        print(f"\n  RAG cải thiện: {100 * (b_ - a_):+.1f} điểm phần trăm")

    if "BẬT RAG" in kq:
        sai = [r for r in kq["BẬT RAG"] if not r["dung"]]
        if sai:
            print(f"\n  {len(sai)} câu BẬT RAG vẫn sai — xem để chỉnh chunk/top-k:")
            for r in sai[:5]:
                print(f"    · {r['nganh']} ({r['loai']}) — cần: {r['dap_an']}")
                print(f"      trả lời: {' '.join(r['tra_loi'].split())[:100]}…")


if __name__ == "__main__":
    asyncio.run(main())
