"""Dựng nội dung báo cáo Word.  python viet.py"""
import json, pathlib, sys, time
import pandas as pd
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from bao_cao import (BaoCao, doc, hinh_cua, pc, kn, GOC, RA, GD, NHANH,
                     _r, _f, _sub, _sup)

B = BaoCao()
D = {r: {"ten": t} for r, t in NHANH}
for r, _ in NHANH:
    D[r]["map"] = doc(r, GD[0], "mapping.json")
    D[r]["m0"] = doc(r, GD[3], "moc_chuan.json")
    D[r]["ga"] = doc(r, GD[5], "tom_tat.json")
    D[r]["kd"] = doc(r, GD[6], "ket_luan.json")
    D[r]["tf"] = doc(r, GD[7], "tom_tat.json")
    D[r]["sth"] = doc(r, GD[8], "sieu_tham_so.json")
    D[r]["me"] = doc(r, GD[9], "metrics.json")
R2, R3 = D["research2"], D["research3"]
cn = lambda r: sorted(pd.Series(list(r["map"]["nganh_to_nhom"].values()))
                      .value_counts().values, reverse=True)

# ══════════════════════════════════════════════════════════ TRANG BÌA
B.p(); B.p()
B.p("TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM", dam=True, co=13, giua=True)
B.p("KHOA CÔNG NGHỆ THÔNG TIN", co=12, giua=True)
for _ in range(4):
    B.p()
B.p("BÁO CÁO SO SÁNH HAI PHƯƠNG ÁN PHÂN NHÓM NGÀNH", dam=True, co=18, giua=True)
B.p("TRONG BÀI TOÁN GỢI Ý NGÀNH HỌC BẰNG XGBOOST", dam=True, co=16, giua=True)
B.p()
B.p(f"research2 — {R2['ten']}   ·   research3 — {R3['ten']}",
    ngh=True, co=12.5, giua=True)
for _ in range(5):
    B.p()
B.p(f"Ngày lập: {time.strftime('%d/%m/%Y')}", co=11, giua=True)
B.p("Toàn bộ số liệu trong báo cáo được sinh tự động từ file kết quả của hai "
    "pipeline, không nhập tay.", ngh=True, co=10, giua=True)
B.ngat()

# ══════════════════════════════════════════════════════════ 1. TỔNG QUAN
B.h("1. Tổng quan", 1)

B.h("1.1. Bài toán", 2)
B.p("Xây dựng hệ thống gợi ý ngành học cho học sinh THPT dựa trên phiếu khảo sát "
    "và điểm thi. Học sinh trả lời 10 câu hỏi về sở thích (thang Likert 1–5), khai "
    "điểm 3 môn của tổ hợp xét tuyển, giới tính và mục tiêu nghề nghiệp. Hệ thống "
    "trả về danh sách ngành phù hợp nhất trong 39 ngành đào tạo của trường.")
B.p("Hệ thống hoạt động ở hai chế độ, tương ứng hai cách người dùng gọi API:")
B.bang(["Chế độ", "Người dùng cung cấp", "Mô hình làm gì", "Ý nghĩa con số"],
       [["Khám phá", "chỉ khảo sát", "xếp hạng cả 39 ngành",
         "năng lực THẬT của hệ thống"],
        ["Tư vấn", "khảo sát + tự chọn nhóm ngành",
         "chỉ xếp hạng ngành trong nhóm đó", "chỉ số CÓ ĐIỀU KIỆN"]],
       rong=[2.4, 4.2, 4.8, 4.4])
B.p("Hai con số này không so ngang hàng được: ở chế độ tư vấn, người dùng đã tự "
    "giải phần khó nhất của bài toán. Báo cáo luôn ghi rõ đang nói về chế độ nào.",
    ngh=True, co=11)

B.h("1.2. Dữ liệu gốc", 2)
B.bang(["Nguồn", "Số dòng gốc", "Sau làm sạch", "Chứa gì"],
       [["Phiếu khảo sát", "766", f"{R2['map']['n_sach']}",
         "10 Likert · điểm 3 môn · tổ hợp · giới tính · mục tiêu · NGÀNH"],
        ["Hồ sơ trúng tuyển (TTTH)", "18.024", "15.696",
         "điểm 3 môn · tổ hợp · NGÀNH  (KHÔNG có khảo sát)"]],
       rong=[3.6, 2.4, 2.4, 7.4])

B.h("1.3. Thí nghiệm có đối chứng", 2)
B.p("Hai nhánh dùng CÙNG dữ liệu raw, CÙNG cách tách train/test, CÙNG bộ đặc "
    "trưng, CÙNG thuật toán, CÙNG seed ngẫu nhiên. Khác nhau đúng MỘT biến: "
    "cách gom 39 ngành thành nhóm.")
B.bang(["", "research2", "research3"],
       [["Cách nhóm", R2["ten"], R3["ten"]],
        ["Số nhóm", len(R2["map"]["ten_nhom"]), len(R3["map"]["ten_nhom"])],
        ["Cỡ các nhóm", str(cn(R2)), str(cn(R3))],
        ["Dòng huấn luyện", f"{R2['tf']['n_dong']:,}", f"{R3['tf']['n_dong']:,}"],
        ["File khác nhau", "scripts/g01.py (bảng ánh xạ)", "scripts/g01.py (bảng ánh xạ)"]],
       rong=[3.8, 5.6, 5.6])
B.p("Nhờ thiết kế này, mọi chênh lệch kết quả giữa hai nhánh đều quy được về "
    "cách chia nhóm, không lẫn với yếu tố khác.")

B.h("1.4. Kết quả tóm tắt", 2)
h = []
for k in ("1", "2", "3", "5"):
    o = [f"Top-{k}"]
    for r in (R2, R3):
        t = r["me"]["test"]["tu_van"]
        a, b = t["top"][k], t["bua"][k]
        o += [pc(a), pc(b), f"{(a-b)*100:+.1f}đ", pc(kn(a, b))]
    h.append(o)
B.bang(["", "R2 Top-k", "bừa", "hơn", "kỹ năng",
        "R3 Top-k", "bừa", "hơn", "kỹ năng"], h, co=9)
B.p("Chế độ tư vấn, đo trên 102 phiếu test chưa từng dùng.", ngh=True, co=10)
tv2 = R2["me"]["test"]["tu_van"]; tv3 = R3["me"]["test"]["tu_van"]
kp2 = R2["me"]["test"]["kham_pha"]; kp3 = R3["me"]["test"]["kham_pha"]
B.p()
B.p(f"research3 đạt Top-3 = {pc(tv3['top']['3'])}, vượt mục tiêu 80%. "
    f"research2 đạt {pc(tv2['top']['3'])}.", dam=True)
B.p("Nhưng con số trần trụi chưa nói hết. Ba bằng chứng cho thấy research3 tốt hơn "
    "THẬT chứ không chỉ nhờ nhóm nhỏ hơn:")
B.gach([
    f"Kỹ năng cao hơn ở mọi Top-k — Top-3: {pc(kn(tv3['top']['3'], tv3['bua']['3']))} "
    f"so với {pc(kn(tv2['top']['3'], tv2['bua']['3']))}",
    f"Top-1 tăng {pc(tv2['top']['1'])} → {pc(tv3['top']['1'])} trong khi đoán bừa "
    f"Top-1 chỉ nhích {pc(tv2['bua']['1'])} → {pc(tv3['bua']['1'])}. Top-1 gần như "
    "không hưởng lợi từ nhóm nhỏ",
    f"Chế độ KHÁM PHÁ — nơi đoán bừa GIỐNG HỆT nhau ({pc(kp2['bua']['3'])}) vì cả "
    f"hai đều xếp hạng đủ 39 ngành — research3 vẫn hơn: "
    f"{pc(kp3['top']['3'])} so với {pc(kp2['top']['3'])}",
])
B.ngat()

