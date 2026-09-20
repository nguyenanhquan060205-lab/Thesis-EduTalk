"""So ba cách xử lý tổ hợp xét tuyển, trên cùng tập test Hướng 1.

    conda activate Edutalk
    cd backend
    python scripts/do_loc_to_hop.py

    ① tắt lọc      mô hình tự xếp 39 ngành              ← số trong báo cáo hiện tại
    ② hạ một nửa   ngành ngoài tổ hợp × 0,5             ← cách cũ của backend
    ③ loại hẳn     ngành ngoài tổ hợp × 0               ← cách đang chạy từ 20/09/2026

CHIA HAI CỘT LÀ ĐIỂM MẤU CHỐT. Nhãn của tập test là "ngành sinh viên thực sự trúng
tuyển", lấy từ hồ sơ các năm trước. Một phần nhãn đó KHÔNG CÒN HỢP LỆ theo bảng tổ hợp
2026 — trường đổi tổ hợp giữa các năm (Công nghệ thông tin xét D07 năm 2024, bỏ từ 2025).

Đếm cả những dòng đó là phạt mô hình vì không đoán trúng ngành mà thí sinh 2026 KHÔNG
THỂ đăng ký. Nên bảng tách riêng:

    toàn bộ      mọi dòng — so được với số notebook
    hợp lệ 2026  chỉ dòng mà ngành đúng CÓ xét tổ hợp đã khai — đo đúng việc mà
                 tính năng phải làm cho thí sinh 2026

Cột "đoán bừa" bắt buộc theo quy ước dự án: thiếu nó thì 81% có thể chỉ hơn ngẫu nhiên
vài điểm.
"""

import json
import os
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd

GOC = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(GOC / "backend"))
os.environ.pop("EDUTALK_MODEL_DIR", None)
os.environ["EDUTALK_PIPELINE"] = "h1"
os.environ["EDUTALK_PHIEN_BAN"] = "goc"

from app.services.major_predictor import MUC_TIEU_MA, TO_HOP_MAP, get_predictor  # noqa: E402

PROC = GOC / "research" / "data" / "processed"
F_TS = GOC / "backend" / "data" / "co_cau_truc" / "tuyen_sinh_huit_2026.json"

pr = get_predictor()
K_TV, K_KP = pr.diem_van_hanh["tu_van"], pr.diem_van_hanh["kham_pha"]
te = pd.read_csv(PROC / "07_TachTrainTest" / "test_KHOA.csv")
ts = json.loads(F_TS.read_text(encoding="utf-8"))["nganh"]
ma_mt = {v: k for k, v in MUC_TIEU_MA.items()}
cot = pr.columns
cot_th = [c for c in cot if c.startswith("th_")]
rng = random.Random(42)

CACH = [
    ("① tắt lọc", dict(filter_subject_group=False)),
    ("② hạ một nửa", dict(filter_subject_group=True)),
    ("③ loại hẳn", dict(filter_subject_group=True, loai_bo_ngoai_to_hop=True)),
]

dem = {ten: {"tv": 0, "kp": 0, "tv_h": 0, "kp_h": 0} for ten, _ in CACH}
bua = {"kp": 0, "kp_h": 0}
n_tong = n_hop_le = 0

for i, r in te.iterrows():
    th = [c[3:] for c in cot_th if r[c] == 1.0]
    if len(th) != 1:
        continue
    sg = th[0]
    co_diem = {
        c[5:] for c in cot
        if c.startswith("diem_") and c not in ("diem_tb", "diem_lech") and not np.isnan(r[c])
    }
    if co_diem != set(TO_HOP_MAP[sg]):
        continue

    nhap = dict(
        interests=[int(r[c]) for c in cot[:10]],
        subject_group=sg,
        scores=[float(r[f"diem_{m}"]) for m in TO_HOP_MAP[sg]],
        gender="Nam" if r["gioi_tinh_nam"] == 1.0 else "Nu",
        goal=ma_mt[int(r["muc_tieu"])],
    )
    ma = str(int(r["ma_nganh"]))
    hop_le = sg in ts.get(ma, {}).get("to_hop", [])
    n_tong += 1
    n_hop_le += hop_le

    for ten, kw in CACH:
        tv = pr.recommend(**nhap, field_id=int(r["ma_nhom"]), limit=K_TV, **kw)
        kp = pr.recommend(**nhap, field_id=None, limit=K_KP, **kw)
        d_tv = ma in [x["code"] for x in tv["majors"]]
        d_kp = ma in [x["code"] for x in kp["majors"]]
        dem[ten]["tv"] += d_tv
        dem[ten]["kp"] += d_kp
        if hop_le:
            dem[ten]["tv_h"] += d_tv
            dem[ten]["kp_h"] += d_kp

    # Đoán bừa: rút K_KP ngành trong SỐ NGÀNH HỢP LỆ của tổ hợp đó
    xet = [m for m, v in ts.items() if sg in v["to_hop"]]
    if xet:
        chon = rng.sample(xet, min(K_KP, len(xet)))
        bua["kp"] += ma in chon
        if hop_le:
            bua["kp_h"] += ma in chon

print(f"\nTập test: {n_tong:,} dòng dựng lại được · {n_hop_le:,} dòng có ngành đúng "
      f"CÒN xét tổ hợp đã khai ({n_hop_le / n_tong * 100:.1f}%)")
print(f"{'':16}{'TOÀN BỘ ' + str(n_tong) + ' dòng':>26}{'HỢP LỆ 2026 ' + str(n_hop_le) + ' dòng':>28}")
print(f"{'cách':16}{'tư vấn Top-' + str(K_TV):>13}{'khám phá Top-' + str(K_KP):>13}"
      f"{'tư vấn Top-' + str(K_TV):>14}{'khám phá Top-' + str(K_KP):>14}")
print("─" * 84)
for ten, _ in CACH:
    d = dem[ten]
    print(f"{ten:16}{d['tv'] / n_tong:>12.1%}{d['kp'] / n_tong:>13.1%}"
          f"{d['tv_h'] / n_hop_le:>14.1%}{d['kp_h'] / n_hop_le:>14.1%}")
print("─" * 84)
print(f"{'đoán bừa':16}{'—':>12}{bua['kp'] / n_tong:>13.1%}{'—':>14}"
      f"{bua['kp_h'] / n_hop_le:>14.1%}")
print("\n(đoán bừa = rút ngẫu nhiên trong số ngành CÓ xét tổ hợp đó, seed 42)")
