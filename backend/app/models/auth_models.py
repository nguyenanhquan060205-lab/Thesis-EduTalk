# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleSignInRequest(BaseModel):
    idToken: str

class ResendVerifyRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class OtpSendRequest(BaseModel):
    email: EmailStr

class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str
