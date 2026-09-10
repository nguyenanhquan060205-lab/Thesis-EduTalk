"""XAI Service — diễn giải kết quả SHAP thành ngôn ngữ tự nhiên.

Tương ứng lớp `XAIService` trong sơ đồ lớp phân tích của đề tài.

Giá trị SHAP được tính ở `major_predictor.giai_thich()` bằng TreeSHAP; file này
chỉ lo phần **diễn đạt** chúng cho người đọc.

Quy tắc sống còn của cả file: **đưa số SHAP vào prompt**, tuyệt đối không hỏi mô
hình ngôn ngữ kiểu "đoán xem vì sao ngành này được chọn". Cách sau sinh ra lời
giải thích nghe rất thuyết phục nhưng không liên quan gì tới mô hình thật — tệ
hơn là không giải thích, vì nó nguỵ trang thành XAI và mượn uy tín của biểu đồ
số nằm ngay bên cạnh.
"""

import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Bỏ qua mục dưới ngưỡng này khi dựng ngữ cảnh — đưa cả 14 dòng vào prompt thì
# phần lớn là nhiễu (nhiều mục chỉ ±0,01) và làm loãng 2–3 yếu tố thật sự quyết định.
NGUONG_DANG_KE_PCT = 3.0


def mo_ta_shap(features: list[dict], nguong: float = NGUONG_DANG_KE_PCT) -> str:
    """Bảng SHAP → text đưa vào prompt.

    Dùng CHUNG cho cả phần giải thích dưới thẻ ngành lẫn phần trợ lý hội thoại.
    Để mỗi nơi tự định dạng thì hai bên sẽ trôi lệch nhau, và trợ lý có thể mô tả
    SHAP khác với biểu đồ người dùng đang nhìn.

    Bỏ qua mục `anVoiThiSinh` (giới tính, tổ hợp, môn không thi…) — người dùng
    không thấy chúng trên màn hình thì trợ lý cũng không được nhắc tới.
    """
    dong = []
    for f in features:
        if f.get("anVoiThiSinh"):
            continue
        if f.get("phanTram", 0) < nguong:
            continue
        chieu = "đẩy ngành này LÊN" if f.get("dongGop", 0) > 0 else "kéo ngành này XUỐNG"
        # Kèm luôn mức độ bằng chữ do backend chấm. Trước kia chỉ đưa phần trăm,
        # mô hình ngôn ngữ tự quy ra "nhẹ thôi" trong khi bảng ghi "mạnh".
        dong.append(
            f"- {f['ten']} (bạn khai: {f['giaTri']}) — {chieu}, "
            f"mức độ: {f.get('mucDo') or ''} ({f['phanTram']:.0f}%)"
        )
    return "\n".join(dong) if dong else "- (không có yếu tố nào nổi bật)"


def ngu_canh_tu_van(ket_qua: dict, so_nganh: int = 3) -> str:
    """Tóm tắt cả lượt tư vấn → text đưa vào prompt trợ lý hội thoại.

    Không có phần này thì người dùng bấm sang chat, trợ lý **không biết** họ vừa
    được gợi ý ngành gì, thi tổ hợp nào, bao nhiêu điểm — nên chỉ trả lời chung
    chung được.
    """
    if not ket_qua or not ket_qua.get("majors"):
        return ""

    che_do = (
        "người dùng ĐÃ tự chọn nhóm ngành nên hệ thống chỉ xếp hạng trong nhóm đó"
        if ket_qua.get("mode") == "guided"
        else "hệ thống tự đoán cả nhóm ngành lẫn ngành cụ thể"
    )
    phan = [
        "=== KẾT QUẢ TƯ VẤN GẦN NHẤT CỦA NGƯỜI DÙNG ===",
        f"Chế độ: {che_do}.",
    ]
    if ket_qua.get("totalScore") is not None:
        phan.append(f"Tổng điểm 3 môn: {ket_qua['totalScore']}")

    for m in ket_qua["majors"][:so_nganh]:
        phan.append(f"\n#{m.get('rank')} {m.get('name')} — nhóm {m.get('field')}")
        ad = m.get("admission") or {}
        if ad.get("cutoffs"):
            diem = " · ".join(f"{y}: {v}" for y, v in sorted(ad["cutoffs"].items()))
            phan.append(f"  Điểm chuẩn các năm: {diem}")
        gt = m.get("explain") or {}
        if gt.get("features"):
            phan.append("  Vì sao mô hình xếp ngành này:")
            phan.append(
                "\n".join("  " + d for d in mo_ta_shap(gt["features"]).splitlines())
            )
    return "\n".join(phan)


