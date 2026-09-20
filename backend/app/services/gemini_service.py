"""
Gemini AI Service (Python)
Migrate từ: mobile/lib/services/ai_chat_service.dart
Xử lý chat với Gemini AI và lấy xu hướng ngành nghề.
Thay vì dùng firebase_ai (Flutter SDK), ta gọi trực tiếp Google Generative AI Python SDK.
"""

import asyncio
import json
import logging

import google.generativeai as genai
from dotenv import load_dotenv

from app.core.config import settings
from app.services.rag import lay_ngu_canh

load_dotenv()

log = logging.getLogger(__name__)

# Model sinh câu trả lời. Đo trên đúng dạng prompt RAG của dự án, 3 lần mỗi model:
#
#   gemini-3.8-flash          504 timeout
#   gemini-3.7-flash          7.3s · 3.5s · 15.4s
#   gemini-3.5-flash          2.8s · 3.2s · 2.7s
#   gemini-flash-lite-latest  0.8s · 1.0s · 1.0s   ← chọn
#
# Mấy bản 3.7/3.8 có suy luận nội bộ: chúng nghĩ trước khi trả lời. Ở đây câu trả
# lời đã NẰM SẴN trong ngữ cảnh, chỉ việc đọc ra — nghĩ thêm không làm đúng hơn,
# chỉ làm thí sinh chờ 15 giây. Đổi bằng biến môi trường nếu cần đo lại.
MODEL_CHAT = settings.EDUTALK_MODEL_CHAT

# Tắt RAG để đo mốc đối chứng (`scripts/kiem_rag.py`), đúng luật "mọi bảng chỉ số
# phải có cột đoán bừa" của dự án.
BAT_RAG = settings.rag_enabled

# System Instruction — Giữ nguyên nội dung từ Dart, chỉ chuyển sang Python string
_SYSTEM_INSTRUCTION = """
Bạn là "Trợ lý EduTalk AI", một chuyên gia tư vấn giáo dục và hướng nghiệp tại Việt Nam. 
Nhiệm vụ của bạn là hỗ trợ thông tin khách quan, chính xác về TẤT CẢ các trường Đại học, Cao đẳng trên toàn quốc.

=== LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU & TỪ KHÓA ===
1. Khi người dùng sử dụng tên viết tắt của các trường đại học, bạn phải tra cứu và phân tích ngữ cảnh thật kỹ để tránh nhầm lẫn (Đặc biệt lưu ý HUIT là Trường Đại học Công Thương TP.HCM, trước đây là HUFI. IUH là Đại học Công nghiệp TP.HCM...).
2. Nếu từ khóa viết tắt có thể trùng lặp hoặc không chắc chắn, hãy chủ động hỏi lại tên đầy đủ của trường.

=== QUY TẮC BẮT BUỘC ===
1. LIÊN KẾT NGỮ CẢNH (BẮT BUỘC): Bạn phải luôn đọc lại lịch sử chat và liên kết câu hỏi ngắn hiện tại với chủ đề/trường học đang được nói đến ở câu ngay trước đó. 
   -> Ví dụ: Câu trước user hỏi về "HUIT", câu sau user chỉ gõ "2026" hoặc "học phí", bạn PHẢI tự động hiểu là "thông tin tuyển sinh HUIT 2026" hoặc "học phí HUIT", tuyệt đối không được trả lời chung chung.
2. Bạn CHỈ trả lời các chủ đề: Tư vấn ngành, chọn trường, điểm chuẩn, xét tuyển, học phí, cơ hội việc làm, thông tin kỳ thi.
3. Nếu người dùng hỏi NGOÀI CHỦ ĐỀ giáo dục, hãy TỪ CHỐI NGẮN GỌN.
4. Trả lời bằng tiếng Việt, khách quan, súc tích và đi thẳng vào trọng tâm.

=== PHONG CÁCH ===
- Thân thiện, chuyên nghiệp.
- TUYỆT ĐỐI KHÔNG dùng emoji. Giao diện đã có bộ biểu tượng riêng; emoji do hệ điều
  hành vẽ nên mỗi máy hiện một kiểu, phá mạch trình bày và làm câu trả lời về tuyển
  sinh trông thiếu nghiêm túc.
- Sử dụng in đậm (**từ khóa**) để nhấn mạnh tên trường, tên ngành, điểm số và các ý chính.
- Dùng danh sách (bullet points) để trình bày rõ ràng.
"""

