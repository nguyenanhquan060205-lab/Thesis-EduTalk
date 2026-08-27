import 'dart:io';
import '../models/post_model.dart';
import 'api_client.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// PostService — Toàn bộ logic Posts gọi Python Backend.
/// Không còn gọi Firestore trực tiếp.
class PostService {

  // ===========================================================
  // NOTIFICATIONS
  // ===========================================================

  /// Lấy danh sách thông báo của user.
  /// → GET /api/v1/users/{uid}/notifications
  Stream<List<NotificationModel>> getNotificationsStream(String uid) async* {
    while (true) {
      try {
        final result = await ApiClient.get(
          '/api/v1/users/$uid/notifications',
          withAuth: true,
        );
        if (result['data'] != null) {
          yield (result['data'] as List)
              .map((e) => NotificationModel.fromMap(Map<String, dynamic>.from(e), e['id'] ?? ''))
              .toList();
        } else {
          yield [];
        }
      } catch (_) {
        yield [];
      }
      await Future.delayed(const Duration(seconds: 15));
    }
  }

  /// Đánh dấu một thông báo đã đọc.
  /// → PUT /api/v1/users/{uid}/notifications/{id}/read
  Future<void> markNotificationAsRead(String notifId) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    await ApiClient.put(
      '/api/v1/users/$uid/notifications/$notifId/read',
      withAuth: true,
    );
  }

  /// Đánh dấu tất cả thông báo đã đọc.
  /// → PUT /api/v1/users/{uid}/notifications/read-all
  Future<void> markAllNotificationsAsRead(List<String> ids) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    await ApiClient.put(
      '/api/v1/users/$uid/notifications/read-all',
      withAuth: true,
    );
  }

  // ===========================================================
  // 1. UPLOAD ẢNH
  // → POST /api/v1/posts/upload-image
  // ===========================================================
  Future<String?> uploadPostImage(File imageFile) async {
    try {
      final bytes = await imageFile.readAsBytes();
      final filename = imageFile.path.split('/').last;
      final result = await ApiClient.uploadFile(
        '/api/v1/posts/upload-image',
        bytes,
        filename,
      );
      return result['imageUrl'] as String?;
    } catch (e) {
      return null;
    }
  }

  // ===========================================================
  // 2. TẠO BÀI VIẾT
  // → POST /api/v1/posts
  // ===========================================================
  Future<void> createPost(PostModel post) async {
    await ApiClient.post(
      '/api/v1/posts',
      body: {
        'content': post.content,
        'authorId': post.authorId,
        'authorName': post.authorName,
        'imageUrl': post.imageUrl,
        'tags': post.tags,
      },
      withAuth: true,
    );
  }

  // ===========================================================
  // 3. LẤY DANH SÁCH BÀI VIẾT
  // → GET /api/v1/posts
  // Lưu ý: REST API không có real-time Stream.
  // Màn hình cần polling (RefreshIndicator) hoặc pull-to-refresh.
  // ===========================================================
  Future<List<PostModel>> getPosts({int limit = 20}) async {
    final result = await ApiClient.get('/api/v1/posts?limit=$limit');
    if (result['data'] == null) return [];
    return (result['data'] as List)
        .map((e) => PostModel.fromMap(Map<String, dynamic>.from(e), e['id']))
        .toList();
  }

  Future<PostModel?> getPostById(String postId) async {
    try {
      final result = await ApiClient.get('/api/v1/posts/$postId');
      if (result != null && result.isNotEmpty) {
        return PostModel.fromMap(Map<String, dynamic>.from(result), postId);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Wrapper tạo Stream giả (polling mỗi 30s) cho các widget dùng StreamBuilder.
  /// TODO: Thay bằng WebSocket thực sự nếu cần real-time.
  Stream<List<PostModel>> getPostsStream() async* {
    while (true) {
      yield await getPosts();
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  // ===========================================================
  // 4. LẤY BÀI VIẾT CỦA CHÍNH MÌNH (lọc local)
  // ===========================================================
  Future<List<PostModel>> getMyPosts(String uid) async {
    final all = await getPosts(limit: 100);
    return all.where((p) => p.authorId == uid).toList();
  }

  Stream<List<PostModel>> getMyPostsStream(String uid) async* {
    while (true) {
      yield await getMyPosts(uid);
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  // ===========================================================
  // 5. BÁO CÁO BÀI VIẾT
  // → POST /api/v1/posts/{id}/report
  // ===========================================================
  Future<String> reportPost(String postId, String uid) async {
    final result = await ApiClient.post(
      '/api/v1/posts/$postId/report',
      withAuth: true,
    );
    if (result['status'] == 'error') {
      final msg = result['message'] ?? '';
      if (msg.toString().contains('đã báo cáo')) return 'already_reported';
      return 'error';
    }
    return result['status'] ?? 'success';
  }

  // ===========================================================
  // 6. LIKE / UNLIKE BÀI VIẾT
  // → POST /api/v1/posts/{id}/upvote
  // ===========================================================
  Future<void> upvotePost(String postId, String uid) async {
    await ApiClient.post(
      '/api/v1/posts/$postId/upvote',
      withAuth: true,
    );
  }

  // ===========================================================
  // 7. LẤY BÌNH LUẬN
  // → GET /api/v1/posts/{id}/comments
  // ===========================================================
  Future<List<CommentModel>> getComments(String postId) async {
    final result = await ApiClient.get('/api/v1/posts/$postId/comments');
    if (result['data'] == null) return [];
    return (result['data'] as List).map((e) => CommentModel.fromMap(Map<String, dynamic>.from(e), e['id'] ?? '')).toList();
  }

  Stream<List<CommentModel>> getCommentsStream(String postId) async* {
    while (true) {
      yield await getComments(postId);
      await Future.delayed(const Duration(seconds: 15));
    }
  }
  
  Future<void> upvoteComment(String postId, String commentId, String uid) async {
    await ApiClient.post('/api/v1/posts/$postId/comments/$commentId/upvote', withAuth: true);
  }

  // ===========================================================
  // 8. THÊM BÌNH LUẬN
  // → POST /api/v1/posts/{id}/comments
  // ===========================================================
  Future<void> addComment(
    String postId,
    CommentModel comment,
  ) async {
    await ApiClient.post(
      '/api/v1/posts/$postId/comments',
      body: comment.toMap(),
      withAuth: true,
    );
  }

  // ===========================================================
  // 9. SỬA BÀI VIẾT
  // → PUT /api/v1/posts/{id}
  // ===========================================================
  Future<void> editPost(String postId, Map<String, dynamic> updates) async {
    await ApiClient.put(
      '/api/v1/posts/$postId',
      body: updates,
      withAuth: true,
    );
  }

  // ===========================================================
  // 10. XÓA BÀI VIẾT
  // → DELETE /api/v1/posts/{id}
  // ===========================================================
  Future<void> deletePost(String postId) async {
    await ApiClient.delete(
      '/api/v1/posts/$postId',
      withAuth: true,
    );
  }
}