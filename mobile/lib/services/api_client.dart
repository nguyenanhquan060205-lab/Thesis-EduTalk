import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

/// HTTP Client dùng chung cho toàn bộ services.
/// Tự động đính kèm Firebase ID Token vào mỗi request.
class ApiClient {
  static const String baseUrl = 'https://edutalk-7ndf.onrender.com';
  static const Duration _timeout = Duration(seconds: 30);

  /// Lấy Firebase ID Token của user hiện tại.
  static Future<String?> _getIdToken() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return null;
      return await user.getIdToken();
    } catch (_) {
      return null;
    }
  }

  /// Headers chuẩn với Content-Type JSON
  static Future<Map<String, String>> _headers({bool withAuth = false}) async {
    final headers = {'Content-Type': 'application/json'};
    if (withAuth) {
      final token = await _getIdToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  // =====================================================================
  // GET
  // =====================================================================
  static Future<Map<String, dynamic>> get(
    String path, {
    bool withAuth = false,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(withAuth: withAuth),
          )
          .timeout(_timeout);
      return _handleResponse(response);
    } catch (e) {
      debugPrint('GET $path — lỗi: $e');
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // =====================================================================
  // POST
  // =====================================================================
  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = false,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(withAuth: withAuth),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);
      return _handleResponse(response);
    } catch (e) {
      debugPrint('POST $path — lỗi: $e');
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // =====================================================================
  // PUT
  // =====================================================================
  static Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    bool withAuth = false,
  }) async {
    try {
      final response = await http
          .put(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(withAuth: withAuth),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);
      return _handleResponse(response);
    } catch (e) {
      debugPrint('PUT $path — lỗi: $e');
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // =====================================================================
  // DELETE
  // =====================================================================
  static Future<Map<String, dynamic>> delete(
    String path, {
    bool withAuth = false,
  }) async {
    try {
      final response = await http
          .delete(
            Uri.parse('$baseUrl$path'),
            headers: await _headers(withAuth: withAuth),
          )
          .timeout(_timeout);
      return _handleResponse(response);
    } catch (e) {
      debugPrint('DELETE $path — lỗi: $e');
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // =====================================================================
  // MULTIPART (upload file)
  // =====================================================================
  static Future<Map<String, dynamic>> uploadFile(
    String path,
    List<int> fileBytes,
    String filename,
  ) async {
    try {
      final token = await _getIdToken();
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        fileBytes,
        filename: filename,
      ));
      final streamedResponse = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      debugPrint('UPLOAD $path — lỗi: $e');
      return {'status': 'error', 'message': e.toString()};
    }
  }

  // =====================================================================
  // HELPER: Xử lý response
  // =====================================================================
  static Map<String, dynamic> _handleResponse(http.Response response) {
    try {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return data is Map<String, dynamic>
            ? data
            : {'status': 'success', 'data': data};
      } else {
        final detail = data['detail'] ?? data['message'] ?? 'Lỗi không xác định';
        debugPrint('API Error ${response.statusCode}: $detail');
        return {'status': 'error', 'message': detail.toString()};
      }
    } catch (e) {
      return {'status': 'error', 'message': 'Lỗi parse response: $e'};
    }
  }
}
