"""
Gemini AI Service (Python)
Migrate từ: mobile/lib/services/ai_chat_service.dart
Xử lý chat với Gemini AI và lấy xu hướng ngành nghề.
Thay vì dùng firebase_ai (Flutter SDK), ta gọi trực tiếp Google Generative AI Python SDK.
"""
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

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
- Sử dụng emoji phù hợp để tạo không khí vui vẻ.
- Sử dụng in đậm (**từ khóa**) để nhấn mạnh tên trường, tên ngành, điểm số và các ý chính.
- Dùng danh sách (bullet points) để trình bày rõ ràng.
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
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)

        # Model chính cho Chat — Tương đương _model trong Dart
        self._chat_model = genai.GenerativeModel(
            model_name="gemini-flash-lite-latest",  # Tương đương 'gemini-3.1-flash-lite' trong Dart
            system_instruction=_SYSTEM_INSTRUCTION,
        )

        # Model riêng cho Trending Majors (không có system instruction)
        self._trend_model = genai.GenerativeModel(
            model_name="gemini-flash-lite-latest",
            generation_config=genai.GenerationConfig(response_mime_type="application/json"),
        )

    async def send_message(self, message: str, history: list[dict]) -> str:
        """
        Gửi tin nhắn đến Gemini và nhận phản hồi.
        Tương đương: GeminiChatService.sendMessage() trong Dart.

        Args:
            message: Tin nhắn người dùng gửi.
            history: Lịch sử hội thoại (list của dict {"role": "user"/"model", "parts": [str]}).
                     Phía Client phải gửi kèm lịch sử này vì Backend là stateless.
        Returns:
            Chuỗi phản hồi từ AI.
        """
        try:
            if not self.api_key:
                return "Hệ thống AI đang được bảo trì. Vui lòng cung cấp GEMINI_API_KEY trong file .env."

            # Chuyển đổi history sang format của Python SDK
            chat_history = []
            for msg in history:
                chat_history.append({
                    "role": msg.get("role", "user"),
                    "parts": [msg.get("text", "")]
                })

            # Tạo chat session với lịch sử
            chat = self._chat_model.start_chat(history=chat_history)

            # Gửi tin nhắn
            response = await chat.send_message_async(message)
            return response.text or "Xin lỗi, mình không thể trả lời lúc này. Bạn thử hỏi lại nhé! 🙏"

        except Exception as e:
            raise RuntimeError(
                f"Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại. Lỗi: {str(e)}"
            )

    async def get_trending_majors(self) -> list[dict]:
        """
        Lấy top 3 ngành nghề trending từ Gemini AI.
        Tương đương: GeminiChatService.getTrendingMajors() trong Dart.
        """
        try:
            response = await self._trend_model.generate_content_async(_TRENDING_MAJORS_PROMPT)
            raw_text = response.text or "[]"

            # Parse JSON trả về
            data = json.loads(raw_text)
            return data

        except Exception:
            # Trả về dữ liệu mặc định nếu AI lỗi — Giống hệt Dart
            return _TRENDING_MAJORS_FALLBACK
