"""Báo cáo Word — Hướng 2 (research1/): niêm phong toàn bộ phiếu khảo sát làm tập đo
trên học sinh thật. Đây là phép kiểm tra bổ sung cho Hướng 1.

Mọi con số đọc từ file kết quả; mọi nhận định có assert kiểm chứng. Sau khi lưu, tài
liệu được quét lại để bắt số gõ tay (xem bao_cao_chung.kiem_so).

    python bao_cao_research1.py   →  docs/BaoCao_Research1_NiemPhongKhaoSat.docx
"""
import pathlib
import sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from bao_cao_chung import (GOC, KetQua, MoHinhDaLuu, Word, bang_kq, bang_moc,  # noqa: E402
                           cau_hinh_chot,
                           diem, moc_bua, nen, nguyen, pt, sai_so_95, so)

RA = GOC / "docs" / "BaoCao_Research1_NiemPhongKhaoSat.docx"
TEP_GIONG = ["01_LamSachKhaoSat/khaosat_sach.csv", "01_LamSachKhaoSat/mapping.json",
             "02_ChuanBiTTTH/ttth_sach.csv", "03_HocPhanPhoi/phan_phoi_theo_nganh.npz",
             "04_SinhDacTrung/tom_tat.json", "04_SinhDacTrung/khung_ho_so.csv",
             "05_KiemDinhDuLieuSinh/bao_cao_kiem_dinh.csv", "05_KiemDinhDuLieuSinh/ket_luan.json",
             "05_KiemDinhDuLieuSinh/ttth_da_sinh.csv"]

# ═══════════════════════════════════════════════════════════════════════════
#  NẠP VÀ KIỂM CHÉO
# ═══════════════════════════════════════════════════════════════════════════
kq, kq1 = KetQua("research1"), KetQua("research")
N = nen(kq)
M = kq.js(10, "metrics.json")
XH = kq.cv(10, "chi_so_xep_hang.csv")
TN = kq.cv(10, "theo_nganh.csv")
STH = kq.js(9, "sieu_tham_so.json")
QUET = kq.cv(9, "ket_qua_quet.csv")
NP = kq.js(7, "niem_phong.json")
NPK = kq.js(6, "niem_phong_khaosat.json")
KQ = bang_kq(kq)

KT, KK = M["diem_van_hanh"]["tu_van"], M["diem_van_hanh"]["kham_pha"]
g = lambda t: XH[XH.tang.str.startswith(t)].iloc[0]
x_tv, x_kp = g("TƯ VẤN · NGƯỜI"), g("KHÁM PHÁ · NGƯỜI")
h_tv, h_kp = KQ["TRAIN+VAL · tư vấn"], KQ["TRAIN+VAL · khám phá"]
te_tv, te_kp = KQ["TEST nội bộ · tư vấn"], KQ["TEST nội bộ · khám phá"]
ks_tv, ks_kp = KQ["KHẢO SÁT · tư vấn"], KQ["KHẢO SÁT · khám phá"]
s34_tv, s34_kp = KQ["KHẢO SÁT 34 ngành · tư vấn"], KQ["KHẢO SÁT 34 ngành · khám phá"]
n_nganh = N["n_nganh"]
tap = N["tap"]
hoc = pd.concat([tap["train"], tap["val"]], ignore_index=True)
n_tr, n_va, n_te, n_hoc = len(tap["train"]), len(tap["val"]), len(tap["test_KHOA"]), len(hoc)
ksn = kq.cv(6, "khaosat_NIEMPHONG.csv", usecols=["ma_nganh", "ma_nhom", "rui_ro_vong_tron"])
bang6 = kq.cv(6, "train_ttth.csv", usecols=["nguon"])
n_ks, n_34 = len(ksn), int((ksn.rui_ro_vong_tron == 0).sum())
BUA = moc_bua(N, hoc, ksn, M["doan_bua"])          # mốc tính trên chính 676 phiếu người thật
bua_tv, bua_pb, bua_kp = BUA["trong_nhom"], BUA["dong_nhat"], BUA["kham_pha"]
rb = M["rang_buoc_gd9"]

