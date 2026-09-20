"""Tìm LỖ HỔNG của kho tri thức — kho đang trả lời hụt ở chủ đề nào.

    conda activate Edutalk
    cd backend
    python scripts/do_lo_hong.py

Trả lời câu hỏi "giờ tôi cần thu thập dữ liệu gì" bằng SỐ ĐO thay vì phỏng đoán.

⚠️ ĐỌC KỸ CHỖ NÀY — bản đầu của script này đã đo SAI và suýt cho kết luận ngược.

Bản đầu chỉ xét khoảng cách cosine. Nó báo "Học phí ✅ đủ dữ liệu" trong khi kho
không có lấy một chữ nào về học phí. Nguyên nhân: câu *"Học phí ngành CNTT bao
nhiêu?"* nằm gần chunk ngành CNTT (0.292) vì trùng cụm *"ngành Công nghệ thông
tin"* — dù chunk đó chỉ nói điểm chuẩn và tổ hợp.

    Khoảng cách cosine đo CÙNG CHỦ ĐỀ, không đo CÓ CHỨA CÂU TRẢ LỜI.

Đây cũng chính là giới hạn của ngưỡng `NGUONG_LAC_DE`: nó chặn được câu lạc miền
(thời tiết, bóng đá), KHÔNG chặn được câu đúng miền mà kho không có dữ liệu. Loại
sau nguy hiểm hơn nhiều, vì model nhận được một đoạn "nhìn có vẻ liên quan" rồi
ghép đại thành câu trả lời nghe rất hợp lý.

Nên script đo HAI thứ, và chỗ hai thứ đó lệch nhau mới là phát hiện:

    ① lấy được ngữ cảnh không?   — khoảng cách vector, tức góc nhìn của máy
    ② ngữ cảnh có chứa nội dung cần không?  — đoạn lấy về có nhắc tới từ khoá
      của chủ đề (học phí, ký túc xá, tín chỉ…) hay không

Không gọi LLM sinh — chỉ nhúng câu hỏi, nên chạy nhanh và gần như miễn phí.
"""

import pathlib
import sys
import time
from collections import defaultdict

GOC = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(GOC))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(GOC / ".env")

from app.services.rag.kho import lay_kho  # noqa: E402
from app.services.rag.nguon_co_cau_truc import bo_dau  # noqa: E402
from app.services.rag.tro_ly import (  # noqa: E402
    HE_SO_UNG_VIEN,
    NGUONG_LAC_DE,
    lay_ngu_canh,
)

# Chủ đề → (từ khoá bắt buộc, danh sách câu hỏi).
#
# "Từ khoá bắt buộc": đoạn lấy về phải chứa ít nhất một trong các từ này thì mới
# thật sự trả lời được câu hỏi. Đây là phần chặn kiểu "gần về chủ đề nhưng không
# chứa câu trả lời" — chỉ dùng để CHẤM BÀI ĐO, không dùng lúc chạy thật.
#
# Câu hỏi viết theo giọng thí sinh thật, không viết theo giọng tài liệu.
BO_HOI: dict[str, tuple[tuple[str, ...], list[str]]] = {
    "Điểm chuẩn & tổ hợp": (
        ("diem chuan", "to hop"),
        [
            "Điểm chuẩn ngành Công nghệ thông tin năm 2026?",
            "Ngành Marketing xét những tổ hợp nào?",
            "Em được 21 điểm khối A00 thì đậu ngành nào ở HUIT?",
        ],
    ),
    "Chọn ngành theo sở thích": (
        ("nganh",),
        [
            "Em thích nấu ăn thì học ngành gì?",
            "Em muốn làm lập trình viên nên chọn ngành nào?",
            "HUIT có ngành nào về môi trường không?",
        ],
    ),
    "Học phí": (
        ("hoc phi", "trieu dong", "vnd"),
        [
            "Học phí ngành Công nghệ thông tin một năm bao nhiêu?",
            "Học phí HUIT có tăng theo từng năm không?",
            "Học phí chương trình chất lượng cao khác gì hệ đại trà?",
        ],
    ),
    "Phương thức xét tuyển": (
        ("phuong thuc", "hoc ba", "danh gia nang luc", "xet tuyen thang"),
        [
            "HUIT có mấy phương thức xét tuyển năm 2026?",
            "Em xét học bạ vào HUIT được không, cần điều kiện gì?",
            "Điểm thi đánh giá năng lực có xét vào HUIT được không?",
        ],
    ),
    "Hồ sơ & thời gian": (
        ("ho so", "giay to", "thoi gian", "han nop", "ngay"),
        [
            "Hồ sơ nhập học HUIT cần giấy tờ gì?",
            "Khi nào HUIT công bố kết quả trúng tuyển?",
            "Nộp hồ sơ xét tuyển HUIT trước ngày nào?",
        ],
    ),
    "Học bổng & hỗ trợ": (
        ("hoc bong", "mien giam"),
        [
            "HUIT có học bổng cho tân sinh viên không?",
            "Điều kiện nhận học bổng khuyến khích học tập ở HUIT?",
            "Sinh viên khó khăn có được miễn giảm học phí không?",
        ],
    ),
    "Chương trình đào tạo": (
        ("tin chi", "hoc phan", "mon hoc", "chuong trinh dao tao"),
        [
            "Ngành Công nghệ thông tin học bao nhiêu tín chỉ?",
            "Học ngành Kế toán ở HUIT mấy năm ra trường?",
            "Chương trình đào tạo ngành Marketing có những môn gì?",
        ],
    ),
    "Cơ hội việc làm": (
        ("viec lam", "nghe nghiep", "vi tri", "lam viec tai"),
        [
            "Học Công nghệ thực phẩm ra trường làm gì?",
            "Tỉ lệ sinh viên HUIT có việc làm sau tốt nghiệp là bao nhiêu?",
            "Lương khởi điểm ngành Logistics khoảng bao nhiêu?",
        ],
    ),
}

