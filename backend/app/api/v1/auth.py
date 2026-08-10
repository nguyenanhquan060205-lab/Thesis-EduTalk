"""
Auth Router (Python)
Migrate từ: mobile/lib/services/auth_service.dart
Định nghĩa các API Endpoints cho chức năng xác thực người dùng.
"""
# pyrefly: ignore [missing-import]
from app.services.auth_service import AuthService
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()
auth_service = AuthService()


from app.models.auth_models import (
    ChangePasswordRequest,
    GoogleSignInRequest,
    LoginRequest,
    OtpSendRequest,
    OtpVerifyRequest,
    RegisterRequest,
    ResendVerifyRequest,
)

# ==================== Endpoints ====================

@router.get("/")
def get_auth_status():
    return {"message": "Auth API status OK"}


@router.post("/register")
async def register(body: RegisterRequest):
    """
    Đăng ký tài khoản mới bằng Email/Password.
    Tương đương: auth_service.register() trong Dart.
    """
    result = await auth_service.register(
        name=body.name,
        email=body.email,
        password=body.password,
        phone=body.phone,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result["status"])
    return result


@router.post("/login")
async def login(body: LoginRequest):
    """
    Đăng nhập bằng Email/Password, trả về role và idToken.
    Tương đương: auth_service.login() trong Dart.
    """
    result = await auth_service.login(email=body.email, password=body.password)
    if result["status"] != "success":
        raise HTTPException(status_code=401, detail=result["status"])
    return result


@router.post("/google")
async def sign_in_with_google(body: GoogleSignInRequest):
    """
    Xác thực Google Sign-in từ Client (Android/Web).
    Client tự thực hiện Google Sign-in, gửi ID Token lên đây để xác thực.
    Tương đương: auth_service.signInWithGoogle() trong Dart.
    """
    result = await auth_service.sign_in_with_google(id_token=body.idToken)
    if result["status"] != "success":
        raise HTTPException(status_code=401, detail=result["status"])
    return result


@router.delete("/delete/{uid}")
async def delete_account(uid: str, authorization: str = Header(...)):
    """
    Xóa tài khoản hoàn toàn: lịch sử, Firestore document và Firebase Auth.
    Tương đương: auth_service.deleteAccount() trong Dart.
    """
    # Xác thực token trước khi cho phép xóa
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded or decoded.get("uid") != uid:
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện hành động này.")

    result = await auth_service.delete_account(uid=uid)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message", "Lỗi xóa tài khoản"))
    return result


@router.post("/resend-verify")
async def resend_verification_email(body: ResendVerifyRequest):
    """
    Gửi lại email xác thực.
    Tương đương: auth_service.resendVerificationEmail() trong Dart.
    """
    result = await auth_service.resend_verification_email(
        email=body.email,
        password=body.password
    )
    return result


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, authorization: str = Header(...)):
    """
    Đổi mật khẩu: xác minh mật khẩu cũ, sau đó cập nhật mật khẩu mới.
    Migrate từ: ChangePass.dart — _handleChangePassword().
    """
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")
    uid = decoded["uid"]

    result = await auth_service.change_password(
        uid=uid,
        current_password=body.currentPassword,
        new_password=body.newPassword,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result


@router.post("/otp/send")
async def send_otp(body: OtpSendRequest):
    """
    Sinh và gửi OTP 6 số về email người dùng.
    Migrate từ: OTP_service.dart — sendOtp().
    """
    result = await auth_service.send_otp(email=body.email)
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@router.post("/otp/verify")
async def verify_otp(body: OtpVerifyRequest):
    """
    Xác minh mã OTP người dùng nhập vào.
    Migrate từ: OTP_service.dart — verifyOtp().
    """
    result = await auth_service.verify_otp(email=body.email, input_otp=body.otp)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result