assert all((kq.P / t).read_bytes() == (kq1.P / t).read_bytes() for t in TEP_GIONG), \
    "giai đoạn 1–5 hai hướng không còn trùng khít"
assert kq.bam(7, "test_KHOA.csv") == NP["bam_sha256"], "tập test đã bị sửa"
assert kq.bam(6, "khaosat_NIEMPHONG.csv") == NPK["bam_sha256"], "tập niêm phong đã bị sửa"
assert int(x_tv.k) == KT and int(x_kp.k) == KK
assert abs(ks_tv[KT] - x_tv.hit_k) < 1e-9 and abs(ks_kp[KK] - x_kp.hit_k) < 1e-9
assert n_ks == N["n_ks"] == M["n_khaosat_niemphong"] and n_34 == M["n_khaosat_34_nganh"]
assert n_ks - n_34 == NPK["n_vong_tron"]
assert len(bang6) == N["n_tt"] + N["n_bootstrap"] == n_tr + n_va + n_te
assert int((bang6.nguon == "ttth").sum()) == N["n_tt"]
assert all(N["nguon"](x, "khaosat") == 0 for x in tap), "phiếu khảo sát lọt vào bảng huấn luyện"
assert n_hoc == M["n_hoc"] and n_te == M["n_test"] == NP["n_dong"]
n_bang_h1 = kq1.js(6, "tom_tat.json")["n_dong"]

# Mốc (validation)
m1, m2, m3, m4, mh8 = bang_moc(kq)
assert m4["moc"].startswith("4") and int(m4["n_train"]) == N["nguon"]("train", "ttth")
n_cot_th = int(m3["moc"].split("chỉ ")[1].split(" cột")[0])

# Chọn mô hình
q_tv = QUET[(QUET.tv_train <= rb["kp_train_toi_da"]) & (QUET.gap_tv <= rb["kp_gap_toi_da"])]
assert len(q_tv) == STH["n_hop_le_neu_ap_len_tu_van"] and int(QUET.hop_le.sum()) == STH["n_hop_le"]
lot = q_tv[~q_tv.hop_le]
chot_cf = cau_hinh_chot(QUET, STH["hp"])
assert chot_cf.hop_le and chot_cf.kp_val == QUET[QUET.hop_le].kp_val.max()
dc = STH["doi_chung_tang_tu_van"]
r0 = next(x for x in dc if not x["rieng_nhom"])
r1 = next(x for x in dc if x["rieng_nhom"])
ch_rn, ss_rn = r1["tv_val"] - r0["tv_val"], sai_so_95(r0["tv_val"], n_va)
assert M["rieng_nhom"] == STH["rieng_nhom"] == (ch_rn > 0)
hp = M["hp"]

# Mức lạc quan, 5 ngành vòng tròn, khoảng cách train
lq_tv, lq_kp = te_tv[KT] - ks_tv[KT], te_kp[KK] - ks_kp[KK]
vt_tv, vt_kp = ks_tv[KT] - s34_tv[KT], ks_kp[KK] - s34_kp[KK]
gap_te3, gap_ks3 = h_kp[3] - te_kp[3], h_kp[3] - ks_kp[3]
assert lq_tv > 0 and lq_kp > 0 and vt_tv > 0 and vt_kp > 0
assert gap_te3 <= rb["kp_gap_toi_da"] < gap_ks3

# Theo ngành
COT = f"top{KK}_kham_pha"
assert int((TN[COT] < .5).sum()) == int(x_kp.n_nganh_duoi_50)
assert set(TN[TN.vong_tron == 1].ma) == set(NPK["nganh_vong_tron"])
yeu = TN.nsmallest(6, COT)
trung_vi_hoc = TN.n_hoc.median()
assert yeu.n_hoc.max() < trung_vi_hoc

