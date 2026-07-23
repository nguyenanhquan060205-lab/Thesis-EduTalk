from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_chat_status():
    return {"message": "Chat API status OK"}
