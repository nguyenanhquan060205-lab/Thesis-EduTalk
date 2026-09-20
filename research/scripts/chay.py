"""Chạy notebook và IN THẲNG output ra màn hình ngay khi nó xuất hiện.

`jupyter nbconvert --execute` nhét toàn bộ output vào file .ipynb, chỉ đọc được
sau khi chạy xong — với notebook chạy vài tiếng thì không theo dõi được gì.
Script này bám vào từng thông điệp của kernel nên `print(..., flush=True)` trong
notebook hiện ra ngay lập tức.

    python chay.py 09_CapSoCong.ipynb
    python chay.py 09 10 11              # chạy tuần tự, dừng ngay khi có lỗi

Vẫn ghi kết quả vào chính file .ipynb như nbconvert.
"""
import sys, time, pathlib
import nbformat
from nbclient import NotebookClient

NB = pathlib.Path(__file__).resolve().parents[1] / "notebooks"


class Live(NotebookClient):
    """NotebookClient in stdout của kernel ra terminal theo thời gian thực."""

    def process_message(self, msg, cell, cell_index):
        t = msg["msg_type"]
        if t == "stream":
            sys.stdout.write(msg["content"]["text"]); sys.stdout.flush()
        elif t == "error":
            sys.stdout.write("\n".join(msg["content"]["traceback"]) + "\n")
            sys.stdout.flush()
        return super().process_message(msg, cell, cell_index)


def chay(ten):
    f = NB / (ten if ten.endswith(".ipynb") else
              next(p.name for p in sorted(NB.glob(f"{ten}*.ipynb"))))
    nb = nbformat.read(f, as_version=4)
    n_ma = sum(c.cell_type == "code" for c in nb.cells)
    print(f"\n{'═'*78}\n▶  {f.name}   ({n_ma} cell mã)   "
          f"bắt đầu {time.strftime('%H:%M:%S')}\n{'═'*78}", flush=True)

    t0 = time.time()
    kh = Live(nb, timeout=-1, kernel_name="python3", allow_errors=False,
              resources={"metadata": {"path": str(NB)}})
    try:
        kh.execute()
    finally:
        nbformat.write(nb, f)          # giữ lại output kể cả khi lỗi giữa chừng
    p = time.time() - t0
    print(f"\n{'═'*78}\n✅ {f.name} xong sau {p/60:.1f} phút "
          f"({time.strftime('%H:%M:%S')})\n{'═'*78}", flush=True)
    return p


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(f"Cách dùng: python chay.py 09_CapSoCong.ipynb   |   python chay.py 09 10 11")
    tong = 0.0
    for ten in sys.argv[1:]:
        tong += chay(ten)
    if len(sys.argv) > 2:
        print(f"\n🏁 TỔNG CỘNG {tong/60:.1f} phút cho {len(sys.argv)-1} notebook", flush=True)