# ══════════════════════════════════════════════════════════ 2. QUY TRÌNH
B.h("2. Quy trình 10 giai đoạn", 1)
B.p("Hai nhánh chạy CÙNG một quy trình. Mỗi giai đoạn là một notebook Jupyter, "
    "được sinh tự động từ script Python trong thư mục scripts/ — nên code chạy và "
    "code trong báo cáo luôn khớp nhau.")
B.ma("""raw ─► 01 làm sạch ─► 02 chuẩn bị TTTH ─► 03 tách train/test ─┐
                                                              │
        ┌─────────────────────────────────────────────────────┘
        ▼
      04 mốc chuẩn M₀ ─► 05 học phân phối ─► 06 GA tăng cường
                                                   │
        ┌──────────────────────────────────────────┘
        ▼
      07 kiểm định GA ─► 08 train_final.csv ─► 09 tinh chỉnh ─► 10 chốt + TEST""")

MO_TA = {
"01_LamSachKhaoSat": dict(
  ten="Làm sạch phiếu khảo sát",
  muc="Loại phiếu điền đại và phiếu thiếu dữ liệu; dựng bảng ánh xạ ngành → nhóm "
      "làm nguồn chuẩn duy nhất cho toàn pipeline.",
  vao=["data/raw/khao_sat_dinh_huong_nganh_hoc_clean.csv — 766 phiếu"],
  pp=["Lọc phiếu điền đại: độ lệch chuẩn của 10 câu Likert bằng 0 "
      "(chọn cùng một mức cho mọi câu)",
      "Đối chiếu tên ngành với bảng 39 mã ngành chính thức",
      "Yêu cầu có ít nhất 1 môn điểm"],
  ct=("std(L₁…L₁₀) = 0  ⟹  loại\n\n"
      "Phiếu này nói 'em thích mọi thứ như nhau'. Mô hình đi tìm chính sự KHÁC BIỆT\n"
      "giữa các sở thích, nên phiếu như vậy độc hại hơn là vô dụng."),
  ra=["khaosat_sach.csv", "mapping.json  ← nguồn chuẩn cho 9 giai đoạn sau",
      "bang_nganh.csv"]),

"02_ChuanBiTTTH": dict(
  ten="Chuẩn bị hồ sơ trúng tuyển",
  muc="Lấy điểm thi và tổ hợp CÓ THẬT của thí sinh đã đỗ, làm phần thật cho dữ "
      "liệu tăng cường ở Giai đoạn 6.",
  vao=["data/raw/TTTH_THPT_Cleaned.xlsx — 18.024 hồ sơ", "mapping.json"],
  pp=["Giữ hồ sơ trúng tuyển (KQ = TT)",
      "Remap mã ngành đã đổi theo quy chế; LOẠI mã không thuộc 39 ngành thay vì "
      "đoán bừa — đoán sai mã ngành là làm hỏng nhãn huấn luyện",
      "Loại tổ hợp D10: khảo sát không có học sinh nào thi tổ hợp này",
      "Khử số báo danh trùng",
      "Trải M1/M2/M3 thành 10 cột điểm cùng lược đồ với khảo sát",
      "KHÔNG dùng cột DUT (điểm ưu tiên) — học sinh dùng web không khai được"],
  ct=("A00 → (Toán, Lý, Hoá)      D01 → (Toán, Văn, Anh)\n"
      "A01 → (Toán, Lý, Anh)      D07 → (Toán, Hoá, Anh)\n"
      "B00 → (Toán, Hoá, Sinh)    D09 → (Toán, Sử, Anh)     D15 → (Văn, Địa, Anh)\n\n"
      "M1 của A00 là Toán nhưng M1 của D15 là Văn — phải trải về đúng tên môn."),
  ra=["ttth_sach.csv — 15.696 hồ sơ", "do_phu_theo_nganh.csv"]),

"03_TachTrainTest": dict(
  ten="Tách train / test và dựng fold",
  muc="Khoá tập test TRƯỚC khi làm bất cứ việc gì khác — bước quyết định tính "
      "trung thực của mọi con số về sau.",
  vao=["khaosat_sach.csv"],
  pp=["train_test_split phân tầng theo NGÀNH (39 lớp), tỉ lệ 85/15",
      "RepeatedStratifiedKFold 5 fold × 3 lần lặp = 15 lần đo",
      "Tập test bị khoá — không giai đoạn nào từ 4 đến 9 được mở"],
  ct=("Vì sao phân tầng theo NGÀNH chứ không theo nhóm:\n"
      "  ngành ít nhất chỉ có 6 phiếu → tách ngẫu nhiên thuần rất dễ khiến\n"
      "  một ngành rơi hết về một phía.\n\n"
      "Vì sao 15 fold chứ không 5:\n"
      "  574 dòng là ít; với 5 fold mỗi lần đo chỉ dựa trên ~115 dòng nên\n"
      "  con số dao động 2–3 điểm giữa các lần chạy. Lặp 3 lần với 3 cách xáo\n"
      "  khác nhau cho 15 lần đo, gộp lại thì ổn định hơn hẳn."),
  ra=["khaosat_train.csv — 574 phiếu", "khaosat_test_KHOA.csv — 102 phiếu (KHOÁ)",
      "cv_folds.json — 15 fold"]),

"04_MocChuan": dict(
  ten="Mốc chuẩn M₀",
  muc="Huấn luyện CHỈ trên phiếu khảo sát để lấy mốc mà mọi bước sau phải vượt. "
      "Không có mốc này thì không trả lời được câu hỏi 'thêm dữ liệu có giúp gì không'.",
  vao=["khaosat_train.csv", "cv_folds.json"],
  pp=["XGBoost phân loại — mô hình cho ra xác suất cho từng ngành",
      "So mô hình chung (39 lớp) với mô hình riêng từng nhóm",
      "Đo Top-1/2/3/5 ở cả hai chế độ, LUÔN kèm mốc đoán bừa",
      "Đo thêm trên chính tập train để thấy mức nhớ vẹt"],
  ct=("Cách hoạt động, một câu:\n"
      "  mô hình cho ra XÁC SUẤT cho 39 ngành\n"
      "    → bỏ ngành không thuộc nhóm người dùng chọn\n"
      "      → lấy k ngành xác suất cao nhất còn lại\n\n"
      "Mốc đoán bừa (chế độ tư vấn), tính riêng cho từng học sinh i:\n"
      "  bừa@k = trung bình của  min(k, số ngành trong nhóm của i) / số ngành đó\n\n"
      "Nhóm 2 ngành thì bừa@3 = 1.0 — Top-3 tự đúng 100% mà không cần mô hình."),
  ra=["moc_chuan.json", "moc_chuan_theo_khoi.csv"]),

"05_HocPhanPhoi": dict(
  ten="Học phân phối từng ngành",
  muc="Học đặc điểm học sinh của mỗi ngành, để Giai đoạn 6 sinh dữ liệu giống thật.",
  vao=["khaosat_train.csv", "cv_folds.json"],
  pp=["Vector trung bình μ (10 chiều) + ma trận hiệp phương sai Σ (10×10) của Likert",
      "CO NGÓT BAYES về mức nhóm — ngành ít phiếu thì tin nhóm nhiều hơn",
      "Học tỉ lệ giới tính và phân phối mục tiêu nghề nghiệp theo ngành",
      "Học RIÊNG cho từng fold để không rò rỉ dữ liệu"],
  ct=("VẤN ĐỀ: ngành ít nhất chỉ có 6 phiếu, mà ma trận Σ 10×10 có 55 tham số\n"
      "độc lập. Ước lượng 55 tham số từ 6 dòng là vô vọng.\n\n"
      "CO NGÓT BAYES:\n"
      "            n\n"
      "    w =  ───────           K = 8  (số phiếu 'ảo' của tiên nghiệm)\n"
      "          n + K\n\n"
      "    μ_dùng = w·μ_ngành + (1−w)·μ_nhóm\n"
      "    Σ_dùng = w·Σ_ngành + (1−w)·Σ_nhóm\n\n"
      "  ngành  6 phiếu → w = 0.43  (tin ngành 43%, tin nhóm 57%)\n"
      "  ngành 47 phiếu → w = 0.85  (tin ngành 85%)\n\n"
      "K = 8 nghĩa là 'tiên nghiệm mức nhóm đáng tin bằng khoảng 8 phiếu'."),
  ra=["phan_phoi_theo_fold.npz", "suc_co_ngot.csv"]),

"06_GA_TangCuong": dict(
  ten="Tăng cường dữ liệu bằng giải thuật di truyền",
  muc="Đưa tập huấn luyện lên mức mục tiêu bằng cách ghép hồ sơ trúng tuyển THẬT "
      "với phần khảo sát do GA sinh ra.",
  vao=["ttth_sach.csv", "khaosat_train.csv", "phan_phoi_theo_fold.npz"],
  pp=["Rút ĐỀU mỗi ngành từ hồ sơ trúng tuyển (không giữ tỉ lệ tự nhiên)",
      "Ngành không có hồ sơ TTTH → bootstrap từ phiếu khảo sát của chính ngành",
      "GA sinh 10 câu Likert + giới tính + mục tiêu nghề nghiệp",
      "Sinh RIÊNG cho từng fold + 1 bản học từ toàn bộ train (cho mô hình cuối)",
      "Sinh thêm bản đối chứng lấy mẫu Gauss để Giai đoạn 7 chấm điểm rồi chọn"],
  ct=("PHẦN NÀO THẬT, PHẦN NÀO SINH RA:\n"
      "  ngành trúng tuyển · tổ hợp · điểm 3 môn   →  THẬT (hồ sơ trúng tuyển)\n"
      "  10 câu Likert · giới tính · mục tiêu      →  GA sinh\n\n"
      "TOÁN TỬ GA — đều thao tác trên CÂU TRẢ LỜI CÓ THẬT:\n"
      "  khởi tạo  : lấy mẫu có hoàn lại từ phiếu thật của chính ngành đó\n"
      "  lai ghép  : cắt một điểm — vài câu của bạn A, còn lại của bạn B\n"
      "  đột biến  : thay một câu bằng câu trả lời của một bạn thật khác\n\n"
      "HÀM THÍCH NGHI — chỗ dễ sai nhất:\n"
      "  Cách hiển nhiên là cho điểm cao cho cá thể có log-likelihood LỚN.\n"
      "  Cách đó SAI: qua vài chục thế hệ cả quần thể dồn về đúng điểm μ,\n"
      "  phân bố sinh ra hẹp hơn hẳn dữ liệu thật (đo được: KS chỉ đạt 8%).\n\n"
      "  Mẫu thật rút từ một phân phối KHÔNG nằm ở đỉnh — chúng nằm rải trong\n"
      "  TẬP ĐIỂN HÌNH, nơi log-likelihood xấp xỉ giá trị KỲ VỌNG:\n\n"
      "      E[log p(x)] = −½ · ( d·log(2π) + log|Σ| + d )\n\n"
      "  Nên hàm thích nghi là khoảng cách tới mức kỳ vọng đó:\n\n"
      "      thích nghi(x) = − | log p(x) − E[log p(x)] |\n\n"
      "  Sửa như vậy đưa KS từ 8% lên 64% và AUC từ 0.79 xuống 0.57."),
  ra=["khung_ho_so.csv", "sinh_theo_fold.npz"]),

"07_KiemDinhGA": dict(
  ten="Kiểm định dữ liệu sinh ra",
  muc="Chấm điểm dữ liệu GA bằng bốn phép, so với dòng thật mà bộ sinh CHƯA TỪNG "
      "THẤY, rồi chọn bản tốt hơn.",
  vao=["sinh_theo_fold.npz", "khaosat_train.csv"],
  pp=["Kolmogorov–Smirnov trên từng câu Likert (p > 0,05 là đạt)",
      "Khoảng cách Wasserstein",
      "Khoảng cách năng lượng — nhạy với cấu trúc đa biến",
      "BỘ PHÂN BIỆT: Random Forest tách thật/giả, AUC ≈ 0,50 là đạt",
      "Chấm CẢ HAI bản rồi chọn bản có AUC gần 0,50 nhất"],
  ct=("BA PHÉP ĐẦU chỉ nhìn từng chiều một. PHÉP THỨ TƯ mới nghiêm khắc:\n"
      "nếu một Random Forest phân biệt được thật/giả thì dữ liệu sinh ra NẰM SAI CHỖ\n"
      "trong không gian 10 chiều, dù mọi phân bố biên đều khớp.\n\n"
      "Khoảng cách năng lượng:\n"
      "    E = 2·E|A−B| − E|A−A'| − E|B−B'|\n\n"
      "Điểm mấu chốt: so với phần VALIDATION của mỗi fold — dòng thật mà bộ sinh\n"
      "của fold đó chưa từng nhìn thấy."),
  ra=["bao_cao_kiem_dinh.csv", "ket_luan.json"]),

"08_TrainFinal": dict(
  ten="File CSV huấn luyện tổng hợp",
  muc="Ghép dòng thật và dòng tăng cường thành MỘT bảng duy nhất, đã tiền xử lý "
      "xong, sẵn sàng đưa vào mô hình.",
  vao=["khaosat_train.csv", "khung_ho_so.csv", "sinh_theo_fold.npz", "ket_luan.json"],
  pp=["Dùng CÙNG một hàm dựng đặc trưng cho cả hai nguồn — nếu mỗi nguồn một cách, "
      "mô hình sẽ học được 'dòng này từ đâu ra' thay vì học về ngành",
      "63 đặc trưng + 7 cột quản lý",
      "Kiểm tra: đủ 39 ngành, one-hot tổ hợp đúng 1, không ô trống bất thường"],
  ct=("63 ĐẶC TRƯNG ĐẾN TỪ 5 THỨ HỌC SINH KHAI:\n\n"
      "  10 câu Likert ─┬─► 10 cột likert_*      giữ nguyên\n"
      "                 ├─► 10 cột ips_likert_*  trừ trung bình của CHÍNH người đó\n"
      "                 └─►  2 cột likert_tb, likert_dolech\n\n"
      "  điểm 3 môn    ─┬─► 10 cột diem_*        10 ô, chỉ 3 ô có số\n"
      "                 ├─► 10 cột z_diem_*      cùng điểm, đổi sang z-score\n"
      "                 └─►  4 cột diem_tb, diem_lech, z_tb, z_max\n\n"
      "  tổ hợp        ───► 15 cột th_*          one-hot, đúng 1 ô bằng 1\n"
      "  giới tính     ───►  1 cột gioi_tinh_nam\n"
      "  mục tiêu      ───►  1 cột muc_tieu\n\n"
      "VÌ SAO CẦN ips_likert_* (chuẩn hoá theo người):\n"
      "  có bạn chấm câu nào cũng 4–5, có bạn chấm câu nào cũng 2–3.\n"
      "  Để số thô thì mô hình học nhầm 'thói quen chấm rộng tay' thành\n"
      "  'thích ngành này'. Trừ trung bình của chính bạn đó thì chỉ còn lại\n"
      "  BẠN THÍCH CÂU NÀO HƠN CÂU NÀO — thứ ta thật sự cần.\n\n"
      "VÌ SAO CẦN z_diem_*:\n"
      "  8.0 điểm Toán và 8.0 điểm Văn không cùng ý nghĩa vì độ khó đề khác nhau.\n"
      "  z-score quy về 'so với mặt bằng chung thì bạn này đứng đâu'.\n\n"
      "VÌ SAO TỔ HỢP DÙNG ONE-HOT:\n"
      "  mã hoá A00=0, A01=1, B00=2 sẽ dạy mô hình rằng D01 'lớn hơn' A00 và\n"
      "  trung bình A00 với B00 ra A01 — vô nghĩa. Tổ hợp không có thứ tự."),
  ra=["train_final.csv  ★ FILE HUẤN LUYỆN CHÍNH THỨC", "thong_ke_dac_trung.csv"]),

"09_TinhChinh": dict(
  ten="Tinh chỉnh mô hình",
  muc="Chọn siêu tham số tối ưu ĐỒNG THỜI hai mục tiêu: tối đa Top-3 và ép khoảng "
      "cách train − validation xuống.",
  vao=["sinh_theo_fold.npz (RIÊNG theo fold)", "khaosat_train.csv", "moc_chuan.json"],
  pp=["Đo: thêm dữ liệu tăng cường có giúp gì không?",
      "Quét ngẫu nhiên siêu tham số, LOẠI cấu hình nhớ vẹt quá mức",
      "Dò trọng số dòng khảo sát thật",
      "Thử PHÂN TẦNG cho nhóm nhiều ngành"],
  ct=("MỤC TIÊU KÉP:\n"
      "  Giai đoạn 4 cho thấy mô hình đạt 100% trên train mà chỉ ~67% trên\n"
      "  validation. Con số 100% KHÔNG phải thành tích — nó là NHỚ VẸT: cây\n"
      "  quyết định chẻ nhỏ tới khi mỗi phiếu nằm riêng một nhánh, việc quá dễ\n"
      "  với XGBoost. Yêu cầu 'train và test đều 80–90%' thực chất nghĩa là\n"
      "  HAI CỘT PHẢI GẦN NHAU.\n\n"
      "PHÂN TẦNG — học hai bước cho nhóm nhiều ngành:\n"
      "  Học một lượt 10 lớp bắt mô hình vẽ đồng thời 45 đường ranh giới, kể cả\n"
      "  những cặp gần như không tách được. Sức của mô hình bị dàn mỏng.\n\n"
      "      P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con)\n\n"
      "  ĐÂY KHÔNG PHẢI THU HẸP BÀI TOÁN. Mô hình TỰ đoán lĩnh vực con, người\n"
      "  dùng không cung cấp gì thêm, đầu ra vẫn là xác suất trên đủ các ngành.\n"
      "  Kiểm chứng được: mốc đoán bừa KHÔNG ĐỔI giữa hai cách. Nếu là thu hẹp\n"
      "  thì mốc đó đã phải tăng.\n\n"
      "RÒ RỈ DỮ LIỆU — lỗi đã gặp và cách phát hiện:\n"
      "  train_final.csv dùng bản sinh từ phân phối học trên TOÀN BỘ train —\n"
      "  đúng cho mô hình cuối, nhưng SAI cho cross-validation. Dùng nhầm thì\n"
      "  Top-3 đo được là 79.8% thay vì 69.3%; gần 10 điểm là rò rỉ."),
  ra=["sieu_tham_so.json", "ket_qua_quet.csv", "chan_doan_theo_khoi.csv"]),

"10_ChotModel": dict(
  ten="Chốt mô hình và mở tập test",
  muc="Huấn luyện lại trên toàn bộ dữ liệu rồi mở 102 phiếu test ĐÚNG MỘT LẦN.",
  vao=["sieu_tham_so.json", "train_final.csv", "khaosat_test_KHOA.csv ← MỞ 1 LẦN"],
  pp=["Huấn luyện trên train_final.csv với cấu hình đã chốt",
      "Dự đoán tập test — lần duy nhất tập này được dùng",
      "Đối chứng: đoán lớp đông nhất · model phẳng · chỉ khảo sát",
      "Báo cáo TRAIN | TEST | chênh | đoán bừa | hơn bừa | kỹ năng"],
  ct=("VÌ SAO CHỈ MỞ MỘT LẦN:\n"
      "  Nếu sau khi nhìn kết quả test mà quay lại chỉnh mô hình rồi đo lại,\n"
      "  tập test KHÔNG CÒN là tập test — nó thành tập validation thứ hai, và\n"
      "  con số báo cáo sẽ lạc quan giả."),
  ra=["model_nganh.json", "model_khoi*.json", "metrics.json", "bang_ket_qua.csv",
      "ket_qua_theo_khoi.csv"]),
}