_DIEN_GIAI_PROMPT = """\
Bạn là chuyên viên tư vấn tuyển sinh, đang ngồi cạnh một học sinh lớp 12 và giải
thích cho em ấy vì sao hệ thống gợi ý ngành này.

CĂN CỨ DUY NHẤT (do mô hình tính ra từ chính câu trả lời của bạn học sinh):
Ngành: {nganh}
{bang}

CÁCH NÓI:
- ĐÚNG 2–3 câu. Không hơn. Đây là chú thích dưới biểu đồ, không phải bài tư vấn.
- Gọi người đọc là "bạn". TUYỆT ĐỐI KHÔNG tự xưng "thầy", "cô", "mình", "tôi" —
  đây là hệ thống máy, tự nhận là người là không trung thực.
- Mở đầu bằng chính điểm mạnh của bạn học sinh, đừng mở đầu bằng "Mô hình...".
  Mỗi ngành mở một kiểu khác nhau, đừng lặp khuôn.
- Nói theo hướng "hồ sơ của bạn có nét giống các bạn đang học ngành này ở điểm...".
  Đó đúng là thứ mô hình học được: nó so bạn với sinh viên thật đang theo ngành đó.
- Nếu có yếu tố KÉO XUỐNG thì nói thẳng nhưng nhẹ nhàng, kiểu "chỗ hơi khác là...".
  Giấu đi là không trung thực. Gộp chung một câu, đừng liệt kê từng cái.
- Diễn đạt yếu tố kéo xuống là ĐIỂM KHÁC BIỆT, không phải điểm yếu hay thiếu sót.
  Đây là sự thật chứ không phải nói giảm: mô hình so người đọc với hồ sơ TRUNG BÌNH
  của sinh viên ngành đó, mà không ai trùng khớp hoàn toàn với một mức trung bình.
  Ngành nào cũng có vài điểm lệch — đó là chuyện bình thường.
  Tránh mọi chữ mang nghĩa chê: "yếu", "kém", "thiếu", "hạn chế", "chưa đạt", "trừ điểm".

RANH GIỚI (quan trọng hơn cả giọng văn):
- CHỈ dùng thông tin trong bảng trên. Không nói về việc làm, lương, điểm chuẩn,
  chương trình học, hay bất cứ điều gì không có trong bảng.
- KHÔNG khẳng định "bạn hợp ngành này", "bạn nên chọn ngành này", "đây là ngành
  dành cho bạn". Đây mới là gợi ý để tìm hiểu, không phải kết luận về con người bạn.
- KHÔNG đọc lại BẤT KỲ con số nào — cả phần trăm lẫn giá trị bạn học sinh đã khai
  ("5 trên 5", "điểm 9", "mức 4/5"). Bảng ngay trên đã hiện đủ, nhắc lại chỉ dài dòng.
- PHẢI tôn trọng cột "mức độ" trong bảng. Yếu tố ghi "mạnh" hay "rất mạnh" thì
  KHÔNG được mô tả là "nhẹ", "nhỏ", "không đáng kể" — bảng ngay trên màn hình hiện
  đúng chữ đó, nói ngược lại là tự mâu thuẫn với chính mình.
  Gợi ý cách nói theo từng mức: rất mạnh → "là yếu tố rõ nhất"; mạnh → "ảnh hưởng
  đáng kể"; vừa → "cũng góp phần"; không đáng kể → "ảnh hưởng nhẹ".
- Không nhắc thuật ngữ: SHAP, đặc trưng, trọng số, xác suất, mô hình học máy.
- Không markdown, không gạch đầu dòng. Văn xuôi liền mạch.
- Không khuyên bảo dạy đời, không hỏi ngược lại học sinh.
"""


class XAIService:
    """Chuyển bảng số SHAP thành 2–3 câu tiếng Việt."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self._model = genai.GenerativeModel(model_name="gemini-flash-lite-latest")

    async def dien_giai(self, nganh: str, features: list[dict]) -> str:
        if not self.api_key:
            raise RuntimeError("Chưa cấu hình GEMINI_API_KEY.")
        prompt = _DIEN_GIAI_PROMPT.format(nganh=nganh, bang=mo_ta_shap(features))
        resp = await self._model.generate_content_async(prompt)
        return (resp.text or "").strip()
