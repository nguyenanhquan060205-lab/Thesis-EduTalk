import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/payment_model.dart';

class PaymentService {
  static const String _baseUrl = "https://edutalk-7ndf.onrender.com";

  /// Tạo giao dịch MoMo
  Future<PaymentResponse> createMomoPayment({
    required String userId,
    required String planCode, // Truyền 'monthly', 'yearly', hoặc 'lifetime'
    String orderInfo = "EduTalk Premium",
  }) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/payment/momo-payment"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "userId": userId,
          "plan": planCode,
          "orderInfo": orderInfo,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
        return PaymentResponse.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? "Failed to create payment");
      }
    } catch (e) {
      throw Exception("Network error: $e");
    }
  }

  /// Tạo giao dịch Chuyển khoản (SePay)
  Future<PaymentResponse> createBankPayment({
    required String userId,
    required String planCode, // Truyền 'monthly', 'yearly', hoặc 'lifetime'
  }) async {
    try {
      final response = await http.post(
        Uri.parse("$_baseUrl/payment/create-bank-payment"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "userId": userId,
          "plan": planCode,
        }),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
        return PaymentResponse.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? "Failed to create bank payment");
      }
    } catch (e) {
      throw Exception("Network error: $e");
    }
  }

  /// Mở ứng dụng MoMo hoặc trình duyệt
  Future<void> openMomoPayment(String payUrl, {String? deeplink}) async {
    if (deeplink != null && deeplink.isNotEmpty) {
      try {
        final Uri deepUri = Uri.parse(deeplink);
        bool launched = await launchUrl(
          deepUri,
          mode: LaunchMode.externalNonBrowserApplication,
        );
        if (launched) return;
      } catch (e) {
        debugPrint("Lỗi khi mở deeplink: $e");
      }
    }

    final Uri webUri = Uri.parse(payUrl);
    try {
      bool launched = await launchUrl(
        webUri,
        mode: LaunchMode.externalNonBrowserApplication,
      );
      if (launched) return;
    } catch (e) {
      debugPrint("Lỗi khi mở Universal Link: $e");
    }

    if (await canLaunchUrl(webUri)) {
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } else {
      throw Exception("Could not launch $payUrl");
    }
  }

  /// Lắng nghe trạng thái một giao dịch cụ thể (Realtime)
  Stream<String> listenTransactionStatus(String paymentCode) {
    return FirebaseFirestore.instance
        .collection('transactions')
        .doc(paymentCode)
        .snapshots()
        .map((snapshot) {
          final data = snapshot.data();
          if (data == null) return "pending";
          return data['status'] ?? "pending";
        });
  }

  /// Lắng nghe trạng thái Premium qua Firestore (Realtime)
  Stream<bool> listenPremiumStatus(String userId) {
    return FirebaseFirestore.instance
        .collection('users')
        .doc(userId)
        .snapshots()
        .map((snapshot) {
          final data = snapshot.data();
          if (data == null) return false;
          
          final isPremium = data['isPremium'] ?? false;
          final plan = data['plan'];
          final expiry = data['premiumExpiry'] as Timestamp?;

          if (!isPremium) return false;
          if (plan == 'lifetime') return true;
          if (expiry == null) return false;
          
          return expiry.toDate().isAfter(DateTime.now());
        });
  }

  /// Xem trước giá nâng cấp (Pro-rated)
  Future<Map<String, dynamic>?> getUpgradePreview(String userId, String planCode) async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/payment/upgrade-preview/$userId/$planCode"),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint("Lỗi preview nâng cấp: $e");
    }
    return null;
  }

  /// Kiểm tra trạng thái Premium từ Backend (Đồng bộ logic)
  Future<Map<String, dynamic>?> checkPremiumStatus(String userId) async {
    try {
      final response = await http.get(
        Uri.parse("$_baseUrl/payment/check-status/$userId"),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint("Lỗi kiểm tra trạng thái Premium: $e");
    }
    return null;
  }
}
