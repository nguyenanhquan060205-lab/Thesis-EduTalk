import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'api_client.dart';

/// Top-level background message handler (bắt buộc nằm ngoài class)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Background message: ${message.notification?.title}');
}

/// NotificationService — FCM Token nay được lưu lên Python Backend
/// (thay vì ghi thẳng vào Firestore từ client).
class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  /// Bước 1: Xin quyền thông báo từ OS
  static Future<void> initialize() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );

    debugPrint('Notification permission: ${settings.authorizationStatus}');

    await getAndSaveToken();

    // Refresh token → cập nhật lên Backend
    _messaging.onTokenRefresh.listen((newToken) async {
      await _saveTokenToBackend(newToken);
      debugPrint('FCM Token refreshed: $newToken');
    });

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageNavigation(initialMessage);
    }

    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageNavigation);
  }

  /// Bước 2: Lấy FCM Token và lưu lên Backend (thay Firestore)
  static Future<void> getAndSaveToken() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    try {
      // Kiểm tra cài đặt thông báo từ Backend
      final userResult = await ApiClient.get('/api/v1/users/$uid', withAuth: true);
      final isEnabled = userResult['isNotificationEnabled'] as bool? ?? true;

      if (!isEnabled) {
        // Tắt thông báo: xóa FCM Token trên Backend
        await ApiClient.put(
          '/api/v1/users/$uid',
          body: {'fcmToken': null},
          withAuth: true,
        );
        debugPrint('FCM Token cleared (notifications disabled)');
        return;
      }

      final token = await _messaging.getToken();
      if (token != null) {
        await _saveTokenToBackend(token);
      }
    } catch (e) {
      debugPrint('FCM token save error: $e');
    }
  }

  /// Lưu FCM Token lên Backend
  /// → PUT /api/v1/users/{uid}/fcm-token
  static Future<void> _saveTokenToBackend(String token) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    try {
      await ApiClient.put(
        '/api/v1/users/$uid',
        body: {'fcmToken': token},
        withAuth: true,
      );
      debugPrint('FCM Token saved to backend: $token');
    } catch (e) {
      debugPrint('FCM backend save error: $e');
    }
  }

  /// Xử lý Deep Link khi user bấm vào thông báo
  static void _handleMessageNavigation(RemoteMessage message) {
    final postId = message.data['postId'];
    if (postId != null && postId.isNotEmpty) {
      _pendingPostId = postId;
      debugPrint('Deep Link postId: $postId');
    }
  }

  static String? _pendingPostId;
  static String? consumePendingPostId() {
    final id = _pendingPostId;
    _pendingPostId = null;
    return id;
  }
}
