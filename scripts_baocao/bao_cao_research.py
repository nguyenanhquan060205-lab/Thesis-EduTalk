"""Báo cáo Word — Hướng 1 (research/): gộp toàn bộ dữ liệu rồi mới chia.
Đây là kết quả chính của khoá luận.

Mọi con số đọc từ file kết quả; mọi nhận định có assert kiểm chứng. Sau khi lưu, tài
liệu được quét lại để bắt số gõ tay (xem bao_cao_chung.kiem_so).

    python bao_cao_research.py   →  docs/BaoCao_Research_GoiYNganh.docx
"""
import pathlib
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from bao_cao_chung import (GOC, TOP_K, KetQua, MoHinhDaLuu, Word, bang_kq, bang_moc,  # noqa: E402
                           cau_hinh_chot, diem, moc_bua, nen, nguyen, pho_bien, pt,
                           sai_so_95, so)

RA = GOC / "docs" / "BaoCao_Research_GoiYNganh.docx"

# ═══════════════════════════════════════════════════════════════════════════
#  NẠP VÀ KIỂM CHÉO
# ═══════════════════════════════════════════════════════════════════════════
kq = KetQua("research")
N = nen(kq)
M = kq.js(10, "metrics.json")
XH = kq.cv(10, "chi_so_xep_hang.csv")
TN = kq.cv(10, "theo_nganh.csv")
LOP = kq.cv(10, "chi_so_lop.csv").set_index("lat_cat")
STH = kq.js(9, "sieu_tham_so.json")
QUET = kq.cv(9, "ket_qua_quet.csv")
NP = kq.js(7, "niem_phong.json")
T6 = kq.js(6, "tom_tat.json")
KQ = bang_kq(kq)

KT, KK = M["diem_van_hanh"]["tu_van"], M["diem_van_hanh"]["kham_pha"]
xtv = XH[XH.tang.str.startswith("TƯ VẤN")].iloc[0]
xkp = XH[XH.tang.str.startswith("KHÁM PHÁ")].iloc[0]
tv, kp = KQ["TEST · tư vấn"], KQ["TEST · khám phá"]
tvh, kph = KQ["TRAIN+VAL · tư vấn"], KQ["TRAIN+VAL · khám phá"]
cs_tv, cs_kp = LOP.loc["tư vấn · TEST"], LOP.loc["khám phá · TEST"]
rb = M["rang_buoc_gd9"]
n_nganh = N["n_nganh"]
tap = N["tap"]
hoc = pd.concat([tap["train"], tap["val"]], ignore_index=True)
te = tap["test_KHOA"]
n_tr, n_va, n_te, n_hoc = len(tap["train"]), len(tap["val"]), len(te), len(hoc)
ks_tr, ks_va, ks_te = (N["nguon"](x, "khaosat") for x in ("train", "val", "test_KHOA"))
BUA = moc_bua(N, hoc, te, M["doan_bua"])
bua_tv, bua_pb, bua_kp = BUA["trong_nhom"], BUA["dong_nhat"], BUA["kham_pha"]

assert int(xtv.k) == KT and int(xkp.k) == KK
assert kq.bam(7, "test_KHOA.csv") == NP["bam_sha256"], "tập test đã bị sửa sau khi niêm phong"
assert n_te == M["n_test"] == NP["n_dong"] and n_hoc == M["n_hoc"]
assert T6["n_dong"] == N["n_tt"] + N["n_bootstrap"] + N["n_ks"] == n_tr + n_va + n_te
assert ks_tr + ks_va + ks_te == N["n_ks"] and ks_te == NP["n_that"]
assert abs(tv[KT] - xtv.hit_k) < 1e-9 and abs(kp[KK] - xkp.hit_k) < 1e-9
assert abs(tv[1] - cs_tv.acc_top1) < 1e-9 and abs(kp[1] - cs_kp.acc_top1) < 1e-9
ty_le = [nguyen(round(NP[k] * 100)) for k in ("p_train", "p_val", "p_test")]

# Giai đoạn 5 — năm cách sinh dữ liệu
kd, kl = N["kd"], N["kl"]
CHOT = kl["phuong_phap_chot"]
GA = [f"ga_{g}" for g in N["the_he"]]
ga_it, ga_nhieu = GA[0], GA[-1]
assert kd[kd.hop_le].lech_05.idxmin() == CHOT
assert kd.da_dang.idxmax() == CHOT
assert not kd.loc[ga_it, "hop_le"] and kd.auc.idxmax() == ga_nhieu
assert kd.loc[GA, "da_dang"].idxmin() == ga_nhieu
assert (kd.loc[GA[1:], "sao_chep"] < kl["nguong_sao_chep"]).all()

# Giai đoạn 8 — mốc (bang_moc.csv, đủ độ chính xác)
MOC = bang_moc(kq)
m1, m2, m3, m4, mh8 = MOC
assert m1["moc"].startswith("1") and m4["moc"].startswith("4") and mh8["moc"].startswith("MÔ HÌNH")
n_cot_th = int(m3["moc"].split("chỉ ")[1].split(" cột")[0])
assert int(m4["n_train"]) == ks_tr
assert mh8["kp_val"] - m3["kp_val"] > mh8["tv_val"] - m3["tv_val"] > 0 and mh8["kp_val"] > m4["kp_val"]

