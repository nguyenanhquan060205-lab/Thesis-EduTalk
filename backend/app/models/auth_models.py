# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = None
    # "Nam" | "Nu" — mô hình gợi ý ngành dùng trường này, lấy tự động từ hồ sơ
    # thay vì hỏi lại người dùng ở mỗi lần khảo sát.
    gender: str | None = None


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


class VerifyRegistrationRequest(BaseModel):
    """Mã 6 số gửi tới email đăng ký. Sai quá 3 lần thì tài khoản bị xoá.

    Không cần token — mã OTP chính là bằng chứng sở hữu hộp thư.
    """

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class EmailChangeStartRequest(BaseModel):
    """Bước 1: người dùng gõ lại email hiện tại.

    Bắt gõ vì phía giao diện chỉ hiện bản đã che (`co**********@gmail.com`).
    Sai 3 lần thì phiên bị huỷ — không thì bước này thành công cụ dò ngược
    phần bị che.
    """

    currentEmail: EmailStr


class OtpOnlyRequest(BaseModel):
    """Bước 2: mã 6 số gửi về hộp thư CŨ. Danh tính lấy từ token."""

    otp: str = Field(..., min_length=6, max_length=6)


class EmailChangeSetNewRequest(BaseModel):
    """Bước 3: địa chỉ mới. Chỉ nhận sau khi bước 2 thành công."""

    newEmail: EmailStr


class ChangeEmailRequest(BaseModel):
    """Bước 4: `otp` là mã đã gửi tới CHÍNH địa chỉ mới — chứng minh người dùng
    thật sự đọc được hộp thư đó."""

    newEmail: EmailStr
    otp: str
