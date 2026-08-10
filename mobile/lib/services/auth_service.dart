import 'dart:io';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'api_client.dart';

/// AuthService — Toàn bộ logic Auth giờ gọi Python Backend.
/// Firebase Auth chỉ được dùng để:
///   1. Lấy ID Token (để đính kèm vào request)
///   2. signOut() cục bộ
///   3. Google Sign-in Flow (vẫn cần GoogleSignIn package)
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  // ===========================================================
  // ĐĂNG KÝ
  // → POST /api/v1/auth/register
  // ===========================================================
  Future<Map<String, dynamic>> register(
    String name,
    String email,
    String password, {
    String? phone,
  }) async {
    return await ApiClient.post(
      '/api/v1/auth/register',
      body: {
        'name': name,
        'email': email,
        'password': password,
        if (phone != null) 'phone': phone,
      },
    );
  }

  // ===========================================================
  // ĐĂNG NHẬP
  // → POST /api/v1/auth/login
  // Backend xác thực password + email verified + trả về role + idToken
  // ===========================================================
  Future<Map<String, dynamic>> login(String email, String password) async {
    return await ApiClient.post(
      '/api/v1/auth/login',
      body: {'email': email, 'password': password},
    );
  }

  // ===========================================================
  // ĐĂNG NHẬP GOOGLE
  // Luồng: GoogleSignIn (trên thiết bị) → lấy idToken → gửi lên Backend
  // → POST /api/v1/auth/google
  // ===========================================================
  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      await _googleSignIn.disconnect().catchError((_) {});

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        return {'status': 'Đã hủy đăng nhập Google.'};
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Đăng nhập vào Firebase Auth cục bộ để lấy session (cần cho FCM token)
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );
      await _auth.signInWithCredential(credential);

      // Gửi idToken lên Backend để tạo/xác thực user trong Firestore
      return await ApiClient.post(
        '/api/v1/auth/google',
        body: {'idToken': googleAuth.idToken ?? ''},
      );
    } catch (e) {
      return {'status': 'Lỗi hệ thống: $e'};
    }
  }

  // ===========================================================
  // UPLOAD AVATAR
  // Tạm mượn endpoint upload-image của posts để lấy link
  // ===========================================================
  Future<String?> uploadAvatar(File imageFile) async {
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
  // ĐĂNG XUẤT
  // ===========================================================
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _auth.signOut();
    } catch (e) {
      // ignore
    }
  }

  // ===========================================================
  // XÓA TÀI KHOẢN
  // → DELETE /api/v1/auth/delete/{uid}
  // ===========================================================
  Future<Map<String, dynamic>> deleteAccount() async {
    final user = _auth.currentUser;
    if (user == null) {
      return {'status': 'error', 'message': 'Không tìm thấy người dùng'};
    }
    final result = await ApiClient.delete(
      '/api/v1/auth/delete/${user.uid}',
      withAuth: true,
    );
    if (result['status'] == 'success') {
      await _googleSignIn.signOut();
      await _auth.signOut();
    }
    return result;
  }

  // ===========================================================
  // GỬI LẠI EMAIL XÁC THỰC
  // → POST /api/v1/auth/resend-verify
  // ===========================================================
  Future<void> resendVerificationEmail(String email, String password) async {
    await ApiClient.post(
      '/api/v1/auth/resend-verify',
      body: {'email': email, 'password': password},
    );
  }

  // ===========================================================
  // ĐỔI MẬT KHẨU
  // → POST /api/v1/auth/change-password
  // ===========================================================
  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    return await ApiClient.post(
      '/api/v1/auth/change-password',
      body: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
      withAuth: true,
    );
  }

  // ===========================================================
  // GỬI OTP
  // → POST /api/v1/auth/otp/send
  // ===========================================================
  Future<Map<String, dynamic>> sendOtp(String email) async {
    return await ApiClient.post(
      '/api/v1/auth/otp/send',
      body: {'email': email},
    );
  }

  // ===========================================================
  // XÁC MINH OTP
  // → POST /api/v1/auth/otp/verify
  // ===========================================================
  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    return await ApiClient.post(
      '/api/v1/auth/otp/verify',
      body: {'email': email, 'otp': otp},
    );
  }

  // ===========================================================
  // Stream trạng thái đăng nhập (giữ lại để màn hình reactive)
  // ===========================================================
  Stream<User?> get user => _auth.authStateChanges();

  /// UID của user hiện tại (tiện dùng)
  String? get currentUid => _auth.currentUser?.uid;

  // ===========================================================
  // PROFILE MANAGEMENT
  // ===========================================================
  Future<Map<String, dynamic>?> getUserInfo(String uid) async {
    try {
      final result = await ApiClient.get('/api/v1/users/$uid', withAuth: true);
      return result;
    } catch (e) {
      return null;
    }
  }

  Future<void> updateProfile(String uid, Map<String, dynamic> data) async {
    await ApiClient.put(
      '/api/v1/users/$uid',
      body: data,
      withAuth: true,
    );
  }
}
