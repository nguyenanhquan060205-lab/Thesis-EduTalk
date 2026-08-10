import 'api_client.dart';

/// OtpService — Gọi Python Backend để gửi/xác minh OTP.
/// Bảo mật hơn: OTP không còn lưu trực tiếp vào Firestore từ Client.
class OtpService {

  /// Gửi OTP 6 số về email.
  /// → POST /api/v1/auth/otp/send
  Future<Map<String, dynamic>> sendOtp(String email) async {
    return await ApiClient.post(
      '/api/v1/auth/otp/send',
      body: {'email': email},
    );
  }

  /// Xác minh mã OTP người dùng nhập vào.
  /// → POST /api/v1/auth/otp/verify
  Future<Map<String, dynamic>> verifyOtp(String email, String inputOtp) async {
    return await ApiClient.post(
      '/api/v1/auth/otp/verify',
      body: {'email': email, 'otp': inputOtp},
    );
  }

  /// Xóa OTP sau khi đổi mật khẩu xong.
  /// Backend tự xử lý TTL qua Firestore — không cần gọi thêm.
  Future<void> clearOtp(String email) async {
    // No-op: Backend tự dọn OTP sau khi verified=true
  }
}
