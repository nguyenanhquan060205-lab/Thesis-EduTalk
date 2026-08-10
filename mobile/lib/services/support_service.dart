import 'api_client.dart';

class SupportService {
  /// Lấy danh sách yêu cầu hỗ trợ của người dùng hiện tại
  /// → GET /api/v1/support/
  Future<List<Map<String, dynamic>>> getMySupportRequests() async {
    try {
      final result = await ApiClient.get('/api/v1/support', withAuth: true);
      if (result['data'] != null) {
        return List<Map<String, dynamic>>.from(result['data']);
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fake stream để dùng cho StreamBuilder (cơ chế polling)
  Stream<List<Map<String, dynamic>>> getMySupportRequestsStream() async* {
    while (true) {
      yield await getMySupportRequests();
      await Future.delayed(const Duration(seconds: 15));
    }
  }
}
