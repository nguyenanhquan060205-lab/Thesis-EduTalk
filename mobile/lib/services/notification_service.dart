import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Top-level background message handler (bắt buộc phải nằm ngoài class, ngoài main())
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // App đang tắt hoặc chạy ngầm — Firebase tự hiển thị banner
  // Không cần xử lý thêm vì notification data đã có trong payload
  debugPrint('📬 Background message: ${message.notification?.title}');
}

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Bước 1: Xin quyền thông báo từ OS (Android 13+ cần hỏi runtime)
  static Future<void> initialize() async {
    // Xin quyền (chỉ áp dụng Android 13+ / API 33+)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );

    debugPrint('🔔 Notification permission: ${settings.authorizationStatus}');

    // Lấy token và lưu ngay sau khi được cấp quyền
    await getAndSaveToken();

    // Lắng nghe khi token được làm mới (VD: user reset app data)
    _messaging.onTokenRefresh.listen((newToken) async {
      await _saveTokenToFirestore(newToken);
      debugPrint('🔄 FCM Token refreshed: $newToken');
    });

    // Xử lý khi người dùng bấm vào thông báo từ ngoài màn hình khóa
    // (App đang tắt hoàn toàn → onMessageOpenedApp không bắt được)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageNavigation(initialMessage);
    }

    // Xử lý khi bấm banner lúc app đang chạy ngầm
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageNavigation);
  }

  /// Bước 2: Lấy FCM Token thiết bị và lưu lên Firestore
  static Future<void> getAndSaveToken() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    // Kiểm tra cấu hình nhận thông báo của user
    final doc = await _db.collection('users').doc(uid).get();
    if (doc.exists) {
      final isEnabled = doc.data()?['isNotificationEnabled'] ?? true;
      if (!isEnabled) {
        // Nếu người dùng tắt thông báo, xóa FCM Token khỏi Firestore
        await _db.collection('users').doc(uid).update({
          'fcmToken': FieldValue.delete(),
        }).catchError((_) {});
        debugPrint('🗑️ FCM Token cleared because notifications are disabled');
        return;
      }
    }

    final token = await _messaging.getToken();
    if (token != null) {
      await _saveTokenToFirestore(token);
      debugPrint('✅ FCM Token saved: $token');
    }
  }

  /// Lưu token vào Firestore (merge để không ghi đè data cũ)
  static Future<void> _saveTokenToFirestore(String token) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    await _db.collection('users').doc(uid).set(
      {
        'fcmToken': token,
        'fcmTokenUpdatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true), // Không ghi đè các field khác
    );
  }

  /// Xử lý Deep Link: khi user bấm vào thông báo → nhảy vào bài viết cụ thể
  static void _handleMessageNavigation(RemoteMessage message) {
    final data = message.data;
    final postId = data['postId'];

    if (postId != null && postId.isNotEmpty) {
      // Lưu postId để HomeScreen/Navigator xử lý khi build xong
      _pendingPostId = postId;
      debugPrint('🔗 Deep Link → postId: $postId');
    }
  }

  // PostId cần navigate tới khi app mở (được đọc bởi HomeScreen)
  static String? _pendingPostId;
  static String? consumePendingPostId() {
    final id = _pendingPostId;
    _pendingPostId = null;
    return id;
  }
}