# Chỉ ghép thêm vào system instruction KHI có ngữ cảnh. Nếu gắn cố định thì câu
# hỏi về trường khác — mà kho HUIT không có dữ liệu — sẽ bị từ chối oan.
_LUAT_RAG = """

=== NGỮ CẢNH TRA CỨU (LUẬT CAO NHẤT, ĐÈ MỌI QUY TẮC TRÊN) ===
Tin nhắn của người dùng có kèm khối NGỮ CẢNH lấy từ dữ liệu chính thức của HUIT.

1. Điểm chuẩn, mã ngành, tổ hợp xét tuyển, học phí, chỉ tiêu: CHỈ được lấy từ NGỮ
   CẢNH. TUYỆT ĐỐI không dùng kiến thức sẵn có của bạn cho những con số này, kể cả
   khi bạn "nhớ" là mình biết.
2. Ngữ cảnh không có thì nói thẳng là chưa có dữ liệu và mời xem ts.huit.edu.vn.
   KHÔNG suy đoán, KHÔNG ước lượng, KHÔNG lấy số của ngành gần giống.
3. Nêu điểm chuẩn thì BẮT BUỘC kèm năm. Điểm chuẩn đổi từng năm — thiếu năm là
   câu trả lời sai.
4. Ngữ cảnh nói về ngành khác với ngành người dùng hỏi thì BỎ QUA đoạn đó, đừng
   cố ghép vào cho có.
5. Kết thúc bằng một dòng "*Nguồn: ...*" chép lại đúng nhãn nguồn của đoạn đã
   dùng, giữ nguyên cả phần tên mục.

=== VÍ DỤ MẪU ===
Ba ví dụ dưới đây quy định ĐỊNH DẠNG, không phải dữ liệu thật. Con số trong đó
là bịa để minh hoạ — tuyệt đối không dùng lại.

NGỮ CẢNH: [1] (Nguồn: Đề án tuyển sinh HUIT 2026 — Ngành ABC, năm 2026)
          Ngành ABC, mã ngành 7000001. Các tổ hợp xét tuyển: A00, A01.
          Điểm chuẩn xét theo kết quả thi tốt nghiệp THPT: năm 2026 là 20 điểm.
HỎI: Ngành ABC lấy bao nhiêu điểm?
ĐÁP: Ngành **ABC** (mã 7000001) có điểm chuẩn xét theo kết quả thi tốt nghiệp
     THPT **năm 2026 là 20 điểm**, xét các tổ hợp **A00, A01**.
     *Nguồn: Đề án tuyển sinh HUIT 2026 — Ngành ABC*

NGỮ CẢNH: [1] (Nguồn: Đề án tuyển sinh HUIT 2026 — Ngành ABC, năm 2026)
          Ngành ABC, mã ngành 7000001. Các tổ hợp xét tuyển: A00, A01.
HỎI: Học phí ngành ABC bao nhiêu một năm?
ĐÁP: Hiện tại hệ thống chưa có dữ liệu học phí của ngành **ABC**. Bạn xem thông
     tin chính thức tại ts.huit.edu.vn nhé.
     (KHÔNG kèm dòng Nguồn, vì không có đoạn nào làm căn cứ.)

NGỮ CẢNH: [1] (Nguồn: Đề án tuyển sinh HUIT 2026 — Ngành XYZ, năm 2026)
          Ngành XYZ, mã ngành 7000002. Điểm chuẩn năm 2026 là 25 điểm.
HỎI: Ngành ABC lấy bao nhiêu điểm?
ĐÁP: Hiện tại hệ thống chưa có dữ liệu điểm chuẩn ngành **ABC**.
     (Ngữ cảnh chỉ có ngành XYZ — TUYỆT ĐỐI không lấy 25 điểm của XYZ gán cho ABC.)
"""

_TRENDING_MAJORS_PROMPT = """
Bạn là chuyên gia phân tích thị trường lao động và nhân sự tại Việt Nam.
Nhiệm vụ: Phân tích và đưa ra Top 3 ngành nghề đang có nhu cầu tuyển dụng và mức tăng trưởng cao nhất hiện nay tại Việt Nam.
YÊU CẦU KIỂM SOÁT DỮ LIỆU (KHÔNG DÙNG DỮ LIỆU ẢO):
- Dựa vào xu hướng thực tế của năm nay (Ví dụ: Trí tuệ nhân tạo, Vi mạch bán dẫn, Chăm sóc sức khỏe, Logistics, Thương mại điện tử...).
- Mức tăng trưởng (growth) phải là con số thực tế hợp lý (ví dụ: +12%, +15%, +18%), không đưa ra số quá lố ảo tưởng.
- CHỈ TRẢ VỀ JSON ARRAY. Tuyệt đối KHÔNG có markdown, KHÔNG có văn bản giải thích.

Định dạng bắt buộc:
[
  {"rank": 1, "name": "Tên ngành 1", "growth": "+15%"},
  {"rank": 2, "name": "Tên ngành 2", "growth": "+12%"},
  {"rank": 3, "name": "Tên ngành 3", "growth": "+10%"}
]
"""

# Fallback data khi AI bị lỗi — Giống hệt fallback trong Dart
_TRENDING_MAJORS_FALLBACK = [
    {"rank": 1, "name": "Trí tuệ nhân tạo (AI)", "growth": "+18%"},
    {"rank": 2, "name": "Thiết kế Vi mạch", "growth": "+15%"},
    {"rank": 3, "name": "Thương mại điện tử", "growth": "+12%"},
]


