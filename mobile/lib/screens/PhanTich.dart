import 'package:flutter/material.dart';
import 'package:ui_login_out/services/api_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class PhanTichScreen extends StatefulWidget {
  final VoidCallback onBack;
  final Function(
    String major,
    List<dynamic> recommendations,
    List<int> userScores,
    List<int> majorRequirements,
  )
  onShowKetQua;
  final double totalScore; // ← THÊM
  final List<String> subjects; // ← THÊM
  final List<double> scoresDetail; // ← THÊM

  const PhanTichScreen({
    super.key,
    required this.onBack,
    required this.onShowKetQua,
    required this.totalScore,
    required this.subjects,
    required this.scoresDetail,
  });

  @override
  State<PhanTichScreen> createState() => _PhanTichScreenState();
}

class _PhanTichScreenState extends State<PhanTichScreen> {
  final _apiService = ApiService();

  Future<void> _onPredict() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final uid = FirebaseAuth.instance.currentUser?.uid ?? '';
      
      // Thêm Timeout để tránh đợi quá lâu khi server Render đang khởi động
      final result = await _apiService.predict(
        scores: inItems.map((item) => item.value.toDouble()).toList(),
        userId: uid,
      );

      if (context.mounted) Navigator.pop(context);

      if (result['success'] == true) {
        // 1. Tăng usageCount trên Firestore TRƯỚC (chỉ khi không phải Premium)
        if (uid.isNotEmpty) {
          final userDoc = await FirebaseFirestore.instance.collection('users').doc(uid).get();
          if (userDoc.exists) {
            final isPremium = userDoc.data()?['isPremium'] ?? false;
            if (!isPremium) {
              await FirebaseFirestore.instance.collection('users').doc(uid).update({
                'usageCount': FieldValue.increment(1),
              });
            }
          }
        }

        final major = result['predicted_major'] as String;
        final unis = result['recommendations'] as List<dynamic>;
        final userScores = List<int>.from(
          (result['user_scores'] as List<dynamic>? ?? []).map(
            (e) => (e as num).round(),
          ),
        );
        final majorReqs = List<int>.from(
          (result['major_requirements'] as List<dynamic>? ?? []).map(
            (e) => (e as num).round(),
          ),
        );

        // ← LƯU KẾT QUẢ LÊN FIRESTORE (THÊM total_score, subjects, scores_detail)
        if (uid.isNotEmpty) {
          await FirebaseFirestore.instance
              .collection('predictions')
              .doc(uid)
              .collection('history')
              .add({
                'predicted_major': major,
                'user_scores': userScores,
                'major_requirements': majorReqs,
                'recommendations': unis
                    .map(
                      (u) => {
                        'ten_truong': u['ten_truong'] ?? '',
                        'ma_truong': u['ma_truong'] ?? '',
                        'diem_chuan_2024': u['diem_chuan_2024'] ?? '',
                        'website': u['website'] ?? '',
                      },
                    )
                    .toList(),
                'input_scores': inItems.map((item) => item.value).toList(),
                'total_score': widget.totalScore, // ← THÊM DÒNG NÀY
                'subjects': widget.subjects, // ← THÊM DÒNG NÀY
                'scores_detail': widget.scoresDetail, // ← THÊM DÒNG NÀY
                'created_at': FieldValue.serverTimestamp(),
              });
        }

        widget.onShowKetQua(major, unis, userScores, majorReqs);
      } else {
        _showError('Dự đoán thất bại: ${result['error'] ?? ''}');
      }
    } catch (e) {
      if (context.mounted) Navigator.pop(context);
      _showError('Lỗi kết nối BE: $e');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  final List<InterestItem> inItems = [
    InterestItem(
      title: 'Sự năng động & Hoạt bát',
      icon: Icons.bolt,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Làm việc Độc lập (Hướng nội)',
      icon: Icons.shield_outlined,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Sự Sáng tạo & Đổi mới',
      icon: Icons.lightbulb_outline,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Tư duy Logic & Phân tích',
      icon: Icons.grid_view_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Sự Tò mò & Khám phá',
      icon: Icons.search_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Sự Cảm thông & Sẻ chia',
      icon: Icons.favorite_border_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Yêu thích Công nghệ & Lập trình',
      icon: Icons.code_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Yêu thích Hoạt động Xã hội',
      icon: Icons.groups_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Yêu thích Y tế & Sức khỏe',
      icon: Icons.medical_services_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
    InterestItem(
      title: 'Yêu thích Văn hóa & Nghệ thuật',
      icon: Icons.palette_rounded,
      iconBg: const Color(0xFFFFE7E7),
      iconColor: Colors.red,
      value: 3,
    ),
  ];

  String getMoodEmoji(int value) {
    switch (value) {
      case 1:
        return '😣';
      case 2:
        return '🙁';
      case 3:
        return '😐';
      case 4:
        return '🙂';
      case 5:
        return '😄';
      default:
        return '😐';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: Stack(
                children: [
                  ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 110),
                    itemCount: inItems.length,
                    itemBuilder: (context, index) {
                      final item = inItems[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: InterestCard(
                          item: item,
                          moodEmoji: getMoodEmoji(item.value),
                          onChanged: (newValue) {
                            setState(() {
                              inItems[index] = inItems[index].copyWith(
                                value: newValue,
                              );
                            });
                          },
                        ),
                      );
                    },
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 16,
                    child: SizedBox(
                      height: 58,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2E63F5), Color(0xFFB21CFF)],
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.12),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _onPredict,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Phân tích AI',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(width: 8),
                              Icon(
                                Icons.auto_awesome,
                                color: Colors.white,
                                size: 22,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: const BoxDecoration(
        color: Color(0xFF203D9A),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(34),
          bottomRight: Radius.circular(34),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(24),
                  onTap: widget.onBack,
                  child: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF14D8C4),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Bước 2/2',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          const Text(
            'Bạn là một người như thế nào nhỉ?',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Kéo thanh trượt để cho mình biết sở thích của bạn nhé (1 = Rất ghét, 5 = Rất thích).',
            style: TextStyle(
              color: Color(0xFFDCE6FF),
              fontSize: 16,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class InterestItem {
  final String title;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final int value;

  InterestItem({
    required this.title,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.value,
  });

  InterestItem copyWith({
    String? title,
    IconData? icon,
    Color? iconBg,
    Color? iconColor,
    int? value,
  }) {
    return InterestItem(
      title: title ?? this.title,
      icon: icon ?? this.icon,
      iconBg: iconBg ?? this.iconBg,
      iconColor: iconColor ?? this.iconColor,
      value: value ?? this.value,
    );
  }
}

class InterestCard extends StatelessWidget {
  final InterestItem item;
  final String moodEmoji;
  final ValueChanged<int> onChanged;

  const InterestCard({
    super.key,
    required this.item,
    required this.moodEmoji,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: item.iconBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(item.icon, color: item.iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF13203A),
                    height: 1.3,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(moodEmoji, style: const TextStyle(fontSize: 28)),
            ],
          ),
          const SizedBox(height: 22),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              trackHeight: 8,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
              activeTrackColor: const Color(0xFFE3B400),
              inactiveTrackColor: const Color(0xFFE2E4EA),
              thumbColor: const Color(0xFF1687E0),
              overlayColor: const Color(0x331687E0),
            ),
            child: Slider(
              value: item.value.toDouble(),
              min: 1,
              max: 5,
              divisions: 4,
              onChanged: (value) => onChanged(value.round()),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Row(
              children: [
                const Text(
                  'RẤT GHÉT',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFA4ACBD),
                  ),
                ),
                Expanded(
                  child: Center(
                    child: Text(
                      '${item.value}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFE3B400),
                        height: 1,
                      ),
                    ),
                  ),
                ),
                const Text(
                  'RẤT THÍCH',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFA4ACBD),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
