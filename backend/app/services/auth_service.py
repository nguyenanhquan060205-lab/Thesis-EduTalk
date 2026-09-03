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
            api_key = os.getenv("FIREBASE_WEB_API_KEY")
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
                # Top-3 tụt từ 41,2% xuống 37,3% (đo trên 102 sinh viên thật).
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
        Dùng làm middleware bảo vệ các API cần đăng nhập.
        """
        try:
            decoded = self.auth.verify_id_token(id_token)
            return decoded
        except Exception:  # noqa: BLE001
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
            api_key = os.getenv("FIREBASE_WEB_API_KEY")
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
    # GỬI OTP
    # Migrate từ: OTP_service.dart — sendOtp()
    # ============================================================
    # Mã có hiệu lực 90 giây; sai quá 3 lần thì huỷ mã và bắt làm lại từ đầu.
    OTP_SONG_GIAY = 90
    OTP_TOI_DA_SAI = 3

    async def send_otp(self, target: str, channel: str = "email") -> dict:
        """Sinh mã 6 số, lưu vào MongoDB và gửi tới `target`.

        `channel` = "email" (qua EmailJS) hoặc "sms" (qua nhà cung cấp SMS).
        Gửi lại sẽ ghi đè mã cũ, nên mã cũ mất hiệu lực ngay lập tức.
        """
        target = target.strip().lower()
        try:
            # Chặn bấm "gửi lại" dồn dập. Chỉ cho gửi mã mới sau khi mã cũ hết hạn,
            # đúng như giao diện (nút gửi lại chỉ bật khi đồng hồ về 0).
            cu = await self.db["otp_codes"].find_one({"_id": target})
            if cu and (het := cu.get("expiresAt")):
                if het.tzinfo is None:
                    het = het.replace(tzinfo=timezone.utc)
                con = (het - datetime.now(timezone.utc)).total_seconds()
                if con > 0:
                    return {
                        "status": "error",
                        "message": f"Mã trước còn hiệu lực, thử lại sau {int(con) + 1} giây.",
                        "retryAfter": int(con) + 1,
                    }

            otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
            het_han = datetime.now(timezone.utc) + timedelta(
                seconds=self.OTP_SONG_GIAY
            )

            await self.db["otp_codes"].update_one(
                {"_id": target},
                {
                    "$set": {
                        "otp": otp,
                        "target": target,
                        "channel": channel,
                        "expiresAt": het_han,
                        "createdAt": datetime.now(timezone.utc),
                        "verified": False,
                        "attempts": 0,
                    }
                },
                upsert=True,
            )

            gui = (
                await self._gui_otp_sms(target, otp)
                if channel == "sms"
                else await self._gui_otp_email(target, otp)
            )
            if gui["status"] != "success":
                return gui

            return {"status": "success", "expiresIn": self.OTP_SONG_GIAY}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    async def _gui_otp_email(self, email: str, otp: str) -> dict:
        service_id = os.getenv("EMAILJS_SERVICE_ID", "service_jz7he5o")
        template_id = os.getenv("EMAILJS_TEMPLATE_ID", "template_ntv9o9c")
        public_key = os.getenv("EMAILJS_PUBLIC_KEY", "Ezr_VkJnGkvD-1Ma0")
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.emailjs.com/api/v1.0/email/send",
                    headers={
                        "Content-Type": "application/json",
                        "origin": "http://localhost",
                    },
                    json={
                        "service_id": service_id,
                        "template_id": template_id,
                        "user_id": public_key,
                        "template_params": {"to_email": email, "otp_code": otp},
                    },
                    timeout=15.0,
                )
            if resp.status_code == 200:
                return {"status": "success"}
            return {
                "status": "error",
                "message": f"Gửi email thất bại ({resp.status_code}).",
            }
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Không gửi được email: {e!s}"}

    async def _gui_otp_sms(self, phone: str, otp: str) -> dict:
        """Gửi OTP qua SMS.

        ⚠️ CHƯA CẮM NHÀ CUNG CẤP SMS. Dự án hiện chỉ có EMAILJS trong `.env`,
        không có Twilio/eSMS/Stringee nào. Muốn chạy thật thì đặt các biến
        SMS_API_URL / SMS_API_KEY / SMS_BRANDNAME rồi hiện thực lời gọi HTTP ở đây.

        Khi chưa cấu hình:
        - `SMS_DEV_MODE=true` → in mã ra log server để tự kiểm thử (CHỈ dùng khi dev)
        - ngược lại → báo lỗi rõ ràng thay vì im lặng coi như đã gửi
        """
        if not os.getenv("SMS_API_KEY"):
            if os.getenv("SMS_DEV_MODE", "").lower() == "true":
                print(f"[SMS-DEV] Mã OTP gửi tới {phone}: {otp}")
                return {"status": "success"}
            return {
                "status": "error",
                "message": "Hệ thống chưa cấu hình dịch vụ gửi SMS. "
                "Vui lòng liên hệ quản trị viên.",
            }
        return {
            "status": "error",
            "message": "Chưa hiện thực lời gọi tới nhà cung cấp SMS.",
        }

    # ============================================================
    # XÁC MINH OTP
    # ============================================================
    async def verify_otp(self, target: str, input_otp: str) -> dict:
        """Kiểm tra mã: đúng, còn hạn, chưa dùng, chưa sai quá số lần cho phép.

        Trả về `reset=True` khi đã sai đủ `OTP_TOI_DA_SAI` lần — lúc đó mã bị xoá
        và phía gọi phải bắt người dùng làm lại từ đầu.
        """
        target = target.strip().lower()
        try:
            doc = await self.db["otp_codes"].find_one({"_id": target})
            if not doc:
                return {
                    "status": "error",
                    "message": "Mã không tồn tại hoặc đã hết hiệu lực. Hãy gửi lại mã.",
                    "reset": True,
                }

            if doc.get("verified", False):
                return {"status": "error", "message": "Mã này đã được sử dụng."}

            het_han = doc.get("expiresAt")
            if het_han is not None:
                if het_han.tzinfo is None:
                    het_han = het_han.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > het_han:
                    await self.db["otp_codes"].delete_one({"_id": target})
                    return {
                        "status": "error",
                        "message": "Mã đã hết hạn. Hãy bấm gửi lại mã.",
                        "expired": True,
                    }

            if input_otp.strip() != doc.get("otp", ""):
                so_sai = doc.get("attempts", 0) + 1
                con_lai = self.OTP_TOI_DA_SAI - so_sai
                if con_lai <= 0:
                    await self.db["otp_codes"].delete_one({"_id": target})
                    return {
                        "status": "error",
                        "message": f"Bạn đã nhập sai {self.OTP_TOI_DA_SAI} lần. "
                        "Phiên xác thực bị huỷ, vui lòng làm lại từ đầu.",
                        "reset": True,
                    }
                await self.db["otp_codes"].update_one(
                    {"_id": target}, {"$set": {"attempts": so_sai}}
                )
                return {
                    "status": "error",
                    "message": f"Mã không đúng. Còn {con_lai} lần thử.",
                    "attemptsLeft": con_lai,
                }

            await self.db["otp_codes"].update_one(
                {"_id": target}, {"$set": {"verified": True}}
            )
            return {"status": "success"}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # ĐỔI EMAIL — hai chặng: xác minh hộp thư CŨ rồi mới tới hộp thư MỚI
    # ============================================================
    #
    #   Chặng 0  gõ đúng email hiện tại  (tối đa 3 lần)
    #   Chặng 1  OTP về email CŨ         (90 giây, tối đa 3 lần)
    #   Chặng 2  OTP về email MỚI        (90 giây, tối đa 3 lần)
    #   → cập nhật
    #
    # Trạng thái nằm ở MongoDB chứ không phải ở React: chỉ dựng máy trạng thái
    # phía giao diện thì ai có phiên đăng nhập vẫn gọi thẳng change_email() là bỏ
    # qua được chặng 1.
    PHIEN_DOI_EMAIL_PHUT = 15
    DOI_EMAIL_TOI_DA_SAI_EMAIL_CU = 3

    async def _lay_phien_doi_email(self, uid: str) -> dict | None:
        """Trả phiên còn hạn, tự dọn phiên đã quá hạn."""
        phien = await self.db["email_change_sessions"].find_one({"_id": uid})
        if not phien:
            return None
        tao = phien.get("taoLuc")
        if tao is not None:
            if tao.tzinfo is None:
                tao = tao.replace(tzinfo=timezone.utc)
            song = (datetime.now(timezone.utc) - tao).total_seconds()
            if song > self.PHIEN_DOI_EMAIL_PHUT * 60:
                await self.huy_phien_doi_email(uid)
                return None
        return phien

    async def huy_phien_doi_email(self, uid: str) -> dict:
        """Xoá phiên và mọi mã OTP còn treo của nó."""
        phien = await self.db["email_change_sessions"].find_one({"_id": uid})
        if phien:
            for khoa in ("emailCu", "emailMoi"):
                if dia_chi := phien.get(khoa):
                    await self.db["otp_codes"].delete_one({"_id": dia_chi})
            await self.db["email_change_sessions"].delete_one({"_id": uid})
        return {"status": "success"}

    async def bat_dau_doi_email(self, uid: str, email_hien_tai: str) -> dict:
        """Chặng 0 + 1: đối chiếu email người dùng gõ rồi gửi OTP về hộp thư CŨ.

        Bắt gõ lại địa chỉ hiện tại vì phía người dùng chỉ nhìn thấy bản đã che.
        Phải giới hạn số lần: không thì chính bước này thành công cụ dò ngược
        phần bị che, cứ gõ thử tới khi server trả "đúng".
        """
        nguoi = await self.db["users"].find_one({"_id": uid})
        if not nguoi:
            return {"status": "error", "message": "Không tìm thấy tài khoản."}

        that = (nguoi.get("email") or "").strip().lower()
        go = email_hien_tai.strip().lower()

        phien = await self._lay_phien_doi_email(uid)
        so_sai = (phien or {}).get("saiEmailCu", 0)

        if go != that:
            so_sai += 1
            con_lai = self.DOI_EMAIL_TOI_DA_SAI_EMAIL_CU - so_sai
            if con_lai <= 0:
                await self.huy_phien_doi_email(uid)
                return {
                    "status": "error",
                    "message": (
                        f"Bạn đã nhập sai email hiện tại {self.DOI_EMAIL_TOI_DA_SAI_EMAIL_CU} "
                        "lần. Phiên đổi email bị huỷ, vui lòng bắt đầu lại."
                    ),
                    "reset": True,
                }
            await self.db["email_change_sessions"].update_one(
                {"_id": uid},
                {
                    "$set": {"saiEmailCu": so_sai, "emailCu": that, "buoc": "cho_xac_minh_cu"},
                    "$setOnInsert": {"taoLuc": datetime.now(timezone.utc)},
                },
                upsert=True,
            )
            return {
                "status": "error",
                "message": f"Email hiện tại không đúng. Còn {con_lai} lần thử.",
                "attemptsLeft": con_lai,
            }

        gui = await self.send_otp(target=that, channel="email")
        if gui["status"] != "success":
            return gui

        await self.db["email_change_sessions"].update_one(
            {"_id": uid},
            {
                "$set": {
                    "emailCu": that,
                    "buoc": "cho_xac_minh_cu",
                    "saiEmailCu": 0,
                    "taoLuc": datetime.now(timezone.utc),
                },
                "$unset": {"emailMoi": "", "cuXongLuc": ""},
            },
            upsert=True,
        )
        return {"status": "success", "expiresIn": self.OTP_SONG_GIAY}

    async def xac_minh_email_cu(self, uid: str, otp: str) -> dict:
        """Chặng 1: kiểm mã gửi về hộp thư cũ. Sai 3 lần thì huỷ cả phiên."""
        phien = await self._lay_phien_doi_email(uid)
        if not phien or phien.get("buoc") != "cho_xac_minh_cu":
            return {
                "status": "error",
                "message": "Phiên đổi email đã hết hạn. Hãy bắt đầu lại.",
                "reset": True,
            }

        kt = await self.verify_otp(target=phien["emailCu"], input_otp=otp)
        if kt["status"] != "success":
            if kt.get("reset"):
                await self.huy_phien_doi_email(uid)
            return kt

        await self.db["email_change_sessions"].update_one(
            {"_id": uid},
            {
                "$set": {
                    "buoc": "da_xac_minh_cu",
                    "cuXongLuc": datetime.now(timezone.utc),
                }
            },
        )
        await self.db["otp_codes"].delete_one({"_id": phien["emailCu"]})
        return {"status": "success"}

    async def dat_email_moi(self, uid: str, new_email: str) -> dict:
        """Chặng 2: nhận địa chỉ mới rồi gửi OTP tới chính địa chỉ đó."""
        phien = await self._lay_phien_doi_email(uid)
        if not phien or phien.get("buoc") != "da_xac_minh_cu":
            return {
                "status": "error",
                "message": "Bạn cần xác minh email hiện tại trước.",
                "reset": True,
            }

        moi = new_email.strip().lower()
        if moi == phien["emailCu"]:
            return {
                "status": "error",
                "message": "Email mới trùng với email hiện tại.",
            }

        trung = await self.db["users"].find_one({"email": moi, "_id": {"$ne": uid}})
        if trung:
            return {
                "status": "error",
                "message": "Email này đã có tài khoản khác sử dụng.",
            }

        gui = await self.send_otp(target=moi, channel="email")
        if gui["status"] != "success":
            return gui

        await self.db["email_change_sessions"].update_one(
            {"_id": uid}, {"$set": {"emailMoi": moi}}
        )
        return {"status": "success", "expiresIn": self.OTP_SONG_GIAY}

    async def change_email(self, uid: str, new_email: str, otp: str) -> dict:
        """Chặng cuối: kiểm mã gửi về hộp thư MỚI rồi mới ghi thay đổi.

        Chỉ chạy khi phiên đã qua chặng 1. Sai 3 lần ở đây thì huỷ phiên và giữ
        nguyên email cũ — email chỉ được ghi ở bước cuối này nên không cần thao
        tác hoàn tác nào.
        """
        phien = await self._lay_phien_doi_email(uid)
        if not phien or phien.get("buoc") != "da_xac_minh_cu":
            return {
                "status": "error",
                "message": "Bạn cần xác minh email hiện tại trước.",
                "reset": True,
            }

        moi = new_email.strip().lower()
        if moi != phien.get("emailMoi"):
            return {
                "status": "error",
                "message": "Địa chỉ không khớp với email đã gửi mã. Hãy bắt đầu lại.",
                "reset": True,
            }

        # Email có thể đã đổi ở nơi khác kể từ lúc mở phiên
        nguoi = await self.db["users"].find_one({"_id": uid})
        if (nguoi or {}).get("email", "").strip().lower() != phien["emailCu"]:
            await self.huy_phien_doi_email(uid)
            return {
                "status": "error",
                "message": "Email tài khoản vừa thay đổi. Hãy bắt đầu lại.",
                "reset": True,
            }

        trung = await self.db["users"].find_one({"email": moi, "_id": {"$ne": uid}})
        if trung:
            return {
                "status": "error",
                "message": "Email này đã có tài khoản khác sử dụng.",
            }

        kt = await self.verify_otp(target=moi, input_otp=otp)
        if kt["status"] != "success":
            if kt.get("reset"):
                await self.huy_phien_doi_email(uid)
            return kt

        try:
            self.auth.update_user(uid, email=moi, email_verified=True)
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Không đổi được email: {e!s}"}

        await self.db["users"].update_one(
            {"_id": uid}, {"$set": {"email": moi, "emailVerified": True}}
        )
        await self.huy_phien_doi_email(uid)
        return {"status": "success", "email": moi}

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