# Vì sao tư vấn gợi ý 2 ngành
co_nhom = N["co_nhom"]
nho_nhat = min(co_nhom)
pb_it, pb_nhieu = pho_bien(tap["train"], tap["val"], KT), pho_bien(tap["train"], tap["val"], nho_nhat)
assert abs(pb_it - m1["tv_val"]) < 1e-9 and nho_nhat == KT + 1

# Giai đoạn 9 — chống học vẹt
q_tv = QUET[(QUET.tv_train <= rb["kp_train_toi_da"]) & (QUET.gap_tv <= rb["kp_gap_toi_da"])]
assert len(q_tv) == STH["n_hop_le_neu_ap_len_tu_van"] and int(QUET.hop_le.sum()) == STH["n_hop_le"]
lot = q_tv[~q_tv.hop_le]
chot_cf = cau_hinh_chot(QUET, STH["hp"])
assert chot_cf.hop_le and chot_cf.kp_val == QUET[QUET.hop_le].kp_val.max()
dc = STH["doi_chung_tang_tu_van"]
r0 = next(x for x in dc if not x["rieng_nhom"])
r1 = next(x for x in dc if x["rieng_nhom"])
ch_rn = r1["tv_val"] - r0["tv_val"]
ss_rn = sai_so_95(r0["tv_val"], n_va)
assert M["rieng_nhom"] == STH["rieng_nhom"] == (ch_rn > 0)
hp = M["hp"]
gap_kp3 = kph[3] - kp[3]
assert gap_kp3 <= rb["kp_gap_toi_da"], "ràng buộc không giữ được trên test — phải sửa kết luận"

# Theo ngành
COT = f"top{KK}_kham_pha"
assert int((TN[COT] < .5).sum()) == int(xkp.n_nganh_duoi_50)
yeu = TN.nsmallest(5, COT)
co_tt = TN[TN.khong_ttth == 0]
assert len(co_tt) == N["n_nganh_tt"]
r_log = float(np.corrcoef(np.log(co_tt.n_hoc), co_tt[COT])[0, 1])
muc_r = "yếu" if abs(r_log) < .3 else ("trung bình" if abs(r_log) < .6 else "khá mạnh")
vd_a = co_tt[co_tt.n_hoc < 150].sort_values([COT, "n_hoc"], ascending=[False, True]).iloc[0]
vd_b = co_tt[co_tt.n_hoc >= 1.5 * vd_a.n_hoc].sort_values([COT, "n_hoc"]).iloc[0]
assert vd_a[COT] > vd_b[COT] and vd_a.n_hoc < vd_b.n_hoc
ng = TN.set_index("ten")
for nho, lon in [("Khoa học dữ liệu", ["Công nghệ thông tin"]),
                 ("Thương mại điện tử", ["Quản trị kinh doanh", "Marketing"])]:
    assert all(ng.loc[x, "nhom"] == ng.loc[nho, "nhom"] and ng.loc[x, "n_hoc"] > 3 * ng.loc[nho, "n_hoc"]
               for x in lon)
cao = TN[(TN.khong_ttth == 1) & (TN[COT] >= .9)].sort_values(COT)

# Dòng test của 5 ngành không có hồ sơ trúng tuyển trùng khít dòng huấn luyện?
du = {x: kq.cv(7, f"{x}.csv") for x in ("train", "val", "test_KHOA")}
hoc_du = pd.concat([du["train"], du["val"]], ignore_index=True)
khoa = [c for c in hoc_du.columns if c.startswith(("diem_", "th_"))] + ["ma_nganh"]
tap_hoc = set(map(tuple, hoc_du[khoa].round(4).fillna(-1).values))
bs = set(hoc_du.loc[hoc_du.nguon == "bootstrap_khaosat", "ma_nganh"])
assert bs == set(TN[TN.khong_ttth == 1].ma)


def ti_le_trung(df):
    return float(np.mean([tuple(v) in tap_hoc for v in df[khoa].round(4).fillna(-1).values]))


trung_bs = ti_le_trung(du["test_KHOA"][du["test_KHOA"].ma_nganh.isin(bs)])
trung_khac = ti_le_trung(du["test_KHOA"][~du["test_KHOA"].ma_nganh.isin(bs)])
assert trung_bs > trung_khac

# Khám phá Top-1..5: Top-4 không có trong bang_ket_qua.csv — tính từ mô hình đã lưu và
# đối chiếu tuyệt đối với các k pipeline có lưu.
kp5 = MoHinhDaLuu(kq).top_k(du["test_KHOA"], False, (1, 2, 3, 4, 5))
assert all(abs(kp5[k] - kp[k]) < 1e-12 for k in TOP_K)

ky_nang = lambda a, b: (a - b) / (1 - b)

