from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_survey_status():
    return {"message": "Survey API status OK"}