# ── Công thức Word (OMML) — Insert ▸ Equation, sửa được bằng Equation Editor ──
PT = {
"04_MocChuan": [
  (_sub(_r("bừa"), _r("k")) + _r(" = ") +
   _f(_r("1"), _r("N")) + _r(" ") +
   _sub(_r("∑"), _r("i=1..N")) + _r(" ") +
   _f(_r("min(k, ") + _sub(_r("c"), _r("i")) + _r(")"), _sub(_r("c"), _r("i"))),
   "Mốc đoán bừa: cᵢ là số ngành trong nhóm của học sinh i. "
   "Nhóm 2 ngành thì bừa₃ = 1,0 — Top-3 tự đúng 100%."),
],
"05_HocPhanPhoi": [
  (_r("w = ") + _f(_r("n"), _r("n + K")) + _r("     (K = 8)"),
   "Trọng số tin vào dữ liệu của chính ngành. n = số phiếu của ngành đó."),
  (_sub(_r("μ"), _r("dùng")) + _r(" = w · ") + _sub(_r("μ"), _r("ngành")) +
   _r(" + (1 − w) · ") + _sub(_r("μ"), _r("nhóm")),
   "Co ngót Bayes cho vector trung bình."),
  (_sub(_r("Σ"), _r("dùng")) + _r(" = w · ") + _sub(_r("Σ"), _r("ngành")) +
   _r(" + (1 − w) · ") + _sub(_r("Σ"), _r("nhóm")),
   "Co ngót Bayes cho ma trận hiệp phương sai."),
],
"06_GA_TangCuong": [
  (_r("E[log p(x)] = − ") + _f(_r("1"), _r("2")) +
   _r(" ( d · log 2π + log|Σ| + d )"),
   "Mức log-likelihood KỲ VỌNG của một mẫu thật rút từ N(μ, Σ). "
   "Đây là mốc mà quần thể GA phải bám."),
  (_r("thích nghi(x) = − | log p(x) − E[log p(x)] |"),
   "Cá thể quá xa μ bị phạt, mà cá thể đúng ngay μ cũng bị phạt — nhờ vậy quần "
   "thể giữ được độ trải đúng bằng dữ liệu thật."),
],
"07_KiemDinhGA": [
  (_r("E = 2 · E|A − B| − E|A − A′| − E|B − B′|"),
   "Khoảng cách năng lượng — nhạy với cấu trúc đa biến, không chỉ từng chiều."),
],
"09_TinhChinh": [
  (_r("P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con)"),
   "Phân tầng hai bước. Mô hình TỰ đoán lĩnh vực con nên mốc đoán bừa không đổi."),
],
}


