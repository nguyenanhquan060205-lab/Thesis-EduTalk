from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_auth_status():
    return {"message": "Auth API status OK"}
