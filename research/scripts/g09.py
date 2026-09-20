"""Sinh notebook 09_TinhChinh.ipynb

Quét siêu tham số trên val với hai RÀNG BUỘC CỨNG, chọn cấu hình cho Giai đoạn 10.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, MO_HINH, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 9 — Tinh chỉnh siêu tham số

''' + so_do(
    "09_TinhChinh",
    ["07_TachTrainTest/train.csv   —  11.880 dòng",
     "07_TachTrainTest/val.csv     —  2.546 dòng",
     "08_MocChuan/moc_chuan.json   —  bốn mốc để so"],
    ["Quét lưới 48 cấu hình siêu tham số",
     "RÀNG BUỘC 1 — KHÁM PHÁ train Top-3 ≤ 95%   (vượt là nhớ vẹt, loại thẳng)",
     "RÀNG BUỘC 2 — KHÁM PHÁ chênh train−val ≤ 10 điểm",
     "Trong số cấu hình HỢP LỆ, chọn Top-3 khám phá trên val cao nhất",
     "Đối chứng tầng tư vấn (Top-2): mô hình chung che bớt  vs  mô hình riêng từng nhóm",
     "Kiểm lại: có hơn cả bốn mốc không"],
    ["09_TinhChinh/sieu_tham_so.json  —  Giai đoạn 10 đọc file này",
     "09_TinhChinh/ket_qua_quet.csv",
     "09_TinhChinh/hinh_9_*.png       —  2 hình"]) + '''

## Vấn đề cần chữa

Giai đoạn 8 cho thấy cấu hình mặc định **nhớ vẹt** — nhưng hai chế độ cho hai bức
tranh hoàn toàn khác nhau (số thật đọc từ `moc_chuan.json`, không viết tay).

Chế độ **tư vấn** trông lành vì đó là bài toán dễ: chọn 2 ngành trong một nhóm 3–7
ngành. Mốc 3 ở Giai đoạn 8 cho thấy chỉ dùng 15 cột one-hot tổ hợp, không Likert, không
điểm, đã đạt mức cao ở tầng này. Chế độ **khám phá** (xếp hạng cả 39 ngành) mới là bài
toán thật, và ở đó khoảng cách train−val lớn gấp nhiều lần.

XGBoost 400 cây độ sâu 5 trên 11.880 dòng thừa sức nhớ hết. Bản thân `train = 100%`
không bất thường với mô hình dung lượng lớn; vấn đề nằm ở **khoảng cách**.

## Hai ràng buộc CỨNG — đo trên chế độ KHÁM PHÁ

```python
KP_TRAIN_TOI_DA = 0.95   # khám phá train Top-3 vượt mức này → nhớ vẹt, LOẠI THẲNG
KP_GAP_TOI_DA   = 0.10   # khám phá chênh train − val vượt 10 điểm → LOẠI THẲNG
```

**Vì sao phải là khám phá, không phải tư vấn.** Lần chạy đầu áp lên tư vấn Top-3 và kết
quả là **0/48 cấu hình hợp lệ** — cấu hình nhẹ nhất trong lưới (150 cây, sâu 3) vẫn
cho tư vấn train 98,0%, vượt ngưỡng 95%. Ràng buộc loại sạch cả lưới, rồi một nhánh
dự phòng âm thầm chọn đại một cấu hình. Con số "chênh 1,9 điểm" ghi trong
`sieu_tham_so.json` trông đẹp nhưng nó không phải kết quả của việc chọn lọc nào cả.

Một ràng buộc mà 100% ứng viên vi phạm thì không phải ràng buộc — nó là lỗi đặt ngưỡng.

**Nhánh dự phòng đã bị gỡ.** Thay bằng `assert`: không cấu hình nào hợp lệ thì notebook
dừng hẳn, chứ không đi tiếp với một lựa chọn không có căn cứ.

Cấu hình nào vi phạm thì bị loại **bất kể Top-3 trên val đẹp tới đâu**. Chỉ chọn trong
số còn lại, và chọn theo **khám phá** — vì ràng buộc đặt ở đâu thì tiêu chí chọn phải
ở đó, nếu không thì hai thứ không ăn nhập gì với nhau.

Đánh đổi: Top-3 sẽ tụt vài điểm so với con số ở Giai đoạn 8. Nhưng con số còn lại mới là
con số dùng được — nó không dựa vào việc mô hình đã nhìn thấy dữ liệu huấn luyện.

> **Đừng siết `KP_GAP_TOI_DA` quá tay.** Ép xuống quá thấp sẽ làm mọi cấu hình rơi về
> đúng mức mốc đoán bừa — kết quả "đẹp" nhưng mô hình đã suy biến thành cái máy đoán
> ngành đông nhất.

## Đối chứng tầng tư vấn: mô hình chung, hay mô hình riêng từng nhóm?

Hệ thống có hai tầng, đúng cách web gọi API:

| Tầng | Gọi | Việc |
|---|---|---|
| **khám phá** | `diem(X)` | chưa biết gì → xếp hạng cả 39 ngành |
| **tư vấn** | `diem(X, nhom)` | người dùng đã chọn nhóm → xếp hạng ngành trong nhóm đó |

Tầng tư vấn hiện dùng **mô hình chung 39 lớp rồi che bỏ ngành ngoài nhóm**. Có một
cách khác: `rieng_nhom=True` — mỗi nhóm một mô hình nhỏ, chỉ học phân biệt 3–7 ngành
của nhóm đó thay vì trải sức phân biệt mọi cặp trong 39 ngành, kể cả những cặp ở hai
nhóm khác hẳn nhau mà thực tế không bao giờ phải so.

Không quét hết lưới cho cả hai — `rieng_nhom` chỉ ảnh hưởng tầng tư vấn, không đụng
tới khám phá, nên tiêu chí chọn cấu hình không đổi. Chốt siêu tham số bằng khám phá
trước, rồi so đúng **hai** lựa chọn ở tầng tư vấn, đo bằng **Top-2** — đúng số gợi ý
tầng này hiển thị. Rẻ hơn nhiều mà trả lời đúng câu hỏi.

## Hướng giảm dung lượng mô hình

| Tham số | Mặc định | Quét | Tác dụng |
|---|---:|---|---|
| `n_estimators` | 400 | 150 · 250 | ít cây hơn → ít nhớ hơn |
| `max_depth` | 5 | 3 · 4 · 5 | cây nông hơn → luật đơn giản hơn |
| `min_child_weight` | 3 | 3 · 10 | lá phải có đủ mẫu mới tách |
| `reg_lambda` | 5 | 5 · 20 | phạt trọng số lớn |
| `colsample_bytree` | 0.6 | 0.4 · 0.6 | mỗi cây thấy ít cột hơn |

## Chốt bằng tập val, không đụng test

`test_KHOA.csv` còn niêm phong. Mọi quyết định ở đây dựa trên `val.csv`.

Đây là lý do phải chia ba tập ngay từ đầu: nếu tinh chỉnh trên chính tập test thì con số
cuối cùng đã bị tập test tham gia vào quyết định thiết kế, và nó sẽ lạc quan hơn thực tế.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + MO_HINH + '''
from itertools import product

OUT = thu_muc(9)
# Cả hai ràng buộc đo trên chế độ KHÁM PHÁ. Lần chạy đầu áp lên tư vấn Top-3 thì
# cấu hình nhẹ nhất của lưới cũng vượt ngưỡng — loại sạch 48/48.
KP_TRAIN_TOI_DA = 0.95    # RÀNG BUỘC CỨNG 1
KP_GAP_TOI_DA = 0.10      # RÀNG BUỘC CỨNG 2

LUOI = {
    "n_estimators": [150, 250],
    "max_depth": [3, 4, 5],
    "min_child_weight": [3, 10],
    "reg_lambda": [5.0, 20.0],
    "colsample_bytree": [0.4, 0.6],
}

D = nap(co_ttth=False)
train = pd.read_csv(thu_muc(7) / "train.csv")
val = pd.read_csv(thu_muc(7) / "val.csv")
MOC = json.loads((thu_muc(8) / "moc_chuan.json").read_text(encoding="utf-8"))
QL = ["ma_nganh", "ma_nhom", "nguon", "is_that", "sample_weight"]
COT = [c for c in train.columns if c not in QL]

Xtr, ytr, gtr = train[COT].values, train.ma_nganh.values, train.ma_nhom.values
Xva, yva, gva = val[COT].values, val.ma_nganh.values, val.ma_nhom.values

assert set(train.sample_weight.unique()) == {1.0}, "trọng số phải bằng nhau"

cau_hinh = [dict(zip(LUOI, v)) for v in product(*LUOI.values())]
print(f"Lưới      : {len(cau_hinh)} cấu hình")
for k, v in LUOI.items():
    print(f"   {k:<20} {v}")
print(f"\\nRàng buộc (đo trên chế độ KHÁM PHÁ):")
print(f"   khám phá train Top-3      ≤ {KP_TRAIN_TOI_DA:.0%}")
print(f"   khám phá chênh train−val  ≤ {KP_GAP_TOI_DA:.0%}")

g8 = MOC["moc"]["MÔ HÌNH đủ dữ liệu"]
print(f"\\nGiai đoạn 8 — mô hình chưa tinh chỉnh:")
print(f"   {'':12}{'train':>9}{'val':>9}{'chênh':>9}")
print(f"   {'tư vấn':<12}{g8['tv_train']:>9.1%}{g8['tv_val']:>9.1%}"
      f"{(g8['tv_train']-g8['tv_val'])*100:>+8.1f}đ")
print(f"   {'khám phá':<12}{g8['kp_train']:>9.1%}{g8['kp_val']:>9.1%}"
      f"{(g8['kp_train']-g8['kp_val'])*100:>+8.1f}đ  ← ràng buộc áp ở đây")

print(f"\\nMốc cần vượt (khám phá Top-3):")
for t, v in MOC["moc"].items():
    if v["kp_val"] is not None:
        print(f"   {t:<34} {v['kp_val']:.1%}")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Quét lưới"))

C.append(code('''def thu(hp):
    mh = MoHinhNganh(D, hp=hp).fit(Xtr, ytr)
    kp_tr = top_k(mh.diem(Xtr), ytr, D["nganh"])[3]
    kp_va = top_k(mh.diem(Xva), yva, D["nganh"])[3]
    tv_tr = top_k(mh.diem(Xtr, gtr), ytr, D["nganh"])[K_TU_VAN]
    tv_va = top_k(mh.diem(Xva, gva), yva, D["nganh"])[K_TU_VAN]
    return {**hp,
            "kp_train": kp_tr, "kp_val": kp_va, "gap_kp": kp_tr - kp_va,
            "tv_train": tv_tr, "tv_val": tv_va, "gap_tv": tv_tr - tv_va}


t0 = time.time()
ra = []
for i, hp in enumerate(cau_hinh, 1):
    ra.append(thu(hp))
    if i % 4 == 0 or i == len(cau_hinh):
        print(f"   {i}/{len(cau_hinh)}  [{time.time()-t0:.0f}s]", flush=True)
q = pd.DataFrame(ra)
q["hop_le"] = (q.kp_train <= KP_TRAIN_TOI_DA) & (q.gap_kp <= KP_GAP_TOI_DA)
q.to_csv(OUT / "ket_qua_quet.csv", index=False)

print(f"\\nQuét xong {len(q)} cấu hình trong {time.time()-t0:.0f}s")
print(f"   hợp lệ : {int(q.hop_le.sum())}/{len(q)}")
print(f"   bị loại: {int((~q.hop_le).sum())}"
      f"  (khám phá train > {KP_TRAIN_TOI_DA:.0%} hoặc chênh > {KP_GAP_TOI_DA:.0%})")

# Đối chứng: cùng bộ ràng buộc này nếu áp lên TƯ VẤN thì còn lại bao nhiêu?
n_tv = int(((q.tv_train <= KP_TRAIN_TOI_DA) & (q.gap_tv <= KP_GAP_TOI_DA)).sum())
print(f"\\n   Cùng ngưỡng đó áp lên chỉ số TƯ VẤN Top-{K_TU_VAN}: {n_tv}/{len(q)} hợp lệ"
      f"   (tư vấn train thấp nhất trong lưới = {q.tv_train.min():.1%})")
if n_tv == 0:
    print(f"   → Ngưỡng 95% vô nghĩa với chỉ số tư vấn vì bài toán đó quá dễ;")
    print(f"     mọi cấu hình đều vượt.")
print(f"   Chênh train−val tư vấn trải từ {q.gap_tv.min():.1%} tới {q.gap_tv.max():.1%},"
      f" khám phá từ {q.gap_kp.min():.1%} tới {q.gap_kp.max():.1%}.")'''))

C.append(code('''hl = q[q.hop_le]

# KHÔNG có nhánh dự phòng. Lần chạy trước loại sạch 48/48 rồi âm thầm "tạm lấy
# cấu hình chênh nhỏ nhất" — pipeline chạy trót lọt và cho ra một cấu hình không
# có căn cứ nào. Thà dừng hẳn còn hơn.
assert len(hl) > 0, (
    f"KHÔNG cấu hình nào trong {len(q)} vượt được ràng buộc "
    f"(khám phá train ≤ {KP_TRAIN_TOI_DA:.0%}, chênh ≤ {KP_GAP_TOI_DA:.0%}).\\n"
    f"Thấp nhất trong lưới: train {q.kp_train.min():.1%}, chênh {q.gap_kp.min():.1%}.\\n"
    f"Phải nới ngưỡng hoặc thêm cấu hình nhẹ hơn vào LUOI — không được đi tiếp.")

# Ràng buộc đặt ở chỉ số khám phá thì tiêu chí chọn cũng phải ở đó.
chot = hl.loc[hl.kp_val.idxmax()]

print("=" * 108)
print(f"{'#':>3}{'cây':>6}{'sâu':>5}{'mcw':>5}{'λ':>6}{'cols':>6}"
      f"{'kp train':>10}{'kp val':>9}{'kp chênh':>10}"
      f"{'tv train':>10}{'tv val':>9}{'tv chênh':>10}{'':>7}")
print("-" * 108)
for i, r in q.sort_values("kp_val", ascending=False).iterrows():
    cd = "✅" if r.hop_le else "❌"
    mui = " ← chốt" if i == chot.name else ""
    print(f"{i:>3}{int(r.n_estimators):>6}{int(r.max_depth):>5}"
          f"{int(r.min_child_weight):>5}{r.reg_lambda:>6.0f}{r.colsample_bytree:>6.1f}"
          f"{r.kp_train:>10.1%}{r.kp_val:>9.1%}{r.gap_kp:>+10.1%}"
          f"{r.tv_train:>10.1%}{r.tv_val:>9.1%}{r.gap_tv:>+10.1%}{cd:>4}{mui}")
print("=" * 108)
print(f"❌ = vi phạm ràng buộc cứng trên chế độ KHÁM PHÁ")
print(f"    (train > {KP_TRAIN_TOI_DA:.0%} hoặc chênh > {KP_GAP_TOI_DA:.0%})")
print(f"\\nSo cột 'kp chênh' với 'tv chênh': chỉ số nào trải rộng hơn thì tách được cấu")
print(f"hình nhớ vẹt với cấu hình lành tốt hơn — ràng buộc đặt ở đó.")

print(f"\\n── CẤU HÌNH CHỐT ──")
for k in LUOI:
    print(f"   {k:<20} {chot[k]}")
print(f"\\n   {'':12}{'train':>9}{'val':>9}{'chênh':>9}")
print(f"   {'khám phá':<12}{chot.kp_train:>9.1%}{chot.kp_val:>9.1%}"
      f"{chot.gap_kp*100:>+8.1f}đ  ← tiêu chí chọn")
print(f"   {'tư vấn':<12}{chot.tv_train:>9.1%}{chot.tv_val:>9.1%}"
      f"{chot.gap_tv*100:>+8.1f}đ")

hy_sinh = q.kp_val.max() - chot.kp_val
print(f"\\n   Cấu hình khám phá cao nhất toàn lưới: {q.kp_val.max():.1%}"
      f" (chênh {q.loc[q.kp_val.idxmax()].gap_kp*100:+.1f}đ — vi phạm)")
print(f"   Chọn cấu hình hợp lệ làm mất {hy_sinh*100:.1f} điểm val."
      f" Đó là cái giá của việc không nhớ vẹt.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 2. Tầng tư vấn — mô hình chung hay mô hình riêng từng nhóm?

Siêu tham số đã chốt bằng chỉ số khám phá ở trên. `rieng_nhom` không đụng tới tầng
khám phá nên nó không thể làm thay đổi lựa chọn đó — chỉ còn đúng một câu hỏi, và
chỉ cần đúng hai lần huấn luyện để trả lời.
'''))

C.append(code('''hp_chot = {k: (int(chot[k]) if k in ("n_estimators", "max_depth",
                                     "min_child_weight") else float(chot[k]))
           for k in LUOI}

t0 = time.time()
doi_chung = []
for rn in (False, True):
    mh_ = MoHinhNganh(D, hp=hp_chot, rieng_nhom=rn).fit(Xtr, ytr)
    doi_chung.append({
        "rieng_nhom": rn,
        "n_mo_hinh": 1 + (len(getattr(mh_, "m_nhom", {})) if rn else 0),
        "tv_train": top_k(mh_.diem(Xtr, gtr), ytr, D["nganh"])[K_TU_VAN],
        "tv_val": top_k(mh_.diem(Xva, gva), yva, D["nganh"])[K_TU_VAN]})
    print(f"   rieng_nhom={rn}  xong [{time.time()-t0:.0f}s]", flush=True)

dc = pd.DataFrame(doi_chung)
dc["gap"] = dc.tv_train - dc.tv_val

print("\\n" + "=" * 78)
print(f"{'Tầng tư vấn Top-' + str(K_TU_VAN):<34}{'số mô hình':>12}{'train':>10}{'val':>10}{'chênh':>10}")
print("-" * 78)
for r in dc.itertuples():
    ten_ = "mô hình riêng từng nhóm" if r.rieng_nhom else "mô hình chung, che bớt ngành"
    print(f"{ten_:<34}{r.n_mo_hinh:>12}{r.tv_train:>10.1%}{r.tv_val:>10.1%}"
          f"{r.gap*100:>+9.1f}đ")
print("=" * 78)

r0, r1 = dc.iloc[0], dc.iloc[1]
chenh = (r1.tv_val - r0.tv_val) * 100
RIENG_NHOM = bool(r1.tv_val > r0.tv_val and r1.gap <= KP_GAP_TOI_DA)

print(f"\\nMô hình riêng {chenh:+.1f} điểm so với mô hình chung.")
if RIENG_NHOM:
    print(f"→ CHỌN mô hình riêng từng nhóm. Giai đoạn 10 dùng rieng_nhom=True.")
    print(f"   Mỗi nhóm chỉ phải học phân biệt 3–7 ngành thay vì trải sức trên cả 39.")
else:
    print(f"→ GIỮ mô hình chung. Giai đoạn 10 dùng rieng_nhom=False.")
    print(f"   Chia nhỏ dữ liệu ra 9 mô hình làm mỗi mô hình ít dòng đi, và phần lợi")
    print(f"   từ việc chuyên biệt hoá không bù lại được.")
print(f"\\n⚠️  Chênh {abs(chenh):.1f} điểm trên {len(val):,} dòng val — sai số khoảng"
      f" ±{1.96*np.sqrt(r0.tv_val*(1-r0.tv_val)/len(val))*100:.1f} điểm.")
if abs(chenh) < 1.96 * np.sqrt(r0.tv_val * (1 - r0.tv_val) / len(val)) * 100:
    print(f"   Chênh nhỏ hơn sai số — hai cách gần như tương đương, đừng kết luận mạnh.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 9.1 — Đánh đổi giữa val và nhớ vẹt ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))
mau = np.where(q.hop_le, C_GA, C_XAM)
a1.scatter(q.kp_train * 100, q.kp_val * 100, s=90, c=mau,
           edgecolor="white", lw=1, zorder=3)
a1.scatter([chot.kp_train * 100], [chot.kp_val * 100], s=230, facecolor="none",
           edgecolor=C_THAT, lw=2.6, zorder=4)
a1.axvline(KP_TRAIN_TOI_DA * 100, color=C_THAT, ls="--", lw=2)
a1.text(KP_TRAIN_TOI_DA * 100 - .4, q.kp_val.min() * 100,
        f"train ≤ {KP_TRAIN_TOI_DA:.0%}", fontsize=9, color=C_THAT,
        ha="right", rotation=90)
lo = min(q.kp_train.min(), q.kp_val.min()) * 100 - 1
a1.plot([lo, 100], [lo, 100], ":", color=C_XAM, lw=1.4)
a1.set_xlabel("Top-3 KHÁM PHÁ trên TRAIN (%)")
a1.set_ylabel("Top-3 KHÁM PHÁ trên VAL (%)")
a1.set_title("Càng sát đường chéo càng ít nhớ vẹt", fontsize=12)
a1.legend(handles=[Patch(facecolor=C_GA, label="hợp lệ"),
                   Patch(facecolor=C_XAM, label="bị loại")], fontsize=9, loc="lower right")

a2.scatter(q.gap_kp * 100, q.kp_val * 100, s=90, c=mau,
           edgecolor="white", lw=1, zorder=3, label="khám phá")
a2.scatter(q.gap_tv * 100, q.tv_val * 100, s=40, c=C_CAM, marker="^",
           edgecolor="white", lw=.6, zorder=2, label=f"tư vấn Top-{K_TU_VAN} (để so)")
a2.scatter([chot.gap_kp * 100], [chot.kp_val * 100], s=230, facecolor="none",
           edgecolor=C_THAT, lw=2.6, zorder=4)
a2.axvline(KP_GAP_TOI_DA * 100, color=C_THAT, ls="--", lw=2)
a2.text(KP_GAP_TOI_DA * 100 + .3, q.kp_val.min() * 100,
        f"chênh ≤ {KP_GAP_TOI_DA:.0%}", fontsize=9, color=C_THAT)
a2.set_xlabel("Chênh train − val (điểm %)")
a2.set_ylabel(f"VAL (%) — khám phá Top-3 · tư vấn Top-{K_TU_VAN}")
a2.set_title("Vì sao ràng buộc phải đặt ở khám phá", fontsize=12)
a2.legend(fontsize=9, loc="center right")

fig.suptitle("Hình 9.1 — Hai ràng buộc cứng loại bỏ cấu hình nào",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_9_1_rang_buoc.png",
    f"Vòng đỏ là cấu hình chốt: khám phá val {chot.kp_val:.1%} với chênh train−val "
    f"{chot.gap_kp*100:.1f} điểm. {int((~q.hop_le).sum())}/{len(q)} cấu hình bị loại — "
    f"nhiều cấu hình trong số đó có val CAO HƠN, nhưng con số đó dựa vào việc mô hình "
    f"đã thuộc lòng dữ liệu huấn luyện. Bảng phải bên cho thấy vì sao ràng buộc không "
    f"thể đặt ở chỉ số tư vấn (tam giác cam): cả 48 cấu hình chụm lại quanh chênh "
    f"{q.gap_tv.min()*100:.0f}–{q.gap_tv.max()*100:.0f} điểm, không tách được cấu hình "
    f"nhớ vẹt với cấu hình lành.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 9.2 — So với bốn mốc, cả hai chế độ ═══════════
ten_moc, gt_tv, gt_kp = [], [], []
for t, v in MOC["moc"].items():
    if not t.startswith("MÔ HÌNH"):
        ten_moc.append(t); gt_tv.append(v["tv_val"] * 100); gt_kp.append(v["kp_val"] * 100)
ten_moc.append("MÔ HÌNH đã tinh chỉnh")
gt_tv.append(chot.tv_val * 100); gt_kp.append(chot.kp_val * 100)

fig, (a1, a2) = plt.subplots(1, 2, figsize=(16, 5))
for ax, gt, ten_, k_ in [(a1, gt_tv, "Chế độ TƯ VẤN", K_TU_VAN),
                         (a2, gt_kp, "Chế độ KHÁM PHÁ  ← tiêu chí chọn", 3)]:
    mau2 = [C_XAM] * (len(ten_moc) - 1) + [C_XANH]
    ax.barh(np.arange(len(ten_moc)), gt, color=mau2, height=.62)
    ax.set_yticks(np.arange(len(ten_moc)))
    ax.set_yticklabels([ngat_dong(t, 22) for t in ten_moc], fontsize=8.5)
    ax.invert_yaxis(); ax.grid(axis="y", alpha=0)
    ax.set_xlabel(f"Top-{k_} trên val (%)"); ax.set_xlim(0, max(gt) * 1.22)
    ax.set_title(ten_, fontsize=12)
    for i, v_ in enumerate(gt):
        ax.text(v_ + 1.2, i, f"{v_:.1f}%", va="center", fontsize=9, fontweight="bold")

fig.suptitle("Hình 9.2 — Mô hình đã tinh chỉnh so với bốn mốc đối chứng",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
hon_tv = gt_tv[-1] - max(gt_tv[:-1])
hon = gt_kp[-1] - max(gt_kp[:-1])
luu(fig, OUT, "hinh_9_2_vs_moc.png",
    f"Ở chế độ khám phá, mô hình sau tinh chỉnh đạt {chot.kp_val:.1%}, hơn mốc mạnh "
    f"nhất ({ten_moc[int(np.argmax(gt_kp[:-1]))]}, {max(gt_kp[:-1]):.1f}%) {hon:+.1f} "
    f"điểm. Ở chế độ tư vấn (Top-{K_TU_VAN}) khoảng cách là {hon_tv:+.1f} điểm. "
    f"Con số ở đây đã qua hai ràng buộc chống nhớ vẹt nên thấp hơn Giai đoạn 8, nhưng "
    f"nó không dựa vào việc mô hình đã thuộc lòng tập huấn luyện.")
plt.show()'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''(OUT / "sieu_tham_so.json").write_text(json.dumps({
    "hp": hp_chot,
    "rieng_nhom": RIENG_NHOM,
    "rang_buoc": {"do_tren": "khám phá (xếp hạng cả 39 ngành)",
                  "kp_train_toi_da": KP_TRAIN_TOI_DA,
                  "kp_gap_toi_da": KP_GAP_TOI_DA},
    "n_cau_hinh": len(q), "n_hop_le": int(q.hop_le.sum()),
    "n_hop_le_neu_ap_len_tu_van": n_tv,
    "k_tu_van": K_TU_VAN,
    "val": {"kp_train": round(float(chot.kp_train), 4),
            "kp_val": round(float(chot.kp_val), 4),
            "gap_kp": round(float(chot.gap_kp), 4),
            "tv_train": round(float(chot.tv_train), 4),
            "tv_val": round(float(chot.tv_val), 4),
            "gap_tv": round(float(chot.gap_tv), 4)},
    "doi_chung_tang_tu_van": dc.to_dict("records"),
}, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 9 — TINH CHỈNH", [
    f"Quét                   {len(q)} cấu hình",
    f"Ràng buộc cứng         đo trên chế độ KHÁM PHÁ",
    f"   khám phá train      ≤ {KP_TRAIN_TOI_DA:.0%}",
    f"   khám phá chênh      ≤ {KP_GAP_TOI_DA:.0%}",
    f"   hợp lệ              {int(q.hop_le.sum())}/{len(q)}",
    f"   (cùng ngưỡng áp lên tư vấn: {n_tv}/{len(q)} — nên không dùng được)",
    "",
    "CẤU HÌNH CHỐT:",
] + [f"   {k:<20} {hp_chot[k]}" for k in LUOI] + [
    f"   {'rieng_nhom':<20} {RIENG_NHOM}",
    "",
    f"Trên val (khám phá Top-3 · tư vấn Top-{K_TU_VAN}):",
    f"   {'':12}{'train':>9}{'val':>9}{'chênh':>9}",
    f"   {'khám phá':<12}{chot.kp_train:>9.1%}{chot.kp_val:>9.1%}"
    f"{chot.gap_kp*100:>+8.1f}đ",
    f"   {'tư vấn':<12}{chot.tv_train:>9.1%}{chot.tv_val:>9.1%}"
    f"{chot.gap_tv*100:>+8.1f}đ",
    "",
    f"Hơn mốc mạnh nhất      khám phá {hon:+.1f}đ · tư vấn {hon_tv:+.1f}đ",
    f"Giá của ràng buộc      −{hy_sinh*100:.1f} điểm khám phá val",
    "",
    "⚠️  Giai đoạn 10 mở test_KHOA.csv ĐÚNG MỘT LẦN bằng cấu hình này",
])
print(f"\\n✅ sieu_tham_so.json · ket_qua_quet.csv · 2 hình  →  {OUT}")'''))

viet("09_TinhChinh.ipynb", C)