# Theo số gợi ý: tư vấn Top-1..3, khám phá Top-1..5. Top-4 không có trong bang_ket_qua.csv —
# tính từ mô hình đã lưu và đối chiếu tuyệt đối với các k pipeline có lưu.
MH = MoHinhDaLuu(kq)
te_du, ks_du = kq.cv(7, "test_KHOA.csv"), kq.cv(6, "khaosat_NIEMPHONG.csv")
K_TV, K_KP = (1, 2, 3), (1, 2, 3, 4, 5)
te_tv_k, te_kp_k = MH.top_k(te_du, True, K_TV), MH.top_k(te_du, False, K_KP)
ks_tv_k, ks_kp_k = MH.top_k(ks_du, True, K_TV), MH.top_k(ks_du, False, K_KP)
for tinh, luu, ds_k in [(te_tv_k, te_tv, K_TV), (ks_tv_k, ks_tv, K_TV),
                        (te_kp_k, te_kp, (1, 2, 3, 5)), (ks_kp_k, ks_kp, (1, 2, 3, 5))]:
    assert all(abs(tinh[k] - luu[k]) < 1e-12 for k in ds_k)

# ═══════════════════════════════════════════════════════════════════════════
b = Word()
b.h("Gợi ý ngành học bằng XGBoost — Hướng 2: niêm phong phiếu khảo sát", 1)
b.p("Kiểm tra bổ sung cho Hướng 1: đo mô hình trên học sinh thật mà mô hình chưa từng thấy.",
    ngh=True)

b.h("Tóm tắt", 2)
b.gach([
    (f"Trên {nguyen(n_ks)} phiếu người thật", f": tầng tư vấn đạt {pt(ks_tv[KT])} (Hit@"
                                              f"{nguyen(KT)}), tầng khám phá đạt "
                                              f"{pt(ks_kp[KK])} (Hit@{nguyen(KK)})."),
    ("Trên tập test nội bộ", f" (cùng nguồn với dữ liệu huấn luyện): tư vấn {pt(te_tv[KT])}, "
                             f"khám phá {pt(te_kp[KK])}."),
    ("Mức chênh", f" — trên người thật thấp hơn {diem(lq_tv, dau=False)} điểm ở tầng tư vấn và "
                  f"{diem(lq_kp, dau=False)} điểm ở tầng khám phá: kết quả đo trên dữ liệu cùng "
                  f"nguồn với dữ liệu huấn luyện lạc quan hơn khi áp dụng cho học sinh thật. "
                  f"Hướng 1 không đo được mức chênh này."),
])

# ═══════════════════════════════════════════════════════════════════════════
b.h("1. Khác Hướng 1 ở đâu", 2)
b.bang(["", "Hướng 1", "Hướng 2"],
       [[f"{nguyen(n_ks)} phiếu khảo sát", "gộp vào bảng huấn luyện",
         "niêm phong, không dùng để huấn luyện"],
        ["Bảng huấn luyện", f"{nguyen(n_bang_h1)} dòng", f"{nguyen(len(bang6))} dòng"],
        ["Chia train / validation / test", "trên bảng đã gộp", "chỉ trên bảng huấn luyện"],
        ["Tập dùng để đo", "test", "test nội bộ và phiếu người thật"]],
       rong=[4.6, 5.0, 5.6])
b.p(f"Giai đoạn 1–5 (làm sạch, sinh câu sở thích, kiểm định dữ liệu sinh) giống hệt Hướng 1: "
    f"{nguyen(len(TEP_GIONG))} tệp kết quả của hai hướng trùng khít từng byte. Chi tiết các "
    f"bước này xem báo cáo Hướng 1.")
