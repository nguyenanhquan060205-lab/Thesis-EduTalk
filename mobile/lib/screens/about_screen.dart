import 'package:flutter/material.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      body: Column(
        children: [
          // ── HEADER CỐ ĐỊNH ──
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xff1e3a8a),
                  Color(0xff312e81),
                  Color(0xff0f766e),
                ],
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(42)),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 0, 20, 24),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(
                        Icons.arrow_back_ios,
                        color: Colors.white,
                        size: 20,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text(
                        "Về chúng tôi",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),
          ),

          // ── NỘI DUNG CUỘN ──
          Expanded(
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 30),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 90,
                          height: 90,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xff4f46e5), Color(0xff06b6d4)],
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.school_rounded,
                            color: Colors.white,
                            size: 42,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          "EduTalk AI",
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xff1e293b),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          "Nền tảng AI hỗ trợ tư vấn tuyển sinh",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color.fromARGB(255, 23, 23, 23),
                            fontSize: 14,
                            height: 1.7,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xffeef2ff),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            "Phiên bản 1.0.0",
                            style: TextStyle(
                              color: Color(0xff4f46e5),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildInfoCard(
                    icon: Icons.lightbulb_outline_rounded,
                    iconColor: const Color(0xfff59e0b),
                    bgColor: const Color(0xfffffbeb),
                    title: "Sứ mệnh",
                    content:
                        "Mang đến giải pháp tư vấn tuyển sinh thông minh, hiện đại và dễ tiếp cận cho học sinh và sinh viên.",
                  ),
                  _buildInfoCard(
                    icon: Icons.auto_awesome_rounded,
                    iconColor: const Color(0xff8b5cf6),
                    bgColor: const Color(0xfff5f3ff),
                    title: "Công nghệ AI",
                    content:
                        "Ứng dụng sử dụng trí tuệ nhân tạo để hỗ trợ định hướng ngành học và giải đáp thông tin tuyển sinh.",
                  ),
                  _buildInfoCard(
                    icon: Icons.groups_rounded,
                    iconColor: const Color(0xff06b6d4),
                    bgColor: const Color(0xffecfeff),
                    title: "Đội ngũ phát triển",
                    content:
                        "Được xây dựng bởi nhóm phát triển trẻ với mục tiêu tối ưu trải nghiệm học tập và hỗ trợ người dùng.",
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Column(
                      children: [
                        Text(
                          "© 2025 EduTalk AI",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Color(0xff1e293b),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          "Cảm ơn bạn đã đồng hành cùng chúng tôi.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey, height: 1.6),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    required String content,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xff1e293b),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  content,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.8,
                    color: Color.fromARGB(255, 24, 24, 24),
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