# ═══════════════════════════════════════════════════════════════════════════
b = Word()
b.h("Gợi ý ngành học bằng XGBoost — Hướng 1: gộp dữ liệu rồi mới chia", 1)
b.p(f"Kết quả chính của khoá luận: {nguyen(N['n_ks'])} phiếu khảo sát và {nguyen(N['n_tt'])} "
    f"hồ sơ trúng tuyển, {nguyen(n_nganh)} ngành thuộc {nguyen(N['n_nhom'])} nhóm ngành "
    f"của Trường Đại học Công Thương TP. Hồ Chí Minh.", ngh=True)

b.h("Tóm tắt", 2)
b.gach([
    ("Tầng tư vấn", f" (đã chọn nhóm ngành, gợi ý {nguyen(KT)} ngành): {pt(tv[KT])} thí sinh "
                    f"có ngành đúng trong {nguyen(KT)} gợi ý; bốc ngẫu nhiên chỉ đúng "
                    f"{pt(bua_tv[KT])}."),
    ("Tầng khám phá", f" (chưa chọn nhóm, gợi ý {nguyen(KK)} trong {nguyen(n_nganh)} ngành): "
                      f"{pt(kp[KK])} thí sinh có ngành đúng trong {nguyen(KK)} gợi ý; bốc ngẫu "
                      f"nhiên chỉ đúng {pt(bua_kp[KK])}."),
    ("Cách đo", f" — tập test {nguyen(n_te)} dòng, tách ra ngay từ đầu, niêm phong bằng mã "
                f"băm SHA-256 và chỉ mở một lần."),
    ("Hạn chế chính", " — câu hỏi sở thích của hồ sơ trúng tuyển do máy sinh, và kết quả với "
                      "học sinh thật có thể thấp hơn; báo cáo Hướng 2 đo được mức chênh này."),
])

# ═══════════════════════════════════════════════════════════════════════════
b.h("1. Bài toán", 2)
b.p("Hệ thống có hai tầng, dùng chung dữ liệu và đặc trưng:")
b.bang(["Tầng", "Khi nào dùng", "Hệ thống làm gì", "Số gợi ý", "Bốc ngẫu nhiên đúng"],
       [["Tư vấn", "Người dùng đã chọn nhóm ngành", "Xếp hạng các ngành trong nhóm",
         nguyen(KT), pt(bua_tv[KT])],
        ["Khám phá", "Chưa có định hướng", f"Xếp hạng cả {nguyen(n_nganh)} ngành",
         nguyen(KK), pt(bua_kp[KK])]],
       rong=[2.4, 4.0, 4.4, 2.2, 3.0])
b.p("Hai tầng khó dễ rất khác nhau, nên mọi con số trong báo cáo đều đi kèm mốc so sánh.")

# ═══════════════════════════════════════════════════════════════════════════
b.h("2. Dữ liệu", 2)

b.h("2.1. Hai nguồn dữ liệu", 3)
b.gach([
    ("Phiếu khảo sát", f" — {nguyen(N['n_ks_tho'])} phiếu học sinh tự điền: "
                       f"{nguyen(N['n_likert'])} câu hỏi sở thích (thang Likert "
                       f"{nguyen(N['likert_min'])}–{nguyen(N['likert_max'])}), điểm thi, tổ hợp, "
                       f"giới tính, mục tiêu. Loại {nguyen(N['n_ks_loai'])} phiếu chọn cùng một "
                       f"mức cho cả {nguyen(N['n_likert'])} câu (dấu hiệu điền cho có), còn "
                       f"{nguyen(N['n_ks'])} phiếu."),
    ("Hồ sơ trúng tuyển", f" — {nguyen(N['n_tt_tho'])} hồ sơ của trường. Bỏ hồ sơ không trúng "
                          f"tuyển, mã ngành ngoài danh mục, tổ hợp D10 và số báo danh trùng, còn "
                          f"{nguyen(N['n_tt'])} hồ sơ thuộc {nguyen(N['n_nganh_tt'])} ngành. Có "
                          f"điểm, tổ hợp và ngành thật nhưng không có câu hỏi sở thích."),
])

b.h("2.2. Điền phần sở thích còn thiếu bằng Gaussian Copula", 3)
b.p(f"Hồ sơ trúng tuyển thiếu {nguyen(N['n_likert'])} câu sở thích. Phần này được sinh theo "
    f"cách trả lời của học sinh cùng ngành trong phiếu khảo sát; điểm, tổ hợp và ngành của hồ "
    f"sơ giữ nguyên. Phương pháp là Gaussian Copula có điều kiện theo ngành (Sklar, 1959; "
    f"Patki và cộng sự, 2016). Với mỗi ngành:")
b.so_thu_tu([
    "Học tỉ lệ chọn từng mức của mỗi câu, và mức độ các câu thường đi cùng nhau (ma trận "
    "tương quan).",
    "Rút ngẫu nhiên các bộ số từ phân phối chuẩn nhiều chiều có đúng mức tương quan đó.",
    "Đổi từng số về mức Likert bằng bảng tỉ lệ đã học, nên tỉ lệ chọn từng mức khớp dữ liệu "
    "thật.",
])
b.p(f"Ngành ít phiếu nhất ({N['ks_it_nhat_ten']}) chỉ có {nguyen(N['ks_it_nhat'])} phiếu. Vì "
    f"vậy tỉ lệ và tương quan của mỗi ngành được kéo về mức chung của nhóm ngành (co ngót "
    f"Bayes, K = {nguyen(N['K'])}): ngành càng ít phiếu càng dựa nhiều vào nhóm. Giới tính và "
    f"mục tiêu cũng rút theo tỉ lệ của ngành.")
