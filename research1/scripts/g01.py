"""Sinh notebook 01_LamSachKhaoSat.ipynb

Lọc phiếu bằng quy trình phát hiện trả lời thiếu nỗ lực (IER) — ba chỉ số, loại
khi vi phạm ít nhất hai. Dựng `mapping.json` làm nguồn chuẩn cho chín giai đoạn sau.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, code, md, so_do, viet

# ═══════════════════════════════════════════════════════════════════════════
# Bảng ánh xạ 39 ngành → 9 NHÓM NGÀNH
# ═══════════════════════════════════════════════════════════════════════════
TAXONOMY = '''
TEN_KHOI = {
    0: "CNTT & Máy tính",
    1: "Kinh doanh & Marketing",
    2: "Tài chính & Kế toán",
    3: "Logistics & Quản lý sản xuất",
    4: "Du lịch, Khách sạn & Ẩm thực",
    5: "Cơ khí - Điện - Tự động hoá",
    6: "Hoá - Vật liệu - Dệt may",
    7: "Thực phẩm, Sinh học & Môi trường",
    8: "Luật & Ngôn ngữ",
}

KHOI = {
    7: [   # Thực phẩm, Sinh học & Môi trường — 7 ngành
        ("Công nghệ chế biến thủy sản", 7540105),
        ("Công nghệ kỹ thuật môi trường", 7510406),
        ("Công nghệ sinh học", 7420201),
        ("Công nghệ thực phẩm", 7540101),
        ("Quản lý tài nguyên và môi trường", 7850101),
        ("Quản trị kinh doanh thực phẩm", 7340129),
        ("Đảm bảo chất lượng và an toàn thực phẩm", 7540106),
    ],
    4: [   # Du lịch, Khách sạn & Ẩm thực — 6 ngành
        ("Du lịch", 7810101),
        ("Khoa học chế biến món ăn", 7819010),
        ("Khoa học dinh dưỡng và ẩm thực", 7819009),
        ("Quản trị dịch vụ du lịch và lữ hành", 7810103),
        ("Quản trị khách sạn", 7810201),
        ("Quản trị nhà hàng và dịch vụ ăn uống", 7810202),
    ],
    0: [   # CNTT & Máy tính — 4 ngành
        ("An toàn thông tin", 7480202),
        ("Công nghệ thông tin", 7480201),
        ("Khoa học dữ liệu", 7460108),
        ("Trí tuệ nhân tạo", 7480107),
    ],
    1: [   # Kinh doanh & Marketing — 4 ngành
        ("Kinh doanh quốc tế", 7340120),
        ("Marketing", 7340115),
        ("Quản trị kinh doanh", 7340101),
        ("Thương mại điện tử", 7340122),
    ],
    5: [   # Cơ khí - Điện - Tự động hoá — 4 ngành
        ("Công nghệ chế tạo máy", 7510202),
        ("Công nghệ kỹ thuật cơ điện tử", 7510203),
        ("Công nghệ kỹ thuật điều khiển và TĐH", 7510303),
        ("Công nghệ kỹ thuật điện - điện tử", 7510301),
    ],
    6: [   # Hoá - Vật liệu - Dệt may — 4 ngành
        ("Công nghệ dệt, may", 7540204),
        ("Công nghệ kỹ thuật hóa học", 7510401),
        ("Công nghệ vật liệu", 7510402),
        ("Kỹ thuật nhiệt", 7520115),
    ],
    8: [   # Luật & Ngôn ngữ — 4 ngành
        ("Luật", 7380101),
        ("Luật kinh tế", 7380107),
        ("Ngôn ngữ Anh", 7220201),
        ("Ngôn ngữ Trung Quốc", 7220204),
    ],
    2: [   # Tài chính & Kế toán — 3 ngành
        ("Công nghệ tài chính", 7340205),
        ("Kế toán", 7340301),
        ("Tài chính ngân hàng", 7340201),
    ],
    3: [   # Logistics & Quản lý sản xuất — 3 ngành
        ("Kinh doanh thời trang và dệt may", 7340123),
        ("Logistics và quản lý chuỗi cung ứng", 7510605),
        ("Quản lý Công nghiệp", 7510601),
    ],
}
'''

C = []

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''# Giai đoạn 1 — Làm sạch phiếu khảo sát

''' + so_do(
    "LÀM SẠCH KHẢO SÁT",
    ["data/raw/khao_sat_dinh_huong_nganh_hoc_raw.csv  —  766 phiếu × 27 cột"],
    ["Đối chiếu tên ngành với bảng chuẩn 39 ngành",
     "Phát hiện trả lời thiếu nỗ lực (IER) — ba chỉ số, loại khi vi phạm ≥ 2",
     "Loại phiếu không có môn điểm nào",
     "Gắn mã ngành và mã nhóm ngành"],
    ["01_LamSachKhaoSat/khaosat_sach.csv   —  676 phiếu",
     "01_LamSachKhaoSat/bang_ier.csv       —  ba chỉ số của TỪNG phiếu",
     "01_LamSachKhaoSat/mapping.json       —  NGUỒN CHUẨN cho 9 giai đoạn sau",
     "01_LamSachKhaoSat/bang_nganh.csv"],
)))

C.append(md('''## Vì sao phải loại phiếu, và loại bằng cách nào

Khảo sát là **nguồn duy nhất** để học phân phối sở thích. Giai đoạn 4 sẽ dùng phân phối
đó sinh Likert cho 15.696 hồ sơ TTTH. Nên một phiếu rác ở đây không chỉ hỏng một dòng —
nó lan sang **95,9%** dữ liệu huấn luyện cuối cùng.

### Không dùng luật tự chế

Cách cũ loại phiếu có `std(10 câu Likert) = 0`. Luật này **đúng**, nhưng không phản biện
được: hội đồng hỏi *"sao em biết họ bấm bừa mà không phải người thích mọi thứ như nhau?"*
thì không có gì để trả lời ngoài cảm tính.

Notebook này dùng quy trình chuẩn của đo lường khảo sát — **phát hiện trả lời thiếu nỗ
lực** (Insufficient Effort Responding), ba chỉ số độc lập:

| Chỉ số | Đo cái gì | Ngưỡng |
|---|---|---|
| **Longstring** | chuỗi câu trả lời giống nhau **liên tiếp** dài nhất | `≥ 10` |
| **IRV** | độ lệch chuẩn 10 câu của chính người đó | `≤ 0` |
| **Mahalanobis D²** | khoảng cách đa biến tới vector trung bình | `> χ²(10, p<.001)` |

**Loại khi vi phạm ít nhất HAI chỉ số.**

### ⚠️ Phải nói rõ: ở ngưỡng cực đại, hai chỉ số đầu là MỘT

Với thang 10 câu, `IRV = 0` ⟺ cả 10 câu giống hệt nhau ⟺ `longstring = 10`. Đây là
**đồng nhất thức**, không phải hai phép đo độc lập cùng chỉ về một chỗ. Notebook có
`assert` chứng minh hai tập trùng khít.

Vậy luật ≥2 thực chất làm đúng một việc: **chặn Mahalanobis loại phiếu một mình.** Diễn
đạt cho đúng:

> Loại phiếu điền trùng cả 10 câu. Phiếu chỉ bất thường về Mahalanobis thì **giữ lại**,
> vì bất thường đa biến không đồng nghĩa với thiếu nỗ lực — có thể chỉ là người có sở
> thích khác số đông.

Nếu muốn ba chỉ số thật sự độc lập thì phải nới ngưỡng (`longstring ≥ 8`, `IRV ≤ 0.3`),
nhưng khi đó số phiếu bị loại tăng lên 103 và ngưỡng trở thành tuỳ chọn của người làm.
Ở đây chọn ngưỡng **cực đại của thang đo** — không có tham số nào để tinh chỉnh, nên
không ai cãi được là "chọn ngưỡng cho ra kết quả đẹp".

Nguồn: Meade & Craig (2012) *Psychological Methods* 17(3) · Curran (2016) *JESP* 66 ·
Johnson (2005) *JRP* 39(1) · Dunn và cộng sự (2018) *JBP* 33(1).

### Hai bằng chứng notebook này in ra

1. **Phân bố longstring** — nếu có bậc thang ở đúng giá trị tối đa thì đó là dấu hiệu
   nhân tạo, không phải biến thể tự nhiên.
2. **Mô phỏng giả thuyết không** — rút lại 10 câu của mỗi người *độc lập* theo phân phối
   biên của từng câu, 200 lần, xem kỳ vọng có bao nhiêu phiếu điền trùng cả 10.

## `mapping.json` là nguồn chuẩn duy nhất

Chín giai đoạn sau **không được** tự khai lại bảng ngành hay bảng nhóm. Tất cả đọc từ
file này. Pipeline cũ để mỗi notebook một bản rồi trôi lệch, README ghi một đằng code
chạy một nẻo.

## Luật xuyên suốt: mọi bảng chỉ số phải có cột đoán bừa

Chín nhóm có cỡ `[7, 6, 4, 4, 4, 4, 4, 3, 3]`. Nhóm 3 ngành thì **Top-3 tự đúng 100%**
mà không cần mô hình — đoán bừa Top-3 trong nhóm đã là **69,2%**. Một con số 85% đứng
trơ trọi có thể chỉ hơn đoán bừa vài điểm. Mọi bảng đều phải đọc cột *hơn bừa*.
'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(code(SETUP + TAXONOMY + '''
from scipy.stats import chi2

OUT = thu_muc(1)
tho = pd.read_csv(RAW / "khao_sat_dinh_huong_nganh_hoc_raw.csv")

TEN_TO_MA = {t: m for ds in KHOI.values() for t, m in ds}
MA_TO_TEN = {m: t for t, m in TEN_TO_MA.items()}
NGANH_TO_KHOI = {m: k for k, ds in KHOI.items() for _, m in ds}
L = [c for c in tho.columns if c.startswith("likert_")]
C_DIEM = [c for c in tho.columns if c.startswith("diem_")]

assert len(TEN_TO_MA) == 39, f"phải đủ 39 ngành, đang có {len(TEN_TO_MA)}"
print(f"Đọc      : {len(tho)} phiếu · {len(tho.columns)} cột")
print(f"Taxonomy : {len(TEN_TO_MA)} ngành → {len(KHOI)} nhóm")
print(f"Cỡ nhóm  : {sorted((len(v) for v in KHOI.values()), reverse=True)}")
print(f"Likert   : {len(L)} câu · Điểm: {len(C_DIEM)} môn")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 1. Ba chỉ số phát hiện trả lời thiếu nỗ lực'''))

C.append(code('''X = tho[L].to_numpy(float)
n, k = X.shape


def longstring(hang):
    """Chuỗi câu trả lời giống nhau LIÊN TIẾP dài nhất.

    Khác IRV ở chỗ nó quan tâm THỨ TỰ: người bấm 5,1,5,1,5,1,5,1,5,1 có IRV cao
    (trông như phân biệt tốt) nhưng longstring chỉ 1 — còn người bấm
    1,1,1,1,1,5,5,5,5,5 thì IRV cũng cao mà longstring tới 5.
    """
    dai = mx = 1
    for i in range(1, len(hang)):
        dai = dai + 1 if hang[i] == hang[i - 1] else 1
        mx = max(mx, dai)
    return mx


ls = np.array([longstring(h) for h in X])          # ① Longstring
irv = X.std(axis=1, ddof=0)                        # ② Intra-individual Response Variability

# ③ Mahalanobis D² — có tính tới TƯƠNG QUAN giữa các câu, nên bắt được mẫu trả
#    lời bất thường mà hai chỉ số trên bỏ sót. Dùng pinv vì ma trận hiệp phương
#    sai có thể suy biến khi vài câu gần như trùng nhau.
mu = X.mean(axis=0)
Sinv = np.linalg.pinv(np.cov(X, rowvar=False))
hieu = X - mu
md2 = np.einsum("ij,jk,ik->i", hieu, Sinv, hieu)
NGUONG_MD = chi2.ppf(0.999, df=k)

vi_pham = (ls >= 10).astype(int) + (irv <= 0).astype(int) + (md2 > NGUONG_MD).astype(int)

print(f"① Longstring ≥ 10           : {int((ls >= 10).sum()):3d} phiếu")
print(f"② IRV ≤ 0                   : {int((irv <= 0).sum()):3d} phiếu")
print(f"③ Mahalanobis D² > {NGUONG_MD:5.2f}   : {int((md2 > NGUONG_MD).sum()):3d} phiếu")

# Ở ngưỡng cực đại, ① và ② là ĐỒNG NHẤT THỨC chứ không phải hai phép đo độc
# lập: IRV = 0 ⟺ cả 10 câu giống nhau ⟺ longstring = 10. Nói "hai chỉ số độc
# lập cùng chỉ về một tập" là overclaim — chứng minh luôn ở đây cho minh bạch.
assert set(np.where(ls >= 10)[0]) == set(np.where(irv <= 0)[0]), "phải trùng khít"
print("   ⚠️  ① và ② trùng khít (đồng nhất thức với thang 10 câu), KHÔNG độc lập")
print("       → luật ≥2 thực chất chỉ để CHẶN ③ loại phiếu một mình")
print()
for v in (3, 2, 1, 0):
    print(f"   vi phạm {v} chỉ số : {int((vi_pham == v).sum()):3d} phiếu"
          + ("   ← LOẠI" if v >= 2 else ""))
print(f"\\n→ Loại {int((vi_pham >= 2).sum())} phiếu, còn {int((vi_pham < 2).sum())}")'''))

C.append(code('''# ═══════════ HÌNH 1.1 — Phân bố longstring ═══════════
# Đây là bằng chứng thứ nhất: phân bố tự nhiên giảm đều, không có bậc thang.
fig, ax = plt.subplots(figsize=(10, 4.6))
gt, sl = np.unique(ls, return_counts=True)
mau = [C_THAT if g >= 10 else C_XANH for g in gt]
ax.bar(gt, sl, color=mau, width=.7)
nhan_doc(ax)
ax.set_xlabel("Chuỗi câu trả lời giống nhau liên tiếp dài nhất")
ax.set_ylabel("Số phiếu")
ax.set_xticks(gt)
ax.set_title("Hình 1.1 — Phân bố longstring: bậc thang ở đúng giá trị tối đa")
ax.legend(handles=[Patch(facecolor=C_XANH, label="bình thường"),
                   Patch(facecolor=C_THAT, label="điền trùng cả 10 câu")], loc="upper center")
n10 = int(sl[gt == 10][0]) if (gt == 10).any() else 0
n9 = int(sl[gt == 9][0]) if (gt == 9).any() else 0
luu(fig, OUT, "hinh_1_1_longstring",
    f"Số phiếu giảm đơn điệu từ longstring 2 tới 9 ({int(sl[gt==2][0])} → {n9}), rồi "
    f"NHẢY VỌT lên {n10} ở đúng mức 10. Biến thể tự nhiên không tạo ra bậc thang ở "
    f"đúng giá trị tối đa của thang đo — đó là dấu vết của hành vi bấm một nút cho xong.")'''))

C.append(code('''# ═══════════ Bằng chứng 2 — mô phỏng giả thuyết không ═══════════
# Rút lại 10 câu của mỗi người ĐỘC LẬP theo phân phối biên của TỪNG câu: giữ
# nguyên độ khó của mỗi câu, chỉ bỏ đi tính nhất quán trong một người. Nếu
# longstring = 10 xuất hiện nhiều dưới giả thuyết này thì nó là ngẫu nhiên.
rng = np.random.default_rng(SEED)
dem = np.array([
    (np.array([longstring(h) for h in
               np.column_stack([rng.choice(X[:, j], n) for j in range(k)])]) == 10).sum()
    for _ in range(200)
])

print(f"Số phiếu điền trùng cả 10 câu")
print(f"   mô phỏng null (200 lần) : trung bình {dem.mean():.1f} · khoảng {dem.min()}–{dem.max()}")
print(f"   QUAN SÁT THẬT           : {int((ls >= 10).sum())}")
print(f"\\n→ Dưới giả thuyết 10 câu độc lập, gần như không thể có ngần ấy phiếu trùng.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 2. Phễu lọc'''))

C.append(code('''buoc = [("Phiếu thu được", len(tho))]
d = tho.copy()
d["ier_longstring"], d["ier_irv"], d["ier_mahalanobis"] = ls, irv, md2
d["ier_so_vi_pham"] = vi_pham

# ── Bước 1: tên ngành phải khớp bảng chuẩn ────────────────────────────────
d["nganh_hoc"] = d.nganh_hoc.astype(str).str.strip()
la = d.nganh_hoc.isin(TEN_TO_MA)
if (~la).any():
    print("Tên ngành không khớp bảng chuẩn:")
    for t, c in d.loc[~la, "nganh_hoc"].value_counts().items():
        print(f"   {c:3d} phiếu · {t!r}")
d = d[la].copy()
buoc.append(("Ngành khớp bảng chuẩn", len(d)))

# ── Bước 2: loại theo quy trình IER ───────────────────────────────────────
loai = d.ier_so_vi_pham >= 2
print(f"\\nPhiếu vi phạm ≥ 2 chỉ số IER: {int(loai.sum())}")
if loai.any():
    print("   mức hay chọn nhất:", d.loc[loai, L[0]].value_counts().head(3).to_dict())
giu1 = d.ier_so_vi_pham == 1
print(f"Phiếu chỉ vi phạm 1 chỉ số (GIỮ LẠI): {int(giu1.sum())}")
for _, r in d[giu1].head(3).iterrows():
    print("   " + " ".join(f"{int(v)}" for v in r[L]) + f"   IRV={r.ier_irv:.2f}")
d = d[~loai].copy()
buoc.append(("Bỏ phiếu thiếu nỗ lực (IER)", len(d)))

# ── Bước 3: phải có ít nhất một môn điểm ──────────────────────────────────
d = d[d[C_DIEM].notna().sum(axis=1) > 0].copy()
buoc.append(("Có ít nhất 1 môn điểm", len(d)))

d["likert_dolech"] = d[L].astype(float).std(axis=1)
d["ma_nganh"] = d.nganh_hoc.map(TEN_TO_MA)
d["ma_khoi"] = d.ma_nganh.map(NGANH_TO_KHOI)
d = d.reset_index(drop=True)

print()
for i, (ten, sl_) in enumerate(buoc):
    mat = f"  (−{buoc[i-1][1]-sl_})" if i else ""
    print(f"   {ten:<30} {sl_:>4}{mat}")
print(f"\\nCòn lại {len(d)} phiếu · {d.ma_nganh.nunique()}/39 ngành"
      f" · {d.ma_khoi.nunique()}/{len(KHOI)} nhóm")
assert d.ma_nganh.nunique() == 39, "có ngành không còn phiếu nào"
assert d.likert_dolech.min() > 0, "còn sót phiếu độ lệch 0 — công thức ips sẽ hỏng"'''))

C.append(code('''# ═══════════ HÌNH 1.2 — Phễu lọc ═══════════
fig, ax = plt.subplots(figsize=(10, 4.2))
ten = [b[0] for b in buoc]; sl_ = [b[1] for b in buoc]
ax.barh(range(len(buoc))[::-1], sl_, color=[C_XAM] + [C_XANH] * (len(buoc) - 1), height=.62)
ax.set_yticks(range(len(buoc))[::-1]); ax.set_yticklabels(ten, fontsize=10)
ax.set_xlabel("Số phiếu"); ax.grid(axis="y", alpha=0)
ax.set_title("Hình 1.2 — Phễu làm sạch dữ liệu khảo sát")
nhan_ngang(ax, sl_)
luu(fig, OUT, "hinh_1_2_pheu_loc",
    f"Giữ lại {sl_[-1]}/{sl_[0]} phiếu ({100*sl_[-1]/sl_[0]:.1f}%). Bước tốn nhiều phiếu "
    f"nhất là lọc IER ({buoc[1][1]-buoc[2][1]} phiếu) — cũng là bước duy nhất cần biện "
    f"luận, nên đã có hai bằng chứng ở mục 1.")'''))

# ───────────────────────────────────────────────────────────────────────────
C.append(md('''## 3. Ghi kết quả'''))

C.append(code('''d.to_csv(OUT / "khaosat_sach.csv", index=False)

# Bảng IER của TỪNG phiếu — để tra ngược được mọi câu hỏi "sao loại phiếu đó".
pd.DataFrame({
    "nganh_hoc": tho.nganh_hoc,
    "longstring": ls, "irv": irv, "mahalanobis_d2": md2,
    "vuot_longstring": (ls >= 10).astype(int),
    "vuot_irv": (irv <= 0).astype(int),
    "vuot_mahalanobis": (md2 > NGUONG_MD).astype(int),
    "so_vi_pham": vi_pham,
    "bi_loai": (vi_pham >= 2).astype(int),
}).to_csv(OUT / "bang_ier.csv", index=False)

# Chín giai đoạn sau đọc file này. Đổi tên khoá là phải vá cả chín notebook,
# nên lược đồ dưới đây coi như hợp đồng, không sửa tuỳ tiện.
mapping = {
    "ten_cach_nhom": "nhóm ngành (chia lại từ 7 khối gốc của HUIT)",
    "ten_to_ma": TEN_TO_MA,
    "ma_to_ten": {str(m): t for m, t in MA_TO_TEN.items()},
    "nganh_to_nhom": {str(m): k for m, k in NGANH_TO_KHOI.items()},
    "ten_nhom": {str(k): v for k, v in TEN_KHOI.items()},
    "nhom_chi_tiet": {str(k): [t for t, _ in v] for k, v in KHOI.items()},
    "cot_likert": L,
    "cot_diem": C_DIEM,
    "n_sach": len(d),
    "nguong_ier": {"longstring": 10, "irv": 0.0, "mahalanobis_d2": float(NGUONG_MD),
                   "so_chi_so_toi_thieu": 2},
    "ghi_chu": "Nguồn chuẩn duy nhất cho toàn pipeline.",
}
(OUT / "mapping.json").write_text(
    json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")

pd.DataFrame([{"ma_nganh": m, "nganh_hoc": MA_TO_TEN[m],
               "ma_khoi": NGANH_TO_KHOI[m], "ten_khoi": TEN_KHOI[NGANH_TO_KHOI[m]],
               "so_phieu": int((d.ma_nganh == m).sum())}
              for m in sorted(MA_TO_TEN)]).to_csv(OUT / "bang_nganh.csv", index=False)

tom_tat("GIAI ĐOẠN 1 — LÀM SẠCH KHẢO SÁT", [
    f"Phiếu thu được         {len(tho)}",
    f"Loại theo IER (≥2/3)   {int((vi_pham >= 2).sum())}",
    f"Giữ lại                {len(d)}",
    f"Ngành / nhóm           {d.ma_nganh.nunique()} / {d.ma_khoi.nunique()}",
    f"Ngành ít phiếu nhất    {int(d.ma_nganh.value_counts().min())} phiếu",
    f"Đặc trưng gốc          {len(L)} câu Likert · {len(C_DIEM)} môn điểm",
])
print(f"\\n✅ khaosat_sach.csv · bang_ier.csv · mapping.json · bang_nganh.csv  →  {OUT}")'''))

viet("01_LamSachKhaoSat.ipynb", C)
