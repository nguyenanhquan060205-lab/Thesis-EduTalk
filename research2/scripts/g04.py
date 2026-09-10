"""Sinh notebook 04_MocChuan.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, DU_LIEU, MO_HINH, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 4 — Mốc chuẩn M₀: huấn luyện CHỈ trên phiếu khảo sát

''' + so_do(
    "04_MocChuan",
    ["03_TachTrainTest/khaosat_train.csv  —  574 phiếu thật",
     "03_TachTrainTest/cv_folds.json      —  15 fold"],
    ["Dựng 63 đặc trưng từ 574 phiếu khảo sát",
     "Huấn luyện qua 15 fold — KHÔNG dùng TTTH, KHÔNG dùng dữ liệu sinh thêm",
     "So mô hình chung với mô hình riêng từng khối",
     "Đo Top-1/2/3/5 ở cả hai chế độ, LUÔN kèm mốc đoán bừa",
     "Đo thêm trên chính tập train để thấy mức nhớ vẹt"],
    ["04_MocChuan/moc_chuan.json          —  mốc M₀ cho các giai đoạn sau",
     "04_MocChuan/moc_chuan_theo_khoi.csv",
     "04_MocChuan/hinh_4_*.png            —  3 hình"]) + '''

## Đây là con số mà mọi bước sau phải vượt

Giai đoạn 6 sẽ sinh thêm hàng nghìn dòng dữ liệu. Không có M₀ thì không trả lời được câu hỏi duy
nhất đáng hỏi: **thêm dữ liệu đó có thật sự giúp gì không?**

## Mô hình: XGBoost phân loại, không có gì khác

Giải thích trong một câu:

```
mô hình cho ra XÁC SUẤT cho từng ngành trong 39 ngành
   → bỏ những ngành không thuộc nhóm người dùng chọn
      → lấy 3 ngành xác suất cao nhất còn lại
```

Đúng cách web gọi API:

| Chế độ web | `fieldId` | Mô hình làm gì | Ý nghĩa con số |
|---|---|---|---|
| **Khám phá** | `null` | xếp hạng cả 39 ngành | **năng lực thật của hệ thống** |
| **Tư vấn** | `0..6` | chỉ xếp hạng ngành trong khối đã chọn | chỉ số **có điều kiện** |

Web gửi `limit: 3` nên **Top-3 là chỉ tiêu chính**.

## Vì sao mọi bảng đều có cột "đoán bừa"

Khối *Luật* và *Ngoại ngữ* chỉ có **2 ngành**. Gợi ý 3 ngành cho một khối 2 ngành thì **luôn đúng
100%** mà không cần mô hình nào cả. Nếu chỉ báo cáo độ chính xác trần trụi, một con số 85% có thể
chỉ hơn đoán bừa vài điểm. Cột `hơn` mới cho biết mô hình đóng góp bao nhiêu.
'''))

C.append(code(SETUP + DU_LIEU + MO_HINH + '''
OUT = thu_muc(4)

D = nap(co_ttth=True)          # TTTH chỉ dùng để lấy danh sách tổ hợp + thống kê điểm
ks = D["train"]
X = dac_trung(ks, D).values
y = ks.ma_nganh.values
NG = D["nganh"]
nhom_sv = np.array([D["nhom"][m] for m in y])
FOLDS = D["folds"]["folds"]
K = len(D["ten_nhom"])
co_nhom = pd.Series(list(D["nhom"].values())).value_counts()

print(f"Dữ liệu   : {len(ks)} phiếu khảo sát thật · {X.shape[1]} đặc trưng")
print(f"Nhãn      : {len(NG)} ngành → {K} {D['ten_cach_nhom']}")
print(f"Cỡ khối   : {sorted(co_nhom.values, reverse=True)}")
print(f"Cross-val : {D['folds']['n_splits']} fold × {D['folds']['n_repeats']} lần lặp"
      f" = {len(FOLDS)} lần đo")'''))

C.append(md("## 1. Chạy cross-validation"))

C.append(code('''def chay_cv(rieng_nhom=False, hp=None, hp_nhom=None, do_train=False):
    """Một lượt CV đầy đủ, gộp dự đoán của cả 15 fold.

    VAL luôn chỉ gồm phiếu khảo sát thật — về sau khi có dữ liệu sinh thêm,
    chúng chỉ được vào phía TRAIN, nếu không thì mô hình được chấm điểm trên
    chính dữ liệu do nó gián tiếp sinh ra.
    """
    g = {k: [] for k in ("auto", "guided", "y", "auto_tr", "guided_tr", "y_tr")}
    for f in FOLDS:
        tr, va = np.array(f["train_idx"]), np.array(f["val_idx"])
        mh = MoHinhNganh(D, hp, rieng_nhom, hp_nhom).fit(X[tr], y[tr])
        g["auto"].append(mh.diem(X[va]))
        g["guided"].append(mh.diem(X[va], nhom_sv[va]))
        g["y"].append(y[va])
        if do_train:
            g["auto_tr"].append(mh.diem(X[tr]))
            g["guided_tr"].append(mh.diem(X[tr], nhom_sv[tr]))
            g["y_tr"].append(y[tr])
    return {k: (np.concatenate(v) if k.startswith("y") else np.vstack(v))
            for k, v in g.items() if v}


t0 = time.time()
kq = chay_cv(do_train=True)
print(f"Mô hình chung  : {len(FOLDS)} fold trong {time.time()-t0:.0f}s")

y_all = kq["y"]
auto = top_k(kq["auto"], y_all, NG)
guided = top_k(kq["guided"], y_all, NG)
bua_auto = bua_toan_bo(len(NG))
bua_guided = bua_trong_nhom(y_all, D["nhom"])

tr_auto = top_k(kq["auto_tr"], kq["y_tr"], NG)
tr_guided = top_k(kq["guided_tr"], kq["y_tr"], NG)
print(f"   tư vấn Top-3 {guided[3]:.1%} · khám phá Top-3 {auto[3]:.1%}")'''))

C.append(md('''## 2. Mô hình chung so với mô hình riêng từng khối

Mô hình chung phải trải sức phân biệt **mọi cặp ngành** trong 39 ngành — kể cả cặp *Luật* với *Công
nghệ thực phẩm*, hai ngành mà thực tế không bao giờ phải đem ra so với nhau.

Mô hình riêng chỉ học đúng việc cần làm: phân biệt vài ngành **trong cùng một khối**.'''))

C.append(code('''t0 = time.time()
kq_r = chay_cv(rieng_nhom=True, do_train=True)
print(f"Mô hình riêng khối: {len(FOLDS)} fold trong {time.time()-t0:.0f}s\\n")

guided_r = top_k(kq_r["guided"], kq_r["y"], NG)
tr_guided_r = top_k(kq_r["guided_tr"], kq_r["y_tr"], NG)

in_bang([dong("Một mô hình chung cho 39 ngành", guided, bua_guided),
         dong("Mỗi khối một mô hình riêng", guided_r, bua_guided)],
        "CHẾ ĐỘ TƯ VẤN — hai cách dựng mô hình")
chenh = {k: guided_r[k] - guided[k] for k in TOP_K}
print("\\nChênh: " + " · ".join(f"Top-{k} {chenh[k]*100:+.1f}đ" for k in TOP_K))

if chenh[3] > 0:
    print("\\n→ Mô hình riêng khối thắng. Các giai đoạn sau dùng cách này.")
    RIENG, guided_c, tr_guided_c = True, guided_r, tr_guided_r
else:
    print("\\n→ Mô hình chung vẫn hơn, giữ nguyên.")
    RIENG, guided_c, tr_guided_c = False, guided, tr_guided'''))

C.append(code('''in_bang([dong("Khám phá (auto) — xếp hạng cả 39 ngành", auto, bua_auto),
         dong("Tư vấn (guided) — trong khối người dùng chọn", guided_c, bua_guided)],
        f"MỐC CHUẨN M₀ — chỉ {len(ks)} phiếu khảo sát, không dữ liệu bổ sung")
print("\\nHai chế độ KHÔNG so ngang hàng được: chế độ tư vấn đã được người dùng cho")
print("biết khối ngành, tức đã giải sẵn phần khó nhất của bài toán.\\n")

bang_train_test([("Tư vấn (người dùng chọn khối)", tr_guided_c, guided_c, bua_guided),
                 ("Khám phá (không chọn khối)", tr_auto, auto, bua_auto)])
print("\\nChênh train − val lớn là đặc tính của XGBoost trên 574 dòng: cây quyết định")
print("nhớ được phần lớn tập huấn luyện. Giai đoạn 9 sẽ siết lại bằng điều hoà.")'''))

C.append(code('''# ═══════════ HÌNH 4.1 — Mốc chuẩn so với đoán bừa ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.2))
kk = list(TOP_K); x = np.arange(len(kk)); w = .38
for ax, (r, b, ten, mau) in zip((a1, a2), [
        (auto, bua_auto, "Khám phá — xếp hạng cả 39 ngành", C_XANH),
        (guided_c, bua_guided, "Tư vấn — trong khối đã chọn", C_CAM)]):
    ax.bar(x - w/2, [r[k]*100 for k in kk], w, color=mau, label="Mô hình")
    ax.bar(x + w/2, [b[k]*100 for k in kk], w, color=C_XAM, label="Đoán bừa")
    ax.set_xticks(x); ax.set_xticklabels([f"Top-{k}" for k in kk])
    ax.set_ylabel("Độ chính xác (%)"); ax.set_ylim(0, 105)
    ax.set_title(ten, fontsize=12)
    cho_chu_giai(ax, ngang=False, phan=.18)
    ax.legend(loc="upper left", framealpha=.95, fontsize=9)
    ax.axhline(80, color=C_THAT, ls="--", lw=1.6)
    for i, k in enumerate(kk):
        ax.text(i - w/2, r[k]*100 + 1.8, f"{r[k]:.1%}", ha="center",
                fontweight="bold", fontsize=10)
        ax.text(i + w/2, b[k]*100 + 1.8, f"{b[k]:.0%}", ha="center", fontsize=9,
                color="#6B7680")
fig.suptitle(f"Hình 4.1 — Mốc chuẩn M₀ trên {len(ks)} phiếu khảo sát",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_4_1_moc_chuan.png",
    f"Chế độ khám phá hơn đoán bừa {(auto[3]-bua_auto[3])*100:.0f} điểm ở Top-3 — gấp "
    f"{auto[3]/bua_auto[3]:.1f} lần. Chế độ tư vấn hơn {(guided_c[3]-bua_guided[3])*100:.0f} điểm. "
    "Khoảng cách so với vạch 80% chính là phần việc còn lại của các giai đoạn sau.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 4.2 — Kết quả theo từng khối ═══════════
S_g = kq_r["guided"] if RIENG else kq["guided"]
theo = []
for g in range(K):
    sel = np.array([D["nhom"][m] == g for m in y_all])
    if not sel.any():
        continue
    o = np.argsort(-S_g[sel], 1)
    yy = y_all[sel]
    t3 = float(np.mean([yy[i] in NG[o[i, :3]] for i in range(int(sel.sum()))]))
    b3 = min(3, co_nhom[g]) / co_nhom[g]
    theo.append({"ma_khoi": g, "khoi": D["ten_nhom"][g], "n_nganh": int(co_nhom[g]),
                 "n_sv": int(sel.sum()), "top3": t3, "bua3": b3, "hon": t3 - b3,
                 "mat": (1 - t3) * sel.mean()})
tk = pd.DataFrame(theo).sort_values("n_nganh", ascending=False)
tk.to_csv(OUT / "moc_chuan_theo_khoi.csv", index=False)

fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.4))
yy = np.arange(len(tk))
a1.barh(yy, tk.bua3 * 100, color=C_XAM, height=.68, label="Đoán bừa")
a1.barh(yy, tk.top3 * 100, color=C_CAM, height=.42, label="Mô hình")
a1.axvline(80, color=C_THAT, ls="--", lw=2)
a1.text(81, -.55, "80%", fontsize=9.5, color=C_THAT, fontweight="bold")
a1.set_yticks(yy)
a1.set_yticklabels([f"{ngat_dong(r.khoi, 24)}\\n({r.n_nganh} ngành · {r.n_sv} SV)"
                    for r in tk.itertuples()], fontsize=8)
a1.set_xlabel("Top-3 ngành trong khối (%)"); a1.set_xlim(0, 138)
a1.set_title("Khối nào đã đạt 80%?", fontsize=12)
a1.legend(loc="center right", fontsize=9, framealpha=.95)
a1.grid(axis="y", alpha=0)

a2.barh(yy, tk.mat * 100, color=C_THAT, height=.66)
a2.set_yticks(yy); a2.set_yticklabels([ngat_dong(r.khoi, 24) for r in tk.itertuples()], fontsize=8)
a2.set_xlabel("Số điểm bị mất trên tổng (%)")
a2.set_title("Khối nào làm mất nhiều điểm nhất?", fontsize=12); a2.grid(axis="y", alpha=0)
for i, v in enumerate(tk.mat * 100):
    a2.text(v + .15, i, f"{v:.1f}đ", va="center", fontsize=9, fontweight="bold")

fig.suptitle("Hình 4.2 — Chẩn đoán theo từng khối", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
xau = tk.loc[tk.mat.idxmax()]
dat80 = tk[tk.top3 >= .8]
luu(fig, OUT, "hinh_4_2_theo_khoi.png",
    f"{len(dat80)}/{len(tk)} khối đã vượt 80%. Khối {xau.khoi} ({xau.n_nganh} ngành, "
    f"{xau.n_sv} SV) chỉ đạt {xau.top3:.1%} và một mình nó làm mất {xau.mat*100:.1f} điểm — "
    "đây là nút thắt của cách chia 7 khối.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 4.3 — Nhớ vẹt ═══════════
fig, ax = plt.subplots(figsize=(11, 4.8))
x = np.arange(len(TOP_K)); w = .2
for j, (tr_, te_, ten, mau) in enumerate([
        (tr_guided_c, guided_c, "Tư vấn", C_CAM),
        (tr_auto, auto, "Khám phá", C_XANH)]):
    ax.bar(x + (j*2-1.5)*w, [tr_[k]*100 for k in TOP_K], w, color=mau, alpha=.45,
           label=f"{ten} — TRAIN")
    ax.bar(x + (j*2-0.5)*w, [te_[k]*100 for k in TOP_K], w, color=mau,
           label=f"{ten} — VAL")
ax.set_xticks(x); ax.set_xticklabels([f"Top-{k}" for k in TOP_K])
ax.set_ylabel("Độ chính xác (%)"); ax.set_ylim(0, 108)
ax.set_title("Hình 4.3 — Mô hình nhớ tập huấn luyện đến mức nào")
ax.legend(fontsize=8.5, ncol=2)
luu(fig, OUT, "hinh_4_3_nho_vet.png",
    f"Chênh train − val ở Top-3: tư vấn {(tr_guided_c[3]-guided_c[3])*100:+.0f} điểm, khám phá "
    f"{(tr_auto[3]-auto[3])*100:+.0f} điểm. Với 574 dòng và cây quyết định thì mức này là bình "
    "thường, nhưng Giai đoạn 9 vẫn phải siết để mô hình không sụp khi gặp dữ liệu mới.")
plt.show()'''))

C.append(md("## 3. Xuất mốc chuẩn"))

C.append(code('''(OUT / "moc_chuan.json").write_text(json.dumps({
    "n_train": len(ks), "n_dac_trung": int(X.shape[1]),
    "n_fold": len(FOLDS), "rieng_nhom": bool(RIENG),
    "auto": {"top": auto, "bua": bua_auto, "tren_train": tr_auto},
    "guided": {"top": guided_c, "bua": bua_guided, "tren_train": tr_guided_c},
    "guided_chung": guided, "guided_rieng_khoi": guided_r,
    "chenh_rieng_vs_chung": chenh,
    "gap_train_val": {"auto": {k: tr_auto[k] - auto[k] for k in TOP_K},
                      "guided": {k: tr_guided_c[k] - guided_c[k] for k in TOP_K}},
    "theo_khoi": tk.to_dict("records"),
}, ensure_ascii=False, indent=2, default=float), encoding="utf-8")

tom_tat("GIAI ĐOẠN 4 — MỐC CHUẨN M₀", [
    f"Dữ liệu                {len(ks)} phiếu khảo sát · {X.shape[1]} đặc trưng",
    f"Cách dựng mô hình      {'mỗi khối một mô hình riêng' if RIENG else 'một mô hình chung'}"
    f"  ({chenh[3]*100:+.1f}đ so với cách kia)",
    "",
    "CHẾ ĐỘ TƯ VẤN (người dùng chọn khối)",
] + [f"   Top-{k}: {guided_c[k]:6.1%}   bừa {bua_guided[k]:5.1%}"
     f"   hơn {(guided_c[k]-bua_guided[k])*100:+5.1f}đ" for k in TOP_K] + [
    "",
    "CHẾ ĐỘ KHÁM PHÁ (chỉ số hệ thống)",
] + [f"   Top-{k}: {auto[k]:6.1%}   bừa {bua_auto[k]:5.1%}"
     f"   gấp {auto[k]/bua_auto[k]:4.1f} lần" for k in TOP_K] + [
    "",
    f"Khối đã đạt 80%        {len(dat80)}/{len(tk)}",
    f"Nút thắt               {xau.khoi} — {xau.n_nganh} ngành, {xau.top3:.1%}",
])
print(f"\\n✅ moc_chuan.json · moc_chuan_theo_khoi.csv · 3 hình  →  {OUT}")'''))

viet("04_MocChuan.ipynb", C)
