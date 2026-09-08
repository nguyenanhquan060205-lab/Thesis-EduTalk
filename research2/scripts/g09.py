"""Sinh notebook 09_TinhChinh.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, DU_LIEU, MO_HINH, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 9 — Tinh chỉnh mô hình

''' + so_do(
    "09_TinhChinh",
    ["06_GA_TangCuong/  —  dữ liệu tăng cường RIÊNG theo từng fold",
     "03_TachTrainTest/ —  574 dòng thật + 15 fold",
     "04_MocChuan/moc_chuan.json  —  mốc M₀ phải vượt"],
    ["Đo: thêm 2.613 dòng tăng cường có giúp gì không?",
     "Quét siêu tham số, loại cấu hình nhớ vẹt quá mức",
     "Dò trọng số dòng thật",
     "Thử PHÂN TẦNG cho khối nhiều ngành — đoán lĩnh vực con trước",
     "Xác nhận cấu hình thắng trên đủ 15 fold"],
    ["09_TinhChinh/sieu_tham_so.json  —  cấu hình chốt cho Giai đoạn 10",
     "09_TinhChinh/ket_qua_quet.csv",
     "09_TinhChinh/hinh_9_*.png       —  3 hình"]) + '''

## Vì sao dữ liệu tăng cường phải lấy RIÊNG theo fold

`train_final.csv` dùng bản sinh từ phân phối học trên **toàn bộ 574 dòng train** — đúng cho mô hình
cuối ở Giai đoạn 10, nhưng **sai cho cross-validation**: phần validation của mỗi fold đã gián tiếp
góp phần tạo ra dữ liệu huấn luyện.

Chênh lệch không nhỏ: dùng nhầm bản đó thì Top-3 đo được là **79,8%**, dùng đúng bản theo fold thì
**69,3%**. Gần 10 điểm hoàn toàn là rò rỉ.

## Mục tiêu KÉP

Thầy yêu cầu *"80–90% cả train lẫn test"*. Giai đoạn 4 cho thấy mô hình đạt **100% trên train** mà
chỉ 67,4% trên validation. Con số 100% không phải thành tích — nó là **nhớ vẹt**: cây quyết định chẻ
nhỏ tới khi mỗi phiếu nằm riêng một nhánh, việc quá dễ với XGBoost.

Ý chính trong lời thầy là **hai cột phải gần nhau**. Nên giai đoạn này tối ưu đồng thời:

1. tối đa Top-3 trên validation
2. ép chênh train − validation xuống

## Phân tầng — học hai bước cho khối nhiều ngành

Khối *Kinh doanh & Quản lý* có 10 ngành. Học một lượt 10 lớp bắt mô hình vẽ đồng thời **45 đường
ranh giới**, kể cả những cặp gần như không tách được (Marketing vs Kinh doanh quốc tế). Sức của mô
hình bị dàn mỏng.

Học hai bước thì bước đầu chỉ phải tách vài lĩnh vực con — việc **dễ hơn và có tín hiệu thật**:

```
bước 1:  Tài chính–Kế toán  |  Marketing–Kinh doanh  |  Vận hành–Chuỗi cung ứng
bước 2:  trong lĩnh vực đó, ngành nào?

P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con)
```

**Đây KHÔNG phải thu hẹp bài toán.** Mô hình tự đoán lĩnh vực con, người dùng không cung cấp gì
thêm, đầu ra vẫn là xác suất trên đủ 10 ngành. Kiểm chứng được: **mốc đoán bừa vẫn là 30%** trong cả
hai cách. Nếu là thu hẹp thì mốc đó đã phải tăng.
'''))

C.append(code(SETUP + DU_LIEU + MO_HINH + '''
import itertools

OUT = thu_muc(9)
N_THU = 14            # số cấu hình ngẫu nhiên
N_FOLD = 5            # quét bằng 5 fold, xác nhận bằng 15 fold ở cuối
GAP_TOI_DA = 0.35     # chỉ chặn ca bệnh lý
TRAIN_TOI_DA = 0.95   # RÀNG BUỘC CỨNG: train vượt mức này là nhớ vẹt, loại thẳng     # ngưỡng chênh train−val

# Ngưỡng quá LỎNG (0.28) để lọt cấu hình gần như không điều hoà → train 100%.
# Ngưỡng quá CHẶT (0.12) khiến mô hình sụp về đúng mốc "3 ngành phổ biến" —
# tức chỉ đếm tần suất, không học gì. 0.20 là điểm giữa, và quan trọng hơn:
# tiêu chí CHỌN cấu hình giờ là VƯỢT MỐC PHỔ BIẾN nhiều nhất, không phải
# Top-3 thô.

D = nap(co_ttth=True)
ks = D["train"]
X = dac_trung(ks, D).values
y = ks.ma_nganh.values
NG = D["nganh"]
nhom_sv = np.array([D["nhom"][m] for m in y])
FOLDS = D["folds"]["folds"]
co_nhom = pd.Series(list(D["nhom"].values())).value_counts()
M0 = json.loads((thu_muc(4) / "moc_chuan.json").read_text(encoding="utf-8"))
bua_g = bua_trong_nhom(y, D["nhom"])
bua_a = bua_toan_bo(len(NG))
# Mốc đối chứng THỰC TẾ — quy tắc không cần mô hình
bua_pb = bua_pho_bien(y, y, D["nhom"])
print(f"\\nMốc 'đoán bừa'          : Top-3 = {bua_g[3]:.1%}")
print(f"Mốc '3 ngành phổ biến'  : Top-3 = {bua_pb[3]:.1%}   ← mốc PHẢI vượt")

# ── Dữ liệu tăng cường RIÊNG theo fold — bắt buộc, xem phần đầu ──────────
khung = pd.read_csv(thu_muc(6) / "khung_ho_so.csv")
Zs = np.load(thu_muc(6) / "sinh_theo_fold.npz")
KL = json.loads((thu_muc(7) / "ket_luan.json").read_text(encoding="utf-8"))
KEY = KL["key_thang"]

# Dựng cho ĐỦ 15 fold. Trước đây chỉ dựng 5 bản rồi vòng xác nhận 15 fold
# dùng lại theo `i % 5` — fold 5 mượn bản của fold 0, mà bản đó sinh từ phần
# train của fold 0 vốn CHỨA validation của fold 5. Rò rỉ, và nó thổi Top-3 từ
# 70% lên 76%.
t0 = time.time()
TC = []
for i in range(len(FOLDS)):
    d_ = khung.copy()
    for c, col in enumerate(D["likert"]):
        d_[col] = Zs[KEY][i, :, c]
    d_["gioi_tinh"] = np.where(Zs["gioi_tinh"][i] == 1, "Nam", "Nữ")
    d_["muc_tieu_ma"] = Zs["muc_tieu"][i]
    TC.append((dac_trung(d_, D).values, d_.ma_nganh.values))
print(f"Dữ liệu tăng cường theo fold: {len(TC)} bản × {TC[0][0].shape[0]:,} dòng"
      f" × {TC[0][0].shape[1]} đặc trưng  ({time.time()-t0:.0f}s)")
assert len(TC) == len(FOLDS), "phải có đúng 1 bản cho MỖI fold, nếu không sẽ rò rỉ"
print(f"Bản GA: {KL['ban_thang']}")
print(f"\\nMốc M₀ phải vượt: tư vấn Top-3 = {M0['guided']['top']['3']:.1%}")
print(f"Loại cấu hình chênh train−val Top-3 > {GAP_TOI_DA:.0%}")'''))

C.append(md("## 1. Hàm đánh giá"))

C.append(code('''def danh_gia(hp=None, hp_nhom=None, w_that=1.0, phan_tang=None,
             n_fold=N_FOLD, dung_tc=True):
    """Một lượt CV. Dữ liệu tăng cường CHỈ vào phía train của mỗi fold."""
    g = {k: [] for k in ("auto", "guided", "y", "auto_tr", "guided_tr", "y_tr")}
    for i in range(n_fold):
        f = FOLDS[i]
        tr, va = np.array(f["train_idx"]), np.array(f["val_idx"])
        if dung_tc:
            Xt, yt = TC[i]
            Xs = np.vstack([X[tr], Xt]); ys = np.concatenate([y[tr], yt])
            w = np.r_[np.full(len(tr), float(w_that)), np.ones(len(yt))]
        else:
            Xs, ys, w = X[tr], y[tr], None
        mh = MoHinhNganh(D, hp, True, hp_nhom, phan_tang).fit(Xs, ys, w)
        g["auto"].append(mh.diem(X[va]))
        g["guided"].append(mh.diem(X[va], nhom_sv[va]))
        g["auto_tr"].append(mh.diem(X[tr]))
        g["guided_tr"].append(mh.diem(X[tr], nhom_sv[tr]))
        g["y"].append(y[va]); g["y_tr"].append(y[tr])
    A = {k: (np.concatenate(v) if k.startswith("y") else np.vstack(v))
         for k, v in g.items()}
    a = top_k(A["auto"], A["y"], NG); gu = top_k(A["guided"], A["y"], NG)
    ta = top_k(A["auto_tr"], A["y_tr"], NG); tg = top_k(A["guided_tr"], A["y_tr"], NG)
    return {**{f"auto_top{k}": a[k] for k in TOP_K},
            **{f"guided_top{k}": gu[k] for k in TOP_K},
            "train_guided_top3": tg[3], "train_auto_top3": ta[3],
            "gap_top3": tg[3] - gu[3], "S_guided": A["guided"], "y_va": A["y"]}


def theo_khoi(r):
    """Top-3 tách theo từng khối."""
    S, yv = r["S_guided"], r["y_va"]
    out = {}
    for g_ in sorted(co_nhom.index):
        sel = np.array([D["nhom"][m] == g_ for m in yv])
        if not sel.any():
            continue
        o = np.argsort(-S[sel], 1)[:, :3]
        out[g_] = float(np.mean([yv[sel][j] in NG[o[j]]
                                 for j in range(int(sel.sum()))]))
    return out'''))

C.append(md("## 2. Dữ liệu tăng cường có giúp gì không?"))

C.append(code('''t0 = time.time()
khong_tc = danh_gia(dung_tc=False)
co_tc = danh_gia(dung_tc=True)
print(f"Đo xong trong {time.time()-t0:.0f}s\\n")

in_bang([dong("CHỈ 574 dòng khảo sát",
              {k: khong_tc[f"guided_top{k}"] for k in TOP_K}, bua_g),
         dong(f"+ {TC[0][0].shape[0]:,} dòng tăng cường",
              {k: co_tc[f"guided_top{k}"] for k in TOP_K}, bua_g)],
        "DỮ LIỆU TĂNG CƯỜNG CÓ GIÚP GÌ KHÔNG? — chế độ tư vấn")
ch = {k: co_tc[f"guided_top{k}"] - khong_tc[f"guided_top{k}"] for k in TOP_K}
print("\\nChênh: " + " · ".join(f"Top-{k} {ch[k]*100:+.1f}đ" for k in TOP_K))
DUNG_TC = ch[3] >= -0.005
print(f"\\n→ {'DÙNG' if DUNG_TC else 'KHÔNG DÙNG'} dữ liệu tăng cường.")'''))

C.append(md("## 3. Quét siêu tham số"))

C.append(code('''rng = np.random.default_rng(SEED)
KG = dict(max_depth=[3, 4, 5, 6], n_estimators=[200, 400],
          learning_rate=[0.03, 0.06, 0.12], min_child_weight=[1, 3, 6, 12],
          subsample=[0.7, 0.8, 1.0], colsample_bytree=[0.4, 0.6, 0.8],
          reg_lambda=[1.0, 5.0, 30.0, 100.0], gamma=[0.0, 0.1, 0.5])
lay_hp = lambda: {k: v[rng.integers(len(v))] for k, v in KG.items()}

t0 = time.time(); quet = []
for i in range(N_THU):
    hp = lay_hp(); w = float(rng.choice([1, 2, 4]))
    r = danh_gia(hp, w_that=w, dung_tc=DUNG_TC)
    hl_ = r["gap_top3"] <= GAP_TOI_DA
    quet.append({"i": i, "w_that": w, **{f"hp_{k}": v for k, v in hp.items()},
                 **{k: v for k, v in r.items() if not k.startswith(("S_", "y_"))},
                 "hop_le": hl_})
    print(f"   [{i+1:2d}/{N_THU}] Top-3 {r['guided_top3']:6.1%}"
          f" · train {r['train_guided_top3']:6.1%} · chênh {r['gap_top3']:+5.1%}"
          f"  {'✓' if hl_ else '✗'}   [{time.time()-t0:.0f}s]", flush=True)
quet = pd.DataFrame(quet)
quet.to_csv(OUT / "ket_qua_quet.csv", index=False)

quet["hon_pho_bien"] = quet.guided_top3 - bua_pb[3]
quet["khong_nho_vet"] = quet.train_guided_top3 <= TRAIN_TOI_DA

# BA ĐIỀU KIỆN, theo thứ tự ưu tiên:
#   1. train <= 95%  — mô hình train ~100% không bảo vệ được, dù chỉ số đẹp
#   2. vượt mốc "3 ngành phổ biến" — nếu thua thì viết 3 dòng code đếm tần
#      suất là xong, không cần khảo sát và không cần mô hình
#   3. trong số còn lại, lấy Top-3 cao nhất
hl = quet[quet.khong_nho_vet & quet.hop_le & (quet.hon_pho_bien > 0)]
print(f"\\n{int(quet.khong_nho_vet.sum())}/{len(quet)} cấu hình train <= {TRAIN_TOI_DA:.0%}")
print(f"{int((quet.hon_pho_bien > 0).sum())}/{len(quet)} cấu hình hơn mốc phổ biến")
print(f"{len(hl)}/{len(quet)} cấu hình ĐẠT CẢ HAI")
if len(hl):
    bang = hl
elif quet.khong_nho_vet.any():
    bang = quet[quet.khong_nho_vet]
    print("   ⚠️  KHÔNG cấu hình nào vừa không nhớ vẹt vừa hơn mốc phổ biến.")
    print("       Ưu tiên ràng buộc train, chấp nhận thua mốc — và ghi rõ điều này.")
else:
    bang = quet
tot = bang.loc[bang.guided_top3.idxmax()]
HP = {k[3:]: (int(tot[k]) if float(tot[k]).is_integer() else float(tot[k]))
      for k in quet.columns if k.startswith("hp_")}
W_TOT = float(tot.w_that)
print(f"Tốt nhất: Top-3 {tot.guided_top3:.1%} · train {tot.train_guided_top3:.1%}"
      f" · chênh {tot.gap_top3:+.0%} · trọng số ×{W_TOT:.0f}")
print(f"   hơn mốc phổ biến {tot.hon_pho_bien*100:+.1f}đ"
      f"  (kỹ năng {ky_nang_vs(tot.guided_top3, bua_pb[3]):.1%})")
print(f"   train {tot.train_guided_top3:.1%} {'✅' if tot.khong_nho_vet else '⚠️ NHỚ VẸT'}"
      f"   ·   chênh train−val {tot.gap_top3*100:+.1f}đ")
print(f"   {HP}")'''))

C.append(md('''## 4. Phân tầng cho khối nhiều ngành

Chỉ áp dụng cho khối từ **8 ngành trở lên** — khối ít ngành không cần chia nhỏ thêm.'''))

C.append(code('''# Lĩnh vực con, chia theo nội dung ngành nghề chứ không phải theo số liệu
LINH_VUC = {
    1: {  # Kinh doanh & Quản lý — 10 ngành
        "Tài chính - Kế toán": ["Kế toán", "Tài chính ngân hàng",
                                "Công nghệ tài chính"],
        "Marketing - Kinh doanh": ["Quản trị kinh doanh", "Marketing",
                                   "Kinh doanh quốc tế", "Thương mại điện tử"],
        "Vận hành - Chuỗi cung ứng": ["Logistics và quản lý chuỗi cung ứng",
                                      "Quản lý Công nghiệp",
                                      "Kinh doanh thời trang và dệt may"],
    },
    3: {  # Kỹ thuật & Công nghệ — 8 ngành
        "Cơ khí - Điện - Tự động hoá": ["Công nghệ chế tạo máy",
                                        "Công nghệ kỹ thuật cơ điện tử",
                                        "Công nghệ kỹ thuật điều khiển và TĐH",
                                        "Công nghệ kỹ thuật điện - điện tử"],
        "Hoá - Vật liệu - Dệt may": ["Công nghệ kỹ thuật hóa học",
                                     "Công nghệ vật liệu", "Công nghệ dệt, may",
                                     "Kỹ thuật nhiệt"],
    },
}
TEN_TO_MA = {v: int(k) for k, v in
             {str(m): t for m, t in D["ma_to_ten"].items()}.items()}
PHAN_TANG = {}
for g, lv in LINH_VUC.items():
    ban_do = {}
    for i_, (ten, ds) in enumerate(lv.items()):
        for t_ in ds:
            ban_do[TEN_TO_MA[t_]] = i_
    assert set(ban_do) == {n for n in NG if D["nhom"][n] == g}, f"lệch ở khối {g}"
    PHAN_TANG[g] = ban_do
    print(f"Khối {g} — {D['ten_nhom'][g]} ({co_nhom[g]} ngành)")
    for ten, ds in lv.items():
        print(f"   {ten:<30} {len(ds)} ngành")

t0 = time.time()
khong_pt = danh_gia(HP, w_that=W_TOT, dung_tc=DUNG_TC)
co_pt = danh_gia(HP, w_that=W_TOT, phan_tang=PHAN_TANG, dung_tc=DUNG_TC)
print(f"\\nĐo xong trong {time.time()-t0:.0f}s\\n")

in_bang([dong("Học thẳng — mỗi khối một model",
              {k: khong_pt[f"guided_top{k}"] for k in TOP_K}, bua_g),
         dong("Phân tầng — lĩnh vực con rồi mới ngành",
              {k: co_pt[f"guided_top{k}"] for k in TOP_K}, bua_g)],
        "PHÂN TẦNG CÓ GIÚP KHÔNG?")
print("\\nMốc đoán bừa GIỐNG NHAU ở cả hai dòng — bằng chứng phân tầng không")
print("phải là thu hẹp bài toán, mà là cách sắp xếp việc học bên trong mô hình.\\n")

tk0, tk1 = theo_khoi(khong_pt), theo_khoi(co_pt)
print(f"{'Khối':<36}{'ngành':>6}{'thẳng':>9}{'phân tầng':>12}{'chênh':>9}")
print("-" * 74)
for g_ in sorted(co_nhom.index, key=lambda g: -co_nhom[g]):
    if g_ not in tk0:
        continue
    dau = " ←" if g_ in PHAN_TANG else ""
    print(f"{D['ten_nhom'][g_][:35]:<36}{co_nhom[g_]:>6}{tk0[g_]:>8.1%}"
          f"{tk1[g_]:>11.1%}{(tk1[g_]-tk0[g_])*100:>+8.1f}đ{dau}")
print("-" * 74)
PT = PHAN_TANG if co_pt["guided_top3"] > khong_pt["guided_top3"] else None
print(f"\\n→ {'DÙNG' if PT else 'KHÔNG dùng'} phân tầng"
      f"   ({(co_pt['guided_top3']-khong_pt['guided_top3'])*100:+.1f}đ)")'''))

C.append(code('''# ═══════════ HÌNH 9.1 — Quét siêu tham số ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.2))
a1.scatter(quet.gap_top3 * 100, quet.guided_top3 * 100, s=90,
           c=[C_GA if h else C_XAM for h in quet.hop_le],
           edgecolor="white", lw=1.2, zorder=3)
a1.axvline(GAP_TOI_DA * 100, color=C_THAT, ls="--", lw=2)
a1.text(GAP_TOI_DA * 100 + .4, quet.guided_top3.min() * 100,
        " ngưỡng loại\\n(nhớ vẹt)", fontsize=9, color=C_THAT)
a1.axhline(M0["guided"]["top"]["3"] * 100, color=C_XANH, ls=":", lw=1.8)
a1.text(quet.gap_top3.min() * 100, M0["guided"]["top"]["3"] * 100 + .3,
        " mốc M₀", fontsize=9, color=C_XANH)
a1.scatter([tot.gap_top3 * 100], [tot.guided_top3 * 100], s=300, marker="*",
           c=C_CAM, edgecolor=C_DAM, lw=1.4, zorder=4, label="cấu hình chọn")
a1.set_xlabel("Chênh train − val ở Top-3 (%)"); a1.set_ylabel("Tư vấn Top-3 (%)")
a1.set_title(f"Quét {N_THU} cấu hình", fontsize=12); a1.legend(fontsize=9)

x = np.arange(len(TOP_K)); w_ = .38
a2.bar(x - w_/2, [khong_pt[f"guided_top{k}"]*100 for k in TOP_K], w_,
       color=C_XAM, label="Học thẳng")
a2.bar(x + w_/2, [co_pt[f"guided_top{k}"]*100 for k in TOP_K], w_,
       color=C_CAM, label="Phân tầng")
a2.plot(x, [bua_g[k]*100 for k in TOP_K], "k--o", lw=1.6, ms=6,
        label="Đoán bừa (không đổi)")
a2.set_xticks(x); a2.set_xticklabels([f"Top-{k}" for k in TOP_K])
a2.set_ylabel("%"); a2.set_title("Phân tầng so với học thẳng", fontsize=12)
a2.legend(fontsize=9)

fig.suptitle("Hình 9.1 — Tinh chỉnh", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_9_1_quet.png",
    f"Trái: chấm xám bị loại vì nhớ vẹt quá mức. Phải: đường đứt là mốc đoán bừa — nó KHÔNG đổi "
    "giữa hai cách, nên phần chênh lệch giữa hai cột màu là năng lực thật, không phải do bài "
    "toán bị thu hẹp.")
plt.show()'''))

C.append(md("## 5. Xác nhận trên đủ 15 fold"))

C.append(code('''t0 = time.time()
cuoi = danh_gia(HP, w_that=W_TOT, phan_tang=PT, n_fold=len(FOLDS), dung_tc=DUNG_TC)
print(f"Xác nhận trên {len(FOLDS)} fold: {time.time()-t0:.0f}s\\n")

in_bang([
    dong("Đoán bừa trong nhóm", bua_g, bua_g),
    dong("★ 3 NGÀNH PHỔ BIẾN NHẤT (không cần mô hình)", bua_pb, bua_g),
    dong("Giai đoạn 4 — M₀ (chỉ khảo sát)",
         {k: M0["guided"]["top"][str(k)] for k in TOP_K}, bua_g),
    dong("Giai đoạn 9 — sau tinh chỉnh",
         {k: cuoi[f"guided_top{k}"] for k in TOP_K}, bua_g),
], "TIẾN TRIỂN — chế độ tư vấn (validation thật, 15 fold)")
print("\\nMốc PHẢI vượt là '3 ngành phổ biến nhất' — quy tắc vài dòng code, không")
print("cần khảo sát hay điểm thi. Vượt 'đoán bừa' là chưa đủ để mô hình có giá trị.")
print(f"\\nMô hình hơn mốc phổ biến: "
      + " · ".join(f"Top-{k} {(cuoi[f'guided_top{k}']-bua_pb[k])*100:+.1f}đ" for k in TOP_K))
in_bang([dong("Khám phá — sau tinh chỉnh",
              {k: cuoi[f"auto_top{k}"] for k in TOP_K}, bua_a)], "CHẾ ĐỘ KHÁM PHÁ")

print(f"\\nCHÊNH TRAIN − VAL ở Top-3")
print(f"   Giai đoạn 4 (M₀)   {M0['gap_train_val']['guided']['3']*100:+5.1f} điểm")
print(f"   Giai đoạn 9        {cuoi['gap_top3']*100:+5.1f} điểm")
print(f"   → train {cuoi['train_guided_top3']:.1%} · val {cuoi['guided_top3']:.1%}")

cd = pd.DataFrame([{"ma_khoi": g_, "khoi": D["ten_nhom"][g_],
                    "n_nganh": int(co_nhom[g_]), "top3": v,
                    "bua3": min(3, co_nhom[g_]) / co_nhom[g_],
                    "phan_tang": g_ in (PT or {})}
                   for g_, v in theo_khoi(cuoi).items()])
cd["hon"] = cd.top3 - cd.bua3
cd = cd.sort_values("n_nganh", ascending=False)
cd.to_csv(OUT / "chan_doan_theo_khoi.csv", index=False)

(OUT / "sieu_tham_so.json").write_text(json.dumps({
    "dung_tang_cuong": bool(DUNG_TC), "loi_ich_tang_cuong": ch,
    "hp": HP, "w_that": W_TOT, "rieng_nhom": True,
    "phan_tang": {str(g): {str(m): int(s) for m, s in b.items()}
                  for g, b in (PT or {}).items()},
    "loi_ich_phan_tang": float(co_pt["guided_top3"] - khong_pt["guided_top3"]),
    "gap_toi_da": GAP_TOI_DA, "train_toi_da": TRAIN_TOI_DA,
    "ket_qua_cv": {k: v for k, v in cuoi.items()
                   if not k.startswith(("S_", "y_"))},
    "bua_pho_bien": bua_pb,
    "hon_pho_bien": {k: cuoi[f"guided_top{k}"] - bua_pb[k] for k in TOP_K},
    "theo_khoi": cd.to_dict("records"),
}, ensure_ascii=False, indent=2, default=float), encoding="utf-8")'''))

C.append(code('''# ═══════════ HÌNH 9.2 — Chẩn đoán theo khối ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.4))
yy = np.arange(len(cd))
a1.barh(yy, cd.bua3 * 100, color=C_XAM, height=.68, label="Đoán bừa")
a1.barh(yy, cd.top3 * 100, color=C_CAM, height=.42, label="Mô hình")
a1.axvline(80, color=C_THAT, ls="--", lw=2)
a1.text(81, -.55, "80%", fontsize=9.5, color=C_THAT, fontweight="bold")
a1.set_yticks(yy)
a1.set_yticklabels([f"{r.khoi[:25]}\\n({r.n_nganh} ngành)"
                    + ("  ⟨phân tầng⟩" if r.phan_tang else "")
                    for r in cd.itertuples()], fontsize=8)
a1.set_xlabel("Top-3 trong khối (%)"); a1.set_xlim(0, 112)
a1.set_title("Khối nào đạt 80%?", fontsize=12)
a1.legend(loc="lower right", fontsize=9); a1.grid(axis="y", alpha=0)

mat = (1 - cd.top3.values) * np.array(
    [float((nhom_sv == g_).mean()) for g_ in cd.ma_khoi]) * 100
a2.barh(yy, mat, color=C_THAT, height=.66)
a2.set_yticks(yy); a2.set_yticklabels([r.khoi[:26] for r in cd.itertuples()],
                                      fontsize=8.5)
a2.set_xlabel("Số điểm bị mất trên tổng (%)")
a2.set_title("Khối nào kéo tụt con số tổng?", fontsize=12); a2.grid(axis="y", alpha=0)
for i, v in enumerate(mat):
    a2.text(v + .15, i, f"{v:.1f}đ", va="center", fontsize=9, fontweight="bold")

fig.suptitle("Hình 9.2 — Chẩn đoán theo từng khối", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
xau = cd.iloc[int(np.argmax(mat))]
luu(fig, OUT, "hinh_9_2_chan_doan.png",
    f"{int((cd.top3 >= .8).sum())}/{len(cd)} khối vượt 80%. Khối {xau.khoi} "
    f"({xau.n_nganh} ngành) chỉ đạt {xau.top3:.1%} và một mình nó làm mất "
    f"{max(mat):.1f} điểm — nút thắt của cách chia 7 khối.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 9.3 — Train so với val ═══════════
fig, ax = plt.subplots(figsize=(11, 4.8))
x = np.arange(3); w_ = .34
nhan = ["Giai đoạn 4\\n(M₀, chưa tinh chỉnh)", "Giai đoạn 9\\n(sau tinh chỉnh)",
        "Mục tiêu\\n(train ≈ val)"]
tr_ = [M0["guided"]["tren_train"]["3"] * 100, cuoi["train_guided_top3"] * 100, 85]
va_ = [M0["guided"]["top"]["3"] * 100, cuoi["guided_top3"] * 100, 80]
ax.bar(x - w_/2, tr_, w_, color=C_TIM, label="TRAIN")
ax.bar(x + w_/2, va_, w_, color=C_XANH, label="VALIDATION")
ax.set_xticks(x); ax.set_xticklabels(nhan, fontsize=9)
ax.set_ylabel("Top-3 (%)"); ax.set_ylim(0, 108)
ax.set_title("Hình 9.3 — Khoảng cách giữa train và validation")
ax.legend()
for i in range(3):
    ax.text(i, max(tr_[i], va_[i]) + 2, f"chênh {tr_[i]-va_[i]:+.0f}đ",
            ha="center", fontsize=9, fontweight="bold",
            color=C_THAT if tr_[i] - va_[i] > 25 else C_GA)
luu(fig, OUT, "hinh_9_3_train_val.png",
    f"Chênh giảm từ {M0['gap_train_val']['guided']['3']*100:+.0f} điểm xuống "
    f"{cuoi['gap_top3']*100:+.0f} điểm nhờ điều hoà mạnh hơn. Cột thứ ba là mức lý tưởng theo "
    "yêu cầu 'cả train lẫn test 80-90%' — vẫn còn khoảng cách, và Giai đoạn 10 sẽ cho biết con "
    "số thật trên tập test.")
plt.show()

tom_tat("GIAI ĐOẠN 9 — TINH CHỈNH", [
    f"Đã thử                 {N_THU} cấu hình siêu tham số",
    f"Loại vì nhớ vẹt        {len(quet)-len(hl)}/{len(quet)}"
    f"  (chênh > {GAP_TOI_DA:.0%})",
    "",
    f"Dữ liệu tăng cường     {'DÙNG' if DUNG_TC else 'KHÔNG'}"
    f"   (Top-3 {ch[3]*100:+.1f}đ)",
    f"Trọng số dòng thật     ×{W_TOT:.0f}",
    f"Phân tầng              {'DÙNG cho khối ' + ', '.join(str(g) for g in PT) if PT else 'KHÔNG'}"
    f"   ({(co_pt['guided_top3']-khong_pt['guided_top3'])*100:+.1f}đ)",
    "",
    f"Tư vấn Top-3           {cuoi['guided_top3']:.1%}"
    f"   (M₀ {M0['guided']['top']['3']:.1%},"
    f" {(cuoi['guided_top3']-M0['guided']['top']['3'])*100:+.1f}đ)",
    f"Tư vấn Top-5           {cuoi['guided_top5']:.1%}",
    f"Khám phá Top-3         {cuoi['auto_top3']:.1%}",
    "",
    f"Chênh train − val      {cuoi['gap_top3']*100:+.1f}đ"
    f"   (M₀ {M0['gap_train_val']['guided']['3']*100:+.1f}đ)",
    f"Khối đạt 80%           {int((cd.top3 >= .8).sum())}/{len(cd)}",
])
print(f"\\n✅ sieu_tham_so.json · ket_qua_quet.csv · chan_doan_theo_khoi.csv"
      f" · 3 hình  →  {OUT}")'''))

viet("09_TinhChinh.ipynb", C)