b.p(f"Riêng {nguyen(N['n_thieu'])} ngành không có hồ sơ trúng tuyển nào: mỗi ngành được bổ sung "
    f"{nguyen(N['bs_moi_nganh'])} dòng, điểm và tổ hợp lấy mẫu lại từ phiếu khảo sát của ngành, "
    f"câu sở thích sinh bằng copula — tổng {nguyen(N['n_bootstrap'])} dòng.")

b.h("2.3. Vì sao không dùng thuật toán di truyền", 3)
b.p("Cách được thử trước là thuật toán di truyền (GA): lấy phiếu thật làm quần thể ban đầu, "
    "rồi qua nhiều thế hệ ghép câu trả lời của hai phiếu và thay ngẫu nhiên một câu bằng câu "
    "của phiếu khác. Dữ liệu sinh ra được chấm bằng ba tiêu chí:")
b.gach([
    ("AUC bộ phân biệt", f" — một mô hình Random Forest thử phân biệt dòng sinh với phiếu "
                         f"thật. Càng gần {so(0.5, 2)} càng tốt: máy không phân biệt được."),
    ("Sao chép", f" — tỉ lệ dòng sinh trùng nguyên một phiếu thật. Phải dưới "
                 f"{pt(kl['nguong_sao_chep'], 0)}, vì chép nguyên phiếu là dùng lại dữ liệu "
                 f"thật."),
    ("Đa dạng", " — tỉ lệ dòng khác nhau. Càng cao càng tốt."),
])


def ten_cach(bn):
    return "Gaussian Copula" if bn == "copula" else f"GA {nguyen(int(bn.split('_')[1]))} thế hệ"


def ket_luan(bn):
    if bn == CHOT:
        return "chọn"
    if not kd.loc[bn, "hop_le"]:
        return "loại: sao chép vượt ngưỡng"
    return f"đạt ngưỡng, AUC xa {so(0.5, 2)} hơn"


b.bang(["Cách sinh", "AUC", "Sao chép", "Đa dạng", "Kết luận"],
       [[ten_cach(bn), so(kd.loc[bn, "auc"], 3), pt(kd.loc[bn, "sao_chep"]),
         pt(kd.loc[bn, "da_dang"]), ket_luan(bn)] for bn in [CHOT] + GA],
       rong=[3.8, 2.0, 2.4, 2.4, 5.2])
b.p(f"GA mắc kẹt ở một đánh đổi. Chạy ít thế hệ thì dữ liệu còn giống thật nhưng chép nguyên "
    f"phiếu ({pt(kd.loc[ga_it, 'sao_chep'])} ở {nguyen(N['the_he'][0])} thế hệ). Chạy nhiều thế "
    f"hệ thì gần như không còn chép, nhưng các dòng co cụm lại và lệch khỏi dữ liệu thật (đa "
    f"dạng còn {pt(kd.loc[ga_nhieu, 'da_dang'])}, AUC {so(kd.loc[ga_nhieu, 'auc'], 3)} ở "
    f"{nguyen(N['the_he'][-1])} thế hệ). Copula có AUC gần {so(0.5, 2)} nhất trong các cách đạt "
    f"ngưỡng sao chép và có độ đa dạng cao nhất, nên được chọn.")
b.hinh(kq.hinh(5, "hinh_5_1*.png"),
       f"Chấm điểm năm cách sinh (ga_{N['the_he'][0]} là GA {nguyen(N['the_he'][0])} thế hệ). Trái: AUC, vạch "
       f"đỏ là mức lý tưởng {so(0.5, 2)}. Phải: AUC theo tỉ lệ sao chép; bản nằm bên phải vạch "
       f"cam {pt(kl['nguong_sao_chep'], 0)} bị loại.")

b.h("2.4. Gộp thành một bảng rồi mới chia", 3)
b.bang(["Nguồn", "Số dòng"],
       [["Hồ sơ trúng tuyển (câu sở thích do copula sinh)", nguyen(N["n_tt"])],
        [f"Bổ sung {nguyen(N['n_thieu'])} ngành không có hồ sơ trúng tuyển",
         nguyen(N["n_bootstrap"])],
        ["Phiếu khảo sát", nguyen(N["n_ks"])],
        ["Tổng — bảng huấn luyện cuối cùng", nguyen(T6["n_dong"])]],
       rong=[10.0, 3.0])
b.p(f"Mọi dòng có trọng số như nhau; cột ghi nguồn gốc không đưa vào mô hình. Bảng được chia "
    f"ngẫu nhiên theo tỉ lệ {ty_le[0]}/{ty_le[1]}/{ty_le[2]}, giữ tỉ lệ từng ngành ở cả ba tập:")
