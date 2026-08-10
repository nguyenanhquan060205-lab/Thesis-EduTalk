"""
Post Service (Python)
Migrate từ: mobile/lib/services/post_service.dart
Xử lý CRUD bài viết, comment, like, report và notification.
"""

import os
from datetime import datetime, timezone

import cloudinary
import cloudinary.uploader
from app.core.mongodb import get_db
from bson import ObjectId


class PostService:
    """
    Tương đương class PostService trong post_service.dart.
    Sử dụng MongoDB thay cho Firestore.
    """

    def __init__(self):
        # Cấu hình Cloudinary
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "edutalk-app"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        )

    @property
    def db(self):
        return get_db()

    # ============================================================
    # UPLOAD ẢNH
    # ============================================================
    async def upload_post_image(self, file_bytes: bytes, filename: str) -> str | None:
        """Upload ảnh lên Cloudinary và trả về secure_url."""
        try:
            result = cloudinary.uploader.upload(
                file_bytes,
                upload_preset="edutalk_posts",
                public_id=f"posts/{filename}",
            )
            return result.get("secure_url")
        except Exception as e:  # noqa: BLE001
            print(f"Lỗi upload Cloudinary: {e}")
            return None

    # ============================================================
    # LẤY DANH SÁCH BÀI VIẾT
    # ============================================================
    async def get_posts(self, limit: int = 20) -> list[dict]:
        """Lấy danh sách bài viết chưa bị pending (không bị báo cáo nhiều)."""
        try:
            cursor = (
                self.db["posts"]
                .find({"isPending": False})
                .sort("createdAt", -1)
                .limit(limit)
            )
            posts = []
            async for doc in cursor:
                doc["id"] = str(doc.pop("_id"))
                if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
                    doc["createdAt"] = doc["createdAt"].isoformat()
                posts.append(doc)
            return posts
        except Exception as e:  # noqa: BLE001
            print(f"Lỗi get_posts: {e}")
            return []

    # ============================================================
    # TẠO BÀI VIẾT
    # ============================================================
    async def create_post(self, post_data: dict) -> str:
        """Tạo bài viết mới, trả về ID của bài viết."""
        post_data["createdAt"] = datetime.now(timezone.utc)
        post_data["isPending"] = False
        post_data["reportCount"] = 0
        post_data["reportedBy"] = []
        post_data["upvotedBy"] = []
        post_data["interactionCount"] = 0
        post_data["commentCount"] = 0

        result = await self.db["posts"].insert_one(post_data)
        return str(result.inserted_id)

    # ============================================================
    # SỬA BÀI VIẾT
    # ============================================================
    async def edit_post(self, post_id: str, new_content: str, author_id: str) -> dict:
        """Cập nhật nội dung bài viết (chỉ tác giả mới được sửa)."""
        try:
            post_doc = await self.db["posts"].find_one({"_id": ObjectId(post_id)})
            if not post_doc:
                return {"status": "error", "message": "Bài viết không tồn tại."}
            if post_doc.get("authorId") != author_id:
                return {
                    "status": "error",
                    "message": "Không có quyền sửa bài viết này.",
                }

            await self.db["posts"].update_one(
                {"_id": ObjectId(post_id)}, {"$set": {"content": new_content}}
            )
            return {"status": "success"}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # XÓA BÀI VIẾT
    # ============================================================
    async def delete_post(self, post_id: str, author_id: str) -> dict:
        """Xóa bài viết (chỉ tác giả hoặc admin mới được xóa)."""
        try:
            post_doc = await self.db["posts"].find_one({"_id": ObjectId(post_id)})
            if not post_doc:
                return {"status": "error", "message": "Bài viết không tồn tại."}

            # Cho phép tác giả hoặc admin xóa
            user_doc = await self.db["users"].find_one({"_id": author_id})
            user_role = user_doc.get("role", "user") if user_doc else "user"

            if post_doc.get("authorId") != author_id and user_role != "admin":
                return {
                    "status": "error",
                    "message": "Không có quyền xóa bài viết này.",
                }

            await self.db["posts"].delete_one({"_id": ObjectId(post_id)})
            # Xóa các bình luận liên quan (tuỳ chọn, nhưng khuyến nghị)
            await self.db["comments"].delete_many({"postId": post_id})
            return {"status": "success"}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # BÁO CÁO BÀI VIẾT
    # ============================================================
    async def report_post(self, post_id: str, uid: str) -> str:
        """Báo cáo bài viết. Nếu >= 5 báo cáo thì chuyển sang pending."""
        try:
            post_doc = await self.db["posts"].find_one({"_id": ObjectId(post_id)})
            if not post_doc:
                return "not_found"

            reported_by = post_doc.get("reportedBy", [])
            if uid in reported_by:
                return "already_reported"

            new_report_count = post_doc.get("reportCount", 0) + 1
            is_pending = new_report_count >= 5

            await self.db["posts"].update_one(
                {"_id": ObjectId(post_id)},
                {
                    "$addToSet": {"reportedBy": uid},
                    "$set": {"reportCount": new_report_count, "isPending": is_pending},
                },
            )

            # Tạo thông báo cho admin
            await self.db["admin_notifications"].insert_one(
                {
                    "type": "post_report",
                    "postId": post_id,
                    "reportCount": new_report_count,
                    "createdAt": datetime.now(timezone.utc),
                    "status": "unread",
                    "message": "Một bài viết trong cộng đồng vừa bị báo cáo!",
                }
            )
            return "success"
        except Exception as e:  # noqa: BLE001
            print(f"Error report_post: {e}")
            return "error"

    # ============================================================
    # LIKE / UNLIKE BÀI VIẾT
    # ============================================================
    async def upvote_post(self, post_id: str, uid: str) -> dict:
        """Toggle like/unlike bài viết và gửi thông báo cho chủ bài."""
        try:
            post_doc = await self.db["posts"].find_one({"_id": ObjectId(post_id)})
            if not post_doc:
                return {"status": "error", "message": "not_found"}

            upvoted_by = post_doc.get("upvotedBy", [])
            post_owner_id = post_doc.get("authorId")

            if uid in upvoted_by:
                # Unlike
                await self.db["posts"].update_one(
                    {"_id": ObjectId(post_id)},
                    {"$pull": {"upvotedBy": uid}, "$inc": {"interactionCount": -1}},
                )
                is_upvoting = False
            else:
                # Like
                await self.db["posts"].update_one(
                    {"_id": ObjectId(post_id)},
                    {"$addToSet": {"upvotedBy": uid}, "$inc": {"interactionCount": 1}},
                )
                is_upvoting = True

            # Gửi thông báo nếu like (không phải unlike) và không tự like bài mình
            if is_upvoting and post_owner_id and post_owner_id != uid:
                await self._send_notification(
                    receiver_id=post_owner_id,
                    sender_id=uid,
                    notif_type="like",
                    post_id=post_id,
                )

            return {
                "status": "success",
                "action": "liked" if is_upvoting else "unliked",
            }
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # THÊM BÌNH LUẬN
    # ============================================================
    async def add_comment(
        self, post_id: str, comment_data: dict, author_id: str
    ) -> dict:
        """Thêm bình luận vào bài viết và gửi thông báo."""
        try:
            comment_data["postId"] = post_id
            comment_data["createdAt"] = datetime.now(timezone.utc)
            comment_data["authorId"] = author_id
            comment_data["upvotedBy"] = []
            comment_data["interactionCount"] = 0

            # Lưu vào collection comments riêng biệt
            result = await self.db["comments"].insert_one(comment_data)
            comment_id = str(result.inserted_id)

            # Cập nhật số lượng comment trong post
            await self.db["posts"].update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"interactionCount": 1, "commentCount": 1}},
            )

            # Gửi thông báo
            parent_id = comment_data.get("parentId")
            if parent_id:
                # Reply một comment khác
                parent_doc = await self.db["comments"].find_one(
                    {"_id": ObjectId(parent_id)}
                )
                if parent_doc:
                    parent_author = parent_doc.get("authorId")
                    if parent_author:
                        await self._send_notification(
                            receiver_id=parent_author,
                            sender_id=author_id,
                            notif_type="reply",
                            post_id=post_id,
                        )
            else:
                # Comment trực tiếp vào bài viết
                post_doc = await self.db["posts"].find_one({"_id": ObjectId(post_id)})
                if post_doc:
                    post_owner = post_doc.get("authorId")
                    if post_owner:
                        await self._send_notification(
                            receiver_id=post_owner,
                            sender_id=author_id,
                            notif_type="comment",
                            post_id=post_id,
                        )

            return {"status": "success", "commentId": comment_id}
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": str(e)}

    # ============================================================
    # LẤY DANH SÁCH BÌNH LUẬN
    # ============================================================
    async def get_comments(self, post_id: str) -> list[dict]:
        """Lấy danh sách bình luận của một bài viết."""
        try:
            cursor = self.db["comments"].find({"postId": post_id}).sort("createdAt", -1)
            comments = []
            async for doc in cursor:
                doc["id"] = str(doc.pop("_id"))
                if "createdAt" in doc and isinstance(doc["createdAt"], datetime):
                    doc["createdAt"] = doc["createdAt"].isoformat()
                comments.append(doc)
            return comments
        except Exception as e:  # noqa: BLE001
            print(f"Lỗi get_comments: {e}")
            return []

    # ============================================================
    # HELPER: Gửi thông báo
    # ============================================================
    async def _send_notification(
        self, receiver_id: str, sender_id: str, notif_type: str, post_id: str
    ):
        """Gửi thông báo vào MongoDB collection 'notifications'."""
        if receiver_id == sender_id:
            return  # Không tự gửi thông báo cho chính mình

        # Kiểm tra người nhận có bật thông báo không
        receiver_doc = await self.db["users"].find_one({"_id": receiver_id})
        if receiver_doc:
            is_enabled = receiver_doc.get("isNotificationEnabled", True)
            if not is_enabled:
                return

        # Lấy tên người gửi
        sender_doc = await self.db["users"].find_one({"_id": sender_id})
        sender_name = "Thành viên EduTalk"
        if sender_doc:
            sender_name = sender_doc.get("name", sender_name)

        await self.db["notifications"].insert_one(
            {
                "receiverId": receiver_id,
                "senderId": sender_id,
                "senderName": sender_name,
                "type": notif_type,
                "postId": post_id,
                "isRead": False,
                "createdAt": datetime.now(timezone.utc),
            }
        )
