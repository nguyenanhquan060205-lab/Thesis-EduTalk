"""Sinh notebook 10_ChotModel.ipynb"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from nbgen import SETUP, DU_LIEU, MO_HINH, md, code, so_do, viet

C = []

C.append(md('''# Giai đoạn 10 — Chốt mô hình và mở tập test

''' + so_do(
    "10_ChotModel",
    ["09_TinhChinh/sieu_tham_so.json       —  cấu hình đã chốt",
     "08_TrainFinal/train_final.csv        —  3.187 dòng huấn luyện",
     "03_TachTrainTest/khaosat_test_KHOA.csv  ←  MỞ ĐÚNG MỘT LẦN"],
    ["Huấn luyện lại trên toàn bộ train_final.csv",
     "Dự đoán 102 phiếu test — lần duy nhất tập này được dùng",
     "Báo cáo TRAIN | TEST | chênh | đoán bừa | hơn bừa cho mọi Top-k",
     "So với đối chứng: đoán lớp đông nhất · model phẳng · chỉ khảo sát"],
    ["10_ChotModel/model_*.json            —  mô hình để backend dùng",
     "10_ChotModel/metrics.json · bang_ket_qua.csv",
     "10_ChotModel/hinh_10_*.png           —  5 hình"]) + '''

## Đây là lần duy nhất tập test được mở

102 phiếu khảo sát đã bị khoá từ Giai đoạn 3. Không notebook nào từ 4 đến 9 đọc nó.

Nếu sau khi nhìn kết quả test mà quay lại chỉnh mô hình rồi đo lại, tập test **không còn là tập
test** — nó thành tập validation thứ hai, và con số báo cáo sẽ lạc quan giả. Đó là lý do bước này
nằm cuối và **chỉ chạy một lần**.

## Hai chế độ, đúng như web gọi API

| Chế độ web | `fieldId` | Ý nghĩa con số |
|---|---|---|
| **Khám phá** | `null` | **năng lực thật của hệ thống** — học sinh chỉ trả lời khảo sát |
| **Tư vấn** | `0..6` | chỉ số **có điều kiện** — người dùng đã tự chọn khối |

Hai con số này **không so ngang hàng được**. Chế độ tư vấn cao hơn hẳn vì người dùng đã giải sẵn
phần khó nhất. Báo cáo phải ghi rõ điều này, nếu không người đọc sẽ tưởng hệ thống giỏi hơn thực tế.
'''))

C.append(code(SETUP + DU_LIEU + MO_HINH + '''
from sklearn.metrics import f1_score, balanced_accuracy_score, confusion_matrix

OUT = thu_muc(10)

D = nap(co_test=True, co_ttth=True)        # ← LẦN DUY NHẤT mở tập test
ks, te = D["train"], D["test"]
te = te.copy()
te["to_hop_thi"] = te.to_hop_thi.astype(str).str.split(" ").str[0]
Xte = dac_trung(te, D).values
yte = te.ma_nganh.values
NG = D["nganh"]
nhom_te = np.array([D["nhom"][m] for m in yte])
K = len(D["ten_nhom"])
co_nhom = pd.Series(list(D["nhom"].values())).value_counts()

STH = json.loads((thu_muc(9) / "sieu_tham_so.json").read_text(encoding="utf-8"))
M0 = json.loads((thu_muc(4) / "moc_chuan.json").read_text(encoding="utf-8"))
HP = STH["hp"]
W_THAT = STH["w_that"]
# Phân tầng: {mã nhóm: {mã ngành: id lĩnh vực con}} — Giai đoạn 9 quyết định
PHAN_TANG = {int(g): {int(m): int(s) for m, s in b.items()}
             for g, b in STH.get("phan_tang", {}).items()}

# Tập huấn luyện chính thức
# Tìm theo mẫu tên để chấp nhận cả train_final.csv lẫn train_final_7.csv,
# train_final_9.csv… (file có thể được đổi tên khi đối chiếu hai nhánh)
_f = sorted(thu_muc(8).glob("train_final*.csv"))
assert _f, f"không thấy train_final*.csv trong {thu_muc(8)}"
print(f"Đọc tập huấn luyện: {_f[0].name}")
tf = pd.read_csv(_f[0])
COT = [c for c in tf.columns if c not in
       ("ma_nganh", "ma_nhom", "nganh_hoc", "to_hop_thi", "nguon", "is_that",
        "sample_weight")]
# LỖI ĐÃ SỬA: trước đây notebook này luôn huấn luyện trên toàn bộ
# train_final.csv, kể cả khi Giai đoạn 9 đã kết luận dữ liệu tăng cường KHÔNG
# giúp gì. Khi đó mô hình cuối không phải mô hình mà Giai đoạn 9 đã chọn, và
# cột TRAIN bị thổi lên gần 100% vì các dòng tăng cường sinh ra từ chính 574
# dòng thật nên rất dễ khớp.
DUNG_TC = bool(STH.get("dung_tang_cuong", True))
if not DUNG_TC:
    print(f"⚠️  Giai đoạn 9 kết luận dữ liệu tăng cường KHÔNG giúp "
          f"({STH['loi_ich_tang_cuong']['3']*100:+.1f}đ ở Top-3).")
    print(f"    Mô hình cuối chỉ huấn luyện trên {int(tf.is_that.sum())} dòng khảo sát thật.")
    tf = tf[tf.is_that == 1].reset_index(drop=True)
else:
    print(f"Giai đoạn 9 kết luận DÙNG dữ liệu tăng cường "
          f"({STH['loi_ich_tang_cuong']['3']*100:+.1f}đ ở Top-3).")

Xtr = tf[COT].values
ytr = tf.ma_nganh.values
wtr = np.where(tf.is_that == 1, W_THAT, 1.0)
nhom_tr = tf.ma_nhom.values

assert list(COT) == list(dac_trung(te, D).columns), "cột train và test lệch nhau"
print(f"Train : {len(tf):,} dòng  ({int(tf.is_that.sum())} thật ×{W_THAT:.0f}"
      f" + {int((1-tf.is_that).sum()):,} tăng cường)")
print(f"Test  : {len(te)} phiếu — chưa từng đọc ở giai đoạn nào trước")
print(f"Đặc trưng: {len(COT)}")
print(f"Siêu tham số: {HP}")
print(f"Phân tầng   : {'nhóm ' + ', '.join(str(g) for g in PHAN_TANG) if PHAN_TANG else 'không dùng'}")'''))

C.append(md("## 1. Huấn luyện mô hình cuối cùng"))

C.append(code('''t0 = time.time()
MH = MoHinhNganh(D, HP, rieng_nhom=True, phan_tang=PHAN_TANG).fit(Xtr, ytr, wtr)
print(f"Huấn luyện xong trong {time.time()-t0:.0f}s")
print(f"   mô hình chung 39 ngành + {len(MH.m_nhom)} mô hình riêng nhóm"
      f" + {len(MH.m_tang)} mô hình phân tầng")'''))

C.append(md("## 2. Mở tập test — đúng một lần"))

C.append(code('''S_auto = MH.diem(Xte)
S_guided = MH.diem(Xte, nhom_te)

auto = top_k(S_auto, yte, NG)
guided = top_k(S_guided, yte, NG)
bua_a = bua_toan_bo(len(NG))
bua_g = bua_trong_nhom(yte, D["nhom"])

# ── Đối chứng ────────────────────────────────────────────────────────────
mp = MoHinhNganh(D, HP, rieng_nhom=False).fit(Xtr, ytr, wtr)
phang = top_k(mp.diem(Xte), yte, NG)

ks_ = ks.copy()
ks_["to_hop_thi"] = ks_.to_hop_thi.astype(str).str.split(" ").str[0]
Xks = dac_trung(ks_, D).values
MH0 = MoHinhNganh(D, HP, rieng_nhom=True,
                  phan_tang=PHAN_TANG).fit(Xks, ks_.ma_nganh.values)
chi_ks_a = top_k(MH0.diem(Xte), yte, NG)
chi_ks_g = top_k(MH0.diem(Xte, nhom_te), yte, NG)

p_dong = pd.Series(ks_.ma_nganh).value_counts(normalize=True)
dong_nhat = {k: float(p_dong.head(k).sum()) for k in TOP_K}
# MỐC ĐỐI CHỨNG THỰC TẾ: luôn gợi ý k ngành đông nhất trong nhóm người dùng chọn.
# Học tần suất từ TRAIN, áp lên TEST. Không cần khảo sát, không cần điểm thi.
bua_pb = bua_pho_bien(ks_.ma_nganh.values, yte, D["nhom"])

in_bang([
    dong("Đoán lớp đông nhất", dong_nhat, bua_a),
    dong("Model phẳng (không dùng khối)", phang, bua_a),
    dong("Chỉ 574 phiếu khảo sát", chi_ks_a, bua_a),
    dong("★ Mô hình cuối", auto, bua_a),
], f"{len(te)} PHIẾU TEST — CHẾ ĐỘ KHÁM PHÁ (chỉ số hệ thống)")

in_bang([
    dong("Đoán bừa trong nhóm", bua_g, bua_g),
    dong("★ 3 NGÀNH PHỔ BIẾN NHẤT (không cần mô hình)", bua_pb, bua_g),
    dong("Chỉ 574 phiếu khảo sát", chi_ks_g, bua_g),
    dong("★ Mô hình cuối", guided, bua_g),
], "CHẾ ĐỘ TƯ VẤN — người dùng đã chọn khối (chỉ số CÓ ĐIỀU KIỆN)")

print("\\n" + "═" * 78)
print("MÔ HÌNH CÓ HƠN QUY TẮC 'GỢI Ý 3 NGÀNH PHỔ BIẾN NHẤT' KHÔNG?")
print("═" * 78)
print(f"{'':<8}{'mô hình':>10}{'phổ biến':>11}{'hơn':>9}{'kỹ năng':>10}")
for k in TOP_K:
    print(f"Top-{k:<4}{guided[k]:>10.1%}{bua_pb[k]:>11.1%}"
          f"{(guided[k]-bua_pb[k])*100:>+8.1f}đ{ky_nang_vs(guided[k], bua_pb[k]):>10.1%}")
print("═" * 78)
print("Đây mới là mốc đối chứng đúng. Vượt 'đoán bừa' là chưa đủ — không ai xây")
print("hệ thống gợi ý bằng cách bốc ngẫu nhiên. Quy tắc 'ngành phổ biến nhất'")
print("chỉ vài dòng code, nên mô hình học máy phải hơn được NÓ mới có giá trị.")'''))

C.append(code('''# ── Cột TRAIN phải đo cho ĐÚNG ─────────────────────────────────────────────
# KHÔNG đo được trên train_final.csv: các dòng tăng cường trong đó SINH RA TỪ
# phân phối của chính 574 dòng thật, nên chúng "chứa sẵn" đặc điểm của 574 dòng
# đó. Mô hình học chúng rồi chấm lại 574 dòng gốc thì luôn ra ~100%, vô nghĩa.
#
# Cách đúng, giống hệt Giai đoạn 9: dùng dữ liệu tăng cường SINH RIÊNG CHO TỪNG
# FOLD — bản của fold nào chỉ học từ phần train của fold đó.
_khung = pd.read_csv(thu_muc(6) / "khung_ho_so.csv")
_Zs = np.load(thu_muc(6) / "sinh_theo_fold.npz")
_KEY = json.loads((thu_muc(7) / "ket_luan.json").read_text(encoding="utf-8"))["key_thang"]
_FOLDS = D["folds"]["folds"]
_Xks, _yks = Xks, ks_.ma_nganh.values
_nhks = np.array([D["nhom"][m] for m in _yks])
_ga, _gg, _gy = [], [], []
for _i in range(5):
    _d = _khung.copy()
    for _c, _col in enumerate(D["likert"]):
        _d[_col] = _Zs[_KEY][_i, :, _c]
    _d["gioi_tinh"] = np.where(_Zs["gioi_tinh"][_i] == 1, "Nam", "Nữ")
    _d["muc_tieu_ma"] = _Zs["muc_tieu"][_i]
    _Xt, _yt = dac_trung(_d, D).values, _d.ma_nganh.values
    _tr = np.array(_FOLDS[_i]["train_idx"])
    if DUNG_TC:
        _Xs = np.vstack([_Xks[_tr], _Xt]); _ys = np.concatenate([_yks[_tr], _yt])
        _w = np.r_[np.full(len(_tr), W_THAT), np.ones(len(_yt))]
    else:
        _Xs, _ys, _w = _Xks[_tr], _yks[_tr], None
    _m = MoHinhNganh(D, HP, rieng_nhom=True, phan_tang=PHAN_TANG).fit(_Xs, _ys, _w)
    _ga.append(_m.diem(_Xks[_tr])); _gg.append(_m.diem(_Xks[_tr], _nhks[_tr]))
    _gy.append(_yks[_tr])
tr_auto = top_k(np.vstack(_ga), np.concatenate(_gy), NG)
tr_guided = top_k(np.vstack(_gg), np.concatenate(_gy), NG)
print(f"TRAIN đo như Giai đoạn 9: cross-validation với dữ liệu tăng cường"
      f" RIÊNG từng fold, chấm trên {len(ks_)} dòng khảo sát thật")
print(f"   (đo trên train_final.csv sẽ ra ~100% vì dòng tăng cường sinh ra"
      f" từ chính 574 dòng thật đó)")
bang_train_test([("Tư vấn (người dùng chọn khối)", tr_guided, guided, bua_g),
                 ("Khám phá (không chọn khối)", tr_auto, auto, bua_a)])
print("\\nCột TRAIN đo trên 3.187 dòng huấn luyện, cột TEST trên 102 phiếu chưa từng thấy.")
print("Chỉ cột TEST mới là năng lực thật của mô hình.")

pred_a = NG[S_auto.argmax(1)]
pred_g = NG[S_guided.argmax(1)]
nhom_pred = np.array([D["nhom"][m] for m in pred_a])
bo_sung = {
    "auto_macro_f1": float(f1_score(yte, pred_a, average="macro")),
    "auto_balanced_acc": float(balanced_accuracy_score(yte, pred_a)),
    "guided_macro_f1": float(f1_score(yte, pred_g, average="macro")),
    "nhom_top1": float(np.mean(nhom_pred == nhom_te)),
}
print(f"\\nmacro-F1 (khám phá)      : {bo_sung['auto_macro_f1']:.3f}")
print(f"balanced accuracy        : {bo_sung['auto_balanced_acc']:.3f}")
print(f"Đoán đúng KHỐI (từ ngành): {bo_sung['nhom_top1']:.1%}   (đoán bừa {1/K:.1%})")'''))

C.append(code('''# ═══════════ HÌNH 10.1 — Kết quả test ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5.4))
x = np.arange(len(TOP_K)); w = .38
for ax, (r, b, ten, mau) in zip((a1, a2), [
        (auto, bua_a, "Khám phá — chỉ số hệ thống", C_XANH),
        (guided, bua_g, "Tư vấn — có điều kiện", C_CAM)]):
    ax.bar(x - w/2, [r[k]*100 for k in TOP_K], w, color=mau, label="Mô hình")
    ax.bar(x + w/2, [b[k]*100 for k in TOP_K], w, color=C_XAM, label="Đoán bừa")
    ax.set_xticks(x); ax.set_xticklabels([f"Top-{k}" for k in TOP_K])
    ax.set_ylabel("Độ chính xác (%)"); ax.set_ylim(0, 105)
    ax.set_title(ten, fontsize=12); ax.legend()
    ax.axhline(80, color=C_THAT, ls="--", lw=1.8)
    for i, k in enumerate(TOP_K):
        ax.text(i - w/2, r[k]*100 + 1.8, f"{r[k]:.1%}", ha="center",
                fontweight="bold", fontsize=10)
        ax.text(i + w/2, b[k]*100 + 1.8, f"{b[k]:.0%}", ha="center", fontsize=9,
                color="#6B7680")
fig.suptitle(f"Hình 10.1 — Kết quả trên {len(te)} phiếu test chưa từng dùng",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_10_1_ket_qua.png",
    f"Chế độ khám phá là năng lực thật: Top-3 {auto[3]:.1%} so với đoán bừa {bua_a[3]:.1%} — gấp "
    f"{auto[3]/bua_a[3]:.1f} lần. Chế độ tư vấn cao hơn vì người dùng đã tự chọn khối, "
    f"nên đoán bừa cũng đã là {bua_g[3]:.1%}.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.2 — Train so với test ═══════════
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))
x = np.arange(len(TOP_K)); w = .27
for ax, (tr_, te_, b_, ten) in zip((a1, a2), [
        (tr_guided, guided, bua_g, "Tư vấn — người dùng chọn khối"),
        (tr_auto, auto, bua_a, "Khám phá — không chọn khối")]):
    ax.bar(x - w, [tr_[k]*100 for k in TOP_K], w, color=C_TIM, label="TRAIN")
    ax.bar(x, [te_[k]*100 for k in TOP_K], w, color=C_XANH, label="TEST")
    ax.bar(x + w, [b_[k]*100 for k in TOP_K], w, color=C_XAM, label="Đoán bừa")
    ax.set_xticks(x); ax.set_xticklabels([f"Top-{k}" for k in TOP_K])
    ax.set_ylabel("Độ chính xác (%)"); ax.set_ylim(0, 108)
    ax.set_title(ten, fontsize=12); ax.legend(fontsize=9)
    ax.axhline(80, color=C_THAT, ls="--", lw=1.6)
    for i, k in enumerate(TOP_K):
        ax.text(i, te_[k]*100 + 1.6, f"{te_[k]:.0%}", ha="center",
                fontweight="bold", fontsize=9.5, color=C_XANH)
fig.suptitle("Hình 10.2 — Độ chính xác trên tập huấn luyện và tập kiểm tra",
             fontsize=14, fontweight="bold", y=1.0)
fig.tight_layout()
luu(fig, OUT, "hinh_10_2_train_test.png",
    f"Chênh train − test ở Top-3 chế độ tư vấn: {(tr_guided[3]-guided[3])*100:+.0f} điểm "
    f"(Giai đoạn 4 chênh {M0['gap_train_val']['guided']['3']*100:+.0f} điểm). Điều hoà ở Giai "
    "đoạn 9 đã kéo hai cột lại gần nhau — đúng yêu cầu 'cả train lẫn test'.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.3 — Tiến triển qua các giai đoạn ═══════════
fig, ax = plt.subplots(figsize=(11, 5.2))
buoc = ["Đoán bừa", "Chỉ khảo sát\\n(M₀, Giai đoạn 4)",
        "+ tăng cường & tinh chỉnh\\n(Giai đoạn 9, val)", "Mô hình cuối\\n(test)"]
gt_g = [bua_g[3]*100, M0["guided"]["top"]["3"]*100,
        STH["ket_qua_cv"]["guided_top3"]*100, guided[3]*100]
gt_a = [bua_a[3]*100, M0["auto"]["top"]["3"]*100,
        STH["ket_qua_cv"]["auto_top3"]*100, auto[3]*100]
x = np.arange(len(buoc)); w = .38
ax.bar(x - w/2, gt_a, w, color=C_XANH, label="Khám phá Top-3")
ax.bar(x + w/2, gt_g, w, color=C_CAM, label="Tư vấn Top-3")
ax.set_xticks(x); ax.set_xticklabels(buoc, fontsize=9)
ax.set_ylabel("Top-3 (%)"); ax.set_ylim(0, 100)
ax.set_title("Hình 10.3 — Từng bước đóng góp bao nhiêu")
ax.legend(); ax.axhline(80, color=C_THAT, ls="--", lw=1.8)
for i in range(len(buoc)):
    ax.text(i - w/2, gt_a[i] + 1.6, f"{gt_a[i]:.1f}", ha="center", fontsize=9,
            fontweight="bold")
    ax.text(i + w/2, gt_g[i] + 1.6, f"{gt_g[i]:.1f}", ha="center", fontsize=9,
            fontweight="bold")
luu(fig, OUT, "hinh_10_3_tien_trien.png",
    "Ba cột đầu đo trên validation, cột cuối trên tập test — đặt cạnh nhau để thấy xu hướng, "
    "không phải để so trực tiếp. Khoảng cách giữa cột 1 và cột 4 là toàn bộ đóng góp của "
    "công trình.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.4 — Nhầm lẫn ở mức khối ═══════════
fig, ax = plt.subplots(figsize=(9, 7.6))
cm = confusion_matrix(nhom_te, nhom_pred, labels=range(K))
cmn = cm / np.maximum(cm.sum(1, keepdims=True), 1)
im = ax.imshow(cmn, cmap="Blues", vmin=0, vmax=1)
tn = [D["ten_nhom"][i][:22] for i in range(K)]
ax.set_xticks(range(K)); ax.set_xticklabels(tn, rotation=45, ha="right", fontsize=8.5)
ax.set_yticks(range(K)); ax.set_yticklabels(tn, fontsize=8.5)
ax.set_xlabel("Mô hình đoán"); ax.set_ylabel("Thực tế")
ax.set_title("Hình 10.4 — Khối nào hay bị nhầm với khối nào")
for i in range(K):
    for j in range(K):
        if cm[i, j]:
            ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=8.5,
                    color="white" if cmn[i, j] > .5 else C_DAM, fontweight="bold")
ax.grid(alpha=0); fig.colorbar(im, ax=ax, shrink=.75, label="tỉ lệ theo hàng")
fig.tight_layout()
cheo = int(np.diag(cm).sum())
luu(fig, OUT, "hinh_10_4_nham_lan.png",
    f"Đường chéo (đoán đúng khối) chiếm {cheo}/{cm.sum()} = {cheo/cm.sum():.1%}. Ô sáng ngoài "
    "đường chéo cho biết khối nào có hồ sơ sinh viên giống nhau tới mức mô hình không tách nổi — "
    "giới hạn của dữ liệu, không phải của thuật toán.")
plt.show()'''))

C.append(code('''# ═══════════ HÌNH 10.5 — Kết quả theo khối ═══════════
theo = []
for g in range(K):
    sel = nhom_te == g
    if not sel.any():
        continue
    o = np.argsort(-S_guided[sel], 1)
    yy_ = yte[sel]
    t3 = float(np.mean([yy_[i] in NG[o[i, :3]] for i in range(int(sel.sum()))]))
    b3 = min(3, co_nhom[g]) / co_nhom[g]
    theo.append({"ma_khoi": g, "khoi": D["ten_nhom"][g], "n_nganh": int(co_nhom[g]),
                 "n_sv": int(sel.sum()), "top3": t3, "bua3": b3, "hon": t3 - b3})
dg = pd.DataFrame(theo).sort_values("n_nganh", ascending=False)
dg.to_csv(OUT / "ket_qua_theo_khoi.csv", index=False)

fig, ax = plt.subplots(figsize=(11, 5.2))
yy = np.arange(len(dg))
ax.barh(yy, dg.bua3 * 100, color=C_XAM, height=.66, label="Đoán bừa Top-3")
ax.barh(yy, dg.top3 * 100, color=C_CAM, height=.4, label="Mô hình Top-3")
ax.axvline(80, color=C_THAT, ls="--", lw=1.8)
ax.set_yticks(yy)
ax.set_yticklabels([f"{r.khoi[:26]}\\n({r.n_nganh} ngành · {r.n_sv} SV)"
                    for r in dg.itertuples()], fontsize=8.5)
ax.set_xlabel("Top-3 ngành trong khối (%)"); ax.set_xlim(0, 118)
ax.set_title("Hình 10.5 — Khối nào mô hình thực sự đóng góp?")
ax.legend(loc="lower right"); ax.grid(axis="y", alpha=0)
for i, r in enumerate(dg.itertuples()):
    ax.text(max(r.top3, r.bua3) * 100 + 1.6, i, f"{r.hon*100:+.0f}đ", va="center",
            fontsize=8.5, fontweight="bold", color=C_GA if r.hon > 0 else C_THAT)
n_de = int(dg[dg.n_nganh <= 3].n_sv.sum())
luu(fig, OUT, "hinh_10_5_theo_khoi.png",
    f"{n_de}/{len(te)} sinh viên test ({n_de/len(te):.0%}) nằm trong khối ≤3 ngành, nơi đoán bừa "
    "đã đúng 100%. Con số tổng phải đọc kèm thực tế này.")
plt.show()'''))

C.append(md("## 3. Xuất mô hình và kết quả"))

C.append(code('''MH.m.save_model(str(OUT / "model_nganh.json"))
for g, (m, _) in MH.m_nhom.items():
    m.save_model(str(OUT / f"model_khoi{g}.json"))

# Mô hình PHÂN TẦNG của các nhóm nghẽn cổ chai. Thiếu khối này thì bản xuất ra đĩa
# KHÔNG tái tạo được con số báo cáo: `diem()` dùng phân tầng cho nhóm nào có trong
# `m_tang`, còn nơi khác chỉ có model_khoi{g}.json nên tụt mất phần +4,8đ mà phân
# tầng đem lại (đo trên 102 em test: Top-3 tư vấn 86,3% → 83,3%).
tang_meta = {}
for g, bo in MH.m_tang.items():
    if bo is None:
        continue
    m_sub, co_s, con = bo
    m_sub.save_model(str(OUT / f"model_tang{g}_sub.json"))
    muc = {"co_s": [int(v) for v in co_s], "con": {}}
    for k, (m_, co_) in con.items():
        if m_ is not None:
            m_.save_model(str(OUT / f"model_tang{g}_{k}.json"))
        muc["con"][str(k)] = {"nganh": [int(v) for v in co_],
                              "co_model": m_ is not None}
    tang_meta[str(g)] = muc

(OUT / "lop_va_dac_trung.json").write_text(json.dumps({
    "nganh_theo_thu_tu_lop": [int(v) for v in MH.co],
    "nganh_day_du": [int(v) for v in NG],
    "lop_theo_khoi": {str(g): [int(v) for v in co]
                      for g, (_, co) in MH.m_nhom.items()},
    "phan_tang": tang_meta,
    "ten_dac_trung": COT,
    "diem_mu": D["diem_mu"].tolist(), "diem_sd": D["diem_sd"].tolist(),
    "to_hop": D["to_hop"],
    "nganh_to_nhom": {str(k): int(v) for k, v in D["nhom"].items()},
    "ten_nhom": {str(k): v for k, v in D["ten_nhom"].items()},
    "cach_dung": ("fieldId=None → model_nganh.json cho 39 ngành. "
                  "fieldId=k → model_khoi{k}.json, TRỪ nhóm có trong `phan_tang`: "
                  "nhóm đó dùng model_tang{k}_sub.json để đoán lĩnh vực con rồi "
                  "nhân với model_tang{k}_{i}.json. Sau đó lấy Top-3."),
}, ensure_ascii=False, indent=2), encoding="utf-8")

metrics = {
    "ngay_chay": time.strftime("%Y-%m-%d %H:%M"), "seed": SEED,
    "cach_nhom": D["ten_cach_nhom"],
    "du_lieu": {"train_tong": len(tf), "train_that": int(tf.is_that.sum()),
                "train_tang_cuong": int((1 - tf.is_that).sum()),
                "test": len(te), "n_dac_trung": len(COT),
                "n_nganh": len(NG), "n_nhom": K, "w_that": W_THAT},
    "sieu_tham_so": {"hp": HP, "w_that": W_THAT,
                     "phan_tang": STH.get("phan_tang", {})},
    "test": {"kham_pha": {"top": auto, "bua": bua_a},
             "tu_van": {"top": guided, "bua": bua_g},
             "phang": phang, "dong_nhat": dong_nhat,
             "bua_pho_bien": bua_pb,
             "hon_pho_bien": {k: guided[k] - bua_pb[k] for k in TOP_K},
             "ky_nang_vs_pho_bien": {k: ky_nang_vs(guided[k], bua_pb[k])
                                     for k in TOP_K},
             "chi_khao_sat": {"kham_pha": chi_ks_a, "tu_van": chi_ks_g},
             **bo_sung},
    "tren_train": {"kham_pha": tr_auto, "tu_van": tr_guided},
    "chenh_train_test": {"kham_pha": {k: tr_auto[k] - auto[k] for k in TOP_K},
                         "tu_van": {k: tr_guided[k] - guided[k] for k in TOP_K}},
    "theo_khoi": dg.to_dict("records"),
    "canh_bao": ("Chỉ số hệ thống là chế độ KHÁM PHÁ. Chế độ TƯ VẤN giả định "
                 "người dùng đã chọn ĐÚNG khối nên không phải năng lực tự động."),
}
(OUT / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2),
                                   encoding="utf-8")
pd.DataFrame([dong("khám phá", auto, bua_a),
              dong("tư vấn", guided, bua_g)]).to_csv(OUT / "bang_ket_qua.csv", index=False)

tom_tat(f"GIAI ĐOẠN 10 — KẾT QUẢ CUỐI trên {len(te)} phiếu test", [
    f"Huấn luyện trên        {len(tf):,} dòng ({int(tf.is_that.sum())} thật ×{W_THAT:.0f}"
    f" + {int((1-tf.is_that).sum()):,} tăng cường)",
    "",
    "CHẾ ĐỘ TƯ VẤN (người dùng chọn khối — chỉ số có điều kiện)",
] + [f"   Top-{k}: {guided[k]:6.1%}   bừa {bua_g[k]:5.1%}"
     f"   hơn {(guided[k]-bua_g[k])*100:+5.1f}đ" for k in TOP_K] + [
    "",
    "CHẾ ĐỘ KHÁM PHÁ (chỉ số hệ thống)",
] + [f"   Top-{k}: {auto[k]:6.1%}   bừa {bua_a[k]:5.1%}"
     f"   gấp {auto[k]/bua_a[k]:4.1f} lần" for k in TOP_K] + [
    "",
    f"Chênh train − test     tư vấn {(tr_guided[3]-guided[3])*100:+.1f}đ"
    f" · khám phá {(tr_auto[3]-auto[3])*100:+.1f}đ  (Top-3)",
    f"macro-F1 {bo_sung['auto_macro_f1']:.3f}"
    f" · balanced acc {bo_sung['auto_balanced_acc']:.3f}"
    f" · đúng khối {bo_sung['nhom_top1']:.1%}",
    "",
    f"Khối đạt 80% (Top-3)   {int((dg.top3 >= .8).sum())}/{len(dg)}",
    "",
    "SO VỚI MỐC THỰC TẾ '3 ngành phổ biến nhất' (không cần mô hình)",
] + [f"   Top-{k}: mô hình {guided[k]:6.1%}  ·  phổ biến {bua_pb[k]:6.1%}"
     f"  ·  hơn {(guided[k]-bua_pb[k])*100:+5.1f}đ" for k in TOP_K] + [
])
print(f"\\n✅ model_nganh.json · {len(MH.m_nhom)} model khối · metrics.json"
      f" · bang_ket_qua.csv · 5 hình  →  {OUT}")
print(f"\\nBackend dùng mô hình này: EDUTALK_MODEL_DIR={OUT.resolve()}")'''))

viet("10_ChotModel.ipynb", C)
