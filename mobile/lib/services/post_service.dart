import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../models/post_model.dart';

class PostService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  

  // 1. Hàm Upload ảnh lên Cloudinary
  Future<String?> uploadPostImage(File imageFile) async {
    try {
      const cloudName = "edutalk-app"; 
      const uploadPreset = "edutalk_posts";  
      
      final url = Uri.parse("https://api.cloudinary.com/v1_1/$cloudName/image/upload");
      final request = http.MultipartRequest('POST', url)
        ..fields['upload_preset'] = uploadPreset
        ..files.add(await http.MultipartFile.fromPath('file', imageFile.path));

      final response = await request.send();
      
      if (response.statusCode == 200) {
        final responseData = await response.stream.bytesToString();
        final jsonMap = jsonDecode(responseData);
        return jsonMap['secure_url']; // Trả về link xịn
      } else {
        debugPrint("Lỗi upload Cloudinary: ${response.statusCode}");
        return null;
      }
    } catch (e) {
      debugPrint("Lỗi khi đẩy ảnh qua Service: $e");
      return null;
    }
  }

  // 2. Hàm đẩy bài viết lên Cloud
  Future<void> createPost(PostModel post) async {
    try {
      await _db.collection('posts').add(post.toMap());
    } catch (e) {
      debugPrint("Lỗi PostService (createPost): $e");
      rethrow; 
    }
  }

  // 3. Hàm lấy bài viết chung 
  Stream<List<PostModel>> getPostsStream() {
    return _db
        .collection('posts')
        .where('isPending', isEqualTo: false) 
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => PostModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // 4. Hàm lấy bài viết của chính mình
  Stream<List<PostModel>> getMyPostsStream(String uid) {
    return _db
        .collection('posts')
        .where('authorId', isEqualTo: uid) 
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => PostModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // 5. Hàm Gắn cờ (Report) - CÓ CHECK TRÙNG UID
  Future<String> reportPost(String postId, String uid) async {
    DocumentReference postRef = _db.collection('posts').doc(postId);
    String result = "success";

    await _db.runTransaction((transaction) async {
      DocumentSnapshot snapshot = await transaction.get(postRef);
      if (!snapshot.exists) return;

      List<dynamic> reportedBy = snapshot.get('reportedBy') ?? [];
      if (reportedBy.contains(uid)) {
        result = "already_reported"; 
        return; 
      }

      int currentReports = snapshot.get('reportCount') ?? 0;
      int newReportCount = currentReports + 1;

      transaction.update(postRef, {
        'reportedBy': FieldValue.arrayUnion([uid]),
        'reportCount': newReportCount,
        'isPending': newReportCount >= 5,
      });

      DocumentReference notifRef = _db.collection('admin_notifications').doc();
      transaction.set(notifRef, {
        'type': 'post_report',
        'postId': postId,
        'reportCount': newReportCount,
        'createdAt': FieldValue.serverTimestamp(),
        'status': 'unread',
        'message': 'Một bài viết trong cộng đồng vừa bị báo cáo!',
      });
    });
    return result;
  }

  // 6. Hàm Tương tác (Upvote) - Hoạt động như công tắc (Toggle)
  Future<void> upvotePost(String postId, String uid) async {
    DocumentReference postRef = _db.collection('posts').doc(postId);

    try {
      bool isUpvoting = false; // Biến cờ để check xem là Like hay Hủy Like
      String? postOwnerId;

      await _db.runTransaction((transaction) async {
        DocumentSnapshot snapshot = await transaction.get(postRef);
        if (!snapshot.exists) return;

        // Lấy danh sách người đã upvote và điểm tương tác
        List<dynamic> upvotedBy = snapshot.get('upvotedBy') ?? [];
        int currentCount = snapshot.get('interactionCount') ?? 0;
        
        // Lấy ID của chủ bài viết 
        final data = snapshot.data() as Map<String, dynamic>?;
        postOwnerId = data?['authorId'];

        if (upvotedBy.contains(uid)) {
          // HỦY VOTE
          transaction.update(postRef, {
            'upvotedBy': FieldValue.arrayRemove([uid]),
            'interactionCount': currentCount - 1
          });
          isUpvoting = false; 
        } else {
          // VOTE
          transaction.update(postRef, {
            'upvotedBy': FieldValue.arrayUnion([uid]),
            'interactionCount': currentCount + 1
          });
          isUpvoting = true; 
        }
      });

      // ==========================================
      // BƯỚC 3: BẮN THÔNG BÁO CHO CHỦ BÀI VIẾT
      // ==========================================
      // Chỉ gửi thông báo khi: Đang LIKE (không phải Hủy) + Có chủ bài + Khác người Like
      if (isUpvoting && postOwnerId != null && postOwnerId != uid) {
        await sendNotification(
          receiverId: postOwnerId!,
          type: 'like',
          postId: postId,
        );
      }
      
    } catch (e) {
      debugPrint("Lỗi upvotePost: $e");
    }
  }

  // 7. Hàm Xóa bài viết 
  Future<void> deletePost(String postId) async {
    try {
      await _db.collection('posts').doc(postId).delete();
    } catch (e) {
      debugPrint("Lỗi Xóa bài: $e");
      rethrow;
    }
  }

  // 8. Hàm Sửa bài viết
  Future<void> editPost(String postId, String newContent) async {
    try {
      await _db.collection('posts').doc(postId).update({
        'content': newContent,
      });
    } catch (e) {
      debugPrint("Lỗi Sửa bài: $e");
      rethrow;
    }
  }

  // 9. Hàm Thêm bình luận (Comment)
  Future<void> addComment(String postId, CommentModel comment) async {
    // Lấy ID người dùng hiện tại trước khi xử lý
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;
    if (currentUserId == null) return; // Nếu chưa đăng nhập thì dừng luôn

    DocumentReference postRef = _db.collection('posts').doc(postId);
    DocumentReference newCommentRef = postRef.collection('comments').doc();

    try {
      await _db.runTransaction((transaction) async {
        // 1. Lưu bình luận
        transaction.set(newCommentRef, comment.toMap());
        
        // 2. Tăng 2 điểm interaction và 1 điểm commentCount cho bài viết
        transaction.update(postRef, {
          'interactionCount': FieldValue.increment(1),
          'commentCount': FieldValue.increment(1),
        });
      });

      if (comment.parentId != null) {
        // TRƯỜNG HỢP 1: BÌNH LUẬN NÀY LÀ TRẢ LỜI MỘT BÌNH LUẬN KHÁC (REPLY)
        final parentCommentDoc = await postRef.collection('comments').doc(comment.parentId).get();
        if (parentCommentDoc.exists) {
          final parentAuthorId = parentCommentDoc.data()?['authorId'];
          if (parentAuthorId != null) {
            await sendNotification(
              receiverId: parentAuthorId,
              type: 'reply',
              postId: postId,
            );
          }
        }
      } else {
        // TRƯỜNG HỢP 2: BÌNH LUẬN TRỰC TIẾP VÀO BÀI VIẾT (COMMENT)
        final postDoc = await postRef.get();
        if (postDoc.exists) {
          final postOwnerId = (postDoc.data() as Map<String, dynamic>?)?['authorId'];
          if (postOwnerId != null) {
            await sendNotification(
              receiverId: postOwnerId,
              type: 'comment',
              postId: postId,
            );
          }
        }
      }

    } catch (e) {
      debugPrint("Lỗi addComment: $e");
    }
  }

  // 10. Hàm lấy danh sách bình luận (Real-time)
  Stream<List<CommentModel>> getCommentsStream(String postId) {
    return _db
        .collection('posts')
        .doc(postId)
        .collection('comments')
        .orderBy('createdAt', descending: true) // Mới nhất xếp trên
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => CommentModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // 11. Hàm Tương tác (Upvote) cho bình luận
  Future<void> upvoteComment(String postId, String commentId, String uid) async {
    DocumentReference commentRef = _db.collection('posts').doc(postId).collection('comments').doc(commentId);

    bool isLiking = false; 
    String? commentAuthorId; 
    await _db.runTransaction((transaction) async {
      DocumentSnapshot snapshot = await transaction.get(commentRef);
      if (!snapshot.exists) return;

      List<dynamic> upvotedBy = snapshot.get('upvotedBy') ?? [];
      int currentCount = snapshot.get('interactionCount') ?? 0;
      commentAuthorId = snapshot.get('authorId'); // Lấy ID của người viết bình luận này

      if (upvotedBy.contains(uid)) {
        // Trường hợp Bỏ tim (Unlike)
        transaction.update(commentRef, {
          'upvotedBy': FieldValue.arrayRemove([uid]),
          'interactionCount': currentCount - 1
        });
        isLiking = false; // Đánh dấu là đang bỏ tim
      } else {
        // Trường hợp Thả tim (Like)
        transaction.update(commentRef, {
          'upvotedBy': FieldValue.arrayUnion([uid]),
          'interactionCount': currentCount + 1
        });
        isLiking = true; // Đánh dấu là đang thả tim
      }
    });

    // CHỈ GỬI THÔNG BÁO KHI: 
    // 1. Hành động là Thả tim (không phải bỏ tim)
    // 2. Tìm thấy ID của chủ bình luận
    if (isLiking && commentAuthorId != null) {
      await sendNotification(
        receiverId: commentAuthorId!, 
        type: 'like', // Đổi thành 'like' vì đây là thả tim
        postId: postId
      );
    }
  }

  // 12. Lấy danh sách thông báo của User hiện tại
  Stream<List<NotificationModel>> getNotificationsStream(String userId) {
    return _db
        .collection('notifications')
        .where('receiverId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => NotificationModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // 13. Bắn thông báo lên Firebase
  Future<void> sendNotification({
    required String receiverId,
    required String type,
    required String postId,
  }) async {
    final currentUser = FirebaseAuth.instance.currentUser;
    // Bỏ qua nếu chưa đăng nhập hoặc tự like/comment bài của chính mình
    if (currentUser == null || currentUser.uid == receiverId) return;

    // Kiểm tra xem người nhận có bật thông báo không
    final receiverDoc = await _db.collection('users').doc(receiverId).get();
    if (receiverDoc.exists) {
      final bool isEnabled = receiverDoc.data()?['isNotificationEnabled'] ?? true;
      if (!isEnabled) return;
    }

    final userDoc = await _db.collection('users').doc(currentUser.uid).get();
    String senderName = userDoc.data()?['name'] ?? "Thành viên EduTalk";

    await _db.collection('notifications').add({
      'receiverId': receiverId,
      'senderId': currentUser.uid,
      'senderName': senderName,
      'type': type,
      'postId': postId,
      'isRead': false,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  // 14. Đánh dấu một thông báo là đã đọc
  Future<void> markNotificationAsRead(String notificationId) async {
    try {
      await _db.collection('notifications').doc(notificationId).update({'isRead': true});
    } catch (e) {
      debugPrint("Lỗi markNotificationAsRead: $e");
    }
  }

  // 15. Đánh dấu tất cả thông báo là đã đọc (batch write)
  Future<void> markAllNotificationsAsRead(List<String> notificationIds) async {
    if (notificationIds.isEmpty) return;
    try {
      final batch = _db.batch();
      for (final id in notificationIds) {
        batch.update(_db.collection('notifications').doc(id), {'isRead': true});
      }
      await batch.commit();
    } catch (e) {
      debugPrint("Lỗi markAllNotificationsAsRead: $e");
    }
  }
}