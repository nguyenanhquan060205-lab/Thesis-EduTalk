"""
Chat Router (Python)
Migrate từ: mobile/lib/services/ai_chat_service.dart
Định nghĩa các API Endpoints cho chức năng Chat AI với Gemini.
"""
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from app.services.gemini_service import GeminiService

router = APIRouter()
gemini_service = GeminiService()


from app.models.chat_models import ChatMessage, SendMessageRequest


# ==================== Endpoints ====================

@router.get("/")
def get_chat_status():
    return {"message": "Chat API status OK"}


@router.post("/message")
async def send_message(body: SendMessageRequest):
    """
    Gửi tin nhắn đến Gemini AI và nhận phản hồi.
    Tương đương: GeminiChatService.sendMessage() trong Dart.

    Client cần gửi kèm toàn bộ history (lịch sử hội thoại) vì Backend là stateless.
    Phía Client (Android/Web) sẽ tự quản lý và lưu history.
    """
    try:
        history_dicts = [{"role": m.role, "text": m.text} for m in body.history]
        response_text = await gemini_service.send_message(
            message=body.message,
            history=history_dicts,
        )
        return {"response": response_text}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/trending-majors")
async def get_trending_majors():
    """
    Lấy top 3 ngành nghề đang trending từ Gemini AI.
    Tương đương: GeminiChatService.getTrendingMajors() trong Dart.
    """
    data = await gemini_service.get_trending_majors()
    return {"data": data}
