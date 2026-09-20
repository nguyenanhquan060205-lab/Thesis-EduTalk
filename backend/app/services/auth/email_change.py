"""Luồng đổi email 4 bước: xin mã ở email cũ → xác minh → đặt email mới → xác minh.

Dài nhất trong AuthService (~220 dòng) và hoàn toàn độc lập với đăng nhập, nên ở
riêng một file.
"""

from datetime import datetime, timezone


class EmailChangeMixin:
    """Trộn vào `AuthService`; dùng lại phần gửi OTP của `OtpMixin`."""

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
