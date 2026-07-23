import 'package:flutter/material.dart';
import 'package:ui_login_out/services/ai_chat_service.dart';

class TrendingMajorsCard extends StatelessWidget {
  const TrendingMajorsCard({super.key});

  @override
  Widget build(BuildContext context) {
    final currentYear = DateTime.now().year;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.trending_up_rounded, color: Colors.green, size: 22),
                  const SizedBox(width: 8),
                  Text("Ngành Hot $currentYear", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
                ],
              ),
              const Text("Được AI tổng hợp", style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 16),

          // ==========================================
          // GỌI HÀM LẤY DATA TỪ AI THÔNG QUA FUTUREBUILDER
          // ==========================================
          FutureBuilder<List<Map<String, dynamic>>>(
            future: GeminiChatService().getTrendingMajors(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                        SizedBox(height: 8),
                        Text("AI đang phân tích thị trường...", style: TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                );
              }
              
              if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
                return const Center(child: Text("Không thể tải xu hướng lúc này.", style: TextStyle(color: Colors.grey)));
              }

              final trends = snapshot.data!;

              return Column(
                children: trends.map((trend) {
                  return _buildTrendItem(
                    rank: trend['rank'] ?? 0, 
                    name: trend['name'] ?? '', 
                    growth: trend['growth'] ?? ''
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  // Widget con giữ nguyên như cũ
  Widget _buildTrendItem({required int rank, required String name, required String growth}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
            child: Center(child: Text(rank.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87))),
          ),
          const SizedBox(width: 16),
          Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Colors.black87))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(20)),
            child: Text(growth, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF059669))),
          ),
        ],
      ),
    );
  }
}