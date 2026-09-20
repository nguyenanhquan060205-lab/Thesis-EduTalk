"""Đo TẦNG TRUY HỒI — không gọi LLM sinh, nên chạy nhanh và gần như miễn phí.

    conda activate Edutalk
    cd backend
    python scripts/kiem_truy_hoi.py              # bộ câu hỏi khó, chia 4 mức
    python scripts/kiem_truy_hoi.py --bo tu-dong # bộ sinh máy: nêu nguyên văn tên ngành

Tách riêng khỏi `kiem_rag.py` (đo tầng sinh) là có chủ ý. Khi chatbot trả lời sai,
phải biết sai ở đâu:

    truy hồi sai  →  lấy nhầm tài liệu, model có giỏi mấy cũng chịu
    sinh sai      →  tài liệu đúng nằm ngay đó mà vẫn trả lời sai

Hai loại lỗi này chữa bằng hai cách hoàn toàn khác nhau (chỉnh chunk/top-k, so với
chỉnh prompt), nên phải đo tách.

VÌ SAO KHÔNG DÙNG RAGAS CHO PHẦN NÀY: `context_precision` và `context_recall` của
RAGAS phải nhờ một LLM chấm xem đoạn lấy về có liên quan không. Ở đây ta **biết
chắc** đoạn nào đúng — nên đo trực tiếp: kết quả tất định, chạy lại lúc nào cũng ra
đúng con số đó, không tốn lượt API nào cho việc chấm, và không ai cãi được cách chấm.

RAGAS vẫn đáng dùng cho `faithfulness` và `answer_relevancy` ở tầng sinh — nhưng
CÀI Ở CONDA ENV RIÊNG: nó kéo theo 48 gói và nâng pydantic 2.7.1 → 2.13.5, đúng
gói FastAPI đang dựa vào.

⚠️ BỘ "tu-dong" CHO 100% VÀ CON SỐ ĐÓ VÔ NGHĨA. Câu hỏi sinh máy nêu nguyên văn
tên ngành, mà chunk cũng mở đầu bằng đúng tên đó — trùng chữ thì tìm đúng là
đương nhiên. Nó chỉ dùng làm TRẦN TRÊN. Số đáng báo cáo nằm ở bộ mặc định.
"""

import argparse
import pathlib
import sys

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(GOC / ".env")

from app.services.rag.danh_gia import F_BO, do_truy_hoi  # noqa: E402
from app.services.rag.kho import lay_kho  # noqa: E402
from app.services.rag.nguon_co_cau_truc import lay_nguon  # noqa: E402

# Phần tính toán nằm ở app/services/rag/danh_gia.py — MỘT bản duy nhất, dùng chung với
# trang quản trị. Script này chỉ lo tham số dòng lệnh và in bảng.

MAU_TU_DONG = [
    "Điểm chuẩn ngành {ten} của HUIT năm 2026 là bao nhiêu?",
    "Ngành {ten} xét những tổ hợp nào?",
    "Cho em hỏi về ngành {ten} ở Trường Đại học Công Thương",
]


