"""Đóng gói mô hình Hướng 1 (`research/`) thành một thư mục backend nạp được.

    conda activate Edutalk
    python backend/scripts/dong_goi_mo_hinh_huong1.py

Ra: `backend/data/mo_hinh/huong1/`
    model_nganh.json          tầng khám phá — xếp hạng cả 39 ngành
    model_nhom0..8.json       tầng tư vấn   — mỗi nhóm một mô hình
    metrics.json              chép nguyên từ Giai đoạn 10, trang quản trị đọc file này
    mo_hinh.json              mọi thứ backend cần để dựng đúng 63 đặc trưng

Vì sao phải đóng gói thay vì trỏ thẳng vào `research/`:

1. Ảnh Docker chỉ chứa thư mục `backend/` (`docker-compose.yml` khai `context: ./backend`).
2. Giai đoạn 10 KHÔNG lưu bộ số chuẩn hoá điểm (`diem_mu`, `diem_sd`). Bộ số đó được tính ở
   Giai đoạn 6 trên TOÀN BỘ `train_final.csv` (16.972 dòng). Lấy nhầm bộ số khác — ví dụ
   tính lại chỉ trên tập train — thì mô hình vẫn chạy, vẫn trả kết quả trông hợp lý, nhưng
   sai âm thầm. Nên script tính lại rồi KIỂM từng ô z-score của cả 16.972 dòng trước khi ghi.

Chạy lại script này mỗi khi chạy lại Giai đoạn 10 của `research/`. Backend kiểm mã băm
SHA-256 của từng file lúc khởi động, nên chép thiếu hoặc lệch phiên bản sẽ báo lỗi ngay.
"""

import hashlib
import json
import re
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

GOC = Path(__file__).resolve().parents[2]
PROC = GOC / "research" / "data" / "processed"
NGUON = PROC / "10_ChotModel"
RA = GOC / "backend" / "data" / "mo_hinh" / "huong1"