b.bang(["Tập", "Số dòng", "Trong đó phiếu khảo sát", "Dùng để"],
       [["Train", nguyen(n_tr), nguyen(ks_tr), "huấn luyện"],
        ["Validation", nguyen(n_va), nguyen(ks_va), "chọn cấu hình"],
        ["Test", nguyen(n_te), nguyen(ks_te), "đo kết quả cuối, mở một lần"]],
       rong=[2.6, 2.6, 4.4, 5.4])

b.h("2.5. Niêm phong tập test bằng mã băm SHA-256", 3)
b.p("Tập test được băm SHA-256 ngay khi tách. Trước khi đo ở giai đoạn 10, chương trình băm "
    "lại và so với mã đã lưu: khớp mới đo, lệch thì dừng. Chỉ cần tệp đổi một ký tự là mã băm "
    "khác hẳn, nên phát hiện được tập test bị sửa hay bị tráo — điều mà đếm số dòng không làm "
    "được.")
b.p("SHA-256 được chọn vì là chuẩn của NIST (FIPS 180-4) và có sẵn trong Python; MD5 và SHA-1 "
    "đã có cách tạo hai tệp khác nhau cùng mã. Mã băm không phát hiện được việc tập test bị xem "
    "trước; điều đó được bảo đảm bằng quy trình: mọi lựa chọn cấu hình chỉ dựa trên validation.")

# ═══════════════════════════════════════════════════════════════════════════
b.ngat()
b.h("3. Cách đánh giá", 2)

b.h("3.1. Chỉ số", 3)
b.bang(["Chỉ số", "Ý nghĩa"],
       [["Hit@k", "Tỉ lệ thí sinh có ngành đúng nằm trong k gợi ý"],
        ["macro Hit@k", "Hit@k tính riêng từng ngành rồi lấy trung bình — ngành ít thí sinh "
                        "được tính ngang ngành đông"],
        ["MRR", f"Trung bình của {nguyen(1)}/(hạng của ngành đúng); bằng {nguyen(1)} khi ngành "
                f"đúng luôn đứng đầu"],
        ["NDCG@k", "Chấm theo vị trí trong k gợi ý: đứng đầu được trọn điểm, càng xuống dưới "
                   "càng ít điểm"],
        ["Hạng trung vị", "Một nửa số thí sinh có ngành đúng ở hạng này hoặc đứng trước"],
        ["Kỹ năng", f"Phần sai của bốc ngẫu nhiên mà mô hình sửa được: (mô hình − ngẫu nhiên) "
                    f"/ ({nguyen(1)} − ngẫu nhiên)"]],
       rong=[3.4, 12.0])
b.p("Không dùng precision@k và recall@k: mỗi thí sinh chỉ có một ngành đúng nên recall@k "
    "trùng với Hit@k, còn precision@k chỉ là Hit@k chia cho k. Cũng không có AUC@k, vì AUC "
    "không cắt theo số gợi ý; vai trò đó thuộc về NDCG@k.")

b.h(f"3.2. Vì sao tầng tư vấn gợi ý {nguyen(KT)} ngành", 3)
b.p(f"Nhóm ngành có từ {nguyen(nho_nhat)} đến {nguyen(max(co_nhom))} ngành; "
    f"{nguyen(co_nhom.count(nho_nhat))} nhóm chỉ có {nguyen(nho_nhat)} ngành, nên gợi ý "
    f"{nguyen(nho_nhat)} ngành ở các nhóm này luôn đúng mà không cần mô hình. Trên tập "
    f"validation, quy tắc đơn giản “luôn gợi ý các ngành đông thí sinh nhất trong nhóm” đúng "
    f"{pt(pb_nhieu)} khi gợi ý {nguyen(nho_nhat)} ngành, nhưng chỉ {pt(pb_it)} khi gợi ý "
    f"{nguyen(KT)} ngành. Vì vậy tầng tư vấn gợi ý {nguyen(KT)} ngành — mức mà mô hình vẫn hơn rõ "
    f"quy tắc đơn giản.")

b.h("3.3. Mốc đối chứng", 3)
b.p("Đo trên validation. Tầng khám phá ở mục này dùng Top-3 vì đó là chỉ số được chọn từ trước "
    "để lọc cấu hình ở giai đoạn 9; kết quả cuối vẫn báo cáo ở Top-5.")
b.bang(["Mốc", f"Tư vấn Top-{nguyen(KT)}", "Khám phá Top-3"],
       [["Luôn gợi ý ngành đông thí sinh nhất", pt(m1["tv_val"]), pt(m1["kp_val"])],
        ["Bốc ngẫu nhiên", pt(m2["tv_val"]), pt(m2["kp_val"])],
        [f"Chỉ dùng {nguyen(n_cot_th)} cột tổ hợp xét tuyển", pt(m3["tv_val"]), pt(m3["kp_val"])],
        [f"Chỉ học từ {nguyen(m4['n_train'])} phiếu khảo sát", pt(m4["tv_val"]),
         pt(m4["kp_val"])],
        [f"Mô hình đầy đủ ({nguyen(T6['n_dac_trung'])} đặc trưng)", pt(mh8["tv_val"]),
         pt(mh8["kp_val"])]],
       rong=[8.0, 3.4, 3.6])
