import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/post_model.dart';

class AdminService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // =========================================================================
  // 1. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
  // =========================================================================

  /// Lắng nghe danh sách tất cả người dùng dạng UserModel
  Stream<List<UserModel>> getUsersStream() {
    return _db.collection('users').snapshots().map((snapshot) {
      return snapshot.docs.map((doc) => UserModel.fromDocument(doc)).toList();
    });
  }

  /// Cập nhật cấp độ Premium của người dùng
  Future<void> updatePremiumStatus(
    String docId, {
    required SubscriptionPlan plan,
    required bool isPremium,
  }) async {
    final updates = <String, dynamic>{
      'plan': plan == SubscriptionPlan.none ? null : plan.name,
      'isPremium': isPremium,
      'subscriptionStatus': isPremium ? 'active' : 'none',
    };
    
    // Nếu cấp quyền premium, cập nhật thời gian hết hạn tương ứng
    if (isPremium) {
      final now = DateTime.now();
      updates['premiumStart'] = Timestamp.fromDate(now);
      updates['premiumAt'] = Timestamp.fromDate(now);
      
      if (plan == SubscriptionPlan.monthly) {
        updates['premiumExpiry'] = Timestamp.fromDate(now.add(const Duration(days: 30)));
      } else if (plan == SubscriptionPlan.yearly) {
        updates['premiumExpiry'] = Timestamp.fromDate(now.add(const Duration(days: 365)));
      } else if (plan == SubscriptionPlan.lifetime) {
        // lifetime không cần ngày hết hạn
        updates['premiumExpiry'] = null;
      }
    } else {
      updates['premiumStart'] = null;
      updates['premiumExpiry'] = null;
      updates['premiumAt'] = null;
    }

    await _db.collection('users').doc(docId).update(updates);
  }

  /// Xóa người dùng khỏi Firestore
  Future<void> deleteUser(String docId) async {
    await _db.collection('users').doc(docId).delete();
  }

  // =========================================================================
  // 2. QUẢN LÝ PREMIUM (PREMIUM MANAGEMENT)
  // =========================================================================

  /// Lắng nghe các giao dịch đã thành công để tính doanh thu
  Stream<QuerySnapshot> getSuccessfulTransactionsStream() {
    return _db
        .collection('transactions')
        // .where('status', isEqualTo: 'success') // Bỏ filter tạm thời để debug
        .snapshots();
  }

  // =========================================================================
  // 3. QUẢN LÝ DIỄN ĐÀN (FORUM MANAGEMENT)
  // =========================================================================

  /// Lắng nghe danh sách bài viết dạng PostModel, sắp xếp theo thời gian giảm dần
  Stream<List<PostModel>> getPostsStream() {
    return _db
        .collection('posts')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PostModel.fromMap(doc.data(), doc.id))
          .toList();
    });
  }

  /// Xóa bài viết khỏi Firestore
  Future<void> deletePost(String docId) async {
    await _db.collection('posts').doc(docId).delete();
    
    // Đồng thời đánh dấu thông báo liên quan đến bài viết này là đã đọc
    final notifications = await _db
        .collection('admin_notifications')
        .where('postId', isEqualTo: docId)
        .where('status', isEqualTo: 'unread')
        .get();
        
    final batch = _db.batch();
    for (var doc in notifications.docs) {
      batch.update(doc.reference, {'status': 'read'});
    }
    await batch.commit();
  }

  /// Bỏ báo cáo bài viết (duyệt bài viết an toàn, xóa lượt báo cáo)
  Future<void> dismissPostReports(String postId) async {
    await _db.collection('posts').doc(postId).update({
      'reportCount': 0,
      'isPending': false,
      'reportedBy': [],
    });
    
    // Đánh dấu các thông báo liên quan đến bài viết này là đã đọc
    final notifications = await _db
        .collection('admin_notifications')
        .where('postId', isEqualTo: postId)
        .where('status', isEqualTo: 'unread')
        .get();
        
    final batch = _db.batch();
    for (var doc in notifications.docs) {
      batch.update(doc.reference, {'status': 'read'});
    }
    await batch.commit();
  }

  // =========================================================================
  // 4. DASHBOARD & THÔNG BÁO
  // =========================================================================

  /// Lắng nghe danh sách giao dịch gần đây giới hạn số lượng hiển thị
  Stream<QuerySnapshot> getRecentTransactionsStream({int limit = 5}) {
    return _db
        .collection('transactions')
        .orderBy('timestamp', descending: true)
        .limit(limit)
        .snapshots();
  }

  /// Lấy danh sách thông báo chưa đọc của Admin
  Stream<QuerySnapshot> getAdminNotificationsStream() {
    return _db
        .collection('admin_notifications')
        .where('status', isEqualTo: 'unread')
        .orderBy('createdAt', descending: true)
        .snapshots();
  }

  /// Đánh dấu một thông báo admin đã xử lý
  Future<void> resolveAdminNotification(String docId) async {
    await _db.collection('admin_notifications').doc(docId).update({'status': 'read'});
  }

  /// Đánh dấu tất cả thông báo admin chưa đọc thành đã đọc
  Future<void> resolveAllAdminNotifications() async {
    final unread = await _db
        .collection('admin_notifications')
        .where('status', isEqualTo: 'unread')
        .get();

    if (unread.docs.isEmpty) return;

    final batch = _db.batch();
    for (var doc in unread.docs) {
      batch.update(doc.reference, {'status': 'read'});
    }
    await batch.commit();
  }
}
