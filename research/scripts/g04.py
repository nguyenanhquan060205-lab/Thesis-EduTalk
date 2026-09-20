"""Sinh notebook 04_SinhDacTrung.ipynb

Sinh 10 câu Likert + giới tính + mục tiêu cho TOÀN BỘ 15.696 hồ sơ TTTH, giữ
nguyên điểm thi, tổ hợp và nhãn ngành.

Phương pháp chính: **Gaussian copula có điều kiện theo ngành**.
Kèm vài cấu hình **giải thuật di truyền** làm đối chứng để Giai đoạn 5 chấm.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import DU_LIEU, SETUP, code, md, so_do, viet

C = []

C.append(md('''# Giai đoạn 4 — Sinh đặc trưng còn thiếu của hồ sơ trúng tuyển

''' + so_do(
    "04_SinhDacTrung",
    ["02_ChuanBiTTTH/ttth_sach.csv            —  15.696 hồ sơ (điểm + tổ hợp THẬT)",
     "03_HocPhanPhoi/phan_phoi_theo_nganh.npz —  Σ đã co ngót Bayes của mỗi ngành",
     "01_LamSachKhaoSat/khaosat_sach.csv      —  676 phiếu thật"],
    ["Giữ NGUYÊN điểm thi, tổ hợp và nhãn ngành của TTTH",
     "Gaussian copula có điều kiện theo ngành → sinh 10 câu Likert",
     "Rút giới tính và mục tiêu theo phân phối của ngành",
     "5 ngành không có hồ sơ TTTH → bootstrap từ chính phiếu khảo sát của ngành",
     "Sinh thêm vài cấu hình GA làm ĐỐI CHỨNG"],
    ["04_SinhDacTrung/khung_ho_so.csv         —  phần THẬT giữ nguyên",
     "04_SinhDacTrung/sinh_theo_ppp.npz       —  Likert của từng phương pháp",
     "04_SinhDacTrung/hinh_4_*.png            —  4 hình"]) + '''

## Sinh cái gì, giữ nguyên cái gì

Hồ sơ trúng tuyển có **điểm thi, tổ hợp và ngành trúng tuyển CÓ THẬT** — thứ mà 676 phiếu
khảo sát không thể có nhiều. Giai đoạn này **không đụng vào chúng**.

| Cột | Ở TTTH | Xử lý |
|---|---|---|
| Ngành trúng tuyển | ✅ thật | **giữ nguyên** — đây là nhãn |
| Tổ hợp xét tuyển | ✅ thật | **giữ nguyên** |
| Điểm 3 môn | ✅ thật | **giữ nguyên** |
| 10 câu Likert | ❌ không có | **copula sinh** |
| Giới tính · mục tiêu | ❌ không có | rút theo phân phối của ngành |

## Gaussian copula có điều kiện theo ngành

Bốn bước, mỗi ngành làm riêng:

```
①  u_j = F_j(x_j)            đưa từng câu về thang đều [0,1]
                             bằng hàm phân phối THỰC NGHIỆM của ngành đó
②  z_j = Φ⁻¹(u_j)            đưa sang thang chuẩn
③  z' ~ N(0, R_ngành)        rút mẫu mới — R là tương quan của ngành
④  x'_j = F_j⁻¹(Φ(z'_j))     tra NGƯỢC hàm phân vị → về đúng thang 1..5
```

**Bước ④ là chỗ quyết định.** Nó không làm tròn — nó tra vào **đúng bảng tần suất có thật
của ngành**. Nên phân phối biên của từng câu được tái tạo gần như chính xác, chứ không bị
méo như cách lấy mẫu chuẩn rồi làm tròn.

Bước ③ giữ **cấu trúc phụ thuộc** giữa 10 câu. Người thật trả lời không độc lập — ai thích
thí nghiệm cũng thường thích môi trường (r = +0,62) và dinh dưỡng (r = +0,52). Ma trận R
giữ lại đúng mối liên hệ đó.

Và vì `z` là biến **liên tục**, hai mẫu gần như không bao giờ trùng nhau — không có chuyện
sao chép nguyên phiếu thật.

### Dùng lại đúng phần co ngót đã có

Không ước lượng lại gì cả:

- **Tương quan `R`** — lấy thẳng `Σ` đã co ngót Bayes ở Giai đoạn 3, đổi sang ma trận
  tương quan bằng `R = D⁻¹ Σ D⁻¹` với `D = diag(√Σᵢᵢ)`.
- **Phân phối biên từng câu** — co ngót về mức nhóm bằng **đúng công thức**
  `w = n/(n+8)` của Giai đoạn 3.

Nhờ vậy ngành 6 phiếu vẫn không sinh ra phân phối méo mó, và hai giai đoạn nhất quán với
nhau.

### Vì sao chỉ điều kiện theo NGÀNH, không theo điểm thi

Về nguyên tắc có thể điều kiện thêm theo điểm thi của chính hồ sơ đó. Nhưng đã đo trên
676 phiếu thật: liên hệ giữa 10 câu Likert và 10 môn điểm **rất yếu** —
`|r|` trung bình **0,105**, chỉ **9/80 cặp** vượt 0,25, và mấy cặp mạnh nhất đều rơi vào
môn Địa với n = 45 (mẫu nhỏ, nhiều khả năng là nhiễu).

Bỏ qua liên hệ đó không mất mát đáng kể, mà tránh được việc ước lượng thêm một ma trận
20×20 từ 676 dòng.

### Nguồn tham khảo

- **Sklar (1959)** — định lý nền tảng: mọi phân phối nhiều chiều tách được thành các phân
  phối biên và một copula mô tả cấu trúc phụ thuộc.
- **Patki, Wedge & Veeramachaneni (2016)**, *The Synthetic Data Vault*, IEEE DSAA —
  Gaussian copula làm lõi cho sinh dữ liệu tổng hợp dạng bảng.

## Giải thuật di truyền — giữ làm đối chứng

Cấu hình GA vẫn được sinh ra để Giai đoạn 5 chấm cạnh copula. Ba toán tử:

| Toán tử | Cách làm |
|---|---|
| Khởi tạo | lấy mẫu có hoàn lại từ phiếu thật của ngành |
| Lai ghép | cắt một điểm — vài câu của bạn A, còn lại của bạn B |
| Đột biến | thay **một** câu bằng câu trả lời của một bạn thật khác |

Hàm thích nghi bám **tập điển hình**, không bám đỉnh:

```
E[log p(x)] = −½ (d·log(2π) + log|Σ| + d)
fitness(x)  = −| log p(x) − E[log p(x)] |
```

Đặt hàm thích nghi là `log p(x)` thuần thì cả quần thể hội tụ về đúng vector trung bình.

**Số thế hệ là siêu tham số quyết định của GA**, nên quét nhiều mức. GA sinh ra để *hội
tụ*, mà bước này cần *phân tán* — mỗi dòng phải là một học sinh khác nhau. Chạy càng
nhiều thế hệ, đấu loại từng cặp càng nhân bản cá thể hợp hàm thích nghi nhất ra khắp
quần thể.

## Sinh cho TOÀN BỘ 15.696 dòng

Bảng huấn luyện ở Giai đoạn 6 sẽ có khoảng **96% dòng tổng hợp**. Con số này phải nêu rõ
khi báo cáo.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + DU_LIEU + '''
from scipy.stats import multivariate_normal, norm

OUT = thu_muc(4)
K_CO_NGOT = 8             # phải KHỚP Giai đoạn 3 — nếu không hai nơi sẽ lệch nhau
MUC = np.arange(1, 6)     # thang Likert 1..5
N_MUC_TIEU = 4
N_BOOTSTRAP = 120         # số dòng bootstrap cho ngành KHÔNG có hồ sơ TTTH

# Cấu hình GA đối chứng — Giai đoạn 5 chấm cạnh copula
DS_THE_HE = [3, 5, 20, 40]
P_LAI = 0.75
P_DOT_BIEN = 0.25
N_TINH_HOA = 3

D = nap(co_ttth=True)
ks, tt = D["train"], D["ttth"]
L, C_DIEM = D["likert"], D["diem"]
NG, I_NG = D["nganh"], D["i_nganh"]
y_ks = ks.ma_nganh.values
Lk_ks = ks[L].astype(float).values
gt_ks = (ks.gioi_tinh == "Nam").astype(float).values
nhom_sv = np.array([D["nhom"][m] for m in y_ks])

Z = np.load(thu_muc(3) / "phan_phoi_theo_nganh.npz")
MU, SIG, PNAM, PMT = Z["mu"], Z["sigma"], Z["p_nam"], Z["p_muctieu"]

co_tt = tt.ma_nganh.value_counts()
thieu = [m for m in NG if m not in co_tt.index]
print(f"Hồ sơ TTTH : {len(tt):,} dòng · phủ {len(co_tt)}/{len(NG)} ngành")
print(f"Ngành thiếu: {len(thieu)} → bootstrap {N_BOOTSTRAP} dòng/ngành từ phiếu khảo sát")
for m in thieu:
    print(f"             · {D['ma_to_ten'][m]:<40} ({int((y_ks==m).sum())} phiếu khảo sát)")
print(f"\\nSẽ sinh Likert cho {len(tt) + len(thieu)*N_BOOTSTRAP:,} dòng")
print(f"Chính       : Gaussian copula có điều kiện theo ngành")
print(f"Đối chứng   : GA ở {len(DS_THE_HE)} mức thế hệ {DS_THE_HE}")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 1. Dựng khung hồ sơ nền — phần THẬT"))

C.append(code('''rng = np.random.default_rng(SEED)

# Toàn bộ hồ sơ TTTH — điểm, tổ hợp, nhãn giữ NGUYÊN, không rút mẫu
khung = tt[["to_hop_thi", "ma_nganh"] + C_DIEM].copy()
khung["nguon"] = "ttth"

# 5 ngành không có hồ sơ trúng tuyển nào. Không bootstrap thì bảng huấn luyện chỉ
# có vài chục phiếu khảo sát cho mỗi ngành đó, trong khi ngành khác có hàng nghìn
# dòng — mô hình sẽ gần như không bao giờ đoán ra chúng.
if thieu:
    bs = []
    for ma in thieu:
        phieu = ks[ks.ma_nganh == ma]
        lay = rng.choice(len(phieu), N_BOOTSTRAP, replace=True)
        r = phieu.iloc[lay][["to_hop_thi"] + C_DIEM].reset_index(drop=True)
        r["to_hop_thi"] = r.to_hop_thi.astype(str).str.split(" ").str[0]
        r["ma_nganh"] = ma
        r["nguon"] = "bootstrap_khaosat"
        bs.append(r)
    khung = pd.concat([khung] + bs, ignore_index=True)

khung["j_nganh"] = khung.ma_nganh.map(I_NG)
khung["ma_nhom"] = khung.ma_nganh.map(D["nhom"])
khung = khung.reset_index(drop=True)
ma_arr = khung.ma_nganh.values

print(f"Khung hồ sơ nền: {len(khung):,} dòng · {khung.ma_nganh.nunique()}/{len(NG)} ngành")
print(khung.nguon.value_counts().to_string())
cq = khung.ma_nganh.value_counts()
print(f"\\nDòng mỗi ngành: ít nhất {cq.min()} · nhiều nhất {cq.max():,}"
      f" · trung vị {int(cq.median())}")
assert khung[C_DIEM].notna().sum(axis=1).min() >= 3, "có dòng thiếu điểm"
assert khung.ma_nganh.nunique() == len(NG), "có ngành không có dòng nào"'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 2. Gaussian copula có điều kiện theo ngành"))

C.append(code('''def pmf_co_ngot(ma):
    """Phân phối biên từng câu của một ngành, CO NGÓT về mức nhóm.

    Dùng đúng công thức w = n/(n+K) của Giai đoạn 3 để hai nơi nhất quán. Ngành
    6 phiếu mà lấy tần suất thô thì mỗi mức Likert chỉ có 0 hoặc 1 người — hàm
    phân vị dựng từ đó sẽ bậc thang rất thô.
    """
    sel = y_ks == ma
    n = int(sel.sum())
    w = n / (n + K_CO_NGOT)
    sel_nh = nhom_sv == D["nhom"][ma]
    ra = np.zeros((len(L), len(MUC)))
    for k in range(len(L)):
        p_ng = (np.bincount(Lk_ks[sel, k].astype(int) - 1, minlength=len(MUC)) / n
                if n else np.zeros(len(MUC)))
        p_nh = np.bincount(Lk_ks[sel_nh, k].astype(int) - 1,
                           minlength=len(MUC)) / sel_nh.sum()
        p = w * p_ng + (1 - w) * p_nh
        ra[k] = p / p.sum()
    return ra


def tuong_quan(S):
    """Σ → ma trận tương quan R, ép xác định dương.

    Σ đã co ngót nên hiếm khi suy biến, nhưng phép chia cho độ lệch chuẩn có thể
    đẩy vài trị riêng xuống ~0. Cắt sàn trị riêng rồi chuẩn hoá lại đường chéo.
    """
    d = np.sqrt(np.diag(S))
    R = S / np.outer(d, d)
    R = (R + R.T) / 2
    np.fill_diagonal(R, 1.0)
    w_, V = np.linalg.eigh(R)
    R = V @ np.diag(np.clip(w_, 1e-6, None)) @ V.T
    dd = np.sqrt(np.diag(R))
    return R / np.outer(dd, dd)


def copula_mot_nganh(ma, n_can, rng):
    """Bốn bước của Gaussian copula. Xem phần giải thích ở đầu notebook."""
    R = tuong_quan(SIG[I_NG[ma]])
    z = rng.multivariate_normal(np.zeros(len(L)), R, size=n_can)   # ③
    u = norm.cdf(z)                                               # ③→④
    P = pmf_co_ngot(ma)
    ra = np.zeros((n_can, len(L)))
    for k in range(len(L)):
        cum = np.cumsum(P[k])
        # Hàm phân vị của phân phối RỜI RẠC — tra u vào bảng tần suất tích luỹ.
        # Đây là chỗ phân phối biên thật được tái tạo, không phải làm tròn.
        ra[:, k] = MUC[np.searchsorted(cum, u[:, k], side="left").clip(0, len(MUC) - 1)]
    return ra


def sinh_copula(rng):
    lk = np.zeros((len(khung), len(L)))
    gt = np.zeros(len(khung))
    mt = np.zeros(len(khung), dtype=int)
    for ma in NG:
        j = I_NG[ma]
        o = np.where(ma_arr == ma)[0]
        lk[o] = copula_mot_nganh(ma, len(o), rng)
        gt[o] = (rng.random(len(o)) < PNAM[j]).astype(float)
        mt[o] = rng.choice(N_MUC_TIEU, size=len(o), p=PMT[j]) + 1
    return lk, gt, mt


t0 = time.time()
LK_CP, GT, MT = sinh_copula(np.random.default_rng(SEED))
print(f"Copula xong sau {time.time()-t0:.1f}s")
print(f"   Likert : giá trị {int(LK_CP.min())}…{int(LK_CP.max())} · dạng {LK_CP.shape}")
print(f"   đa dạng: {len(pd.DataFrame(LK_CP).drop_duplicates())/len(LK_CP):.1%}"
      f"   (khảo sát thật {len(ks[L].drop_duplicates())/len(ks):.1%})")
print(f"   Nam    : {GT.mean():.1%}   (khảo sát thật {gt_ks.mean():.1%})")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 3. Giải thuật di truyền — đối chứng"))

C.append(code('''def ga_mot_nganh(kho_that, mu, sig, n_can, rng, n_the_he):
    """Sinh `n_can` bộ câu trả lời Likert cho một ngành.

    Mọi toán tử chỉ tổ hợp lại giá trị có sẵn trong `kho_that`, không bịa giá trị
    mới — đó vừa là điểm mạnh (luôn là câu trả lời có thật) vừa là điểm yếu (dễ
    lặp lại nguyên phiếu thật khi chạy ít thế hệ).
    """
    n_gen = kho_that.shape[1]
    pp = multivariate_normal(mean=mu, cov=sig, allow_singular=True)
    _, logdet = np.linalg.slogdet(np.atleast_2d(sig))
    ll_ky_vong = -0.5 * (n_gen * np.log(2 * np.pi) + logdet + n_gen)

    def thich_nghi(Q):
        return -np.abs(pp.logpdf(Q) - ll_ky_vong)

    quan_the = kho_that[rng.integers(len(kho_that), size=n_can)].copy()
    for _ in range(n_the_he):
        f = thich_nghi(quan_the)
        tinh_hoa = quan_the[np.argsort(-f)[:N_TINH_HOA]].copy()
        a, b = rng.integers(n_can, size=(2, n_can))
        cha_me = quan_the[np.where(f[a] >= f[b], a, b)]

        # Ghép trên phần CHẴN, dòng lẻ cuối giữ nguyên. Cách viết ngây thơ
        # `cap = ... if n_can % 2 == 0 else None` khiến ngành có số dòng lẻ KHÔNG
        # BAO GIỜ lai ghép — cả một toán tử bị tắt âm thầm, không báo lỗi.
        con = cha_me.copy()
        n_chan = n_can - (n_can % 2)
        if n_chan >= 2:
            cap = rng.permutation(n_can)[:n_chan].reshape(-1, 2)
            lai = rng.random(len(cap)) < P_LAI
            cat = rng.integers(1, n_gen, size=len(cap))
            for (i, j), co_lai, c in zip(cap, lai, cat):
                if co_lai:
                    con[i, c:], con[j, c:] = cha_me[j, c:].copy(), cha_me[i, c:].copy()

        db = rng.random(n_can) < P_DOT_BIEN
        if db.any():
            idx = np.where(db)[0]
            gen = rng.integers(n_gen, size=len(idx))
            nguon = kho_that[rng.integers(len(kho_that), size=len(idx))]
            con[idx, gen] = nguon[np.arange(len(idx)), gen]

        con[:N_TINH_HOA] = tinh_hoa
        quan_the = con
    return quan_the


def sinh_ga(rng, n_the_he):
    lk = np.zeros((len(khung), len(L)))
    for ma in NG:
        j = I_NG[ma]
        o = np.where(ma_arr == ma)[0]
        kho = Lk_ks[y_ks == ma]
        if len(kho) < 2:
            kho = Lk_ks
        lk[o] = ga_mot_nganh(kho, MU[j], SIG[j], len(o), rng, n_the_he)
    return np.clip(np.rint(lk), 1, 5)


t0 = time.time()
PPP = {"copula": LK_CP}
for g in DS_THE_HE:
    PPP[f"ga_{g}"] = sinh_ga(np.random.default_rng(SEED), g)
    dd = len(pd.DataFrame(PPP[f"ga_{g}"]).drop_duplicates()) / len(khung)
    print(f"   GA {g:2d} thế hệ → đa dạng {dd:6.1%}  [{time.time()-t0:.0f}s]", flush=True)
print(f"\\nTổng {len(PPP)} phương pháp trong {time.time()-t0:.0f}s")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code('''# ═══════════ HÌNH 4.1 — Cấu tạo tập huấn luyện ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5),
                             gridspec_kw={"width_ratios": [1, 1.3]})
n_that, n_sinh = len(ks), len(khung)
a1.bar(["thật\\n(khảo sát)", "tổng hợp"], [n_that, n_sinh],
       color=[C_THAT, C_GA], width=.55)
nhan_doc(a1, fmt="{:,.0f}")
a1.set_ylabel("Số dòng")
a1.set_title(f"Bảng huấn luyện: {n_that + n_sinh:,} dòng\\n"
             f"trong đó {100*n_sinh/(n_that+n_sinh):.1f}% là tổng hợp", fontsize=12)

sl = khung.ma_nganh.value_counts().sort_values()
ten = [D["ma_to_ten"][m][:34] for m in sl.index]
mau = [C_CAM if khung[khung.ma_nganh == m].nguon.iloc[0] == "bootstrap_khaosat" else C_GA
       for m in sl.index]
a2.barh(np.arange(len(sl)), sl.values, color=mau, height=.74)
a2.set_yticks(np.arange(len(sl))); a2.set_yticklabels(ten, fontsize=7.5)
a2.set_xlabel("Số dòng tổng hợp"); a2.set_xscale("log"); a2.grid(axis="y", alpha=0)
a2.set_title("Mỗi ngành có bao nhiêu dòng?", fontsize=12)
a2.legend(handles=[Patch(facecolor=C_GA, label="từ hồ sơ TTTH thật"),
                   Patch(facecolor=C_CAM, label="bootstrap từ khảo sát")],
          loc="lower right", fontsize=9)

fig.suptitle("Hình 4.1 — Cấu tạo tập huấn luyện", fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_4_1_cau_tao.png",
    f"Mất cân bằng rất lớn giữa các ngành: ít nhất {sl.min()} dòng, nhiều nhất "
    f"{sl.max():,} — chênh {sl.max()/sl.min():.0f} lần (trục hoành thang log). Đây là "
    f"hình dạng thật của dữ liệu trúng tuyển; Giai đoạn 9 sẽ cần `sample_weight` để mô "
    f"hình không bỏ rơi ngành ít dòng.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 4.2 — Phân phối biên từng câu ═══════════
fig, axes = plt.subplots(2, 5, figsize=(17, 7), sharey=True)
g_xau = f"ga_{max(DS_THE_HE)}"
for i, (c, ax) in enumerate(zip(L, axes.ravel())):
    that = np.bincount(Lk_ks[:, i].astype(int), minlength=6)[1:] / len(Lk_ks)
    cp = np.bincount(LK_CP[:, i].astype(int), minlength=6)[1:] / len(LK_CP)
    ga_ = np.bincount(PPP[g_xau][:, i].astype(int), minlength=6)[1:] / len(khung)
    ax.plot(MUC, that, "o-", color=C_THAT, lw=2.4, ms=7, label="thật")
    ax.plot(MUC, cp, "s--", color=C_GA, lw=2, ms=6, label="copula")
    ax.plot(MUC, ga_, "^:", color=C_XAM, lw=1.8, ms=6, label=f"GA {max(DS_THE_HE)}")
    ax.set_title(c.replace("likert_", "").replace("_", " "), fontsize=10)
    ax.set_xticks(MUC)
    if i == 0:
        ax.legend(fontsize=9)
fig.suptitle("Hình 4.2 — Phân phối từng câu Likert: thật so với dữ liệu sinh",
             fontsize=14, fontweight="bold", y=1.0)
fig.supxlabel("Mức Likert", fontsize=11); fig.supylabel("Tỉ lệ", fontsize=11)
fig.tight_layout()


def sai_bien(X):
    return np.mean([np.abs(np.bincount(X[:, k].astype(int), minlength=6)[1:] / len(X)
                           - np.bincount(Lk_ks[:, k].astype(int), minlength=6)[1:] / len(Lk_ks)
                           ).sum() / 2 for k in range(len(L))])


luu(fig, OUT, "hinh_4_2_phan_phoi_bien.png",
    f"Sai khác phân phối biên (biến thiên toàn phần trung bình): copula "
    f"{sai_bien(LK_CP):.3f} · GA {max(DS_THE_HE)} thế hệ {sai_bien(PPP[g_xau]):.3f}. "
    f"Copula tái tạo gần khít vì bước tra ngược hàm phân vị dùng ĐÚNG bảng tần suất "
    f"thật của ngành, không phải làm tròn.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 4.3 — Đa dạng và sao chép ═══════════
BO_THAT = set(map(tuple, Lk_ks.astype(int)))
ten_pp = list(PPP)
dd = [len(pd.DataFrame(PPP[p]).drop_duplicates()) / len(khung) for p in ten_pp]
sc = [sum(1 for r in map(tuple, PPP[p].astype(int)) if r in BO_THAT) / len(khung)
      for p in ten_pp]
dd_that = len(ks[L].drop_duplicates()) / len(ks)

fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 4.6))
mau = [C_GA if p == "copula" else C_XAM for p in ten_pp]
a1.bar(ten_pp, [v * 100 for v in dd], color=mau, width=.6)
a1.axhline(dd_that * 100, color=C_THAT, ls="--", lw=1.8)
a1.text(len(ten_pp) - .5, dd_that * 100 + 1.5, f"khảo sát thật {dd_that:.1%}",
        fontsize=9, color=C_THAT, ha="right")
nhan_doc(a1, fmt="{:.0f}%")
a1.set_ylabel("% dòng khác nhau"); a1.set_ylim(0, 108)
a1.set_title("Đa dạng — bao nhiêu dòng thực sự khác nhau?", fontsize=12)
a1.tick_params(axis="x", rotation=20)

a2.bar(ten_pp, [v * 100 for v in sc], color=mau, width=.6)
a2.axhline(5, color=C_THAT, ls="--", lw=1.8)
a2.text(len(ten_pp) - .5, 5.4, "ngưỡng 5%", fontsize=9, color=C_THAT, ha="right")
nhan_doc(a2, fmt="{:.1f}%")
a2.set_ylabel("% dòng trùng KHÍT một phiếu thật")
a2.set_title("Sao chép — nguồn rò rỉ sang tập test", fontsize=12)
a2.tick_params(axis="x", rotation=20)

fig.suptitle("Hình 4.3 — Hai chỉ số quyết định độ tin cậy của dữ liệu sinh",
             fontsize=14, fontweight="bold", y=1.02)
fig.tight_layout()
i_cp = ten_pp.index("copula")
luu(fig, OUT, "hinh_4_3_da_dang_sao_chep.png",
    f"Copula đạt đa dạng {dd[i_cp]:.1%} — gần bằng mức của người thật ({dd_that:.1%}) — "
    f"và chỉ {sc[i_cp]:.1%} dòng trùng khít phiếu thật. GA ít thế hệ sao chép nhiều, GA "
    f"nhiều thế hệ thì quần thể tự trùng lặp. Sao chép là nguồn rò rỉ trực tiếp: Giai "
    f"đoạn 7 chia train/test trên bảng đã gộp, nên bản sao của một dòng test có thể nằm "
    f"trong tập train.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 4.4 — Cấu trúc tương quan ═══════════
iu = np.triu_indices(len(L), 1)
r_that = np.corrcoef(Lk_ks.T)[iu]
sai_r = {p: np.abs(np.corrcoef(PPP[p].T)[iu] - r_that).mean() for p in ten_pp}

fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 4.8))
a1.bar(ten_pp, [sai_r[p] for p in ten_pp], color=mau, width=.6)
nhan_doc(a1, fmt="{:.3f}")
a1.set_ylabel("Sai khác tuyệt đối trung bình")
a1.set_title("Sai lệch tương quan so với dữ liệu thật", fontsize=12)
a1.tick_params(axis="x", rotation=20)

a2.scatter(r_that, np.corrcoef(PPP[g_xau].T)[iu], s=46, color=C_XAM,
           label=f"GA {max(DS_THE_HE)} thế hệ (sai {sai_r[g_xau]:.3f})",
           edgecolor="white", lw=.6)
a2.scatter(r_that, np.corrcoef(LK_CP.T)[iu], s=46, color=C_GA,
           label=f"copula (sai {sai_r['copula']:.3f})", edgecolor="white", lw=.6)
lim = [r_that.min() - .1, r_that.max() + .1]
a2.plot(lim, lim, "--", color=C_THAT, lw=1.6)
a2.set_xlim(lim); a2.set_ylim(lim); a2.legend(fontsize=9)
a2.set_xlabel("Tương quan THẬT"); a2.set_ylabel("Tương quan SINH RA")
a2.set_title("45 cặp câu — càng gần đường chéo càng tốt", fontsize=12)

fig.suptitle("Hình 4.4 — Mối liên hệ giữa 10 câu có được giữ lại không?",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_4_4_tuong_quan.png",
    f"Người thật trả lời 10 câu KHÔNG độc lập — ai thích thí nghiệm cũng thường thích "
    f"môi trường (r = +0,62). Copula giữ được cấu trúc đó vì nó rút mẫu thẳng từ ma trận "
    f"tương quan (sai {sai_r['copula']:.3f}); GA lai ghép và đột biến theo từng câu nên "
    f"kéo dữ liệu về phía độc lập (sai {sai_r[g_xau]:.3f}).")
plt.show()'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md("## 4. Xuất dữ liệu"))

C.append(code('''khung.to_csv(OUT / "khung_ho_so.csv", index=False)
np.savez_compressed(OUT / "sinh_theo_ppp.npz",
                    ten=np.array(ten_pp),
                    likert=np.stack([PPP[p] for p in ten_pp]),
                    gioi_tinh=GT, muc_tieu=MT)

(OUT / "tom_tat.json").write_text(json.dumps({
    "n_dong": int(len(khung)),
    "n_tu_ttth": int((khung.nguon == "ttth").sum()),
    "n_bootstrap": int((khung.nguon == "bootstrap_khaosat").sum()),
    "n_nganh": int(khung.ma_nganh.nunique()),
    "phuong_phap": ten_pp,
    "chinh": "copula",
    "K_co_ngot": K_CO_NGOT,
    "ds_the_he_ga": DS_THE_HE,
    "da_dang": {p: round(d, 4) for p, d in zip(ten_pp, dd)},
    "sao_chep": {p: round(v, 4) for p, v in zip(ten_pp, sc)},
    "sai_tuong_quan": {p: round(float(v), 4) for p, v in sai_r.items()},
}, ensure_ascii=False, indent=2), encoding="utf-8")

tom_tat("GIAI ĐOẠN 4 — SINH ĐẶC TRƯNG CÒN THIẾU", [
    f"Dòng sinh ra           {len(khung):,}  × {len(ten_pp)} phương pháp",
    f"   từ hồ sơ TTTH thật  {int((khung.nguon=='ttth').sum()):,}",
    f"   bootstrap khảo sát  {int((khung.nguon=='bootstrap_khaosat').sum()):,}"
    f"  ({len(thieu)} ngành không có hồ sơ TTTH)",
    "",
    "Giữ NGUYÊN             điểm thi · tổ hợp · nhãn ngành",
    "Sinh                   10 câu Likert · giới tính · mục tiêu",
    "",
    "CHÍNH: Gaussian copula có điều kiện theo ngành",
    f"   đa dạng             {dd[i_cp]:.1%}   (khảo sát thật {dd_that:.1%})",
    f"   sao chép phiếu thật {sc[i_cp]:.1%}",
    f"   sai tương quan      {sai_r['copula']:.3f}",
    "",
    f"ĐỐI CHỨNG: GA ở {len(DS_THE_HE)} mức thế hệ {DS_THE_HE}",
] + [f"   GA {g:2d} thế hệ → đa dạng {dd[ten_pp.index(f'ga_{g}')]:.1%}"
     f" · sao chép {sc[ten_pp.index(f'ga_{g}')]:.1%}" for g in DS_THE_HE] + [
    "",
    "Giai đoạn 5 chấm cả 5 phương pháp và chọn",
])
print(f"\\n✅ khung_ho_so.csv · sinh_theo_ppp.npz · 4 hình  →  {OUT}")'''))

viet("04_SinhDacTrung.ipynb", C)
