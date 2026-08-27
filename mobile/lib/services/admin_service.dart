import '../models/user_model.dart';
import '../models/post_model.dart';
import 'api_client.dart';

/// AdminService — Gọi Python Backend thay vì Firestore trực tiếp.
/// Toàn bộ quyền Admin được kiểm soát server-side (require_admin middleware).
class AdminService {

  // =========================================================================
  // 1. DASHBOARD
  // → GET /api/v1/admin/dashboard
  // =========================================================================
  Future<Map<String, dynamic>> getDashboard() async {
    return await ApiClient.get('/api/v1/admin/dashboard', withAuth: true);
  }

  // =========================================================================
  // 2. QUẢN LÝ NGƯỜI DÙNG
  // =========================================================================

  /// Lấy danh sách tất cả users.
  /// → GET /api/v1/admin/users
  Future<List<UserModel>> getUsers() async {
    final result = await ApiClient.get('/api/v1/admin/users', withAuth: true);
    if (result['data'] == null) return [];
    return (result['data'] as List)
        .map((e) => UserModel.fromMap(Map<String, dynamic>.from(e), e['id'] ?? ''))
        .toList();
  }

  /// Stream wrapper (polling 30s).
  Stream<List<UserModel>> getUsersStream() async* {
    while (true) {
      yield await getUsers();
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  /// Cập nhật trạng thái Premium.
  /// → PUT /api/v1/admin/users/{uid}/premium
  Future<void> updatePremiumStatus(
    String docId, {
    required SubscriptionPlan plan,
    required bool isPremium,
  }) async {
    await ApiClient.put(
      '/api/v1/admin/users/$docId/premium',
      body: {
        'plan': plan == SubscriptionPlan.none ? 'none' : plan.name,
        'isPremium': isPremium,
      },
      withAuth: true,
    );
  }

  /// Xóa người dùng.
  /// → DELETE /api/v1/admin/users/{uid}
  Future<void> deleteUser(String docId) async {
    await ApiClient.delete('/api/v1/admin/users/$docId', withAuth: true);
  }

  // =========================================================================
  // 3. QUẢN LÝ DIỄN ĐÀN
  // =========================================================================

  /// Lấy tất cả bài viết (kể cả pending) cho Admin.
  /// → GET /api/v1/admin/posts
  Future<List<PostModel>> getPosts() async {
    final result = await ApiClient.get('/api/v1/admin/posts', withAuth: true);
    if (result['data'] == null) return [];
    return (result['data'] as List)
        .map((e) => PostModel.fromMap(Map<String, dynamic>.from(e), e['id']))
        .toList();
  }

  Stream<List<PostModel>> getPostsStream() async* {
    while (true) {
      yield await getPosts();
      await Future.delayed(const Duration(seconds: 20));
    }
  }

  /// Xóa bài viết.
  /// → DELETE /api/v1/admin/posts/{id}
  Future<void> deletePost(String docId) async {
    await ApiClient.delete('/api/v1/admin/posts/$docId', withAuth: true);
  }

  /// Bỏ báo cáo bài viết (duyệt an toàn).
  /// → PUT /api/v1/admin/posts/{id}/dismiss-report
  Future<void> dismissPostReports(String postId) async {
    await ApiClient.put(
      '/api/v1/admin/posts/$postId/dismiss-report',
      withAuth: true,
    );
  }

  // =========================================================================
  // 4. DASHBOARD & THÔNG BÁO ADMIN
  // =========================================================================

  /// Lấy thông báo admin chưa đọc.
  /// → GET /api/v1/admin/notifications
  Future<List<Map<String, dynamic>>> getAdminNotifications() async {
    final result = await ApiClient.get(
      '/api/v1/admin/notifications',
      withAuth: true,
    );
    if (result['data'] == null) return [];
    return List<Map<String, dynamic>>.from(result['data']);
  }

  Stream<List<Map<String, dynamic>>> getAdminNotificationsStream() async* {
    while (true) {
      yield await getAdminNotifications();
      await Future.delayed(const Duration(seconds: 15));
    }
  }

  /// Đánh dấu thông báo đã xử lý.
  /// → PUT /api/v1/admin/notifications/{id}/resolve
  Future<void> resolveAdminNotification(String docId) async {
    await ApiClient.put(
      '/api/v1/admin/notifications/$docId/resolve',
      withAuth: true,
    );
  }

  /// Đánh dấu tất cả thông báo đã đọc (gọi từng cái).
  Future<void> resolveAllAdminNotifications() async {
    final notifs = await getAdminNotifications();
    for (final n in notifs) {
      if (n['id'] != null) {
        await resolveAdminNotification(n['id']);
      }
    }
  }

  // =========================================================================
  // 5. QUẢN LÝ GIAO DỊCH (giữ lại stream từ Backend nếu có)
  // =========================================================================

  /// Lấy giao dịch gần đây — dùng dashboard data.
  Future<List<Map<String, dynamic>>> getRecentTransactions({int limit = 5}) async {
    final dashboard = await getDashboard();
    // Dashboard đã có tổng doanh thu — transactions chi tiết có thể thêm sau
    return [];
  }

  // Compat stream cho code cũ
  Stream<List<Map<String, dynamic>>> getSuccessfulTransactionsStream() async* {
    while (true) {
      yield await getRecentTransactions();
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  Stream<List<Map<String, dynamic>>> getRecentTransactionsStream({int limit = 5}) async* {
    while (true) {
      yield await getRecentTransactions(limit: limit);
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  // =========================================================================
  // 6. QUẢN LÝ SUPPORT
  // =========================================================================

  /// → GET /api/v1/admin/support
  Future<List<Map<String, dynamic>>> getSupportRequests() async {
    final result = await ApiClient.get('/api/v1/admin/support', withAuth: true);
    if (result['data'] == null) return [];
    return List<Map<String, dynamic>>.from(result['data']);
  }

  /// → PUT /api/v1/admin/support/{id}
  Future<void> updateSupportRequest(String id, String status, {String? note}) async {
    await ApiClient.put(
      '/api/v1/admin/support/$id',
      body: {'status': status, 'adminNote': note},
      withAuth: true,
    );
  }
}