# Chủ đề CỐ Ý không đưa vào kho. Để lại trong bảng trên thì nó báo đỏ mãi mãi, mà một
# dòng đỏ không bao giờ tắt được sẽ dạy người ta quen mắt bỏ qua — rồi bỏ qua luôn lỗi
# thật nằm ngay cạnh. Ghi ra đây để vẫn thấy được quyết định, không phải xoá lặng lẽ.
#
# Muốn làm lại thì chuyển mục tương ứng ngược lên `CHU_DE`.
NGOAI_PHAM_VI = {
    "Đời sống sinh viên": "ký túc xá, cơ sở, chuyển ngành — ngoài phạm vi khoá luận",
}


def main():
    kho = lay_kho()
    if not kho.san_sang:
        sys.exit("Kho vector chưa dựng — chạy `python scripts/nap_kho.py` trước.")

    print("═" * 84)
    print(f"  DÒ LỖ HỔNG KHO TRI THỨC · {kho.thong_tin.get('so_chunk')} chunk")
    print("═" * 84)

    kq: dict[str, list[dict]] = defaultdict(list)
    for chu_de, (tu_khoa, ds) in BO_HOI.items():
        for q in ds:
            # Nới đúng cỡ backend dùng thật, nếu không bài đo phản ánh một hệ thống
            # khác với hệ thống đang phục vụ — xem chú thích ở `danh_gia.py`.
            ung_vien = kho.truy_xuat(q, 4 * HE_SO_UNG_VIEN)
            lay_ve = ung_vien[:4]
            nc = lay_ngu_canh(q, 4, lay_ve=ung_vien)
            van = bo_dau(" ".join(d["noi_dung"] for d in nc.doan))
            kq[chu_de].append({
                "hoi": q,
                "gan": lay_ve[0]["khoang_cach"] if lay_ve else 9.9,
                "co_ngu_canh": len(nc.doan) > 0,
                # Đoạn lấy về có thật sự nói về chủ đề được hỏi không
                "co_noi_dung": any(bo_dau(t) in van for t in tu_khoa),
            })
            time.sleep(0.3)  # gói free có trần lượt/phút
        print(f"  ✓ {chu_de}")

    print("\n" + "═" * 84)
    print("  KẾT QUẢ")
    print("═" * 84)
    print(f"  {'chủ đề':<26} {'① lấy được':>11} {'② có nội dung':>14} {'k/cách TB':>10}   kết luận")
    print("  " + "─" * 88)

    thieu = []
    for chu_de, r in kq.items():
        n = len(r)
        c1 = sum(x["co_ngu_canh"] for x in r)
        c2 = sum(x["co_noi_dung"] for x in r)
        tb = sum(x["gan"] for x in r) / n

        if c2 == n:
            ket, xau = "✅ kho có dữ liệu", False
        elif c2 == 0 and c1 > 0:
            # Trường hợp nguy hiểm nhất: máy tưởng tìm được, thật ra không có gì
            ket, xau = "🔴 GIẢ CÓ — lấy được nhưng RỖNG nội dung", True
        elif c2 == 0:
            ket, xau = "❌ trống hoàn toàn", True
        else:
            ket, xau = "⚠️  che phủ một phần", True

        print(f"  {chu_de:<26} {c1}/{n:<10} {c2}/{n:<13} {tb:>9.3f}   {ket}")
        if xau:
            thieu.append((chu_de, r))

    for chu_de, vi_sao in NGOAI_PHAM_VI.items():
        print(f"  {chu_de:<26} {'—':<10} {'—':<13} {'—':>9}   ⊘ ngoài phạm vi: {vi_sao}")

    if thieu:
        print("\n" + "═" * 84)
        print("  CHI TIẾT — cần thu thập tài liệu cho những chủ đề này")
        print("═" * 84)
        for chu_de, r in thieu:
            print(f"\n  ▸ {chu_de}")
            for x in r:
                if x["co_noi_dung"]:
                    dau = "✅ có nội dung  "
                elif x["co_ngu_canh"]:
                    dau = "🔴 giả có       "
                else:
                    dau = "❌ không lấy được"
                print(f"      {dau} {x['gan']:.3f}  {x['hoi']}")

    print("\n  ĐỌC BẢNG:")
    print("  ① lấy được   — vector tìm ra đoạn nào đó dưới ngưỡng lạc đề")
    print("  ② có nội dung — đoạn đó THẬT SỰ nhắc tới chủ đề được hỏi")
    print()
    print("  🔴 GIẢ CÓ là ô nguy hiểm nhất, nguy hiểm hơn cả 'trống hoàn toàn':")
    print("     câu hỏi vẫn lọt qua ngưỡng nên bot NHẬN ĐƯỢC ngữ cảnh, chỉ có điều")
    print("     ngữ cảnh đó không chứa câu trả lời. Bot sẽ ghép đại từ đoạn gần")
    print("     giống, kèm cả dòng 'Nguồn: Đề án tuyển sinh HUIT'. Trống hoàn toàn")
    print("     thì bot còn biết đường nói 'chưa có dữ liệu'.")
    print()
    print(f"  Ngưỡng lạc đề hiện tại {NGUONG_LAC_DE} chỉ chặn câu LẠC MIỀN (thời tiết,")
    print("  bóng đá). Nó KHÔNG chặn được câu đúng miền mà kho chưa có dữ liệu.")


if __name__ == "__main__":
    main()
