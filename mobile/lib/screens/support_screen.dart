import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'support_request_screen.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),

      appBar: AppBar(
        backgroundColor: const Color(0xff1e3a8a),
        elevation: 0,

        centerTitle: true,

        iconTheme: const IconThemeData(color: Colors.white),

        title: const Text(
          "Liên hệ hỗ trợ",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),

      body: Stack(
        children: [
          // ==================================================
          // TOP BACKGROUND
          // ==================================================
          Container(
            height: 180,

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
          ),

          // ==================================================
          // CONTENT
          // ==================================================
          SingleChildScrollView(
            physics: const ClampingScrollPhysics(),

            padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),

            child: Column(
              children: [
                // ==============================================
                // HEADER CARD
                // ==============================================
                Container(
                  width: double.infinity,

                  padding: const EdgeInsets.all(24),

                  decoration: BoxDecoration(
                    color: Colors.white,

                    borderRadius: BorderRadius.circular(30),

                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
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
                            colors: [Color(0xff06b6d4), Color(0xff14b8a6)],
                          ),

                          shape: BoxShape.circle,
                        ),

                        child: const Icon(
                          Icons.support_agent_rounded,
                          color: Colors.white,
                          size: 44,
                        ),
                      ),

                      const SizedBox(height: 20),

                      const Text(
                        "Chúng tôi luôn sẵn sàng hỗ trợ",
                        textAlign: TextAlign.center,

                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xff1e293b),
                        ),
                      ),

                      const SizedBox(height: 12),

                      const Text(
                        "Liên hệ với đội ngũ hỗ trợ nếu bạn gặp bất kỳ vấn đề nào trong quá trình sử dụng ứng dụng.",
                        textAlign: TextAlign.center,

                        style: TextStyle(
                          fontSize: 14,
                          height: 1.8,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // ==============================================
                // CONTACT ITEMS
                // ==============================================
                _buildContactItem(
                  icon: Icons.email_outlined,
                  iconColor: const Color(0xff2563eb),
                  bgColor: const Color(0xffeff6ff),

                  title: "Email hỗ trợ",
                  subtitle: "support@edutalk.ai",
                ),

                _buildContactItem(
                  icon: Icons.phone_outlined,
                  iconColor: const Color(0xff059669),
                  bgColor: const Color(0xffecfdf5),

                  title: "Hotline",
                  subtitle: "1900 6067",
                ),

                const SizedBox(height: 24),

                // ==============================================
                // BUTTON
                // ==============================================
                SizedBox(
                  width: double.infinity,
                  height: 56,

                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SupportRequestScreen(),
                        ),
                      );
                    },

                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xff1e293b),

                      elevation: 0,

                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),

                    child: const Text(
                      "Gửi yêu cầu hỗ trợ",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // ==============================================
                // REQUEST HISTORY SECTION
                // ==============================================
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xffeff6ff),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.history_rounded,
                        color: Color(0xff2563eb),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      "Lịch sử yêu cầu",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xff1e293b),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance
                      .collection('support_requests')
                      .where(
                        'uid',
                        isEqualTo: FirebaseAuth.instance.currentUser?.uid,
                      )
                      .snapshots(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (snapshot.hasError) {
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xfffef2f2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          "Lỗi tải dữ liệu: ${snapshot.error}",
                          style: const TextStyle(color: Color(0xffdc2626)),
                        ),
                      );
                    }

                    final docs = snapshot.data?.docs ?? [];
                    if (docs.isEmpty) {
                      return Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 30,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xffe2e8f0)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 40,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              "Chưa có yêu cầu hỗ trợ",
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey.shade500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Các yêu cầu hỗ trợ bạn gửi sẽ hiển thị ở đây.",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    // Sắp xếp in-memory theo thời gian giảm dần
                    final sortedDocs = List<QueryDocumentSnapshot>.from(docs);
                    sortedDocs.sort((a, b) {
                      final aTime =
                          (a.data() as Map<String, dynamic>?)?['createdAt']
                              as Timestamp?;
                      final bTime =
                          (b.data() as Map<String, dynamic>?)?['createdAt']
                              as Timestamp?;
                      if (aTime == null && bTime == null) return 0;
                      if (aTime == null) return 1;
                      if (bTime == null) return -1;
                      return bTime.compareTo(aTime);
                    });

                    return Column(
                      children: sortedDocs
                          .map((doc) => _buildRequestCard(doc))
                          .toList(),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestCard(QueryDocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final title = data['title'] ?? 'Không có tiêu đề';
    final message = data['message'] ?? '';
    final type = data['type'] ?? 'Khác';
    final status = data['status'] ?? 'pending';
    final createdAtVal = data['createdAt'];
    final answer = data['answer'];
    final answeredAtVal = data['answeredAt'];

    String dateStr = '';
    if (createdAtVal is Timestamp) {
      dateStr = DateFormat('dd/MM/yyyy HH:mm').format(createdAtVal.toDate());
    }

    String answeredDateStr = '';
    if (answeredAtVal is Timestamp) {
      answeredDateStr = DateFormat(
        'dd/MM/yyyy HH:mm',
      ).format(answeredAtVal.toDate());
    }

    final isResolved = status == 'resolved';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(color: const Color(0xfff1f5f9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xfff1f5f9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  type,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xff475569),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: isResolved
                      ? const Color(0xffdcfce7)
                      : const Color(0xfffef3c7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isResolved ? "Đã phản hồi" : "Đang chờ",
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isResolved
                        ? const Color(0xff15803d)
                        : const Color(0xffb45309),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xff1e293b),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xff475569),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.access_time_rounded,
                size: 14,
                color: Colors.grey,
              ),
              const SizedBox(width: 4),
              Text(
                dateStr,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          if (isResolved && answer != null) ...[
            const SizedBox(height: 16),
            const Divider(height: 1, color: Color(0xffe2e8f0)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xfff0fdf4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xffdcfce7)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.admin_panel_settings_rounded,
                        color: Color(0xff15803d),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        "Giải đáp của Admin",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xff15803d),
                        ),
                      ),
                      const Spacer(),
                      if (answeredDateStr.isNotEmpty)
                        Text(
                          answeredDateStr,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xff15803d),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    answer.toString(),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xff166534),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactItem({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    required String subtitle,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 18),

      padding: const EdgeInsets.all(18),

      decoration: BoxDecoration(
        color: Colors.white,

        borderRadius: BorderRadius.circular(24),

        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),

      child: Row(
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
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xff1e293b),
                  ),
                ),

                const SizedBox(height: 6),

                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color.fromARGB(255, 22, 22, 22),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          const Icon(Icons.chevron_right_rounded, color: Colors.grey),
        ],
      ),
    );
  }
}