b.gach([
    f"Các đặc trưng ngoài tổ hợp có đóng góp: mô hình đầy đủ hơn mốc chỉ dùng tổ hợp "
    f"{diem(mh8['tv_val'] - m3['tv_val'], dau=False)} điểm ở tầng tư vấn và "
    f"{diem(mh8['kp_val'] - m3['kp_val'], dau=False)} điểm ở tầng khám phá.",
    f"Hồ sơ trúng tuyển có đóng góp: chỉ học từ phiếu khảo sát thì tầng khám phá đạt "
    f"{pt(m4['kp_val'])}; thêm hồ sơ trúng tuyển lên {pt(mh8['kp_val'])}.",
])
b.hinh(kq.hinh(8, "hinh_8_1*.png"),
       f"Mô hình so với bốn mốc đối chứng trên validation (tư vấn Top-{nguyen(KT)}, khám phá "
       f"Top-3).")

b.h("3.4. Chống học vẹt", 3)
b.p(f"Giai đoạn 9 thử {nguyen(STH['n_cau_hinh'])} cấu hình XGBoost. Một cấu hình bị loại nếu ở "
    f"tầng khám phá (Top-3), độ chính xác trên train vượt {pt(rb['kp_train_toi_da'], 0)} hoặc "
    f"cao hơn validation quá {nguyen(round(rb['kp_gap_toi_da'] * 100))} điểm phần trăm — dấu "
    f"hiệu mô hình học thuộc dữ liệu. Còn {nguyen(STH['n_hop_le'])}/{nguyen(STH['n_cau_hinh'])} "
    f"cấu hình; chọn cấu hình có kết quả validation cao nhất trong số đó.")
b.p(f"Ràng buộc đặt ở tầng khám phá vì chỉ số tư vấn không đủ nhạy: áp cùng ngưỡng lên tầng tư "
    f"vấn (Top-{nguyen(KT)}) thì {nguyen(len(q_tv))} cấu hình qua, nhưng {nguyen(len(lot))} "
    f"trong số đó vẫn học vẹt ở tầng khám phá (chênh tới "
    f"{diem(lot.gap_kp.max(), dau=False)} điểm). Cái giá của ràng buộc: cấu hình tốt nhất toàn "
    f"lưới đạt {pt(QUET.kp_val.max())} trên validation nhưng bị loại; cấu hình được chọn đạt "
    f"{pt(chot_cf.kp_val)}.")
b.bang(["Siêu tham số", "Giá trị"],
       [["Số cây (n_estimators)", nguyen(hp["n_estimators"])],
        ["Độ sâu tối đa (max_depth)", nguyen(hp["max_depth"])],
        ["Số mẫu tối thiểu ở lá (min_child_weight)", nguyen(hp["min_child_weight"])],
        ["Hệ số phạt (reg_lambda)", so(hp["reg_lambda"])],
        ["Tỉ lệ cột mỗi cây dùng (colsample_bytree)", so(hp["colsample_bytree"])],
        ["Mô hình riêng cho từng nhóm (tầng tư vấn)", "có" if M["rieng_nhom"] else "không"]],
       rong=[9.0, 3.0])
b.p(f"Ở tầng tư vấn, mô hình riêng cho từng nhóm cao hơn mô hình chung "
    f"{diem(ch_rn, dau=False)} điểm trên validation" +
    (f" — nhỏ hơn sai số ±{so(ss_rn * 100)} điểm, nên hai cách gần như tương đương."
     if abs(ch_rn) < ss_rn else "."))

# ═══════════════════════════════════════════════════════════════════════════
b.ngat()
b.h("4. Kết quả trên tập test", 2)
b.p(f"Mô hình cuối học lại trên train + validation ({nguyen(n_hoc)} dòng), rồi đo một lần trên "
    f"{nguyen(n_te)} dòng test sau khi kiểm mã băm.")

b.h("4.1. Chỉ số chính", 3)
b.bang(["Chỉ số", f"Tư vấn ({nguyen(KT)} gợi ý)", f"Khám phá ({nguyen(KK)} gợi ý)"],
       [["Hit@k", pt(tv[KT]), pt(kp[KK])],
        ["Hit@k khi bốc ngẫu nhiên", pt(bua_tv[KT]), pt(bua_kp[KK])],
        ["macro Hit@k", pt(xtv.macro_hit_k), pt(xkp.macro_hit_k)],
        ["MRR", so(xtv.mrr, 3), so(xkp.mrr, 3)],
        ["MRR khi bốc ngẫu nhiên", so(xtv.mrr_doan_bua, 3), so(xkp.mrr_doan_bua, 3)],
        ["NDCG@k", so(xtv.ndcg_k, 3), so(xkp.ndcg_k, 3)],
        ["Hạng trung vị của ngành đúng", nguyen(xtv.hang_trung_vi), nguyen(xkp.hang_trung_vi)],
        [f"Số ngành dưới {pt(0.5, 0)}", f"{nguyen(xtv.n_nganh_duoi_50)}/{nguyen(xtv.n_nganh)}",
         f"{nguyen(xkp.n_nganh_duoi_50)}/{nguyen(xkp.n_nganh)}"]],
       rong=[6.4, 4.4, 4.6])
