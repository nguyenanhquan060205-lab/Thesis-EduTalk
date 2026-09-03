"""
Auth Router (Python)
Migrate từ: mobile/lib/services/auth_service.dart
Định nghĩa các API Endpoints cho chức năng xác thực người dùng.
"""

# pyrefly: ignore [missing-import]
from app.services.auth_service import AuthService
from fastapi import APIRouter, Header, HTTPException

router = APIRouter()


def chi_tiet_otp(result: dict) -> dict:
    """Gói kết quả OTP thất bại thành `detail` có cấu trúc.

    Trả chuỗi thuần thì client phải đoán tình huống qua nội dung câu chữ — đổi
    một dấu chấm là hỏng. Các cờ dưới đây quyết định giao diện làm gì tiếp:
    `expired` → bật nút gửi lại; `reset` → đóng popup và làm lại từ đầu;
    `deleted` → tài khoản vừa bị xoá, phải dọn cả phiên đăng nhập.
    """
    return {
        "message": result.get("message", "Xác thực thất bại."),
        "expired": bool(result.get("expired")),
        "reset": bool(result.get("reset")),
        "deleted": bool(result.get("deleted")),
        "attemptsLeft": result.get("attemptsLeft"),
    }
auth_service = AuthService()


from app.models.auth_models import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    GoogleSignInRequest,
    LoginRequest,
    OtpSendRequest,
    OtpVerifyRequest,
    RegisterRequest,
    ResendVerifyRequest,
    VerifyRegistrationRequest,
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
        gender=body.gender,
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
        raise HTTPException(
            status_code=403, detail="Không có quyền thực hiện hành động này."
        )

    result = await auth_service.delete_account(uid=uid)
    if result["status"] != "success":
        raise HTTPException(
            status_code=400, detail=result.get("message", "Lỗi xóa tài khoản")
        )
    return result


@router.post("/resend-verify")
async def resend_verification_email(body: ResendVerifyRequest):
    """
    Gửi lại email xác thực.
    Tương đương: auth_service.resendVerificationEmail() trong Dart.
    """
    result = await auth_service.resend_verification_email(
        email=body.email, password=body.password
    )
    return result


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest, authorization: str = Header(...)
):
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


@router.post("/change-email")
async def change_email(body: ChangeEmailRequest, authorization: str = Header(...)):
    """Đổi email đăng nhập — **bắt buộc** xác minh OTP gửi tới địa chỉ mới.

    Luồng đúng phía client:
    1. `POST /api/v1/auth/otp/send` với email mới → người dùng nhận mã 6 số
    2. `POST /api/v1/auth/change-email` kèm `newEmail` + `otp`

    Không có bước OTP thì người dùng có thể gán email của người khác cho tài khoản
    mình, hoặc gõ nhầm địa chỉ rồi mất luôn đường đăng nhập.
    """
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")

    result = await auth_service.change_email(
        uid=decoded["uid"], new_email=body.newEmail, otp=body.otp
    )
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/registration/verify", summary="Xác minh email sau khi đăng ký")
async def verify_registration(body: VerifyRegistrationRequest):
    """Nhập mã 6 số gửi tới email đăng ký. **Không cần đăng nhập** — mã OTP đã là
    bằng chứng người nhập đọc được hộp thư đó.

    - Đúng → `emailVerified = true`, mở khoá đăng bài và bình luận
    - Sai đủ 3 lần → **xoá luôn tài khoản** (Firebase + MongoDB), trả `deleted: true`
      để client dọn form và bắt đăng ký lại từ đầu
    - Hết 90 giây → trả `expired: true`, client bật nút gửi lại mã

    Đóng popup giữa chừng vẫn đăng nhập và dùng ứng dụng được, chỉ không đăng bài
    hay bình luận cho tới khi xác minh.
    """
    result = await auth_service.verify_registration(email=body.email, otp=body.otp)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/otp/send")
async def send_otp(body: OtpSendRequest):
    """
    Sinh và gửi OTP 6 số về email người dùng.
    Migrate từ: OTP_service.dart — sendOtp().
    """
    result = await auth_service.send_otp(target=body.email, channel="email")
    if result["status"] != "success":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@router.post("/otp/verify")
async def verify_otp(body: OtpVerifyRequest):
    """
    Xác minh mã OTP người dùng nhập vào.
    Migrate từ: OTP_service.dart — verifyOtp().
    """
    result = await auth_service.verify_otp(target=body.email, input_otp=body.otp)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result
