"""BƯỚC ① THU THẬP — đọc nguồn có cấu trúc, viết thành văn xuôi để đem đi nhúng.

Không phải nhánh truy vấn. File này chỉ làm đúng một việc: biến
`tuyen_sinh_huit_2026.json` thành những đoạn văn hoàn chỉnh, rồi giao cho
`nap_kho.py` nhúng và đẩy vào Chroma. Sau đó nó không tham gia gì nữa — mọi câu
hỏi đều đi qua Chroma.

VÌ SAO KHÔNG ĐƯA THẲNG JSON VÀO CHUNK: bộ nhúng học từ văn bản tự nhiên. Chuỗi khô
`7480201|A00,A01|20.0` cho vector rất kém so với một câu tiếng Việt hoàn chỉnh, và
model đọc câu văn cũng ít trích nhầm số hơn nhiều so với đọc một hàng phân cách
bằng gạch đứng.

Đây cũng là chỗ khác với sơ đồ RAG 4 bước thông thường: JSON **đã sạch sẵn**, nên
KHÔNG cho nó đi qua bước "làm sạch văn bản thô". Ép dữ liệu có cấu trúc qua bộ làm
sạch văn bản là đi lùi — mất cấu trúc, dễ sinh lỗi. Chỉ PDF đề án và HTML tin tức
mới cần bước đó.

    ĐÃ GỠ: nhánh tra bảng (`tim_nganh` / `can_tra_bang` / `tra_cuu`).
    Hệ thống chạy RAG thuần — mọi truy vấn đi qua Chroma, không có đường tắt nào
    tra thẳng vào dict. Lịch sử và số liệu so sánh hai hướng nằm ở
    docs/KETQUA_RAG.md.
"""

import json
import logging
import re
import unicodedata

from app.core import paths

log = logging.getLogger(__name__)

_DATA = paths.CO_CAU_TRUC

# ĐỌC TỪ `backend/data/`, KHÔNG đọc thẳng `research*/`. Hai lý do:
#
# 1. `docker-compose.yml` khai `context: ./backend`, nên image CHỈ chứa thư mục
#    `backend/`. Trỏ vào `research/` thì trong container file không tồn tại và kho
#    dựng ra rỗng trơn — chatbot vẫn chạy, vẫn trả lời, chỉ là không còn dữ liệu
#    điểm chuẩn nào. Hỏng âm thầm, đúng kiểu cần chặn.
#
# 2. Bảng tuyển sinh là dữ liệu của TRƯỜNG, không thuộc pipeline nào. Mô hình phục vụ
#    đổi từ pipeline này sang pipeline khác (research3 → Hướng 1 ở `research/`) mà dữ
#    liệu điểm chuẩn thì không đổi — nên nó không được nằm nhờ thư mục pipeline.
#
# Cố ý KHÔNG làm kiểu "có research/ thì đọc research/, không thì đọc bản sao": như
# vậy máy dev và máy production đọc hai file khác nhau, và ngày nào hai bản lệch
# nhau thì lỗi chỉ hiện ra sau khi deploy.
#
# Bản sao được `scripts/nap_kho.py` chép sang và chép LẠI mỗi lần chạy, nên chỉ cần
# nhớ đúng một điều: sửa dữ liệu gốc xong thì chạy `nap_kho.py`.
F_NGANH = _DATA / "tuyen_sinh_huit_2026.json"
F_NHOM = _DATA / "mapping_nhom_nganh.json"


def bo_dau(s: str) -> str:
    """Bỏ dấu tiếng Việt và hạ chữ thường, để so khớp không phụ thuộc cách gõ.

    Dùng cho tìm kiếm trong trang quản trị và cho các script đo — KHÔNG dùng trong
    đường truy xuất của chatbot (đường đó thuần vector).
    """
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d")
    return re.sub(r"\s+", " ", s).strip()


