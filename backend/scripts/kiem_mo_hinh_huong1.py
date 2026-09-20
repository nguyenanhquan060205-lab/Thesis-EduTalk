"""Kiểm backend có chạy ĐÚNG mô hình Hướng 1 như notebook không.

    conda activate Edutalk
    python backend/scripts/kiem_mo_hinh_huong1.py

Cách kiểm duy nhất đáng tin (CLAUDE.md): cho từng dòng của tập test đi qua `recommend()`
như một người dùng thật, rồi đối chiếu với số notebook đã ghi. Với mỗi dòng trong
`research/data/processed/07_TachTrainTest/test_KHOA.csv`:

1. Dựng lại đúng thứ người dùng nhập — 10 câu sở thích, tổ hợp, 3 điểm theo thứ tự môn
   của tổ hợp, giới tính, mục tiêu.
2. So 63 đặc trưng `build_features()` dựng ra với 63 cột trong file test.
3. Gọi `recommend()` ở hai chế độ, TẮT lọc mềm theo tổ hợp (notebook không có bước đó),
   đếm Top-2 tư vấn và Top-5 khám phá, phải khớp `bang_ket_qua.csv` đến từng dòng.

Cuối cùng đo thêm khi BẬT lọc mềm — đó là cấu hình người dùng thật gặp — chỉ để báo cáo.
Lệch ở bước 2 hoặc 3 thì thoát mã 1.
"""

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

GOC = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(GOC / "backend"))
os.environ.pop("EDUTALK_MODEL_DIR", None)
os.environ["EDUTALK_PIPELINE"] = "h1"
# Luôn kiểm mô hình GỐC trong gói — phiên bản huấn luyện lại (nếu đang phục vụ) đã học thêm
# phiếu phản hồi nên không thể và không cần khớp notebook.
os.environ["EDUTALK_PHIEN_BAN"] = "goc"

from app.services.major_predictor import MUC_TIEU_MA, TO_HOP_MAP, get_predictor  # noqa: E402

PROC = GOC / "research" / "data" / "processed"
pr = get_predictor()
assert type(pr).__name__ == "MajorPredictorH1", type(pr).__name__
K_TV, K_KP = pr.diem_van_hanh["tu_van"], pr.diem_van_hanh["kham_pha"]

te = pd.read_csv(PROC / "07_TachTrainTest" / "test_KHOA.csv")
bk = pd.read_csv(PROC / "10_ChotModel" / "bang_ket_qua.csv").set_index("tap")
ma_mt = {v: k for k, v in MUC_TIEU_MA.items()}
cot = pr.columns
cot_th = [c for c in cot if c.startswith("th_")]

lech_dt, sai_nhap = 0.0, []
dung = {"tv": 0, "kp": 0, "tv_loc": 0, "kp_loc": 0}
for i, r in te.iterrows():
    th = [c[3:] for c in cot_th if r[c] == 1.0]
    assert len(th) == 1, f"dòng {i}: {len(th)} tổ hợp"
    sg = th[0]
    co_diem = {c[5:] for c in cot if c.startswith("diem_") and c not in ("diem_tb", "diem_lech")
               and not np.isnan(r[c])}
    if co_diem != set(TO_HOP_MAP[sg]):
        sai_nhap.append(i)   # điểm không khớp môn của tổ hợp → biểu mẫu không nhập được
        continue
    nhap = dict(
        interests=[int(r[c]) for c in cot[:10]],
        subject_group=sg,
        scores=[float(r[f"diem_{m}"]) for m in TO_HOP_MAP[sg]],
        gender="Nam" if r["gioi_tinh_nam"] == 1.0 else "Nu",
        goal=ma_mt[int(r["muc_tieu"])],
    )

    X = pr.build_features(**nhap)[0]
    Y = r[cot].to_numpy(float)
    assert np.array_equal(np.isnan(X), np.isnan(Y)), f"dòng {i}: vị trí ô trống lệch"
    lech_dt = max(lech_dt, float(np.nanmax(np.abs(X - Y))))

    ma = str(int(r["ma_nganh"]))
    for loc in (False, True):
        tv = pr.recommend(**nhap, field_id=int(r["ma_nhom"]), limit=K_TV,
                          filter_subject_group=loc)
        kp = pr.recommend(**nhap, field_id=None, limit=K_KP, filter_subject_group=loc)
        hau = "_loc" if loc else ""
        dung["tv" + hau] += ma in [x["code"] for x in tv["majors"]]
        dung["kp" + hau] += ma in [x["code"] for x in kp["majors"]]

n = len(te) - len(sai_nhap)
print(f"Tập test          : {len(te):,} dòng · dựng lại được {n:,} · không nhập được {len(sai_nhap)}")
print(f"63 đặc trưng      : lệch tối đa {lech_dt:.1e} so với file test")

ky_vong_tv = bk.loc["TEST · tư vấn", f"top{K_TV}"]
ky_vong_kp = bk.loc["TEST · khám phá", f"top{K_KP}"]
ok = (not sai_nhap and lech_dt < 1e-9
      and dung["tv"] == round(ky_vong_tv * len(te))
      and dung["kp"] == round(ky_vong_kp * len(te)))

print("\nTẮT lọc mềm — phải khớp notebook")
print(f"   tư vấn Top-{K_TV}   backend {dung['tv'] / n:.4%}   notebook {ky_vong_tv:.4%}")
print(f"   khám phá Top-{K_KP} backend {dung['kp'] / n:.4%}   notebook {ky_vong_kp:.4%}")
print("\nBẬT lọc mềm theo tổ hợp — cấu hình người dùng gặp (chỉ báo cáo)")
print(f"   tư vấn Top-{K_TV}   {dung['tv_loc'] / n:.4%}")
print(f"   khám phá Top-{K_KP} {dung['kp_loc'] / n:.4%}")

print("\n✅ Backend khớp notebook" if ok else "\n❌ LỆCH — backend không chạy đúng mô hình")
sys.exit(0 if ok else 1)