class GeminiService:
    """
    Tương đương class GeminiChatService trong ai_chat_service.dart.
    Thay vì dùng firebase_ai SDK của Flutter, ta gọi trực tiếp Python SDK.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)

        # Model chính cho Chat — Tương đương _model trong Dart
        self._chat_model = genai.GenerativeModel(
            model_name=MODEL_CHAT,
            system_instruction=_SYSTEM_INSTRUCTION,
        )

        # Bản có thêm luật RAG, chỉ dùng cho lượt nào truy xuất được ngữ cảnh
        self._chat_model_rag = genai.GenerativeModel(
            model_name=MODEL_CHAT,
            system_instruction=_SYSTEM_INSTRUCTION + _LUAT_RAG,
        )

        # Model riêng cho Trending Majors (không có system instruction)
        self._trend_model = genai.GenerativeModel(
            model_name=MODEL_CHAT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json"
            ),
        )

    async def send_message(
        self, message: str, history: list[dict], dung_rag: bool | None = None
    ) -> dict:
        """
        Gửi tin nhắn đến Gemini và nhận phản hồi, có tra cứu kho tri thức HUIT.

        Args:
            message: Tin nhắn người dùng gửi.
            history: Lịch sử hội thoại (list của dict {"role": "user"/"model", "text": str}).
                     Phía Client phải gửi kèm lịch sử này vì Backend là stateless.
            dung_rag: Ép bật/tắt RAG cho lượt này. `None` là theo biến môi trường —
                      dùng để đo mốc đối chứng bật/tắt.
        Returns:
            {"response": str, "co_rag": bool, "nguon": [str]}
        """
        try:
            if not self.api_key:
                return {
                    "response": "Hệ thống AI đang được bảo trì. Vui lòng cung cấp "
                                "GEMINI_API_KEY trong file .env.",
                    "co_rag": False,
                    "nguon": [],
                }

            # Chuyển đổi history sang format của Python SDK
            chat_history = []
            for msg in history:
                chat_history.append(
                    {"role": msg.get("role", "user"), "parts": [msg.get("text", "")]}
                )

            # ── Truy xuất ────────────────────────────────────────────────
            # `to_thread` vì cả nhúng lẫn Chroma đều là lời gọi CHẶN. Gọi thẳng
            # trong hàm async sẽ khoá event loop: mọi request khác của backend
            # đứng chờ theo, kể cả request dự đoán ngành không liên quan gì.
            ngu_canh = None
            if BAT_RAG if dung_rag is None else dung_rag:
                try:
                    ngu_canh = await asyncio.to_thread(
                        lay_ngu_canh, message, lich_su=history
                    )
                except Exception:  # noqa: BLE001
                    # RAG chết thì chatbot vẫn phải sống. Nhưng PHẢI ghi log KÈM
                    # VẾT GỌI — im lặng tụt về không-RAG là cái bẫy cần tránh
                    # nhất, mà chỉ in tên lớp lỗi thì cũng gần như im lặng.
                    log.exception("Truy xuất lỗi — lượt này trả lời KHÔNG có RAG")

            if ngu_canh:
                model = self._chat_model_rag
                noi_dung = (
                    f"=== NGỮ CẢNH ===\n{ngu_canh.van_ban()}\n\n"
                    f"=== CÂU HỎI ===\n{message}"
                )
            else:
                model = self._chat_model
                noi_dung = message

            chat = model.start_chat(history=chat_history)
            response = await chat.send_message_async(noi_dung)
            return {
                "response": response.text
                or "Xin lỗi, mình không thể trả lời lúc này. Bạn thử hỏi lại nhé!",
                "co_rag": bool(ngu_canh),
                "nguon": ngu_canh.nguon() if ngu_canh else [],
            }

        except Exception as e:  # noqa: BLE001
            # GHI VẾT GỌI RA LOG trước khi gói lại. Không có dòng này thì mọi lỗi
            # — kể cả lỗi import hay lỗi lập trình — đều hiện ra ngoài đúng một
            # kiểu "503 · không kết nối được với AI", terminal im lặng, và người
            # sửa phải đi dò từ đầu. Đã mất thời gian đúng vì chuyện này một lần.
            log.exception("Chat thất bại — câu hỏi: %r", message[:120])
            raise RuntimeError(
                f"Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại. Lỗi: {e!s}"
            )

    async def get_trending_majors(self) -> list[dict]:
        """
        Lấy top 3 ngành nghề trending từ Gemini AI.
        Tương đương: GeminiChatService.getTrendingMajors() trong Dart.
        """
        try:
            response = await self._trend_model.generate_content_async(
                _TRENDING_MAJORS_PROMPT
            )
            raw_text = response.text or "[]"

            # Parse JSON trả về
            data = json.loads(raw_text)
            return data

        except Exception:  # noqa: BLE001
            # Trả về dữ liệu mặc định nếu AI lỗi — Giống hệt Dart
            return _TRENDING_MAJORS_FALLBACK