b.p(f"Mô hình phân loại chưa từng thấy phiếu nào trong {nguyen(n_ks)} phiếu niêm phong. Bộ sinh "
    f"copula thì có học từ chúng, vì đây là nguồn câu sở thích duy nhất — nên không gọi là "
    f"“hoàn toàn độc lập”.", dam=True)

# ═══════════════════════════════════════════════════════════════════════════
b.h("2. Dữ liệu và niêm phong", 2)
b.bang(["Nguồn", "Số dòng"],
       [["Hồ sơ trúng tuyển (câu sở thích do copula sinh)", nguyen(N["n_tt"])],
        [f"Bổ sung {nguyen(N['n_thieu'])} ngành không có hồ sơ trúng tuyển (điểm và tổ hợp lấy "
         f"mẫu từ phiếu khảo sát)", nguyen(N["n_bootstrap"])],
        ["Tổng — bảng huấn luyện", nguyen(len(bang6))]],
       rong=[11.0, 3.0])
b.bang(["Tập", "Số dòng", "Dùng để"],
       [["Train", nguyen(n_tr), "huấn luyện"],
        ["Validation", nguyen(n_va), "chọn cấu hình"],
        ["Test nội bộ", nguyen(n_te), "đo trên dữ liệu cùng nguồn, mở một lần"],
        ["Phiếu khảo sát niêm phong", nguyen(n_ks), "đo trên học sinh thật, mở một lần"]],
       rong=[5.0, 2.6, 7.4])
b.p("Cả hai tập đo được băm SHA-256 lúc tách và kiểm lại trước khi mở ở giai đoạn 10; lệch mã "
    "thì chương trình dừng. Thống kê chuẩn hoá điểm chỉ tính trên bảng huấn luyện, để thông tin "
    "của phiếu niêm phong không lọt vào bước tiền xử lý.")
b.hinh(kq.hinh(6, "hinh_6_1*.png"),
       f"Trái: bảng huấn luyện và tập niêm phong tách biệt. Phải: số dòng huấn luyện mỗi ngành; "
       f"cột cam là {nguyen(N['n_thieu'])} ngành rò rỉ vòng tròn.")

# ═══════════════════════════════════════════════════════════════════════════
b.h("3. Năm ngành rò rỉ vòng tròn", 2)
b.p(f"Trong {nguyen(n_nganh)} ngành, {nguyen(N['n_thieu'])} ngành không có hồ sơ trúng tuyển. Dòng huấn luyện của chúng lấy "
    f"điểm và tổ hợp từ chính các phiếu đang bị niêm phong, nên kết quả trên các ngành này mang "
    f"tính vòng tròn.")
b.bang(["Ngành", "Phiếu niêm phong", "Dòng huấn luyện"],
       [[r.ten, nguyen(r.n_test), nguyen(r.n_hoc)]
        for r in TN[TN.vong_tron == 1].sort_values("ten").itertuples()],
       rong=[8.0, 3.6, 3.6])
b.p(f"Các ngành này chiếm {nguyen(n_ks - n_34)}/{nguyen(n_ks)} phiếu niêm phong. Bỏ chúng đi "
    f"(còn {nguyen(n_34)} phiếu), kết quả giảm {diem(vt_tv, dau=False)} điểm ở tầng tư vấn và "
    f"{diem(vt_kp, dau=False)} điểm ở tầng khám phá.")

# ═══════════════════════════════════════════════════════════════════════════
b.ngat()
b.h("4. Chọn mô hình", 2)
b.p("Mốc đối chứng trên validation:")
b.bang(["Mốc", f"Tư vấn Top-{nguyen(KT)}", "Khám phá Top-3"],
       [["Luôn gợi ý ngành đông thí sinh nhất", pt(m1["tv_val"]), pt(m1["kp_val"])],
        ["Bốc ngẫu nhiên", pt(m2["tv_val"]), pt(m2["kp_val"])],
        [f"Chỉ dùng {nguyen(n_cot_th)} cột tổ hợp xét tuyển", pt(m3["tv_val"]), pt(m3["kp_val"])],
        [f"Bỏ {nguyen(N['n_thieu'])} ngành vòng tròn ({nguyen(m4['n_train'])} dòng)",
         pt(m4["tv_val"]), pt(m4["kp_val"])],
        ["Mô hình đầy đủ", pt(mh8["tv_val"]), pt(mh8["kp_val"])]],
       rong=[8.0, 3.4, 3.6])
