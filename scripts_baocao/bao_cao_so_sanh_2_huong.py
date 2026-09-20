"""Báo cáo Word — so sánh Hướng 1 (research/) và Hướng 2 (research1/).

Hai cách thiết kế đánh giá cho cùng một bài toán, khác nhau đúng một điểm: phiếu khảo sát
được gộp vào bảng huấn luyện hay được niêm phong. Mọi con số đọc từ file kết quả của cả hai
hướng; mọi nhận định có assert kiểm chứng.

    python bao_cao_so_sanh_2_huong.py  →  docs/BaoCao_SoSanh_Huong1_Huong2.docx
"""
import pathlib
import sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from bao_cao_chung import (GOC, KetQua, MoHinhDaLuu, Word, bang_kq, diem, moc_bua, nen,  # noqa: E402
                           nguyen,
                           pt, so)

RA = GOC / "docs" / "BaoCao_SoSanh_Huong1_Huong2.docx"
TEP_GIONG = ["01_LamSachKhaoSat/khaosat_sach.csv", "01_LamSachKhaoSat/mapping.json",
             "02_ChuanBiTTTH/ttth_sach.csv", "03_HocPhanPhoi/phan_phoi_theo_nganh.npz",
             "04_SinhDacTrung/tom_tat.json", "04_SinhDacTrung/khung_ho_so.csv",
             "05_KiemDinhDuLieuSinh/bao_cao_kiem_dinh.csv", "05_KiemDinhDuLieuSinh/ket_luan.json",
             "05_KiemDinhDuLieuSinh/ttth_da_sinh.csv"]

# ═══════════════════════════════════════════════════════════════════════════
#  NẠP VÀ KIỂM CHÉO
# ═══════════════════════════════════════════════════════════════════════════
k1, k2 = KetQua("research"), KetQua("research1")
N1, N2 = nen(k1), nen(k2)
M1, M2 = k1.js(10, "metrics.json"), k2.js(10, "metrics.json")
S1, S2 = k1.js(9, "sieu_tham_so.json"), k2.js(9, "sieu_tham_so.json")
X1, X2 = k1.cv(10, "chi_so_xep_hang.csv"), k2.cv(10, "chi_so_xep_hang.csv")
Q1, Q2 = bang_kq(k1), bang_kq(k2)

assert all((k1.P / t).read_bytes() == (k2.P / t).read_bytes() for t in TEP_GIONG), \
    "giai đoạn 1–5 hai hướng không còn trùng khít"
assert M1["diem_van_hanh"] == M2["diem_van_hanh"]
assert M1["hp"] == M2["hp"] and M1["rieng_nhom"] == M2["rieng_nhom"], "hai hướng khác cấu hình"
assert k1.bam(7, "test_KHOA.csv") == k1.js(7, "niem_phong.json")["bam_sha256"]
assert k2.bam(7, "test_KHOA.csv") == k2.js(7, "niem_phong.json")["bam_sha256"]
assert k2.bam(6, "khaosat_NIEMPHONG.csv") == k2.js(6, "niem_phong_khaosat.json")["bam_sha256"]

KT, KK = M1["diem_van_hanh"]["tu_van"], M1["diem_van_hanh"]["kham_pha"]
g = lambda X, t: X[X.tang.str.startswith(t)].iloc[0]
x1tv, x1kp = g(X1, "TƯ VẤN"), g(X1, "KHÁM PHÁ")
x2tv_t, x2kp_t = g(X2, "TƯ VẤN · test"), g(X2, "KHÁM PHÁ · test")
x2tv, x2kp = g(X2, "TƯ VẤN · NGƯỜI"), g(X2, "KHÁM PHÁ · NGƯỜI")
assert {int(x.k) for x in (x1tv, x2tv_t, x2tv)} == {KT} and {int(x.k) for x in (x1kp, x2kp_t, x2kp)} == {KK}

h1_tv, h1_kp = Q1["TRAIN+VAL · tư vấn"], Q1["TRAIN+VAL · khám phá"]
t1_tv, t1_kp = Q1["TEST · tư vấn"], Q1["TEST · khám phá"]
h2_tv, h2_kp = Q2["TRAIN+VAL · tư vấn"], Q2["TRAIN+VAL · khám phá"]
t2_tv, t2_kp = Q2["TEST nội bộ · tư vấn"], Q2["TEST nội bộ · khám phá"]
ks_tv, ks_kp = Q2["KHẢO SÁT · tư vấn"], Q2["KHẢO SÁT · khám phá"]
s34_tv, s34_kp = Q2["KHẢO SÁT 34 ngành · tư vấn"], Q2["KHẢO SÁT 34 ngành · khám phá"]

