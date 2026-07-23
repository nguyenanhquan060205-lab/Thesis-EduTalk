from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import predict, majors, survey, users, auth, chat

app = FastAPI(
    title="EduTalk HUIT API",
    description="API for EduTalk HUIT - University Major Prediction & Consulting",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. In production, specify domains.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(predict.router, prefix="/api/v1/predict", tags=["Prediction"])
app.include_router(majors.router, prefix="/api/v1/majors", tags=["Majors"])
app.include_router(survey.router, prefix="/api/v1/survey", tags=["Survey"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])


@app.get("/")
def read_root():
    return {"message": "Welcome to EduTalk HUIT API"}
