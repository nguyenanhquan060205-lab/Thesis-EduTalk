import 'package:firebase_ai/firebase_ai.dart';
import 'dart:convert';

/// Service xử lý chat với Gemini AI thông qua Firebase AI Logic.
class GeminiChatService {
  late final GenerativeModel _model;
  late  ChatSession _chat;

  // ==========================================
  // SINGLETON PATTERN: Giữ service chạy ngầm
  // ==========================================
  static final GeminiChatService _instance = GeminiChatService._internal();
  factory GeminiChatService() => _instance;

  // ==========================================
  // LƯU LỊCH SỬ UI: Giữ text khi đóng BottomSheet
  // ==========================================
  List<Map<String, dynamic>> chatHistory = [
    {
      "sender": "ai",
      "text":
          "Xin chào! Mình là trợ lý EduTalk AI 🎓\n\nMình có thể giúp bạn tư vấn về:\n• Chọn ngành học phù hợp\n• Thông tin các trường đại học\n• Điểm chuẩn, xét tuyển\n• Cơ hội nghề nghiệp\n\nBạn cần mình hỗ trợ gì nhé? ✨",
    },
  ];

  // System instruction – quy định phạm vi trả lời của AI
  static const String _systemInstruction = '''
Bạn là "Trợ lý EduTalk AI", một chuyên gia tư vấn giáo dục và hướng nghiệp tại Việt Nam. 
Nhiệm vụ của bạn là hỗ trợ thông tin khách quan, chính xác về TẤT CẢ các trường Đại học, Cao đẳng trên toàn quốc.

=== LƯU Ý QUAN TRỌNG VỀ DỮ LIỆU & TỪ KHÓA ===
1. Khi người dùng sử dụng tên viết tắt của các trường đại học, bạn phải tra cứu và phân tích ngữ cảnh thật kỹ để tránh nhầm lẫn (Đặc biệt lưu ý HUIT là Trường Đại học Công Thương TP.HCM, trước đây là HUFI. IUH là Đại học Công nghiệp TP.HCM...).
2. Nếu từ khóa viết tắt có thể trùng lặp hoặc không chắc chắn, hãy chủ động hỏi lại tên đầy đủ của trường.

=== QUY TẮC BẮT BUỘC ===
1. LIÊN KẾT NGỮ CẢNH (BẮT BUỘC): Bạn phải luôn đọc lại lịch sử chat và liên kết câu hỏi ngắn hiện tại với chủ đề/trường học đang được nói đến ở câu ngay trước đó. 
   -> Ví dụ: Câu trước user hỏi về "HUIT", câu sau user chỉ gõ "2026" hoặc "học phí", bạn PHẢI tự động hiểu là "thông tin tuyển sinh HUIT 2026" hoặc "học phí HUIT", tuyệt đối không được trả lời chung chung.
2. Bạn CHỈ trả lời các chủ đề: Tư vấn ngành, chọn trường, điểm chuẩn, xét tuyển, học phí, cơ hội việc làm, thông tin kỳ thi.
3. Nếu người dùng hỏi NGOÀI CHỦ ĐỀ giáo dục, hãy TỪ CHỐI NGẮN GỌN ."
4. Trả lời bằng tiếng Việt, khách quan, súc tích và đi thẳng vào trọng tâm.

=== PHONG CÁCH ===
- Thân thiện, chuyên nghiệp.
- Sử dụng emoji phù hợp để tạo không khí vui vẻ.
- Sử dụng in đậm (**từ khóa**) để nhấn mạnh tên trường, tên ngành, điểm số và các ý chính.
- Dùng danh sách (bullet points) để trình bày rõ ràng.
''';
  GeminiChatService._internal() {
    _model = FirebaseAI.googleAI().generativeModel(
      model: 'gemini-3.1-flash-lite',
      systemInstruction: Content.system(_systemInstruction),
    );
    _chat = _model.startChat();
  }

  /// Gửi tin nhắn và nhận phản hồi từ Gemini.
  Future<String> sendMessage(String message) async {
    try {
      final response = await _chat.sendMessage(Content.text(message));
      return response.text ??
          'Xin lỗi, mình không thể trả lời lúc này. Bạn thử hỏi lại nhé! 🙏';
    } catch (e) {
      throw GeminiChatException(
        'Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng và thử lại.',
        originalError: e,
      );
    }
  }

  /// Reset cuộc hội thoại (tạo chat session mới và dọn dẹp giao diện).
  void resetChat() {
    _chat = _model.startChat();
    // Reset luôn cả list tin nhắn trên màn hình về câu chào mới
    chatHistory = [
      {
        "sender": "ai",
        "text":
            "Cuộc hội thoại đã được làm mới! 🔄\nMình sẵn sàng hỗ trợ bạn. Hãy đặt câu hỏi nhé! ✨",
      },
    ];
  }

Future<List<Map<String, dynamic>>> getTrendingMajors() async {
    // Tạo một model mới để không bị ảnh hưởng bởi cái System Instruction của chat
    final trendModel = FirebaseAI.googleAI().generativeModel(
      model: 'gemini-3.1-flash-lite',
      // Ép nó trả về JSON
      generationConfig: GenerationConfig(responseMimeType: "application/json"), 
    );

    const prompt = '''
    Bạn là chuyên gia phân tích thị trường lao động và nhân sự tại Việt Nam.
    Nhiệm vụ: Phân tích và đưa ra Top 3 ngành nghề đang có nhu cầu tuyển dụng và mức tăng trưởng cao nhất hiện nay tại Việt Nam.
    YÊU CẦU KIỂM SOÁT DỮ LIỆU (KHÔNG DÙNG DỮ LIỆU ẢO):
    - Dựa vào xu hướng thực tế của năm nay (Ví dụ: Trí tuệ nhân tạo, Vi mạch bán dẫn, Chăm sóc sức khỏe, Logistics, Thương mại điện tử...).
    - Mức tăng trưởng (growth) phải là con số thực tế hợp lý (ví dụ: +12%, +15%, +18%), không đưa ra số quá lố ảo tưởng.
    - CHỈ TRẢ VỀ JSON ARRAY. Tuyệt đối KHÔNG có markdown, KHÔNG có văn bản giải thích.
    
    Định dạng bắt buộc:
    [
      {"rank": 1, "name": "Tên ngành 1", "growth": "+15%"},
      {"rank": 2, "name": "Tên ngành 2", "growth": "+12%"},
      {"rank": 3, "name": "Tên ngành 3", "growth": "+10%"}
    ]
    ''';

    try {
      final response = await trendModel.generateContent([Content.text(prompt)]);
      final String rawText = response.text ?? '[]';
      
      // Dịch chuỗi JSON thành List dữ liệu cho Flutter đọc
      final List<dynamic> jsonData = jsonDecode(rawText);
      return List<Map<String, dynamic>>.from(jsonData);
      
    } catch (e) {
      // Nếu có lỗi mạng hoặc AI bị ngáo, trả về dữ liệu an toàn mặc định để app không bị sập
      return [
        {"rank": 1, "name": "Trí tuệ nhân tạo (AI)", "growth": "+18%"},
        {"rank": 2, "name": "Thiết kế Vi mạch", "growth": "+15%"},
        {"rank": 3, "name": "Thương mại điện tử", "growth": "+12%"}
      ];
    }
  }
}

/// Exception riêng cho Gemini Chat Service.
class GeminiChatException implements Exception {
  final String message;
  final dynamic originalError;

  GeminiChatException(this.message, {this.originalError});

  @override
  String toString() => 'GeminiChatException: $message';
}