tap1, tap2 = N1["tap"], N2["tap"]
n1 = {x: len(tap1[x]) for x in tap1}
n2 = {x: len(tap2[x]) for x in tap2}
ks1 = {x: N1["nguon"](x, "khaosat") for x in tap1}
assert all(N2["nguon"](x, "khaosat") == 0 for x in tap2)
ksn = k2.cv(6, "khaosat_NIEMPHONG.csv", usecols=["ma_nganh", "ma_nhom", "rui_ro_vong_tron"])
n_ks, n_34 = len(ksn), int((ksn.rui_ro_vong_tron == 0).sum())
hoc2 = pd.concat([tap2["train"], tap2["val"]], ignore_index=True)
BUA = moc_bua(N2, hoc2, ksn, M2["doan_bua"])
bang1, bang2 = k1.js(6, "tom_tat.json")["n_dong"], len(k2.cv(6, "train_ttth.csv", usecols=["nguon"]))

lech_test = max(abs(t1_tv[KT] - t2_tv[KT]), abs(t1_kp[KK] - t2_kp[KK]))
lq_tv, lq_kp = t2_tv[KT] - ks_tv[KT], t2_kp[KK] - ks_kp[KK]
assert lech_test < 0.02 and lq_tv > 0 and lq_kp > 0
rb = M2["rang_buoc_gd9"]
gap = {"h1": (h1_tv[KT] - t1_tv[KT], h1_kp[3] - t1_kp[3]),
       "h2_te": (h2_tv[KT] - t2_tv[KT], h2_kp[3] - t2_kp[3]),
       "h2_ks": (h2_tv[KT] - ks_tv[KT], h2_kp[3] - ks_kp[3])}
assert gap["h1"][1] <= rb["kp_gap_toi_da"] and gap["h2_te"][1] <= rb["kp_gap_toi_da"] < gap["h2_ks"][1]

# Theo số gợi ý: tư vấn Top-1..3, khám phá Top-1..5 — tính từ mô hình đã lưu, đối chiếu tuyệt đối
K_TV, K_KP = (1, 2, 3), (1, 2, 3, 4, 5)
MH1, MH2 = MoHinhDaLuu(k1), MoHinhDaLuu(k2)
DU = {"h1": (MH1, k1.cv(7, "test_KHOA.csv")), "h2_te": (MH2, k2.cv(7, "test_KHOA.csv")),
      "h2_ks": (MH2, k2.cv(6, "khaosat_NIEMPHONG.csv"))}
TK = {t: (m.top_k(df, True, K_TV), m.top_k(df, False, K_KP)) for t, (m, df) in DU.items()}
for t, (tv_, kp_) in [("h1", (t1_tv, t1_kp)), ("h2_te", (t2_tv, t2_kp)), ("h2_ks", (ks_tv, ks_kp))]:
    assert all(abs(TK[t][0][k] - tv_[k]) < 1e-12 for k in K_TV)
    assert all(abs(TK[t][1][k] - kp_[k]) < 1e-12 for k in (1, 2, 3, 5))

# ═══════════════════════════════════════════════════════════════════════════
b = Word()
b.h("So sánh Hướng 1 và Hướng 2", 1)
b.p("Hai cách thiết kế đánh giá cho cùng một bài toán, khác nhau đúng một điểm: phiếu khảo sát "
    "được gộp vào bảng huấn luyện hay được niêm phong làm tập đo riêng.", ngh=True)

b.h("Tóm tắt và khuyến nghị", 2)
b.gach([
    ("Trên tập test", f", hai hướng cho kết quả gần như nhau: tư vấn Hit@{nguyen(KT)} "
                      f"{pt(t1_tv[KT])} và {pt(t2_tv[KT])}, khám phá Hit@{nguyen(KK)} "
                      f"{pt(t1_kp[KK])} và {pt(t2_kp[KK])}."),
    ("Trên học sinh thật", f" (chỉ Hướng 2 đo được): tư vấn {pt(ks_tv[KT])}, khám phá "
                           f"{pt(ks_kp[KK])} — thấp hơn test nội bộ {diem(lq_tv, dau=False)} và "
                           f"{diem(lq_kp, dau=False)} điểm."),
    ("Khuyến nghị", " — dùng Hướng 1 làm kết quả chính, vì đúng quy trình gộp toàn bộ dữ liệu "
                    "thành một bảng rồi mới chia. Dùng Hướng 2 làm kiểm tra bổ sung và nêu mức "
                    "chênh trên học sinh thật như một hạn chế đã đo được."),
])

