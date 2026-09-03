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
    EmailChangeSetNewRequest,
    EmailChangeStartRequest,
    GoogleSignInRequest,
    LoginRequest,
    OtpOnlyRequest,
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


async def _uid_tu_token(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    decoded = await auth_service.verify_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Token không hợp lệ.")
    return decoded["uid"]


# ==================== ĐỔI EMAIL — 4 bước ====================
#
#   1. email-change/start       gõ đúng email hiện tại → mã về hộp thư CŨ
#   2. email-change/verify-old  nhập mã của hộp thư CŨ
#   3. email-change/set-new     nhập email MỚI        → mã về hộp thư MỚI
#   4. change-email             nhập mã của hộp thư MỚI → ghi thay đổi
#
# Người dùng chỉ nhìn thấy email đã che nên bước 1 vừa là xác nhận danh tính vừa
# là điều kiện mở phiên. Trạng thái giữ ở MongoDB, bước 4 từ chối nếu chưa qua
# bước 2 — nên gọi thẳng bằng curl cũng không bỏ qua được chặng nào.


@router.post("/email-change/start", summary="Bước 1 — xác nhận email hiện tại")
async def email_change_start(
    body: EmailChangeStartRequest, authorization: str = Header(...)
):
    """Đối chiếu email người dùng gõ với email thật, đúng thì gửi mã về hộp thư cũ.

    Sai 3 lần → huỷ phiên, trả `reset: true`.
    """
    uid = await _uid_tu_token(authorization)
    result = await auth_service.bat_dau_doi_email(uid, body.currentEmail)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/email-change/verify-old", summary="Bước 2 — mã của hộp thư cũ")
async def email_change_verify_old(
    body: OtpOnlyRequest, authorization: str = Header(...)
):
    """Sai 3 lần → huỷ phiên, email **không** đổi, phải làm lại từ bước 1."""
    uid = await _uid_tu_token(authorization)
    result = await auth_service.xac_minh_email_cu(uid, body.otp)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/email-change/set-new", summary="Bước 3 — nhận email mới")
async def email_change_set_new(
    body: EmailChangeSetNewRequest, authorization: str = Header(...)
):
    """Chỉ chạy được sau khi bước 2 thành công. Gửi mã tới địa chỉ mới."""
    uid = await _uid_tu_token(authorization)
    result = await auth_service.dat_email_moi(uid, body.newEmail)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/verify-my-email/send", summary="Gửi mã xác minh cho chính mình")
async def verify_my_email_send(authorization: str = Header(...)):
    """Dành cho người đã đăng nhập nhưng chưa xác minh email (đóng popup lúc đăng ký).

    Địa chỉ nhận mã do server tra từ token, **không nhận từ client** — phía người
    dùng chỉ có bản đã che nên gửi lên sẽ thành địa chỉ rác.
    """
    uid = await _uid_tu_token(authorization)
    result = await auth_service.gui_ma_xac_minh_cua_toi(uid)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/verify-my-email/confirm", summary="Xác minh email của chính mình")
async def verify_my_email_confirm(
    body: OtpOnlyRequest, authorization: str = Header(...)
):
    """Khác `/registration/verify`: sai quá số lần **không xoá tài khoản**, vì
    người dùng ở đây đã đăng nhập được và chỉ đang xác minh muộn."""
    uid = await _uid_tu_token(authorization)
    result = await auth_service.xac_minh_email_cua_toi(uid, body.otp)
    if result["status"] != "success":
        raise HTTPException(status_code=400, detail=chi_tiet_otp(result))
    return result


@router.post("/email-change/cancel", summary="Huỷ phiên đổi email")
async def email_change_cancel(authorization: str = Header(...)):
    """Gọi khi người dùng đóng hộp thoại giữa chừng hoặc sai quá số lần."""
    uid = await _uid_tu_token(authorization)
    return await auth_service.huy_phien_doi_email(uid)


@router.post("/change-email", summary="Bước 4 — mã của hộp thư mới, ghi thay đổi")
async def change_email(body: ChangeEmailRequest, authorization: str = Header(...)):
    """Bước cuối. **Từ chối** nếu phiên chưa qua bước 2 xác minh hộp thư cũ.

    Sai 3 lần → huỷ phiên, giữ nguyên email cũ. Email chỉ được ghi ở bước này nên
    không có gì phải hoàn tác.
    """
    uid = await _uid_tu_token(authorization)
    result = await auth_service.change_email(
        uid=uid, new_email=body.newEmail, otp=body.otp
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