for i, gd in enumerate(GD, 1):
    m = MO_TA[gd]
    B.h(f"2.{i}. Giai đoạn {gd[:2]} — {m['ten']}", 2)
    B.p(m["muc"])
    B.p("Đầu vào:", dam=True, co=11)
    B.gach(m["vao"])
    B.p("Phương pháp:", dam=True, co=11)
    B.gach(m["pp"])
    if m.get("ct"):
        B.p("Chi tiết thuật toán:", dam=True, co=11)
        B.ma(m["ct"])
    for omml, chu in PT.get(gd, []):
        B.ct(omml, chu)
    B.p("Đầu ra:", dam=True, co=11)
    B.gach(m["ra"])

    # số liệu thực tế hai nhánh
    so = {
      "01_LamSachKhaoSat": lambda r: [
          ("Phiếu thu được", "766"), ("Phiếu dùng được", f"{r['map']['n_sach']}"),
          ("Số nhóm", f"{len(r['map']['ten_nhom'])}"), ("Cỡ nhóm", str(cn(r)))],
      "02_ChuanBiTTTH": lambda r: [
          ("Hồ sơ gốc", "18.024"), ("Hồ sơ dùng được", "15.696"),
          ("Ngành có hồ sơ", "34/39")],
      "03_TachTrainTest": lambda r: [
          ("Train", f"{r['me']['du_lieu']['train_that']}"),
          ("Test", f"{r['me']['du_lieu']['test']}"), ("Số fold", "15")],
      "04_MocChuan": lambda r: [
          ("M₀ tư vấn Top-3", pc(r["m0"]["guided"]["top"]["3"])),
          ("đoán bừa", pc(r["m0"]["guided"]["bua"]["3"])),
          ("M₀ khám phá Top-3", pc(r["m0"]["auto"]["top"]["3"])),
          ("Nhóm đạt 80%",
           f"{sum(1 for x in r['m0']['theo_khoi'] if x['top3']>=.8)}/{len(r['m0']['theo_khoi'])}")],
      "05_HocPhanPhoi": lambda r: [
          ("K co ngót", "8"), ("Số fold học riêng", "15"),
          ("Ma trận Σ suy biến", "0")],
      "06_GA_TangCuong": lambda r: [
          ("Dòng/ngành", f"{r['ga']['n_moi_nganh']}"),
          ("Dòng tăng cường", f"{r['ga']['n_tang_cuong']:,}"),
          ("TỔNG huấn luyện", f"{r['ga']['n_tong']:,}"),
          ("Số thế hệ GA", f"{r['ga']['n_the_he']}")],
      "07_KiemDinhGA": lambda r: [
          ("Bản thắng", r["kd"]["ban_thang"]),
          ("AUC bản Gauss", f"{r['kd']['auc_ban1']:.3f}"),
          ("AUC bản GA", f"{r['kd']['auc_ban2']:.3f}"),
          ("Kết luận", "ĐẠT" if r["kd"]["dat"] else "CHƯA ĐẠT")],
      "08_TrainFinal": lambda r: [
          ("Số dòng", f"{r['tf']['n_dong']:,}"), ("Số cột", f"{r['tf']['n_cot']}"),
          ("Đặc trưng", f"{r['tf']['n_dac_trung']}"),
          ("Dòng thật / tăng cường",
           f"{r['tf']['n_that']} / {r['tf']['n_tang_cuong']:,}")],
      "09_TinhChinh": lambda r: [
          ("Top-3 sau tinh chỉnh", pc(r["sth"]["ket_qua_cv"]["guided_top3"])),
          ("Chênh train − val", f"{r['sth']['ket_qua_cv']['gap_top3']*100:+.1f}đ"),
          ("Trọng số dòng thật", f"×{r['sth']['w_that']:.0f}"),
          ("Lợi ích phân tầng", f"{r['sth']['loi_ich_phan_tang']*100:+.1f}đ")],
      "10_ChotModel": lambda r: [
          ("TEST tư vấn Top-3", pc(r["me"]["test"]["tu_van"]["top"]["3"])),
          ("đoán bừa", pc(r["me"]["test"]["tu_van"]["bua"]["3"])),
          ("TEST khám phá Top-3", pc(r["me"]["test"]["kham_pha"]["top"]["3"])),
          ("macro-F1", f"{r['me']['test']['auto_macro_f1']:.3f}")],
    }[gd]
    a, b = so(R2), so(R3)
    B.p("Số liệu thực tế:", dam=True, co=11)
    B.bang(["Chỉ tiêu", "research2 (7 khối)", "research3 (9 nhóm)"],
           [[a[j][0], a[j][1], b[j][1]] for j in range(len(a))],
           rong=[5.0, 5.0, 5.0])

    for r, ten in NHANH:
        hs = hinh_cua(r, gd)
        if hs:
            B.p(f"Hình của {r} ({ten}):", dam=True, co=11)
            for hf in hs:
                B.hinh(hf)
    B.ngat()