noise = (f", nhỏ hơn sai số ±{so(ss_rn * 100)} điểm" if abs(ch_rn) < ss_rn else
         f", xấp xỉ sai số ±{so(ss_rn * 100)} điểm" if abs(ch_rn) < 2 * ss_rn else "")
b.p(f"Giai đoạn 9 dùng cùng lưới {nguyen(STH['n_cau_hinh'])} cấu hình và cùng ràng buộc chống học "
    f"vẹt như Hướng 1 (tầng khám phá Top-3: train không quá {pt(rb['kp_train_toi_da'], 0)}, cao "
    f"hơn validation không quá {nguyen(round(rb['kp_gap_toi_da'] * 100))} điểm); còn "
    f"{nguyen(STH['n_hop_le'])}/{nguyen(STH['n_cau_hinh'])} cấu hình hợp lệ. Áp cùng ngưỡng lên "
    f"tầng tư vấn thì {nguyen(len(q_tv))} cấu hình qua nhưng {nguyen(len(lot))} trong số đó vẫn "
    f"học vẹt ở tầng khám phá. Cấu hình được chọn: {nguyen(hp['n_estimators'])} cây, độ sâu "
    f"{nguyen(hp['max_depth'])}, tối thiểu {nguyen(hp['min_child_weight'])} mẫu ở lá, hệ số phạt "
    f"{so(hp['reg_lambda'])}, mỗi cây dùng {pt(hp['colsample_bytree'], 0)} số cột; tầng tư vấn "
    f"dùng mô hình riêng cho từng nhóm (cao hơn mô hình chung {diem(ch_rn, dau=False)} điểm"
    f"{noise}).")

# ═══════════════════════════════════════════════════════════════════════════
b.h("5. Kết quả", 2)

b.h("5.1. Ba cách đo", 3)
b.bang(["Đo trên", f"Tư vấn Hit@{nguyen(KT)}", f"Khám phá Hit@{nguyen(KK)}", "Trả lời câu hỏi"],
       [[f"Train + validation ({nguyen(n_hoc)} dòng)", pt(h_tv[KT]), pt(h_kp[KK]),
         "mô hình nhớ dữ liệu huấn luyện đến đâu"],
        [f"Test nội bộ ({nguyen(n_te)} dòng)", pt(te_tv[KT]), pt(te_kp[KK]),
         "khớp dữ liệu cùng nguồn đến đâu"],
        [f"Người thật ({nguyen(n_ks)} phiếu)", pt(ks_tv[KT]), pt(ks_kp[KK]),
         "dự đoán học sinh thật đến đâu"],
        [f"Người thật, bỏ ngành vòng tròn ({nguyen(n_34)} phiếu)", pt(s34_tv[KT]),
         pt(s34_kp[KK]), "như trên, bỏ phần vòng tròn"],
        ["Bốc ngẫu nhiên (trên người thật)", pt(bua_tv[KT]), pt(bua_kp[KK]), "mốc so sánh"]],
       rong=[5.4, 2.8, 3.0, 5.0])
b.p(f"Trên người thật, kết quả thấp hơn test nội bộ {diem(lq_tv, dau=False)} điểm ở tầng tư vấn "
    f"và {diem(lq_kp, dau=False)} điểm ở tầng khám phá. Hướng 1 không đo được mức chênh này, vì "
    f"ở đó phiếu người thật đã nằm lẫn trong bảng huấn luyện và tập test.", dam=True)