# ═══════════════════════════════════════════════════════════════════════════
b.h("1. Hai hướng khác nhau ở đâu", 2)
b.bang(["", "Hướng 1", "Hướng 2"],
       [[f"{nguyen(n_ks)} phiếu khảo sát", "gộp vào bảng huấn luyện",
         "niêm phong, không dùng để huấn luyện"],
        ["Bảng huấn luyện", f"{nguyen(bang1)} dòng", f"{nguyen(bang2)} dòng"],
        ["Train / validation / test",
         f"{nguyen(n1['train'])} / {nguyen(n1['val'])} / {nguyen(n1['test_KHOA'])}",
         f"{nguyen(n2['train'])} / {nguyen(n2['val'])} / {nguyen(n2['test_KHOA'])}"],
        ["Phiếu khảo sát mô hình cuối đã học", nguyen(ks1["train"] + ks1["val"]), nguyen(0)],
        ["Tập dùng để đo", f"test (trong đó {nguyen(ks1['test_KHOA'])} phiếu khảo sát)",
         f"test nội bộ và {nguyen(n_ks)} phiếu người thật"]],
       rong=[4.8, 5.0, 5.4])
b.p(f"Giai đoạn 1–5 của hai hướng cho kết quả trùng khít từng byte ({nguyen(len(TEP_GIONG))} tệp "
    f"đã so), và giai đoạn 9 của hai hướng chọn cùng một cấu hình mô hình. Vì vậy khác biệt "
    f"giữa hai hướng chỉ đến từ việc phiếu khảo sát được gộp hay được niêm phong.")

# ═══════════════════════════════════════════════════════════════════════════
b.h("2. Kết quả đặt cạnh nhau", 2)
b.bang(["Đo trên", f"Tư vấn Hit@{nguyen(KT)}", f"Khám phá Hit@{nguyen(KK)}"],
       [[f"Hướng 1 · test ({nguyen(n1['test_KHOA'])} dòng)", pt(t1_tv[KT]), pt(t1_kp[KK])],
        [f"Hướng 2 · test nội bộ ({nguyen(n2['test_KHOA'])} dòng)", pt(t2_tv[KT]), pt(t2_kp[KK])],
        [f"Hướng 2 · người thật ({nguyen(n_ks)} phiếu)", pt(ks_tv[KT]), pt(ks_kp[KK])],
        [f"Hướng 2 · người thật, bỏ ngành vòng tròn ({nguyen(n_34)} phiếu)", pt(s34_tv[KT]),
         pt(s34_kp[KK])],
        ["Bốc ngẫu nhiên (trên người thật)", pt(BUA["trong_nhom"][KT]), pt(BUA["kham_pha"][KK])]],
       rong=[8.6, 3.2, 3.4])
b.p(f"Hai dòng đầu chênh nhau không quá {diem(lech_test, dau=False)} điểm. Khác biệt đáng kể nằm "
    f"ở dòng thứ ba: trên học sinh thật, kết quả thấp hơn test nội bộ "
    f"{diem(lq_tv, dau=False)} điểm ở tầng tư vấn và {diem(lq_kp, dau=False)} điểm ở tầng khám "
    f"phá.", dam=True)

b.p("Chỉ số chi tiết tại điểm vận hành:")
b.bang(["Chỉ số", "H1 · test", "H2 · test nội bộ", "H2 · người thật"],
       [[f"Tư vấn Hit@{nguyen(KT)}", pt(x1tv.hit_k), pt(x2tv_t.hit_k), pt(x2tv.hit_k)],
        [f"Tư vấn macro Hit@{nguyen(KT)}", pt(x1tv.macro_hit_k), pt(x2tv_t.macro_hit_k),
         pt(x2tv.macro_hit_k)],
        ["Tư vấn MRR", so(x1tv.mrr, 3), so(x2tv_t.mrr, 3), so(x2tv.mrr, 3)],
        [f"Khám phá Hit@{nguyen(KK)}", pt(x1kp.hit_k), pt(x2kp_t.hit_k), pt(x2kp.hit_k)],
        [f"Khám phá macro Hit@{nguyen(KK)}", pt(x1kp.macro_hit_k), pt(x2kp_t.macro_hit_k),
         pt(x2kp.macro_hit_k)],
        ["Khám phá MRR", so(x1kp.mrr, 3), so(x2kp_t.mrr, 3), so(x2kp.mrr, 3)],
        ["Khám phá: hạng trung vị của ngành đúng", nguyen(x1kp.hang_trung_vi),
         nguyen(x2kp_t.hang_trung_vi), nguyen(x2kp.hang_trung_vi)],
        [f"Khám phá: số ngành dưới {pt(0.5, 0)}", f"{nguyen(x1kp.n_nganh_duoi_50)}/{nguyen(x1kp.n_nganh)}",
         f"{nguyen(x2kp_t.n_nganh_duoi_50)}/{nguyen(x2kp_t.n_nganh)}",
         f"{nguyen(x2kp.n_nganh_duoi_50)}/{nguyen(x2kp.n_nganh)}"]],
       rong=[6.0, 2.8, 3.2, 3.2])