def bam(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def so_lop(f: Path) -> int:
    m = XGBClassifier()
    m.load_model(f)
    cfg = json.loads(m.get_booster().save_config())
    return int(cfg["learner"]["learner_model_param"]["num_class"])


L = json.loads((NGUON / "lop_va_dac_trung.json").read_text(encoding="utf-8"))
MAP = json.loads((PROC / "01_LamSachKhaoSat" / "mapping.json").read_text(encoding="utf-8"))
M = json.loads((NGUON / "metrics.json").read_text(encoding="utf-8"))

cot = L["cot_dac_trung"]
assert len(cot) == 63, f"phải đúng 63 đặc trưng, đang có {len(cot)}"
assert L["rieng_nhom"] is True, "gói này dành cho mô hình riêng từng nhóm (rieng_nhom=True)"
# Backend lấy 10 cột ĐẦU làm Likert — thứ tự phải khớp bảng ánh xạ của Giai đoạn 1
assert cot[:10] == MAP["cot_likert"], "10 cột đầu không phải Likert theo đúng thứ tự"

# ── Bộ số chuẩn hoá điểm: tính lại đúng như Giai đoạn 6, rồi kiểm từng ô ─────────
mon = [c[5:] for c in cot if c.startswith("diem_") and c not in ("diem_tb", "diem_lech")]
assert sorted(f"diem_{m}" for m in mon) == sorted(MAP["cot_diem"])
tf = pd.read_csv(PROC / "06_TrainFinal" / "train_final.csv")
tho = tf[[f"diem_{m}" for m in mon]].astype(float)
diem_mu = tho.mean().values
diem_sd = tho.std().replace(0, 1).values        # ddof=1, giống pandas ở Giai đoạn 6

z_tinh = (tho.values - diem_mu) / diem_sd
z_file = tf[[f"z_diem_{m}" for m in mon]].values
assert np.array_equal(np.isnan(z_tinh), np.isnan(z_file)), "vị trí ô trống z-score lệch"
lech_z = float(np.nanmax(np.abs(z_tinh - z_file)))
assert lech_z < 1e-12, f"z-score tính lại lệch {lech_z} so với train_final.csv"

# ── Lớp ngành, lớp của từng mô hình nhóm ────────────────────────────────────────
nganh = [int(x) for x in L["nganh"]]
assert nganh == sorted(nganh), "mô hình chung học nhãn đã sắp xếp — danh sách phải tăng dần"
nganh_to_nhom = {int(k): int(v) for k, v in L["nganh_to_nhom"].items()}
# MoHinhNganh._fit1 đánh số lớp bằng np.unique → mã ngành tăng dần trong từng nhóm
lop_theo_khoi = {
    str(g): sorted(m for m in nganh if nganh_to_nhom[m] == g)
    for g in sorted(set(nganh_to_nhom.values()))
}
to_hop = [c[3:] for c in cot if c.startswith("th_")]

tep = ["model_nganh.json"] + [f"model_nhom{g}.json" for g in lop_theo_khoi]
assert so_lop(NGUON / "model_nganh.json") == len(nganh)
for g, ds in lop_theo_khoi.items():
    n = so_lop(NGUON / f"model_nhom{g}.json")
    assert n == len(ds), f"model_nhom{g}.json có {n} lớp, nhóm có {len(ds)} ngành"

# ── Cỡ dữ liệu cho trang quản trị ───────────────────────────────────────────────
tach = PROC / "07_TachTrainTest"
hoc = pd.concat([pd.read_csv(tach / "train.csv", usecols=["is_that"]),
                 pd.read_csv(tach / "val.csv", usecols=["is_that"])])
assert len(hoc) == M["n_hoc"]
seed = int(re.search(r"^SEED = (\d+)$", (GOC / "research/scripts/nbgen.py")
                     .read_text(encoding="utf-8"), re.M).group(1))

# ── Chỉ số đủ độ chính xác cho trang quản trị ───────────────────────────────────
# metrics.json làm tròn 4 chữ số; làm tròn thêm lần nữa lúc hiển thị sẽ sai ở số tận
# cùng bằng 5 (0,9965 → "99,7%" trong khi thật là 99,65% → 99,6%). Nên lấy từ CSV.
bk = pd.read_csv(NGUON / "bang_ket_qua.csv").set_index("tap")


def dong(bang: pd.DataFrame, ten: str) -> dict:
    return {c: float(bang.loc[ten, c]) for c in bang.columns}


xh = pd.read_csv(NGUON / "chi_so_xep_hang.csv").set_index("tang")
lop = pd.read_csv(NGUON / "chi_so_lop.csv").set_index("lat_cat")
chi_so = {
    "test": {"tu_van": dong(bk, "TEST · tư vấn"), "kham_pha": dong(bk, "TEST · khám phá")},
    "train_val": {"tu_van": dong(bk, "TRAIN+VAL · tư vấn"),
                  "kham_pha": dong(bk, "TRAIN+VAL · khám phá")},
    "xep_hang": {t: {c: (None if pd.isna(v) else float(v)) for c, v in xh.loc[t].items()}
                 for t in xh.index},
    "lop": {t: {c: (None if pd.isna(v) else float(v)) for c, v in lop.loc[t].items()}
            for t in lop.index},
}
for tang, k in M["diem_van_hanh"].items():
    assert abs(chi_so["test"][tang][f"top{k}"] - M["test"][tang][f"top{k}"]) < 6e-5

# ── Mức trên người thật: Hướng 2 (`research1/`) niêm phong 676 phiếu khảo sát ──────
# Cùng cấu hình mô hình nhưng CHƯA TỪNG học các phiếu đó — Hướng 1 không đo sạch được
# con số này vì phiếu khảo sát đã nằm trong dữ liệu học. Thiếu thư mục thì bỏ qua.
nguoi_that = None
R1 = GOC / "research1" / "data" / "processed" / "10_ChotModel"
if (R1 / "bang_ket_qua.csv").exists():
    m1 = json.loads((R1 / "metrics.json").read_text(encoding="utf-8"))
    assert m1["hp"] == M["hp"] and m1["rieng_nhom"] == L["rieng_nhom"], "Hướng 2 khác cấu hình"
    b1 = pd.read_csv(R1 / "bang_ket_qua.csv").set_index("tap")
    nguoi_that = {
        "nguon": "Hướng 2 (research1/): cùng cấu hình, 676 phiếu khảo sát niêm phong",
        "n": int(m1["n_khaosat_niemphong"]),
        "n_34_nganh": int(m1["n_khaosat_34_nganh"]),
        "tu_van": dong(b1, "KHẢO SÁT · tư vấn"),
        "kham_pha": dong(b1, "KHẢO SÁT · khám phá"),
        "tu_van_34_nganh": dong(b1, "KHẢO SÁT 34 ngành · tư vấn"),
        "kham_pha_34_nganh": dong(b1, "KHẢO SÁT 34 ngành · khám phá"),
        "doan_bua": m1["doan_bua"],
    }

# ── Ghi gói ─────────────────────────────────────────────────────────────────────
RA.mkdir(parents=True, exist_ok=True)
for f in tep + ["metrics.json"]:
    shutil.copyfile(NGUON / f, RA / f)
    assert bam(RA / f) == bam(NGUON / f)

# ── Dữ liệu cho huấn luyện lại định kỳ (vòng lặp phản hồi) ─────────────────────
# Retrain chạy TRONG backend (ảnh Docker không có research/), nên gói phải mang theo
# đúng dữ liệu Giai đoạn 10 đã học (train + val) và tập test khoá để làm cổng kiểm
# định. Chỉ giữ 63 đặc trưng + nhãn — không cần cột nào khác.
tep_du_lieu = ["du_lieu_hoc.csv.gz", "test_khoa.csv.gz"]
COT_GIU = cot + ["ma_nganh", "ma_nhom", "is_that"]
p_test = tach / "test_KHOA.csv"
NP = json.loads((tach / "niem_phong.json").read_text(encoding="utf-8"))
assert bam(p_test) == NP["bam_sha256"], "tập test đã bị sửa sau khi niêm phong"
pd.concat([pd.read_csv(tach / "train.csv"), pd.read_csv(tach / "val.csv")], ignore_index=True)[
    COT_GIU].to_csv(RA / "du_lieu_hoc.csv.gz", index=False, compression={"method": "gzip", "mtime": 0})
pd.read_csv(p_test)[COT_GIU].to_csv(
    RA / "test_khoa.csv.gz", index=False, compression={"method": "gzip", "mtime": 0})

meta = {
    "ten": "Hướng 1 — research/: gộp khảo sát và hồ sơ trúng tuyển rồi chia 70/15/15",
    "nguon": "research/data/processed/10_ChotModel",
    "ngay_chot": datetime.fromtimestamp((NGUON / "metrics.json").stat().st_mtime)
    .strftime("%Y-%m-%d %H:%M"),
    "seed": seed,
    "cach_dung": "fieldId=None → model_nganh.json xếp hạng cả 39 ngành (khám phá). "
                 "fieldId=k → model_nhom{k}.json chỉ xếp hạng ngành trong nhóm k (tư vấn).",
    "diem_van_hanh": M["diem_van_hanh"],
    "ten_cach_nhom": MAP.get("ten_cach_nhom"),
    # Cấu hình Giai đoạn 9 đã chốt — huấn luyện lại dùng ĐÚNG bộ này, không tinh chỉnh lại
    "hp": M["hp"],
    "rieng_nhom": True,
    "ten_dac_trung": cot,
    "nganh_theo_thu_tu_lop": nganh,
    "lop_theo_khoi": lop_theo_khoi,
    "nganh_to_nhom": {str(k): v for k, v in nganh_to_nhom.items()},
    "ten_nhom": L["ten_nhom"],
    "ma_to_ten": L["ma_to_ten"],
    "to_hop": to_hop,
    "diem_mu": [float(x) for x in diem_mu],
    "diem_sd": [float(x) for x in diem_sd],
    "du_lieu": {
        "n_hoc": int(M["n_hoc"]),
        "n_hoc_that": int(hoc.is_that.sum()),
        "n_test": int(M["n_test"]),
        "n_dac_trung": len(cot),
        "n_nganh": len(nganh),
        "n_nhom": len(lop_theo_khoi),
    },
    "chi_so": chi_so,
    "nguoi_that": nguoi_that,
    "sha256": {f: bam(RA / f) for f in tep + ["metrics.json"] + tep_du_lieu},
}
(RA / "mo_hinh.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1),
                                 encoding="utf-8")

print(f"✅ Đóng gói xong → {RA.relative_to(GOC)}")
print(f"   {len(tep)} mô hình · 63 đặc trưng · {len(nganh)} ngành · {len(lop_theo_khoi)} nhóm")
print(f"   z-score tính lại khớp {z_file.size - int(np.isnan(z_file).sum()):,} ô "
      f"(lệch tối đa {lech_z:.1e})")
print(f"   dữ liệu học {M['n_hoc']:,} dòng ({int(hoc.is_that.sum())} phiếu khảo sát) · "
      f"test {M['n_test']:,} dòng")