b.p(f"Ràng buộc chống học vẹt vẫn giữ trên test nội bộ: ở tầng khám phá (Top-3), train cao hơn "
    f"test nội bộ {diem(gap_te3, dau=False)} điểm, dưới ngưỡng "
    f"{nguyen(round(rb['kp_gap_toi_da'] * 100))} điểm. Nhưng so với người thật, khoảng cách là "
    f"{diem(gap_ks3, dau=False)} điểm: ràng buộc ngăn mô hình học thuộc dữ liệu huấn luyện, "
    f"không kiểm soát được khoảng cách giữa dữ liệu huấn luyện và học sinh thật.")
b.hinh(kq.hinh(10, "hinh_10_2*.png"),
       f"Ba cách đo (tư vấn Top-{nguyen(KT)}, khám phá Top-3). Chữ đỏ là mức chênh giữa test nội "
       f"bộ và người thật.")

b.h("5.2. Chỉ số chính trên người thật", 3)
b.bang(["Chỉ số", f"Tư vấn ({nguyen(KT)} gợi ý)", f"Khám phá ({nguyen(KK)} gợi ý)"],
       [["Hit@k", pt(ks_tv[KT]), pt(ks_kp[KK])],
        ["Hit@k khi bốc ngẫu nhiên", pt(bua_tv[KT]), pt(bua_kp[KK])],
        ["macro Hit@k", pt(x_tv.macro_hit_k), pt(x_kp.macro_hit_k)],
        ["MRR", so(x_tv.mrr, 3), so(x_kp.mrr, 3)],
        ["MRR khi bốc ngẫu nhiên", so(x_tv.mrr_doan_bua, 3), so(x_kp.mrr_doan_bua, 3)],
        ["NDCG@k", so(x_tv.ndcg_k, 3), so(x_kp.ndcg_k, 3)],
        ["Hạng trung vị của ngành đúng", nguyen(x_tv.hang_trung_vi), nguyen(x_kp.hang_trung_vi)],
        [f"Số ngành dưới {pt(0.5, 0)}", f"{nguyen(x_tv.n_nganh_duoi_50)}/{nguyen(x_tv.n_nganh)}",
         f"{nguyen(x_kp.n_nganh_duoi_50)}/{nguyen(x_kp.n_nganh)}"]],
       rong=[6.4, 4.4, 4.6])
b.gach([
    f"Tầng tư vấn: {pt(ks_tv[1])} thí sinh có ngành đúng ngay ở gợi ý đầu; với "
    f"{nguyen(KT)} gợi ý, mô hình hơn quy tắc “luôn gợi ý ngành đông nhất” "
    f"{diem(ks_tv[KT] - bua_pb[KT], dau=False)} điểm.",
    f"Tầng khám phá: Hit@{nguyen(KK)} cao hơn bốc ngẫu nhiên "
    f"{diem(ks_kp[KK] - bua_kp[KK], dau=False)} điểm.",
    f"Sai số 95% trên {nguyen(n_ks)} phiếu: ±{so(sai_so_95(ks_tv[KT], n_ks) * 100)} điểm (tư "
    f"vấn) và ±{so(sai_so_95(ks_kp[KK], n_ks) * 100)} điểm (khám phá).",
])
b.hinh(kq.hinh(10, "hinh_10_1*.png"),
       f"Kết quả trên {nguyen(n_ks)} phiếu người thật theo số gợi ý. Cột xám là bốc ngẫu nhiên; "
       f"thanh đen là khoảng tin cậy {pt(0.95, 0)}. Hình vẽ các mức Top-1, Top-2, Top-3 và Top-5; "
       f"Top-4 xem mục 5.3.")