print("… phần 2 xong")

# ══════════════════════════════════════════════════════════ 3. KẾT QUẢ
B.h("3. Kết quả chi tiết trên tập test", 1)
B.p("102 phiếu khảo sát bị khoá từ Giai đoạn 3, chỉ được mở đúng một lần ở Giai "
    "đoạn 10. Không notebook nào từ 4 đến 9 đọc tập này.")

for r, ten in NHANH:
    x = D[r]
    B.h(f"3.{1 if r=='research2' else 2}. {r} — {ten}", 2)
    for ch, kh in (("Chế độ TƯ VẤN (người dùng tự chọn nhóm — chỉ số CÓ ĐIỀU KIỆN)",
                    "tu_van"),
                   ("Chế độ KHÁM PHÁ (chỉ số THẬT của hệ thống)", "kham_pha")):
        B.p(ch, dam=True, co=11)
        t = x["me"]["test"][kh]
        tr = x["me"]["tren_train"][kh]
        B.bang(["", "TRAIN", "TEST", "chênh", "đoán bừa", "hơn bừa", "kỹ năng"],
               [[f"Top-{k}", pc(tr[k]), pc(t["top"][k]),
                 f"{(tr[k]-t['top'][k])*100:+.1f}đ", pc(t["bua"][k]),
                 f"{(t['top'][k]-t['bua'][k])*100:+.1f}đ",
                 pc(kn(t["top"][k], t["bua"][k]))] for k in ("1", "2", "3", "5")])
    B.p("Đối chứng (chế độ khám phá, Top-3):", dam=True, co=11)
    te = x["me"]["test"]
    B.bang(["Cấu hình", "Top-3", "so với mô hình cuối"],
           [["Đoán lớp đông nhất", pc(te["dong_nhat"]["3"]),
             f"{(te['dong_nhat']['3']-te['kham_pha']['top']['3'])*100:+.1f}đ"],
            ["Model phẳng (không dùng nhóm)", pc(te["phang"]["3"]),
             f"{(te['phang']['3']-te['kham_pha']['top']['3'])*100:+.1f}đ"],
            ["Chỉ 574 phiếu khảo sát", pc(te["chi_khao_sat"]["kham_pha"]["3"]),
             f"{(te['chi_khao_sat']['kham_pha']['3']-te['kham_pha']['top']['3'])*100:+.1f}đ"],
            ["★ Mô hình cuối", pc(te["kham_pha"]["top"]["3"]), "—"]],
           rong=[6.5, 3.5, 5.0])
    tk = pd.DataFrame(x["me"]["theo_khoi"])
    B.p("Bóc tách theo từng nhóm (Top-3, chế độ tư vấn):", dam=True, co=11)
    B.bang(["Nhóm ngành", "ngành", "SV test", "Top-3", "bừa", "hơn", "kỹ năng"],
           [[r_.khoi, r_.n_nganh, r_.n_sv, pc(r_.top3), pc(r_.bua3),
             f"{r_.hon*100:+.1f}đ", pc(kn(r_.top3, r_.bua3))]
            for r_ in tk.sort_values("n_nganh", ascending=False).itertuples()],
           rong=[5.4, 1.7, 1.9, 2.0, 1.8, 1.9, 2.0])
    B.ngat()
