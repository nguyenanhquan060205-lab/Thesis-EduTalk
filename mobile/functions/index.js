const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

/**
 * Trigger lắng nghe trên collection 'notifications' toàn cục.
 * Gửi Push Notification (Heads-up) đến điện thoại của người nhận khi có thông báo mới.
 */
exports.onNotificationCreated = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const db = getFirestore();
    const messaging = getMessaging();
    const notificationData = event.data?.data();

    if (!notificationData) {
      console.log("Không có dữ liệu thông báo.");
      return null;
    }

    const { receiverId, senderName, type, postId } = notificationData;

    if (!receiverId) {
      console.log("Không tìm thấy receiverId.");
      return null;
    }

    try {
      // 1. Lấy FCM Token của người nhận
      const receiverDoc = await db.collection("users").doc(receiverId).get();
      if (!receiverDoc.exists) {
        console.log(`User ${receiverId} không tồn tại.`);
        return null;
      }

      const fcmToken = receiverDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.log(`User ${receiverId} không có FCM Token (thông báo hệ thống đang tắt).`);
        return null;
      }

      // 2. Xác định tiêu đề và nội dung hiển thị trên điện thoại
      let title = "Thông báo mới 🔔";
      let body = `${senderName} đã tương tác với bạn.`;

      if (type === "like") {
        title = "Thích bài viết ❤️";
        body = `${senderName} đã thích bài viết của bạn.`;
      } else if (type === "comment") {
        title = "Bình luận mới 💬";
        body = `${senderName} đã bình luận về bài viết của bạn.`;
      } else if (type === "reply") {
        title = "Phản hồi mới 💬";
        body = `${senderName} đã phản hồi bình luận của bạn.`;
      }

      // 3. Gửi thông báo đến thiết bị qua FCM
      const message = {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        data: {
          postId: postId || "",
          type: type || "",
        },
        android: {
          priority: "high",
          notification: {
            channelId: "edutalk_notifications",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      await messaging.send(message);
      console.log(`✅ Đã gửi FCM Push Notification thành công tới user: ${receiverId}`);
      return null;
    } catch (error) {
      console.error("❌ Lỗi khi gửi FCM Push Notification:", error);
      return null;
    }
  }
);

/**
 * Hàm tự động chạy khi có comment mới được tạo trong một bài viết.
 * Lưu bản sao lịch sử thông báo vào subcollection của user (giữ lại để tương thích ngược).
 */
exports.onCommentCreated = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const db = getFirestore();
    const postId = event.params.postId;
    const commentData = event.data?.data();

    if (!commentData) {
      console.log("Không có dữ liệu comment.");
      return null;
    }

    const commenterName = commentData.authorName || "Ai đó";
    const commentContent = commentData.content || "(hình ảnh)";
    const commenterId = commentData.authorId;

    try {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (!postDoc.exists) {
        console.log(`Bài viết ${postId} không tồn tại.`);
        return null;
      }

      const authorId = postDoc.data()?.authorId;

      if (!authorId || authorId === commenterId) {
        console.log("Người comment là chính tác giả hoặc không có authorId.");
        return null;
      }

      // Lưu thông báo vào subcollection Firestore (users/{authorId}/notifications) để tương thích ngược
      await db
        .collection("users")
        .doc(authorId)
        .collection("notifications")
        .add({
          title: "Có bình luận mới",
          content: `${commenterName} đã bình luận: "${commentContent.substring(0, 100)}"`,
          postId: postId,
          commenterId: commenterId,
          commenterName: commenterName,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
          type: "new_comment",
        });

      console.log(`✅ Đã lưu thông báo dự phòng vào Firestore cho user ${authorId}`);
      return null;
    } catch (error) {
      console.error("❌ Lỗi trong onCommentCreated:", error);
      return null;
    }
  }
);
