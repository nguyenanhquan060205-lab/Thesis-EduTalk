import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class SupportManagementScreen extends StatefulWidget {
  const SupportManagementScreen({super.key});

  @override
  State<SupportManagementScreen> createState() => _SupportManagementScreenState();
}

class _SupportManagementScreenState extends State<SupportManagementScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  int _activeTab = 0; // 0: Chưa xử lý, 1: Đã xử lý

  void _showAnswerSheet(BuildContext context, String docId, String title, String message, String userEmail, String? userUid) {
    final replyController = TextEditingController();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 24,
                right: 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      "Giải đáp hỗ trợ",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      "Từ: $userEmail",
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Tiêu đề: $title",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(message, style: const TextStyle(height: 1.5, color: Colors.black87)),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      "Câu trả lời của bạn",
                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: replyController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: "Nhập nội dung giải đáp cho người dùng...",
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: isSaving ? null : () async {
                          final answer = replyController.text.trim();
                          if (answer.isEmpty) return;

                          setSheetState(() => isSaving = true);
                          try {
                            await _db.collection('support_requests').doc(docId).update({
                              'answer': answer,
                              'answeredAt': FieldValue.serverTimestamp(),
                              'status': 'resolved',
                            });

                            if (userUid != null && userUid.isNotEmpty) {
                              await _db.collection('notifications').add({
                                'receiverId': userUid,
                                'senderId': 'admin',
                                'senderName': 'Quản trị viên',
                                'type': 'support',
                                'postId': docId,
                                'isRead': false,
                                'createdAt': FieldValue.serverTimestamp(),
                              });
                            }
                            if (context.mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Đã gửi giải đáp thành công!"), backgroundColor: Colors.green),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text("Lỗi: $e"), backgroundColor: Colors.red),
                              );
                            }
                          } finally {
                            setSheetState(() => isSaving = false);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: isSaving
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text("Gửi giải đáp", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            );
          }
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Column(
        children: [
          // Tabs
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _activeTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _activeTab == 0 ? const Color(0xFF2563EB) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _activeTab == 0 ? Colors.transparent : Colors.grey.shade300),
                      ),
                      child: Center(
                        child: Text(
                          "Chưa xử lý",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _activeTab == 0 ? Colors.white : Colors.black54,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _activeTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _activeTab == 1 ? const Color(0xFF2563EB) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _activeTab == 1 ? Colors.transparent : Colors.grey.shade300),
                      ),
                      child: Center(
                        child: Text(
                          "Đã xử lý",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _activeTab == 1 ? Colors.white : Colors.black54,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Request List
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _db
                  .collection('support_requests')
                  .where('status', isEqualTo: _activeTab == 0 ? 'pending' : 'resolved')
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text("Lỗi: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
                }
                final docs = snapshot.data?.docs ?? [];
                if (docs.isEmpty) {
                  return Center(
                    child: Text(
                      _activeTab == 0 ? "Không có yêu cầu hỗ trợ chưa xử lý." : "Không có yêu cầu hỗ trợ đã xử lý.",
                      style: const TextStyle(color: Colors.grey),
                    ),
                  );
                }

                // Sắp xếp in-memory theo thời gian giảm dần
                final sortedDocs = List<QueryDocumentSnapshot>.from(docs);
                sortedDocs.sort((a, b) {
                  final aTime = (a.data() as Map<String, dynamic>?)?['createdAt'] as Timestamp?;
                  final bTime = (b.data() as Map<String, dynamic>?)?['createdAt'] as Timestamp?;
                  if (aTime == null && bTime == null) return 0;
                  if (aTime == null) return 1;
                  if (bTime == null) return -1;
                  return bTime.compareTo(aTime);
                });

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: sortedDocs.length,
                  itemBuilder: (context, index) {
                    final doc = sortedDocs[index];
                    final data = doc.data() as Map<String, dynamic>;
                    final title = data['title'] ?? 'Không có tiêu đề';
                    final message = data['message'] ?? '';
                    final email = data['email'] ?? 'Không rõ email';
                    final type = data['type'] ?? 'Khác';
                    final createdAtVal = data['createdAt'];
                    String dateStr = '';
                    if (createdAtVal is Timestamp) {
                      dateStr = DateFormat('dd/MM/yyyy HH:mm').format(createdAtVal.toDate());
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
                        ],
                        border: Border.all(color: Colors.grey.shade100),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  type,
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue.shade700),
                                ),
                              ),
                              Text(dateStr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B)),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            message,
                            style: const TextStyle(color: Colors.black87, height: 1.4),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            "Từ: $email",
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black54),
                          ),
                          if (_activeTab == 0) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () {
                                  final userUid = data['uid'] as String?;
                                  _showAnswerSheet(context, doc.id, title, message, email, userUid);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1E293B),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                child: const Text("Giải đáp", style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            )
                          ] else if (data['answer'] != null) ...[
                            const SizedBox(height: 12),
                            const Divider(),
                            const SizedBox(height: 8),
                            const Text("Giải đáp của Admin:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green)),
                            const SizedBox(height: 4),
                            Text(data['answer'].toString(), style: const TextStyle(color: Colors.black87, height: 1.4)),
                          ]
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