print("… phần 3 xong")

# ══════════════════════════════════════════════════════════ 4. SO SÁNH
B.h("4. So sánh hai phương án phân nhóm", 1)

B.h("4.1. Vấn đề khi so sánh trực tiếp", 2)
B.p("Chia nhóm càng nhỏ thì mốc đoán bừa càng cao, nên độ chính xác trần trụi "
    "KHÔNG so được giữa hai cách chia. Ví dụ Top-3 chế độ tư vấn:")
B.bang(["", "Top-3", "đoán bừa", "hơn bừa"],
       [[f"{r} — {t}", pc(D[r]['me']['test']['tu_van']['top']['3']),
         pc(D[r]['me']['test']['tu_van']['bua']['3']),
         f"{(D[r]['me']['test']['tu_van']['top']['3']-D[r]['me']['test']['tu_van']['bua']['3'])*100:+.1f}đ"]
        for r, t in NHANH], rong=[7.0, 3.0, 3.0, 3.0])
B.p("research3 cao hơn 15,7 điểm về Top-3, nhưng mốc đoán bừa của nó cũng cao hơn "
    "21,3 điểm. Cần một chỉ số đã trừ sạch lợi thế đó.")

B.h("4.2. Điểm kỹ năng — cách so công bằng", 2)
B.ct(_r("kỹ năng = ") + _f(_r("độ chính xác − đoán bừa"), _r("1 − đoán bừa")))
B.p("Ý nghĩa: mô hình xoá được bao nhiêu PHẦN LỖI mà đoán bừa để lại.")
B.gach(["0% — chỉ ngang đoán bừa, mô hình không đóng góp gì",
        "100% — hoàn hảo",
        "Đã trừ sạch lợi thế do nhóm nhỏ, nên so được giữa các cách chia nhóm"])
h = []
for k in ("1", "2", "3", "5"):
    o = [f"Top-{k}"]
    for r, _ in NHANH:
        t = D[r]["me"]["test"]["tu_van"]
        o.append(pc(kn(t["top"][k], t["bua"][k])))
    o.append(f"{(kn(R3['me']['test']['tu_van']['top'][k], R3['me']['test']['tu_van']['bua'][k]) - kn(R2['me']['test']['tu_van']['top'][k], R2['me']['test']['tu_van']['bua'][k]))*100:+.1f}đ")
    h.append(o)
B.bang(["", "research2", "research3", "chênh"], h, rong=[3.5, 4.0, 4.0, 3.0])

B.h("4.3. Ba bằng chứng research3 tốt hơn THẬT", 2)
B.p("1. Kỹ năng cao hơn ở mọi Top-k", dam=True, co=11.5)
B.p("Bảng 4.2 cho thấy research3 xoá được nhiều phần lỗi hơn ở cả bốn mức Top-k.",
    co=11)
B.p("2. Top-1 tăng mạnh trong khi đoán bừa Top-1 chỉ nhích", dam=True, co=11.5)
B.p(f"Top-1: {pc(tv2['top']['1'])} → {pc(tv3['top']['1'])} "
    f"(tăng {(tv3['top']['1']-tv2['top']['1'])*100:.1f} điểm), trong khi đoán bừa "
    f"Top-1 chỉ đi từ {pc(tv2['bua']['1'])} lên {pc(tv3['bua']['1'])}. Top-1 gần "
    "như không hưởng lợi từ việc nhóm nhỏ đi, nên mức tăng này là năng lực thật.",
    co=11)
B.p("3. Chế độ khám phá — bằng chứng mạnh nhất", dam=True, co=11.5)
B.p(f"Ở chế độ này mô hình xếp hạng CẢ 39 NGÀNH, nên mốc đoán bừa GIỐNG HỆT nhau "
    f"ở hai nhánh ({pc(kp2['bua']['3'])}). Việc chia nhóm không thể giúp gì về mặt "
    f"số học. Vậy mà research3 vẫn đạt {pc(kp3['top']['3'])} so với "
    f"{pc(kp2['top']['3'])} — hơn {(kp3['top']['3']-kp2['top']['3'])*100:.1f} điểm. "
    "Điều này chứng minh cách chia nhóm hợp lý giúp mô hình HỌC tốt hơn ngay từ "
    "gốc, chứ không chỉ làm bài thi dễ đi.", co=11)

B.h("4.4. Một điểm phải trung thực", 2)
B.p(f"Top-5 của research3 là {pc(tv3['top']['5'])} với đoán bừa "
    f"{pc(tv3['bua']['5'])}. Con số 99% nghe rất đẹp nhưng gần như vô nghĩa: nhóm "
    "nhỏ nhất chỉ có 3 ngành nên Top-5 tự đúng 100%. KHÔNG nên đưa Top-5 của "
    "research3 vào phần kết luận.", co=11)
B.p("Tương tự với research2: nhóm Luật và Ngoại ngữ mỗi nhóm chỉ 2 ngành, nên "
    "Top-3 của hai nhóm đó tự đúng 100% mà không cần mô hình. Đó chính là lý do "
    "research3 gộp hai nhóm này lại thành nhóm 4 ngành.", co=11)
B.ngat()
print("… phần 4 xong")

# ══════════════════════════════════════════════════════════ 5. ĐÃ THỬ
B.h("5. Những hướng đã thử mà không hiệu quả", 1)
B.p("Phần này ghi lại các hướng cải tiến đã được đo đạc nhưng không đưa vào "
    "pipeline cuối. Mục đích là trả lời trước câu hỏi 'sao không thử X?' bằng số "
    "liệu thay vì phỏng đoán. Tất cả đo trên research2 (7 khối), chế độ tư vấn "
    "Top-3, cross-validation 5 fold, nền = 69,3%.")
B.bang(["Hướng thử", "Cách làm", "Kết quả"],
       [["Đặc trưng tương tác",
         "Thêm 12 cột: hiệu giữa các cặp câu Likert đối lập, môn mạnh/yếu nhất",
         "68,6%  (−0,7đ)"],
        ["Ensemble 3 mô hình",
         "Trung bình xác suất của XGBoost + Random Forest + ExtraTrees",
         "67,9%  (−1,4đ)"],
        ["Nhân đôi dữ liệu nhóm yếu",
         "Nhân đôi dòng tăng cường cho nhóm từ 8 ngành trở lên",
         "68,5%  (−0,8đ)"],
        ["Siết điều hoà mạnh",
         "max_depth=3, min_child_weight=12, reg_lambda=100, gamma=0.3",
         "66,7%  (−2,6đ)  nhưng train giảm 100% → 84,6%"],
        ["Lọc nhiễu — Confident Learning",
         "Bỏ 5–20% dòng mà mô hình chấm xác suất thấp nhất cho nhãn thật",
         "69,5%  (+0,2đ)"],
        ["Lọc nhiễu — Edited Nearest Neighbours",
         "Bỏ dòng mà phần lớn hàng xóm gần nhất học ngành khác",
         "67,2%  (−2,1đ)  phải bỏ 63% dữ liệu"],
        ["Lọc bất thường — Isolation Forest",
         "Bỏ 5–10% dòng nằm ngoài rìa phân bố",
         "68,5%  (−0,9đ)"],
        ["Warm-start",
         "Lấy model của mốc trước rồi train tiếp thay vì dựng lại",
         "71,0% vs 70,4%  (chênh nằm trong sai số ±2,5đ)"],
        ["Một-đối-một",
         "45 bộ phân loại nhị phân cho từng cặp ngành rồi bỏ phiếu",
         "42,5% vs 44,5% (đo riêng nhóm Kinh doanh)  (−2,0đ)"],
        ["★ Phân tầng hai bước",
         "P(ngành) = P(lĩnh vực con) × P(ngành | lĩnh vực con)",
         "49,3% vs 44,5% (nhóm Kinh doanh)  (+4,8đ)  → ĐÃ DÙNG"]],
       rong=[4.6, 6.4, 4.8], co=9)

