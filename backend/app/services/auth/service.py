"""Đăng ký, đăng nhập, xác minh token, đổi mật khẩu, xoá tài khoản.

Migrate từ: mobile/lib/services/auth_service.dart + OTP_service.dart + ChangePass.dart
Dùng Firebase Admin SDK thay cho FirebaseAuth + Firestore bên Dart.
"""

from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.firebase_admin_config import get_auth

from .email_change import EmailChangeMixin
from .otp import OtpMixin


class TokenExpired(Exception):
    """ID token Firebase đã hết hạn (chỉ sống 1 giờ) — khác hẳn token sai.

    Lỗi của MIỀN NGHIỆP VỤ, không phải lỗi HTTP: `api/deps.py` mới là nơi dịch nó
    thành 401 kèm cờ `expired` cho client biết đường xin token mới.
    """


class AuthService(OtpMixin, EmailChangeMixin):
    """Toàn bộ giao tiếp với Firebase Auth và MongoDB cho phần tài khoản."""

    def __init__(self):
        self.auth = get_auth()

    @property
    def db(self):
        from app.core.mongodb import get_db as get_mongo_db

        return get_mongo_db()

    # ============================================================
    # ĐĂNG KÝ TÀI KHOẢN
    # Tương đương: Future<Map<String, dynamic>> register(...) trong Dart
    # ============================================================
    async def register(
        self,
        name: str,
        email: str,
        password: str,
        phone: str | None = None,
        gender: str | None = None,
    ) -> dict:
        """
        Tạo tài khoản mới bằng Email/Password.
        - Tạo user trong Firebase Authentication
        - Lưu thông tin vào Firestore collection 'users'
        - Gửi email xác thực (qua Firebase REST API)
        """
        try:
            # Tạo user trong Firebase Auth
            user_record = self.auth.create_user(
                email=email,
                password=password,
                display_name=name,
            )
            uid = user_record.uid

            user_data = {
                "_id": uid,
                "name": name,
                "email": email,
                "role": "user",
                "createdAt": datetime.now(timezone.utc),
                "isPremium": False,
                "usageCount": 0,
                "isNotificationEnabled": True,
                "phone": phone,
                # Chưa nhập OTP thì chưa được coi là đã xác minh. Người dùng vẫn
                # vào được ứng dụng, chỉ bị chặn đăng bài và bình luận.
                "emailVerified": False,
                # "Nam" | "Nu" — mô hình gợi ý ngành đọc trường này
                "gender": gender if gender in ("Nam", "Nu") else None,
            }
            await self.db["users"].update_one(
                {"_id": uid}, {"$set": user_data}, upsert=True
            )

            # Gửi email xác thực qua Firebase REST API
            await self._send_email_verification(email, password)

            return {"status": "success", "uid": uid}

        except self.auth.EmailAlreadyExistsError:
            return {"status": "Email này đã được đăng ký."}
        except Exception as e:  # noqa: BLE001
            error_msg = str(e)
            if "WEAK_PASSWORD" in error_msg:
                return {"status": "Mật khẩu quá yếu. Cần ít nhất 6 ký tự."}
            return {"status": f"Lỗi hệ thống: {error_msg}"}

    # ============================================================
    # ĐĂNG NHẬP
    # Tương đương: Future<Map<String, dynamic>> login(...) trong Dart
    # ============================================================
    async def login(self, email: str, password: str) -> dict:
        """
        Đăng nhập bằng Email/Password.
        Firebase Admin SDK không hỗ trợ xác thực password trực tiếp,
        nên chúng ta dùng Firebase REST API để verify.
        """
        try:
            # Xác thực password qua Firebase Auth REST API
            api_key = settings.FIREBASE_WEB_API_KEY
            if not api_key:
                return {"status": "Lỗi cấu hình server: thiếu FIREBASE_WEB_API_KEY."}

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                    json={
                        "email": email,
                        "password": password,
                        "returnSecureToken": True,
                    },
                    timeout=10.0,
                )

            data = resp.json()

            # Kiểm tra lỗi từ Firebase
            if "error" in data:
                code = data["error"].get("message", "")
                if code == "USER_DISABLED":
                    return {
                        "status": "Tài khoản này đã bị khoá. "
                        "Vui lòng liên hệ quản trị viên để được hỗ trợ."
                    }
                if code in [
                    "EMAIL_NOT_FOUND",
                    "INVALID_PASSWORD",
                    "INVALID_LOGIN_CREDENTIALS",
                ]:
                    return {"status": "Sai email hoặc mật khẩu."}
                if code == "EMAIL_NOT_VERIFIED":
                    return {
                        "status": "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn."
                    }
                return {"status": f"Lỗi đăng nhập: {code}"}

            uid = data["localId"]
            id_token = data["idToken"]

            # KHÔNG chặn đăng nhập khi email chưa xác minh.
            # Đã chốt: người dùng vào được ứng dụng, chỉ bị khoá đăng bài và bình
            # luận (xem `yeu_cau_da_xac_minh` trong posts.py). Chặn ở đây còn tạo
            # thế bí: muốn xác minh thì cần token, mà muốn có token thì phải đăng
            # nhập được trước.

            # Lấy role từ MongoDB
            user_doc = await self.db["users"].find_one({"_id": uid})
            if user_doc:
                role = user_doc.get("role", "user")
                return {
                    "status": "success",
                    "role": role,
                    "uid": uid,
                    "idToken": id_token,
                    "emailVerified": user_doc.get("emailVerified") is not False,
                }
            else:
                return {"status": "Không tìm thấy dữ liệu người dùng."}

        except Exception as e:  # noqa: BLE001
            return {"status": f"Lỗi hệ thống: {e!s}"}

    # ============================================================
    # ĐĂNG NHẬP GOOGLE
    # Tương đương: Future<Map<String, dynamic>> signInWithGoogle() trong Dart
    # Lưu ý: Phía Client (Android/Web) xử lý flow Google Sign-in, sau đó
    # gửi idToken lên đây để Backend xác thực và lấy/tạo user data.
    # ============================================================
    async def sign_in_with_google(self, id_token: str) -> dict:
        """
        Xác thực Google ID Token từ Client và trả về role của user.
        Đây là luồng chuẩn: Client (Android/Web) tự làm Google Sign-in,
        sau đó gửi ID Token lên server để server xác nhận và lấy thêm data.
        """
        try:
            # Xác minh ID Token từ Google
            decoded_token = self.auth.verify_id_token(id_token)
            uid = decoded_token["uid"]
            name = decoded_token.get("name", "")
            email = decoded_token.get("email", "")

            # Kiểm tra xem user đã có trong MongoDB chưa
            user_doc = await self.db["users"].find_one({"_id": uid})

            if not user_doc:
                # User mới — tạo document trong MongoDB
                user_data = {
                    "_id": uid,
                    "name": name,
                    "email": email,
                    "role": "user",
                    "createdAt": datetime.now(timezone.utc),
                    "isPremium": False,
                    "usageCount": 0,
                    "isNotificationEnabled": True,
                }
                await self.db["users"].insert_one(user_data)
                # Token Google chỉ có uid/name/email/picture/email_verified — KHÔNG có
                # giới tính. Mô hình gợi ý ngành lại dùng trường này: thiếu nó thì
                # khám phá Top-5 tụt 81,8% → 78,6%, tư vấn Top-2 90,6% → 89,7% (mô hình
                # Hướng 1, tập test 2.546 dòng).
                # Báo `needsProfile` để client hỏi ngay sau lần đăng nhập đầu.
                return {
                    "status": "success",
                    "role": "user",
                    "uid": uid,
                    "needsProfile": True,
                }
            else:
                role = user_doc.get("role", "user")
                return {
                    "status": "success",
                    "role": role,
                    "uid": uid,
                    "needsProfile": user_doc.get("gender") not in ("Nam", "Nu"),
                }

        except self.auth.InvalidIdTokenError:
            return {"status": "Token Google không hợp lệ."}
        except Exception as e:  # noqa: BLE001
            return {"status": f"Lỗi hệ thống: {e!s}"}

    # ============================================================
    # XÁC THỰC TOKEN (Dùng cho các route cần bảo vệ)
    # ============================================================
    async def verify_token(self, id_token: str) -> dict | None:
        """
        Xác minh Firebase ID Token và trả về thông tin user.
        Trả `None` nếu token sai; ném `TokenHetHan` nếu token đã hết hạn.

        Token HẾT HẠN phải tách riêng khỏi token sai: ID token Firebase chỉ sống 1
        giờ nên hết hạn là chuyện thường, client chỉ cần xin token mới rồi gửi lại.
        Gộp chung thành "token không hợp lệ" thì client không biết đường nào mà lần.

        Trước đây hàm này ném thẳng `HTTPException` — tức là tầng dịch vụ tự quyết
        mã HTTP. Sai tầng: service không nên biết mình đang được gọi từ HTTP hay từ
        một script. Giờ nó ném lỗi của miền nghiệp vụ, còn `api/deps.py` dịch sang
        401 kèm `expired: True` y như cũ.
        """
        from firebase_admin import auth as fb_auth

        try:
            return self.auth.verify_id_token(id_token)
        except fb_auth.ExpiredIdTokenError:
            raise TokenExpired from None
        except Exception:  # noqa: BLE001 — chữ ký sai, sai project, token rác…
            return None

    # ============================================================
    # XÁC MINH EMAIL LÚC ĐĂNG KÝ
    # ============================================================
    async def verify_registration(self, email: str, otp: str) -> dict:
        """Nhập đúng mã thì đánh dấu hồ sơ đã xác minh.

        Sai quá số lần cho phép thì **xoá luôn tài khoản vừa tạo** (cả Firebase
        lẫn MongoDB) để người dùng đăng ký lại từ đầu, không để lại tài khoản
        treo chưa xác minh.
        """
        # Không cần token: bản thân mã OTP đã chứng minh người nhập đọc được hộp
        # thư đó. Bắt phải có token sẽ tạo thế bí — muốn xác minh cần đăng nhập,
        # mà chưa xác minh thì không nên phải đăng nhập trước.
        email = email.strip().lower()
        user_doc = await self.db["users"].find_one({"email": email})
        if not user_doc:
            return {"status": "error", "message": "Không tìm thấy tài khoản."}
        uid = user_doc["_id"]

        kt = await self.verify_otp(target=email, input_otp=otp)

        if kt.get("reset"):
            await self.delete_account(uid)
            kt["deleted"] = True
            return kt
        if kt["status"] != "success":
            return kt

        await self.db["users"].update_one(
            {"_id": uid}, {"$set": {"emailVerified": True}}
        )
        try:
            self.auth.update_user(uid, email_verified=True)
        except Exception:  # noqa: BLE001 — không chặn luồng nếu Firebase lỗi
            pass
        await self.db["otp_codes"].delete_one({"_id": email})
        return {"status": "success"}

    async def gui_ma_xac_minh_cua_toi(self, uid: str) -> dict:
        """Gửi mã xác minh tới email của CHÍNH tài khoản đang đăng nhập.

        Địa chỉ do server tra từ `uid`, không nhận từ client: phía người dùng chỉ
        có bản đã che (`co**********@gmail.com`), gửi bản đó lên thì thành địa chỉ
        rác.
        """
        nguoi = await self.db["users"].find_one({"_id": uid})
        email = (nguoi or {}).get("email")
        if not email:
            return {"status": "error", "message": "Tài khoản chưa có email."}
        if nguoi.get("emailVerified"):
            return {"status": "error", "message": "Email này đã được xác minh."}
        return await self.send_otp(target=email, channel="email")

    async def xac_minh_email_cua_toi(self, uid: str, otp: str) -> dict:
        """Xác minh email của chính mình. Cũng tra địa chỉ từ `uid`.

        Khác `verify_registration`: sai quá số lần **không xoá tài khoản**, vì
        người dùng ở đây đã đăng nhập được và chỉ đang xác minh muộn.
        """
        nguoi = await self.db["users"].find_one({"_id": uid})
        email = (nguoi or {}).get("email")
        if not email:
            return {"status": "error", "message": "Tài khoản chưa có email."}

        kt = await self.verify_otp(target=email, input_otp=otp)
        if kt["status"] != "success":
            return kt

        await self.db["users"].update_one(
            {"_id": uid}, {"$set": {"emailVerified": True}}
        )
        try:
            self.auth.update_user(uid, email_verified=True)
        except Exception:  # noqa: BLE001 — không chặn luồng nếu Firebase lỗi
            pass
        await self.db["otp_codes"].delete_one({"_id": email})
        return {"status": "success"}

    # ============================================================
    # XÓA TÀI KHOẢN
    # Tương đương: Future<Map<String, dynamic>> deleteAccount() trong Dart
    # ============================================================
    async def delete_account(self, uid: str) -> dict:
        """
        Xóa hoàn toàn tài khoản: lịch sử dự đoán + user doc + Firebase Auth.
        """
        try:
            # Xóa lịch sử dự đoán
            await self.db["prediction_history"].delete_many({"user_id": uid})

            # Xóa user document trong MongoDB
            await self.db["users"].delete_one({"_id": uid})

            # Xóa tài khoản trong Firebase Authentication
            self.auth.delete_user(uid)

            return {"status": "success"}

        except self.auth.UserNotFoundError:
            return {"status": "error", "message": "Không tìm thấy người dùng."}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # GỬI LẠI EMAIL XÁC THỰC
    # Tương đương: Future<void> resendVerificationEmail(...) trong Dart
    # ============================================================
    async def resend_verification_email(self, email: str, password: str) -> dict:
        """Gửi lại email xác thực tài khoản."""
        try:
            await self._send_email_verification(email, password)
            return {"status": "success"}
        except Exception as e:  # noqa: BLE001
            return {"status": f"Lỗi: {e!s}"}

    # ============================================================
    # ĐỔI MẬT KHẨU
    # Migrate từ: ChangePass.dart — _handleChangePassword()
    # ============================================================
    async def change_password(
        self, uid: str, current_password: str, new_password: str
    ) -> dict:
        """
        Đổi mật khẩu: Xác minh mật khẩu cũ trước (re-authenticate),
        sau đó cập nhật mật khẩu mới qua Firebase Admin SDK.
        """
        try:
            # Lấy email của user từ uid
            user_record = self.auth.get_user(uid)
            email = user_record.email

            # Re-authenticate: xác minh mật khẩu hiện tại qua Firebase REST API
            api_key = settings.FIREBASE_WEB_API_KEY
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                    json={
                        "email": email,
                        "password": current_password,
                        "returnSecureToken": True,
                    },
                    timeout=10.0,
                )
            data = resp.json()
            if "error" in data:
                return {"status": "error", "message": "Mật khẩu hiện tại không đúng."}

            # Cập nhật mật khẩu mới
            self.auth.update_user(uid, password=new_password)
            return {"status": "success"}

        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # HELPER: Gửi email xác thực qua Firebase REST API
    # ============================================================
    async def _send_email_verification(self, email: str, password: str):
        """Internal: Đăng nhập tạm thời để lấy idToken rồi gửi email xác thực."""
        api_key = settings.FIREBASE_WEB_API_KEY
        if not api_key:
            return

        async with httpx.AsyncClient() as client:
            # Đăng nhập để lấy idToken
            sign_in = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                json={"email": email, "password": password, "returnSecureToken": True},
                timeout=10.0,
            )
            sign_in_data = sign_in.json()
            if "idToken" not in sign_in_data:
                return

            id_token = sign_in_data["idToken"]

            # Gửi email xác thực
            await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}",
                json={"requestType": "VERIFY_EMAIL", "idToken": id_token},
                timeout=10.0,
            )