b.gach([
    f"Tầng tư vấn: {pt(tv[1])} thí sinh có ngành đúng ngay ở gợi ý đầu tiên.",
    f"Tầng khám phá: Hit@{nguyen(KK)} cao hơn bốc ngẫu nhiên "
    f"{diem(kp[KK] - bua_kp[KK], dau=False)} điểm.",
    f"macro Hit@{nguyen(KK)} thấp hơn Hit@{nguyen(KK)} "
    f"{diem(xkp.hit_k - xkp.macro_hit_k, dau=False)} điểm: ngành ít thí sinh được gợi ý đúng "
    f"kém hơn (mục 5.1).",
])

b.h("4.2. Theo số gợi ý", 3)
b.p("Tầng tư vấn, so với hai mốc:")
b.bang(["Số gợi ý", "Mô hình", "Bốc ngẫu nhiên", "Ngành đông nhất", "Hơn ngành đông nhất"],
       [[f"Top-{k}", pt(tv[k]), pt(bua_tv[k]), pt(bua_pb[k]), diem(tv[k] - bua_pb[k])]
        for k in (1, 2, 3)],
       rong=[2.4, 2.6, 3.2, 3.4, 4.0])
b.p(f"Khoảng cách với quy tắc “ngành đông nhất” thu hẹp nhanh khi tăng số gợi ý: "
    f"{diem(tv[KT] - bua_pb[KT], dau=False)} điểm ở Top-{nguyen(KT)}, chỉ còn "
    f"{diem(tv[3] - bua_pb[3], dau=False)} điểm ở Top-3.")
b.p("Tầng khám phá:")
b.bang(["Số gợi ý", "Mô hình", "Bốc ngẫu nhiên", "Kỹ năng"],
       [[f"Top-{k}", pt(kp5[k]), pt(k / n_nganh), pt(ky_nang(kp5[k], k / n_nganh))] for k in kp5],
       rong=[2.6, 3.0, 3.4, 3.0])
b.hinh(kq.hinh(10, "hinh_10_1*.png"),
       f"Kết quả trên tập test theo số gợi ý. Cột xám là bốc ngẫu nhiên; thanh đen là khoảng tin "
       f"cậy {pt(0.95, 0)}. Hình vẽ các mức Top-1, Top-2, Top-3 và Top-5; Top-4 có trong bảng "
       f"khám phá ở trên.")

b.h("4.3. Kiểm tra học vẹt trên test", 3)
b.bang(["Chỉ số", "Train + validation", "Test", "Chênh (điểm)"],
       [[f"Tư vấn Top-{nguyen(KT)}", pt(tvh[KT]), pt(tv[KT]), diem(tvh[KT] - tv[KT])],
        ["Khám phá Top-3 (chỉ số của ràng buộc)", pt(kph[3]), pt(kp[3]), diem(gap_kp3)],
        [f"Khám phá Top-{nguyen(KK)}", pt(kph[KK]), pt(kp[KK]), diem(kph[KK] - kp[KK])]],
       rong=[4.2, 4.0, 2.8, 3.2])
b.p(f"Ngưỡng {nguyen(round(rb['kp_gap_toi_da'] * 100))} điểm được đặt trên validation trước khi "
    f"mở test; chênh thực tế trên test ở tầng khám phá là {diem(gap_kp3, dau=False)} điểm, vẫn "
    f"trong ngưỡng.")
b.hinh(kq.hinh(10, "hinh_10_2*.png"),
       f"Train + validation so với test (tư vấn Top-{nguyen(KT)}, khám phá Top-3). Đường đứt nét "
       f"là bốc ngẫu nhiên.")

b.h("4.4. Chỉ số phân loại một nhãn (để đối chiếu)", 3)
b.bang(["Chỉ số", "Tư vấn", "Khám phá"],
       [["Accuracy (Top-1)", pt(cs_tv.acc_top1), pt(cs_kp.acc_top1)],
        ["macro-F1", so(cs_tv.f1_macro, 3), so(cs_kp.f1_macro, 3)],
        ["weighted-F1", so(cs_tv.f1_weighted, 3), so(cs_kp.f1_weighted, 3)]],
       rong=[5.0, 3.4, 3.4])
b.p(f"Nhóm chỉ số này giả định hệ thống chỉ trả một ngành, trong khi hệ thống thật trả "
    f"{nguyen(KT)}–{nguyen(KK)} gợi ý; báo cáo để đối chiếu với các nghiên cứu phân loại.")

# ═══════════════════════════════════════════════════════════════════════════
b.ngat()
b.h("5. Hạn chế", 2)

b.h("5.1. Chênh lệch giữa các ngành", 3)
b.p(f"Trong {nguyen(n_nganh)} ngành, {nguyen(xkp.n_nganh_duoi_50)} ngành có Hit@{nguyen(KK)} khám "
    f"phá dưới {pt(0.5, 0)}. Năm ngành thấp nhất:")