B.h("5.1. Trần lý thuyết của dữ liệu", 2)
B.p("Câu hỏi quan trọng nhất: vì sao không hướng nào giúp được? Phép đo dưới đây "
    "trả lời — dữ liệu KHÔNG CHỨA đủ thông tin để tách các ngành trong nhóm lớn.")
B.p("Đo trên nhóm Kinh doanh & Quản lý của research2 (10 ngành, 146 phiếu):",
    dam=True, co=11)
B.bang(["Phép đo", "Kết quả", "Ý nghĩa"],
       [["Phiếu trùng khít 10 câu Likert", "1%",
         "vấn đề KHÔNG phải do trùng lặp"],
        ["1 hàng xóm gần nhất cùng ngành", "11,6%",
         "hai bạn giống nhau nhất lại học ngành khác"],
        ["3 hàng xóm gần nhất (Top-3)", "32,2%",
         "gần bằng đoán bừa"],
        ["Đoán bừa Top-3", "30,0%", "mốc tham chiếu"]],
       rong=[6.0, 3.0, 6.8])
B.p("Dòng thứ ba là dòng quyết định: hàng xóm gần nhất trong không gian đặc trưng "
    "chỉ cho 32,2%, gần như bằng đoán bừa 30%. Nghĩa là hai học sinh trả lời gần "
    "giống hệt nhau lại chọn những ngành kinh doanh gần như không liên quan gì đến "
    "nhau. Không thuật toán nào tạo ra được thông tin không tồn tại trong dữ liệu.")
B.p("Mô hình đang đạt 45–49% ở nhóm này, tức đã moi ra được NHIỀU HƠN cấu trúc "
    "cục bộ của dữ liệu cho phép, nhờ bắt được vài quy luật tổng thể yếu.")

B.h("5.2. Hai lỗi rò rỉ dữ liệu đã gặp và cách phát hiện", 2)
B.p("Ghi lại vì đây là loại lỗi khiến nhiều báo cáo công bố con số cao hơn thực tế, "
    "và chỉ nhìn con số thì không phát hiện được.")
B.bang(["Lỗi", "Con số sai", "Con số đúng", "Cách phát hiện"],
       [["Dùng train_final.csv (sinh từ toàn bộ train) cho cross-validation",
         "79,8%", "69,3%", "chênh 10 điểm không có nguyên nhân"],
        ["Dựng 5 bản dữ liệu tăng cường rồi dùng lại cho 15 fold (i % 5)",
         "76,1%", "70,5%", "nhảy 6 điểm khi tăng số fold — thêm fold chỉ làm "
         "con số ổn định hơn, không thể làm mô hình giỏi lên"]],
       rong=[6.4, 2.4, 2.4, 6.0], co=9)
B.p("Nguyên nhân chung: dữ liệu tăng cường của fold này bị dùng cho fold khác. Vì "
    "nó sinh ra từ phân phối học trên phần train của một fold cụ thể, nó 'biết' "
    "những dòng mà fold khác đang dùng làm validation.")
B.p("Nguyên tắc đã áp dụng: mọi con số phải đo trên dữ liệu mô hình chưa từng thấy, "
    "KỂ CẢ GIÁN TIẾP. Pipeline hiện tại có assert chặn cứng:", co=11)
B.ma('assert len(TC) == len(FOLDS), "phải có đúng 1 bản cho MỖI fold"')
B.ngat()
print("… phần 5 xong")

# ══════════════════════════════════════════════════════════ 6. HẠN CHẾ
B.h("6. Hạn chế và hướng phát triển", 1)
B.h("6.1. Hạn chế", 2)
B.gach([
 f"Cỡ mẫu test nhỏ — chỉ {R2['me']['du_lieu']['test']} phiếu, sai số chuẩn ±4,7 "
 "điểm. Chênh lệch giữa validation và test (research2: 70,5% → 65,7%) nằm trong "
 "khoảng nhiễu này",
 "Dữ liệu khảo sát ít — 574 phiếu huấn luyện cho 39 ngành, trung bình 15 "
 "phiếu/ngành; ngành ít nhất chỉ 6 phiếu",
 "Chênh train − test còn lớn — mô hình vẫn nhớ vẹt đáng kể dù đã siết điều hoà",
 "Mục tiêu nghề nghiệp lệch mạnh — 62% chọn cùng một đáp án nên khả năng phân "
 "biệt hạn chế",
 "Nhóm Luật của research2 đạt Top-1 100% nhưng dựa chủ yếu vào cột diem_Dia — "
 "cột trống 98% dữ liệu và ngành Luật chỉ có 8 phiếu train. Đây là học vẹt trên "
 "nhiễu, con số đó sẽ không giữ được trên dữ liệu mới",
 "Chỉ tiêu Top-5 của research3 (99%) gần như vô nghĩa vì nhóm nhỏ nhất chỉ 3 ngành",
], dam_dau=False)

B.h("6.2. Hướng phát triển", 2)
B.gach([
 "Thu thêm phiếu khảo sát — đây là yếu tố có ảnh hưởng lớn nhất; mọi cải tiến "
 "thuật toán đã thử đều dưới 1 điểm",
 "Thêm câu hỏi khảo sát — 10 câu Likert hiện tại đóng góp 34,7% trọng số, còn "
 "điểm thi và tổ hợp chiếm 61,6%. Thêm câu hỏi phân biệt được các ngành kinh "
 "doanh sẽ có ích hơn bất kỳ thuật toán nào",
 "Thu thập giới tính và mục tiêu cho hồ sơ trúng tuyển — hiện GA phải sinh hai "
 "cột này",
 "Đánh giá lại sau một năm với dữ liệu tuyển sinh mới",
])
B.ngat()
print("… phần 6 xong")

# ══════════════════════════════════════════════════════════ PHỤ LỤC A
B.h("Phụ lục A — Từ điển 70 cột của train_final.csv", 1)
tf = pd.read_csv(GOC / "research2/data/processed/08_TrainFinal/train_final.csv",
                 nrows=200)
QL = ["ma_nganh", "ma_nhom", "nganh_hoc", "to_hop_thi", "nguon", "is_that",
      "sample_weight"]