b.p("Theo số gợi ý:")
b.bang(["Số gợi ý", "H1 · test", "H2 · test nội bộ", "H2 · người thật"],
       [[f"Tư vấn Top-{k}"] + [pt(TK[t][0][k]) for t in ("h1", "h2_te", "h2_ks")] for k in K_TV] +
       [[f"Khám phá Top-{k}"] + [pt(TK[t][1][k]) for t in ("h1", "h2_te", "h2_ks")] for k in K_KP],
       rong=[4.6, 3.2, 3.6, 3.6])

b.p("Khoảng cách giữa train + validation và tập đo (điểm phần trăm):")
b.bang(["Khoảng cách", f"Tư vấn Top-{nguyen(KT)}", "Khám phá Top-3"],
       [["Hướng 1: train − test", diem(gap["h1"][0]), diem(gap["h1"][1])],
        ["Hướng 2: train − test nội bộ", diem(gap["h2_te"][0]), diem(gap["h2_te"][1])],
        ["Hướng 2: train − người thật", diem(gap["h2_ks"][0]), diem(gap["h2_ks"][1])]],
       rong=[6.4, 3.6, 3.6])
b.p(f"Ràng buộc chống học vẹt (khám phá Top-3, chênh không quá "
    f"{nguyen(round(rb['kp_gap_toi_da'] * 100))} điểm) giữ được trên tập test của cả hai hướng. "
    f"Nhưng khoảng cách tới học sinh thật là {diem(gap['h2_ks'][1], dau=False)} điểm: ràng buộc "
    f"ngăn mô hình học thuộc dữ liệu huấn luyện, không kiểm soát được khoảng cách giữa dữ liệu "
    f"huấn luyện và học sinh thật. Chỉ Hướng 2 phát hiện được điều này.")

b.hinh(k1.hinh(10, "hinh_10_1*.png"),
       "Hướng 1 — kết quả trên tập test theo số gợi ý, kèm bốc ngẫu nhiên và khoảng tin cậy. Hình vẽ "
       "các mức Top-1, Top-2, Top-3 và Top-5; Top-4 có trong bảng ở mục 2.")
b.hinh(k2.hinh(10, "hinh_10_2*.png"),
       f"Hướng 2 — ba cách đo (tư vấn Top-{nguyen(KT)}, khám phá Top-3). Chữ đỏ là mức chênh "
       f"giữa test nội bộ và người thật.")

# ═══════════════════════════════════════════════════════════════════════════
b.h("3. Nên báo cáo con số nào", 2)
b.bang(["Mục đích", "Lấy từ", "Giá trị"],
       [["Kết quả chính — tầng tư vấn", f"Hướng 1, test, Hit@{nguyen(KT)}", pt(t1_tv[KT])],
        ["Kết quả chính — tầng khám phá", f"Hướng 1, test, Hit@{nguyen(KK)}", pt(t1_kp[KK])],
        ["Kiểm tra trên học sinh thật", f"Hướng 2, {nguyen(n_ks)} phiếu",
         f"tư vấn {pt(ks_tv[KT])} · khám phá {pt(ks_kp[KK])}"],
        ["Mức chênh cần nêu kèm", "Hướng 2, test nội bộ − người thật",
         f"tư vấn {diem(lq_tv)} · khám phá {diem(lq_kp)}"]],
       rong=[5.0, 5.4, 4.8])
b.p(f"Hướng 1 là kết quả chính vì đúng quy trình được yêu cầu: gộp toàn bộ dữ liệu thành một "
    f"bảng huấn luyện rồi mới chia, và dùng tập test "
    f"({pt(k1.js(7, 'niem_phong.json')['p_test'], 0)} của bảng gộp) để kiểm tra độ tin cậy "
    f"của dữ liệu cuối cùng. Hướng 2 là phép kiểm tra bổ sung: nó cho gần như cùng kết quả trên "
    f"test nội bộ, và đo thêm được mức lạc quan khi áp dụng cho học sinh thật.", dam=True)
b.p(f"Hạn chế chung của cả hai hướng: bộ sinh copula học từ cả {nguyen(n_ks)} phiếu khảo sát, và "
    f"câu sở thích của {nguyen(N1['n_tt'])} hồ sơ trúng tuyển do máy sinh.")

b.luu(RA)
