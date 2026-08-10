"""
Auth Service (Python)
Migrate từ: mobile/lib/services/auth_service.dart + OTP_service.dart + ChangePass.dart
Chứa toàn bộ logic: Đăng ký, Đăng nhập, Google Sign-in, Đổi mật khẩu, Xóa tài khoản, OTP.
Sử dụng Firebase Admin SDK để thay thế FirebaseAuth + Firestore trong Dart.
"""
import os
import random
from datetime import datetime, timedelta, timezone

import httpx
from app.core.firebase_admin_config import get_auth


class AuthService:
    """
    Tương đương class AuthService trong auth_service.dart.
    Toàn bộ logic giao tiếp với Firebase Auth và Firestore được chuyển vào đây.
    """

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
    async def register(self, name: str, email: str, password: str, phone: str | None = None) -> dict:
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
            }
            await self.db["users"].update_one({"_id": uid}, {"$set": user_data}, upsert=True)

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
            api_key = os.getenv("FIREBASE_WEB_API_KEY")
            if not api_key:
                return {"status": "Lỗi cấu hình server: thiếu FIREBASE_WEB_API_KEY."}

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                    json={"email": email, "password": password, "returnSecureToken": True},
                    timeout=10.0
                )

            data = resp.json()

            # Kiểm tra lỗi từ Firebase
            if "error" in data:
                code = data["error"].get("message", "")
                if code in ["EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"]:
                    return {"status": "Sai email hoặc mật khẩu."}
                if code == "EMAIL_NOT_VERIFIED":
                    return {"status": "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn."}
                return {"status": f"Lỗi đăng nhập: {code}"}

            uid = data["localId"]
            id_token = data["idToken"]

            # Kiểm tra email đã xác thực chưa (trừ admin)
            if email != "admin@edutalk.com":
                user_record = self.auth.get_user(uid)
                if not user_record.email_verified:
                    return {"status": "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn."}

            # Lấy role từ MongoDB
            user_doc = await self.db["users"].find_one({"_id": uid})
            if user_doc:
                role = user_doc.get("role", "user")
                return {"status": "success", "role": role, "uid": uid, "idToken": id_token}
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
                return {"status": "success", "role": "user", "uid": uid}
            else:
                role = user_doc.get("role", "user")
                return {"status": "success", "role": role, "uid": uid}

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
        Dùng làm middleware bảo vệ các API cần đăng nhập.
        """
        try:
            decoded = self.auth.verify_id_token(id_token)
            return decoded
        except Exception:  # noqa: BLE001
            return None

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
    async def change_password(self, uid: str, current_password: str, new_password: str) -> dict:
        """
        Đổi mật khẩu: Xác minh mật khẩu cũ trước (re-authenticate),
        sau đó cập nhật mật khẩu mới qua Firebase Admin SDK.
        """
        try:
            # Lấy email của user từ uid
            user_record = self.auth.get_user(uid)
            email = user_record.email

            # Re-authenticate: xác minh mật khẩu hiện tại qua Firebase REST API
            api_key = os.getenv("FIREBASE_WEB_API_KEY")
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                    json={"email": email, "password": current_password, "returnSecureToken": True},
                    timeout=10.0
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
    # GỬI OTP
    # Migrate từ: OTP_service.dart — sendOtp()
    # ============================================================
    async def send_otp(self, email: str) -> dict:
        """
        Sinh OTP 6 số, lưu vào Firestore với TTL 10 phút,
        và gửi email qua EmailJS API.
        """
        try:
            otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

            # Lưu OTP vào Firestore (server-side — bảo mật hơn Dart)
            self.db.collection("otp_codes").document(email).set({
                "otp": otp,
                "email": email,
                "expiresAt": expires_at,
                "createdAt": datetime.now(timezone.utc),
                "verified": False,
            })

            # Gửi email qua EmailJS
            service_id = os.getenv("EMAILJS_SERVICE_ID", "service_jz7he5o")
            template_id = os.getenv("EMAILJS_TEMPLATE_ID", "template_ntv9o9c")
            public_key = os.getenv("EMAILJS_PUBLIC_KEY", "Ezr_VkJnGkvD-1Ma0")

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.emailjs.com/api/v1.0/email/send",
                    headers={"Content-Type": "application/json", "origin": "http://localhost"},
                    json={
                        "service_id": service_id,
                        "template_id": template_id,
                        "user_id": public_key,
                        "template_params": {"to_email": email, "otp_code": otp},
                    },
                    timeout=15.0
                )

            if resp.status_code == 200:
                return {"status": "success"}
            return {"status": "error", "message": f"Gửi email thất bại ({resp.status_code})."}

        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # XÁC MINH OTP
    # Migrate từ: OTP_service.dart — verifyOtp()
    # ============================================================
    async def verify_otp(self, email: str, input_otp: str) -> dict:
        """
        Kiểm tra OTP: đúng, chưa hết hạn, chưa dùng.
        """
        try:
            doc = self.db.collection("otp_codes").document(email).get()
            if not doc.exists:
                return {"status": "error", "message": "Mã OTP không tồn tại. Vui lòng gửi lại."}

            data = doc.to_dict()
            saved_otp = data.get("otp", "")
            expires_at = data.get("expiresAt")
            already_verified = data.get("verified", False)

            if already_verified:
                return {"status": "error", "message": "Mã OTP này đã được sử dụng."}

            now = datetime.now(timezone.utc)
            if expires_at and now > expires_at.replace(tzinfo=timezone.utc) if hasattr(expires_at, 'replace') else now > expires_at:
                self.db.collection("otp_codes").document(email).delete()
                return {"status": "error", "message": "Mã OTP đã hết hạn. Vui lòng gửi lại."}

            if input_otp.strip() != saved_otp:
                return {"status": "error", "message": "Mã OTP không đúng."}

            # Đánh dấu đã dùng
            self.db.collection("otp_codes").document(email).update({"verified": True})
            return {"status": "success"}

        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # HELPER: Gửi email xác thực qua Firebase REST API
    # ============================================================
    async def _send_email_verification(self, email: str, password: str):
        """Internal: Đăng nhập tạm thời để lấy idToken rồi gửi email xác thực."""
        api_key = os.getenv("FIREBASE_WEB_API_KEY")
        if not api_key:
            return

        async with httpx.AsyncClient() as client:
            # Đăng nhập để lấy idToken
            sign_in = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                json={"email": email, "password": password, "returnSecureToken": True},
                timeout=10.0
            )
            sign_in_data = sign_in.json()
            if "idToken" not in sign_in_data:
                return

            id_token = sign_in_data["idToken"]

            # Gửi email xác thực
            await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}",
                json={"requestType": "VERIFY_EMAIL", "idToken": id_token},
                timeout=10.0
            )