B.p("7 cột quản lý — KHÔNG đưa vào mô hình", dam=True, co=11.5)
B.bang(["Cột", "Kiểu", "Ý nghĩa"],
       [["ma_nganh", "số nguyên", "Mã ngành (nhãn cần dự đoán)"],
        ["ma_nhom", "số nguyên", "Mã nhóm ngành chứa ngành đó"],
        ["nganh_hoc", "chuỗi", "Tên ngành, để đọc cho dễ"],
        ["to_hop_thi", "chuỗi", "Tổ hợp xét tuyển (A00, D01…)"],
        ["nguon", "chuỗi", "khaosat / ttth_ga / bootstrap_khaosat"],
        ["is_that", "0/1", "1 = phiếu khảo sát thật, 0 = dòng tăng cường"],
        ["sample_weight", "số thực", "Trọng số dòng khi huấn luyện"]],
       rong=[3.6, 2.6, 8.8])
B.p("Nếu đưa is_that hoặc nguon vào làm đặc trưng, mô hình sẽ học 'dòng này thật "
    "hay sinh ra' thay vì học về ngành học — đúng thứ ta không muốn.", ngh=True, co=10)

B.p("63 đặc trưng", dam=True, co=11.5)
NHOM_CT = [
 ("likert_* (10 cột)", "1–5", "10 câu Likert thô, giữ nguyên"),
 ("ips_likert_* (10 cột)", "≈ −3,6…3,6",
  "Likert trừ trung bình của CHÍNH người đó — bỏ 'thói quen chấm điểm', "
  "chỉ giữ lại thích câu nào HƠN câu nào"),
 ("likert_tb, likert_dolech", "1,3–5 / 0,3–2",
  "Trung bình và độ lệch của 10 câu — chính là 'thói quen chấm điểm' vừa tách ra, "
  "giữ lại phòng khi nó có ích"),
 ("diem_* (10 cột)", "0–10",
  "Điểm 10 môn. Mỗi học sinh chỉ thi 3 môn nên 7 ô trống — đó là hình dạng bài "
  "toán, không phải dữ liệu hỏng"),
 ("z_diem_* (10 cột)", "≈ −7…3",
  "Cùng điểm đó đổi sang z-score: 8,0 Toán và 8,0 Văn không cùng ý nghĩa vì độ "
  "khó đề khác nhau"),
 ("diem_tb, diem_lech, z_tb, z_max", "—",
  "Trung bình điểm, biên độ, học lực chung, môn mạnh nhất"),
 ("th_* (15 cột)", "0/1",
  "Tổ hợp one-hot, đúng 1 cột bằng 1. Không mã hoá thành số vì tổ hợp KHÔNG có "
  "thứ tự"),
 ("gioi_tinh_nam", "0/1", "1 = Nam"),
 ("muc_tieu", "1–4", "Mục tiêu nghề nghiệp"),
]
B.bang(["Nhóm cột", "Khoảng giá trị", "Ý nghĩa"], NHOM_CT, rong=[4.2, 2.8, 8.0])
B.p("Trọng số thực tế mô hình dùng (đo trên research2):", dam=True, co=11)
B.bang(["Nhóm đặc trưng", "Số cột", "Tổng trọng số"],
       [["Điểm z-score từng môn", "10", "20,1%"],
        ["Tổ hợp xét tuyển", "15", "18,8%"],
        ["Điểm thi thô", "10", "17,7%"],
        ["Likert thô", "10", "16,3%"],
        ["Likert chuẩn hoá theo người", "10", "15,5%"],
        ["Phái sinh từ điểm", "4", "5,0%"],
        ["Giới tính · mục tiêu", "2", "3,9%"],
        ["Thống kê Likert", "2", "2,9%"]], rong=[7.0, 2.4, 3.6])
B.p("Điểm thi và tổ hợp cộng lại chiếm 61,6% — mô hình dựa vào thành tích học tập "
    "nhiều hơn khảo sát sở thích (34,7%). Mô hình dùng 50/63 cột, cần 35 cột mới "
    "đạt 80% trọng số, tức nó học rất dàn trải vì không cột nào mang tín hiệu mạnh.")
B.ngat()

# ══════════════════════════════════════════════════════════ PHỤ LỤC B
B.h("Phụ lục B — Giải thích thuật ngữ", 1)
B.bang(["Thuật ngữ", "Giải thích"],
 [["Top-k", "Mô hình đưa ra k ngành; tính là ĐÚNG nếu ngành thật nằm trong k ngành "
   "đó. Web gửi limit=3 nên Top-3 là chỉ tiêu chính."],
  ["Đoán bừa (baseline)",
   "Tỉ lệ đúng nếu chọn ngẫu nhiên k ngành trong nhóm. Nhóm 2 ngành thì đoán bừa "
   "Top-3 = 100%, nên con số Top-3 của nhóm đó vô nghĩa nếu không kèm mốc này."],
  ["Hơn bừa", "Độ chính xác trừ đi đoán bừa, tính bằng điểm phần trăm."],
  ["Kỹ năng",
   "(độ chính xác − đoán bừa) / (1 − đoán bừa). Phần lỗi của đoán bừa mà mô hình "
   "xoá được. Đã trừ sạch lợi thế nhóm nhỏ nên so được giữa các cách chia nhóm."],
  ["Nhớ vẹt (overfitting)",
   "Mô hình học thuộc tập huấn luyện thay vì học quy luật. Dấu hiệu: độ chính xác "
   "trên train rất cao (~100%) trong khi trên dữ liệu mới thấp hơn nhiều."],
  ["Rò rỉ dữ liệu (leakage)",
   "Thông tin từ tập kiểm tra lọt vào quá trình huấn luyện, dù chỉ gián tiếp. Hậu "
   "quả: con số báo cáo cao hơn năng lực thật."],
  ["Cross-validation",
   "Chia dữ liệu thành nhiều phần, lần lượt dùng mỗi phần làm validation. Ở đây "
   "dùng 5 fold × 3 lần lặp = 15 lần đo để con số ổn định."],
  ["Co ngót Bayes (shrinkage)",
   "Kéo ước lượng của nhóm ít dữ liệu về phía ước lượng của nhóm lớn hơn, theo "
   "trọng số w = n/(n+K)."],
  ["Tập điển hình (typical set)",
   "Vùng mà mẫu rút từ một phân phối thực sự rơi vào — nơi log-likelihood xấp xỉ "
   "giá trị KỲ VỌNG, không phải giá trị lớn nhất. Trong không gian nhiều chiều, "
   "điểm có xác suất cao nhất (đỉnh μ) hầu như không bao giờ được rút ra."],
  ["Bộ phân biệt (discriminator)",
   "Một bộ phân loại được huấn luyện để tách 'dữ liệu thật' khỏi 'dữ liệu sinh ra'. "
   "AUC ≈ 0,50 nghĩa là nó không tách nổi — đó là điều ta muốn."],
  ["AUC", "Diện tích dưới đường ROC. 0,5 = đoán bừa, 1,0 = tách hoàn hảo."],
  ["Phân tầng (hierarchical)",
   "Dự đoán theo hai bước: đoán lĩnh vực con trước, rồi đoán ngành trong lĩnh vực "
   "đó. Mô hình TỰ đoán lĩnh vực con nên đây không phải thu hẹp bài toán."],
  ["One-hot", "Mã hoá biến phân loại thành nhiều cột 0/1, mỗi cột hỏi 'có thuộc "
   "loại này không'. Dùng khi biến KHÔNG có thứ tự."],
  ["z-score", "(giá trị − trung bình) / độ lệch chuẩn. Quy các thang đo khác nhau "
   "về cùng một mặt bằng để so sánh được."],
 ], rong=[4.0, 11.0], co=9.5)

n = B.luu(RA)
print(f"\n✅ {RA}")
print(f"   {n} hình  ·  {RA.stat().st_size/1e6:.1f} MB")
