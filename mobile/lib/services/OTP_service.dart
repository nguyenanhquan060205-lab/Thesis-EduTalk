import 'dart:math';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';

class OtpService {
  // ⚠️ Thay 3 giá trị này bằng thông tin EmailJS của bạn
  // Hoặc dùng dotenv: dotenv.env['EMAILJS_SERVICE_ID'] ?? ''
  static const String _serviceId = 'service_jz7he5o';
  static const String _templateId = 'template_ntv9o9c';
  static const String _publicKey = 'Ezr_VkJnGkvD-1Ma0';

  static const String _emailJsUrl =
      'https://api.emailjs.com/api/v1.0/email/send';

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Sinh OTP 6 số ngẫu nhiên
  String _generateOtp() {
    final random = Random.secure();
    return List.generate(6, (_) => random.nextInt(10)).join();
  }

  /// Gửi OTP về email:
  /// 1. Sinh OTP 6 số
  /// 2. Lưu vào Firestore collection 'otp_codes' với TTL 10 phút
  /// 3. Gửi email qua EmailJS
  Future<Map<String, dynamic>> sendOtp(String email) async {
    try {
      final String otp = _generateOtp();
      final DateTime expiresAt = DateTime.now().add(
        const Duration(minutes: 10),
      );

      // Lưu OTP vào Firestore (document id = email để dễ query)
      await _firestore.collection('otp_codes').doc(email).set({
        'otp': otp,
        'email': email,
        'expiresAt': Timestamp.fromDate(expiresAt),
        'createdAt': FieldValue.serverTimestamp(),
        'verified': false,
      });

      // Gửi email qua EmailJS REST API
      final response = await http.post(
        Uri.parse(_emailJsUrl),
        headers: {
          'Content-Type': 'application/json',
          'origin': 'http://localhost', // Required by EmailJS
        },
        body: jsonEncode({
          'service_id': _serviceId,
          'template_id': _templateId,
          'user_id': _publicKey,
          'template_params': {'to_email': email, 'otp_code': otp},
        }),
      );

      if (response.statusCode == 200) {
        return {'status': 'success'};
      } else {
        return {
          'status': 'error',
          'message':
              'Gửi email thất bại (${response.statusCode}). '
              'Kiểm tra lại cấu hình EmailJS.',
        };
      }
    } catch (e) {
      return {'status': 'error', 'message': 'Lỗi hệ thống: $e'};
    }
  }

  /// Xác minh OTP nhập vào:
  /// - Kiểm tra OTP khớp không
  /// - Kiểm tra còn hiệu lực (chưa hết 10 phút)
  Future<Map<String, dynamic>> verifyOtp(String email, String inputOtp) async {
    try {
      final doc = await _firestore.collection('otp_codes').doc(email).get();

      if (!doc.exists) {
        return {
          'status': 'error',
          'message': 'Mã OTP không tồn tại. Vui lòng gửi lại.',
        };
      }

      final data = doc.data()!;
      final String savedOtp = data['otp'] ?? '';
      final Timestamp expiresAt = data['expiresAt'];
      final bool alreadyVerified = data['verified'] ?? false;

      if (alreadyVerified) {
        return {'status': 'error', 'message': 'Mã OTP này đã được sử dụng.'};
      }

      if (DateTime.now().isAfter(expiresAt.toDate())) {
        await _firestore.collection('otp_codes').doc(email).delete();
        return {
          'status': 'error',
          'message': 'Mã OTP đã hết hạn. Vui lòng gửi lại.',
        };
      }

      if (inputOtp.trim() != savedOtp) {
        return {'status': 'error', 'message': 'Mã OTP không đúng.'};
      }

      // Đánh dấu đã verify (tránh dùng lại)
      await _firestore.collection('otp_codes').doc(email).update({
        'verified': true,
      });

      return {'status': 'success'};
    } catch (e) {
      return {'status': 'error', 'message': 'Lỗi xác minh: $e'};
    }
  }

  /// Xóa OTP sau khi đổi mật khẩu xong
  Future<void> clearOtp(String email) async {
    try {
      await _firestore.collection('otp_codes').doc(email).delete();
    } catch (_) {}
  }
}
