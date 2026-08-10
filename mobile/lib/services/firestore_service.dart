import '../models/prediction_model.dart';
import 'api_client.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// FirestoreService — Lấy lịch sử dự đoán từ Python Backend.
class FirestoreService {

  /// Lấy lịch sử dự đoán của user từ Backend.
  /// → GET /api/v1/survey/history/{uid}
  Stream<List<PredictionModel>> getPredictionsForUser(String userId) async* {
    while (true) {
      try {
        final result = await ApiClient.get(
          '/api/v1/survey/history/$userId',
          withAuth: true,
        );
        if (result['data'] != null) {
          final list = (result['data'] as List)
              .map((e) => PredictionModel.fromMap(
                    Map<String, dynamic>.from(e),
                    e['id'] ?? '',
                  ))
              .toList();
          yield list;
        } else {
          yield [];
        }
      } catch (_) {
        yield [];
      }
      await Future.delayed(const Duration(seconds: 30));
    }
  }

  /// Xóa một bản ghi dự đoán.
  /// Lưu ý: Backend chưa có endpoint xóa riêng lẻ — placeholder.
  Future<void> deletePrediction(String id) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    // TODO: Tạo endpoint DELETE /api/v1/survey/history/{uid}/{id} nếu cần
  }
}
