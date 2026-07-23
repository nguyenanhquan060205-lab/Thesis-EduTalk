import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/prediction_model.dart';

class ApiService {
  static const String baseUrl = 'https://edutalk-7ndf.onrender.com';

  Future<Map<String, dynamic>> predict({
    required List<double> scores,
    required String userId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/prediction/predict'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'scores': scores, 'userId': userId}),
    ).timeout(const Duration(seconds: 30));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Lỗi gọi API: ${response.statusCode}');
    }
  }
}
