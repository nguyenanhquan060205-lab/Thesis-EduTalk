import 'api_client.dart';

/// GeminiChatService — Gọi Python Backend thay vì Firebase AI trực tiếp.
/// Backend sẽ gọi Google Generative AI SDK và trả kết quả về.
/// Lợi ích: API Key Gemini không bị lộ trên Client.
class GeminiChatService {
  // ==========================================
  // SINGLETON PATTERN: Giữ service + history
  // ==========================================
  static final GeminiChatService _instance = GeminiChatService._internal();
  factory GeminiChatService() => _instance;
  GeminiChatService._internal();

  // ==========================================
  // LƯU LỊCH SỬ UI: Giữ text khi đóng BottomSheet
  // ==========================================
  List<Map<String, dynamic>> chatHistory = [
    {
      'sender': 'ai',
      'text':
          'Xin chào! Mình là trợ lý EduTalk AI 🎓\n\nMình có thể giúp bạn tư vấn về:\n• Chọn ngành học phù hợp\n• Thông tin các trường đại học\n• Điểm chuẩn, xét tuyển\n• Cơ hội nghề nghiệp\n\nBạn cần mình hỗ trợ gì nhé? ✨',
    },
  ];

  // ==========================================
  // LỊCH SỬ GỬI LÊN BACKEND (format API)
  // Backend cần history để duy trì ngữ cảnh
  // ==========================================
  final List<Map<String, String>> _apiHistory = [];

  // ===========================================================
  // GỬI TIN NHẮN
  // → POST /api/v1/chat/message
  // ===========================================================
  Future<String> sendMessage(String message) async {
    try {
      final result = await ApiClient.post(
        '/api/v1/chat/message',
        body: {
          'message': message,
          'history': _apiHistory, // Gửi lịch sử để AI nhớ ngữ cảnh
        },
      );

      if (result['status'] == 'error') {
        throw GeminiChatException(
          result['message'] ?? 'Lỗi kết nối Backend',
        );
      }

      final responseText = result['response'] as String? ??
          'Xin lỗi, mình không thể trả lời lúc này. Bạn thử hỏi lại nhé! 🙏';

      // Cập nhật history để lần sau Backend có ngữ cảnh
      _apiHistory.add({'role': 'user', 'text': message});
      _apiHistory.add({'role': 'model', 'text': responseText});

      // Giới hạn history tối đa 20 lượt để tránh payload quá lớn
      if (_apiHistory.length > 40) {
        _apiHistory.removeRange(0, 2);
      }

      return responseText;
    } catch (e) {
      if (e is GeminiChatException) rethrow;
      throw GeminiChatException(
        'Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại.',
        originalError: e,
      );
    }
  }

  // ===========================================================
  // LẤY TOP 3 NGÀNH TRENDING
  // → GET /api/v1/chat/trending-majors
  // ===========================================================
  Future<List<Map<String, dynamic>>> getTrendingMajors() async {
    try {
      final result = await ApiClient.get('/api/v1/chat/trending-majors');
      if (result['data'] != null) {
        return List<Map<String, dynamic>>.from(result['data']);
      }
      return _fallback;
    } catch (_) {
      return _fallback;
    }
  }

  // ===========================================================
  // RESET CUỘC HỘI THOẠI
  // ===========================================================
  void resetChat() {
    _apiHistory.clear();
    chatHistory = [
      {
        'sender': 'ai',
        'text':
            'Cuộc hội thoại đã được làm mới! 🔄\nMình sẵn sàng hỗ trợ bạn. Hãy đặt câu hỏi nhé! ✨',
      },
    ];
  }

  // Dữ liệu fallback khi API lỗi
  static const List<Map<String, dynamic>> _fallback = [
    {'rank': 1, 'name': 'Trí tuệ nhân tạo (AI)', 'growth': '+18%'},
    {'rank': 2, 'name': 'Thiết kế Vi mạch', 'growth': '+15%'},
    {'rank': 3, 'name': 'Thương mại điện tử', 'growth': '+12%'},
  ];
}

/// Exception riêng cho Gemini Chat Service.
class GeminiChatException implements Exception {
  final String message;
  final dynamic originalError;

  GeminiChatException(this.message, {this.originalError});

  @override
  String toString() => 'GeminiChatException: $message';
}