class NguonCoCauTruc:
    """Nạp file JSON một lần, sinh chunk nhiều lần."""

    def __init__(self):
        self.nganh: dict[str, dict] = {}
        self.ten_nhom: dict[int, str] = {}
        self.nganh_to_nhom: dict[int, int] = {}
        self.nguon = ""
        self._nap()

    def _nap(self):
        if not F_NGANH.exists():
            log.warning("Không thấy %s — kho sẽ thiếu phần ngành học", F_NGANH)
            return
        d = json.loads(F_NGANH.read_text(encoding="utf-8"))
        self.nganh = d["nganh"]
        self.nguon = d.get("nguon", "Đề án tuyển sinh HUIT 2026")

        if F_NHOM.exists():
            m = json.loads(F_NHOM.read_text(encoding="utf-8"))
            self.ten_nhom = {int(k): v for k, v in m["ten_nhom"].items()}
            self.nganh_to_nhom = {int(k): int(v) for k, v in m["nganh_to_nhom"].items()}

    # ────────────────────────────────────────────────────────────────────
    def mo_ta(self, ma: str) -> str:
        """Một ngành → một đoạn văn TỰ CHỨA ĐỦ NGHĨA.

        Nhét đủ tên ngành, mã ngành, tên trường, nhóm ngành, tổ hợp và điểm chuẩn
        từng năm vào cùng một đoạn: lúc truy xuất, chunk này đứng một mình, nên mọi
        thứ cần để trả lời phải nằm gọn trong nó, không phải ghép từ nhiều mảnh.

        Lặp lại "Trường Đại học Công Thương TP.HCM (HUIT)" ở mọi chunk nghe thừa
        khi đọc cả file, nhưng cần thiết khi chunk bị tách ra đứng riêng.
        """
        v = self.nganh[ma]
        dc = {y: d for y, d in v.get("diem_chuan_thpt", {}).items() if d is not None}
        cau_diem = (
            "Điểm chuẩn xét theo kết quả thi tốt nghiệp THPT: "
            + "; ".join(f"năm {y} là {d} điểm" for y, d in sorted(dc.items()))
            + "."
        ) if dc else "Chưa có dữ liệu điểm chuẩn."
        nhom = self.ten_nhom.get(self.nganh_to_nhom.get(int(ma), -1), "")
        cau_nhom = f" Ngành này thuộc nhóm {nhom}." if nhom else ""
        return (
            f"Ngành {v['ten']}, mã ngành {ma}, Trường Đại học Công Thương TP.HCM "
            f"(HUIT).{cau_nhom} Các tổ hợp xét tuyển: {', '.join(v['to_hop'])}. "
            f"{cau_diem}"
        )

    def mo_ta_nhom(self, ma_nhom: int) -> str | None:
        """Một nhóm ngành và danh sách ngành trong nhóm.

        VÌ SAO CẦN CHUNK RIÊNG. Mỗi chunk ngành chỉ nói "ngành này thuộc nhóm X",
        không chunk nào nói "nhóm X gồm những ngành nào". Thí sinh hỏi *"vài ngành
        tương tự chung nhóm với An toàn thông tin"* thì model phải gom đủ 4 chunk
        ngành rời nhau mới trả lời được — top-4 gom không nổi, nên nó kể đúng một
        ngành rồi dừng. Đo thật trên web ngày 20/09/2026.

        Chín nhóm này chính là nhóm mà mô hình XGBoost dùng để tư vấn (`fieldId`),
        nên câu "ngành nào giống ngành tôi thích" là câu trúng tim đề tài.
        """
        ten = self.ten_nhom.get(ma_nhom)
        if not ten:
            return None
        trong_nhom = [
            (ma, v["ten"])
            for ma, v in self.nganh.items()
            if self.nganh_to_nhom.get(int(ma)) == ma_nhom
        ]
        if len(trong_nhom) < 2:
            return None
        return (
            f"Nhóm ngành {ten} của Trường Đại học Công Thương TP.HCM (HUIT) gồm "
            f"{len(trong_nhom)} ngành: "
            + "; ".join(f"{t} (mã {m})" for m, t in sorted(trong_nhom, key=lambda x: x[1]))
            + "."
        )
        # ⚠️ ĐỪNG thêm câu đuôi chung chung kiểu "các ngành này gần nhau về lĩnh vực,
        # thí sinh quan tâm một ngành thường cân nhắc thêm các ngành còn lại". Đã thử:
        # câu đó khiến chunk nhóm hợp với MỌI câu hỏi về ngành, chen lên hạng 1 cả ở
        # "ngành CNTT xét tổ hợp nào" — mà chunk nhóm không có tổ hợp. Hit@1 tụt từ
        # 97,4% xuống 89,5%. Chunk chỉ nên chứa đúng thứ nó trả lời được.

    def tat_ca_mo_ta(self) -> list[tuple[str, str, dict]]:
        """Toàn bộ 39 ngành + 9 nhóm ngành, dạng (id, nội dung, metadata) cho Chroma."""
        ra = []
        for ma_nhom in sorted(self.ten_nhom):
            if noi_dung := self.mo_ta_nhom(ma_nhom):
                ra.append((
                    f"nhom-{ma_nhom}",
                    noi_dung,
                    {
                        "loai": "nhom_nganh",
                        "nhom": self.ten_nhom[ma_nhom],
                        "nam": 0,
                        "nguon": self.nguon,
                    },
                ))
        for ma, v in self.nganh.items():
            dc = {y for y, d in v.get("diem_chuan_thpt", {}).items() if d is not None}
            ra.append((
                f"nganh-{ma}",
                self.mo_ta(ma),
                {
                    "loai": "nganh",
                    "nganh": v["ten"],
                    "ma_nganh": str(ma),
                    "nam": int(max(dc)) if dc else 0,
                    "nguon": self.nguon,
                },
            ))
        return ra


_nguon: NguonCoCauTruc | None = None


def lay_nguon() -> NguonCoCauTruc:
    global _nguon
    if _nguon is None:
        _nguon = NguonCoCauTruc()
    return _nguon