def bo_tu_dong(so_nganh: int) -> list[dict]:
    tb = lay_nguon()
    return [
        {"muc": "0_tu_dong", "hoi": m.format(ten=tb.nganh[ma]["ten"]), "dap_an": [ma]}
        for ma in sorted(tb.nganh)[:so_nganh]
        for m in MAU_TU_DONG
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--k", type=int, default=4)
    ap.add_argument("--bo", choices=["kho", "tu-dong"], default="kho")
    ap.add_argument("--so-nganh", type=int, default=39, help="chỉ cho bộ tu-dong")
    # Gói free của Gemini có trần lượt/phút — đã chạm 1 lần khi chạy 117 câu liền.
    ap.add_argument("--nghi", type=float, default=0.35)
    a = ap.parse_args()

    if not lay_kho().san_sang:
        sys.exit("Kho vector chưa dựng — chạy `python scripts/nap_kho.py` trước.")

    if a.bo == "tu-dong":
        ds = bo_tu_dong(a.so_nganh)
        nhan_bo = f"sinh máy · {a.so_nganh} ngành × {len(MAU_TU_DONG)} mẫu"
    else:
        ds = None
        nhan_bo = f"gán nhãn tay · {F_BO.name}"

    print("═" * 82)
    print(f"  ĐO TẦNG TRUY HỒI · k={a.k} · bộ {nhan_bo}")
    print("═" * 82)

    def tien_do(i, n, c):
        print(f"  {i:3d}/{n}  {c['hoi'][:70]}", flush=True)

    kq = do_truy_hoi(ds=ds, k=a.k, nghi=a.nghi, bao_tien_do=tien_do)

    # ── Bảng kết quả ────────────────────────────────────────────────────
    print("\n" + "═" * 96)
    print("  KẾT QUẢ THEO MỨC ĐỘ KHÓ  (chỉ số chính bám báo cáo tuần: P@k, R@k, Ctx P, Ctx R)")
    print("═" * 96)
    print(f"  {'mức':<16} {'câu':>4} │ {f'P@{a.k}':>6}{f'R@{a.k}':>7}{'CtxP':>7}{'CtxR':>7} │"
          f" {'Hit@1':>7}{'MRR':>7} │ {f'R@{a.k} từ khoá':>14} {f'R@{a.k} bừa':>10}")
    print("  " + "─" * 94)

    def dong(nhan, r):
        print(f"  {nhan:<16} {r['n']:>4} │ {r['precision_k']:>6.3f}{r['recall_k']:>7.3f}"
              f"{r['context_precision']:>7.3f}{r['context_recall']:>7.3f} │"
              f" {100 * r['hit1']:>6.1f}%{r['mrr']:>7.3f} │"
              f" {r['tu_khoa_recall_k']:>14.3f} {r['bua_recall_k']:>10.3f}")

    for r in kq["theo_muc"]:
        dong(r["muc"], r)
    print("  " + "─" * 94)
    dong("TỔNG", kq["tong"])

    if kq["so_loi_nhung"]:
        print(f"\n  ⚠️  {kq['so_loi_nhung']} câu không nhúng được (lỗi mạng / trần tần suất) — "
              "bị tính là trượt, kết quả thấp hơn thực tế")
    print(f"\n  P@k bị chặn trên bởi (số đáp án)/k: câu chỉ có 1 ngành đúng thì P@{a.k} tối đa "
          f"{1 / a.k:.2f} — đọc cùng R@k, đừng đọc riêng.")

    # ── Câu trượt ───────────────────────────────────────────────────────
    if kq["cau_truot"]:
        print(f"\n  {len(kq['cau_truot'])} câu chunk đúng KHÔNG đứng hạng nhất:")
        for x in kq["cau_truot"]:
            dau = (x["lay_ve_dau"] or {}).get("ten") or "—"
            print(f"    hạng {x['hang'] or '—':>2} · lấy về đầu: {dau[:34]:<36} "
                  f"« {x['hoi'][:40]}")

    print("\n  Đọc số:")
    print("  · P@k / R@k — độ sạch / độ đầy đủ của top-k lấy về (báo cáo tuần 1, CT 7–8)")
    print("  · CtxP / CtxR — như trên nhưng tính trên các đoạn THẬT SỰ vào prompt sau ngưỡng")
    print("  · Hit@1 — chunk đúng đứng ngay hạng nhất")
    print("  · Mức D (chỉ nói nguyện vọng, không nêu tên ngành) là mức duy nhất mà")
    print("    tìm bằng từ khoá không thể làm được — đó là chỗ tầng nhúng kiếm được")
    print("    chỗ đứng, và cũng là lý do đề tài dùng vector chứ không dùng full-text.")


if __name__ == "__main__":
    main()
