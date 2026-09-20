"""Hạ tầng gửi mã xác minh: email qua SMTP và SMS qua Twilio.

Tách khỏi nghiệp vụ đăng nhập vì đây thuần tuý là đường ống gửi tin — dùng chung
cho xác minh email lúc đăng ký lẫn luồng đổi email.
"""

import random
from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings


class OtpMixin:
    """Trộn vào `AuthService`; cần `self.db` và `self.auth` của lớp đó."""

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
        service_id = settings.EMAILJS_SERVICE_ID
        template_id = settings.EMAILJS_TEMPLATE_ID
        public_key = settings.EMAILJS_PUBLIC_KEY
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
        if not settings.SMS_API_KEY:
            if settings.SMS_DEV_MODE.lower() == "true":
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