b.h("5.3. Theo số gợi ý", 3)
b.p("Tầng tư vấn:")
b.bang(["Số gợi ý", "Test nội bộ", "Người thật", "Bốc ngẫu nhiên", "Ngành đông nhất"],
       [[f"Top-{k}", pt(te_tv_k[k]), pt(ks_tv_k[k]), pt(bua_tv[k]), pt(bua_pb[k])] for k in K_TV],
       rong=[2.4, 3.0, 3.0, 3.4, 3.6])
b.p("Tầng khám phá:")
b.bang(["Số gợi ý", "Test nội bộ", "Người thật", "Bốc ngẫu nhiên"],
       [[f"Top-{k}", pt(te_kp_k[k]), pt(ks_kp_k[k]), pt(k / n_nganh)] for k in K_KP],
       rong=[2.4, 3.2, 3.2, 3.4])
b.p("Hai cột mốc so sánh (bốc ngẫu nhiên, ngành đông nhất) tính trên chính các phiếu người thật.")

b.h("5.4. Theo từng ngành", 3)
b.p(f"Trên người thật, {nguyen(x_kp.n_nganh_duoi_50)}/{nguyen(n_nganh)} ngành có Hit@"
    f"{nguyen(KK)} khám phá dưới {pt(0.5, 0)}. Sáu ngành thấp nhất:")
b.bang(["Ngành", "Dòng huấn luyện", "Phiếu người thật", f"Hit@{nguyen(KK)}"],
       [[r.ten, nguyen(r.n_hoc), nguyen(r.n_test), pt(getattr(r, COT))] for r in yeu.itertuples()],
       rong=[7.0, 3.2, 3.2, 2.4])
b.p(f"Cả sáu ngành đều ít dòng huấn luyện (nhiều nhất {nguyen(yeu.n_hoc.max())}, trong khi trung "
    f"vị các ngành là {nguyen(trung_vi_hoc)}). Mỗi ngành chỉ có {nguyen(TN.n_test.min())}–"
    f"{nguyen(TN.n_test.max())} phiếu người thật, nên tỉ lệ của từng ngành dao động lớn.")
b.hinh(kq.hinh(10, "hinh_10_3*.png"),
       f"Hit@{nguyen(KK)} khám phá từng ngành trên người thật. Số cạnh chấm tra tên ở bảng bên "
       f"phải; dấu * là ngành rò rỉ vòng tròn.")

# ═══════════════════════════════════════════════════════════════════════════
b.h("6. Hạn chế và kết luận", 2)
b.gach([
    f"Bộ sinh copula học từ cả {nguyen(n_ks)} phiếu niêm phong, nên tập đo không hoàn toàn độc "
    f"lập; chỉ mô hình phân loại là chưa từng thấy chúng.",
    f"{nguyen(N['n_thieu'])} ngành rò rỉ vòng tròn — đã tách riêng ở mục 3.",
    f"Câu sở thích của {nguyen(N['n_tt'])} hồ sơ trúng tuyển do máy sinh; điểm, tổ hợp và ngành "
    f"là thật.",
    f"Số gợi ý của tầng tư vấn ({nguyen(KT)}) được chốt sau khi các tập đo đã mở; lý do chọn "
    f"và cách kiểm lại xem báo cáo Hướng 1, mục 3.2.",
])
b.bang(["Tầng", "Số gợi ý", "Test nội bộ", "Người thật", "Bốc ngẫu nhiên (người thật)"],
       [["Tư vấn", nguyen(KT), pt(te_tv[KT]), pt(ks_tv[KT]), pt(bua_tv[KT])],
        ["Khám phá", nguyen(KK), pt(te_kp[KK]), pt(ks_kp[KK]), pt(bua_kp[KK])]],
       rong=[2.6, 2.2, 3.0, 3.0, 4.6])
b.p("Hướng 2 không tạo ra mô hình tốt hơn Hướng 1. Nó đo cùng loại mô hình trên học sinh thật, "
    "và định lượng được kết quả nội bộ lạc quan hơn thực tế bao nhiêu.")

b.luu(RA)