b.bang(["Ngành", "Dòng huấn luyện", f"Hit@{nguyen(KK)} khám phá"],
       [[r.ten, nguyen(r.n_hoc), pt(getattr(r, COT))] for r in yeu.itertuples()],
       rong=[8.0, 3.6, 3.6])
b.p(f"Lượng dữ liệu ảnh hưởng rõ: trên {nguyen(len(co_tt))} ngành có hồ sơ trúng tuyển, tương "
    f"quan giữa lôgarit số dòng huấn luyện và Hit@{nguyen(KK)} là r = {so(r_log, 2)}, mức "
    f"{muc_r}. Nhưng không giải thích hết: {vd_a.ten} chỉ có {nguyen(vd_a.n_hoc)} dòng vẫn đạt "
    f"{pt(vd_a[COT])}, trong khi {vd_b.ten} có {nguyen(vd_b.n_hoc)} dòng chỉ đạt {pt(vd_b[COT])}.")
b.p(f"Một nguyên nhân khác là ngành nhỏ nằm cùng nhóm với ngành lớn hơn nhiều: Khoa học dữ liệu "
    f"({nguyen(ng.loc['Khoa học dữ liệu', 'n_hoc'])} dòng) cùng nhóm với Công nghệ thông tin "
    f"({nguyen(ng.loc['Công nghệ thông tin', 'n_hoc'])} dòng); Thương mại điện tử "
    f"({nguyen(ng.loc['Thương mại điện tử', 'n_hoc'])} dòng) cùng nhóm với Quản trị kinh doanh "
    f"({nguyen(ng.loc['Quản trị kinh doanh', 'n_hoc'])} dòng) và Marketing "
    f"({nguyen(ng.loc['Marketing', 'n_hoc'])} dòng).")
if len(cao):
    b.p(f"Các ngành {', '.join(cao.ten)} đạt {pt(cao[COT].min(), 0)}–{pt(cao[COT].max(), 0)} "
        f"nhưng không nên xem là bằng chứng mô hình tốt. Cả {nguyen(len(bs))} ngành không có hồ "
        f"sơ trúng tuyển đều được bổ sung dòng bằng cách lấy mẫu lại điểm và tổ hợp từ phiếu khảo "
        f"sát, nên {pt(trung_bs, 0 if trung_bs == 1 else 1)} dòng test của chúng trùng khít điểm, "
        f"tổ hợp và ngành với một dòng huấn luyện (ở {nguyen(len(co_tt))} ngành còn lại chỉ "
        f"{pt(trung_khac)}).")
b.hinh(kq.hinh(10, "hinh_10_3*.png"),
       f"Hit@{nguyen(KK)} khám phá từng ngành theo số dòng huấn luyện. Số cạnh chấm tra tên ở "
       f"bảng bên phải; dấu * là ngành không có hồ sơ trúng tuyển.")

b.h("5.2. Các hạn chế khác", 3)
b.gach([
    f"Bộ sinh copula học từ cả {nguyen(N['n_ks'])} phiếu khảo sát trước khi chia tập, kể cả "
    f"{nguyen(ks_te)} phiếu sau đó nằm trong test. Đây là hệ quả của việc gộp toàn bộ rồi mới "
    f"chia, nên kết quả có thể cao hơn thực tế.",
    f"Câu sở thích của {nguyen(N['n_tt'])} hồ sơ trúng tuyển do máy sinh; điểm, tổ hợp và ngành "
    f"là thật.",
    f"Số gợi ý của tầng tư vấn ({nguyen(KT)}) được chốt sau khi tập test đã mở. Lý do chọn dựa "
    f"trên cấu trúc nhóm ngành và tập validation (mục 3.2), không dựa trên kết quả test; cấu "
    f"hình mô hình được chọn lại với chỉ số mới và không thay đổi.",
    "Không đánh trọng số theo ngành để bù ngành ít dữ liệu, vì thiết kế yêu cầu mọi dòng có "
    "trọng số như nhau.",
])

# ═══════════════════════════════════════════════════════════════════════════
b.h("6. Kết luận", 2)
b.bang(["Tầng", "Số gợi ý", "Hit@k", "macro Hit@k", "MRR", "Bốc ngẫu nhiên"],
       [["Tư vấn", nguyen(KT), pt(tv[KT]), pt(xtv.macro_hit_k), so(xtv.mrr, 3), pt(bua_tv[KT])],
        ["Khám phá", nguyen(KK), pt(kp[KK]), pt(xkp.macro_hit_k), so(xkp.mrr, 3),
         pt(bua_kp[KK])]],
       rong=[2.6, 2.2, 2.4, 3.0, 2.2, 3.2])
b.p("Mô hình XGBoost hai tầng vượt xa bốc ngẫu nhiên ở cả hai tầng. Ba điểm về phương pháp: "
    "chọn Gaussian Copula thay thuật toán di truyền dựa trên kiểm định có số liệu; mọi kết quả "
    "đi kèm mốc đối chứng; ràng buộc chống học vẹt đặt trên validation trước khi mở test và "
    "vẫn giữ được trên test.")

b.luu(RA)
