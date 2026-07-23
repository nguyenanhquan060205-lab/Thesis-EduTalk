import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

class SupportRequestScreen extends StatefulWidget {
  const SupportRequestScreen({super.key});

  @override
  State<SupportRequestScreen> createState() =>
      _SupportRequestScreenState();
}

class _SupportRequestScreenState
    extends State<SupportRequestScreen> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController titleController =
      TextEditingController();

  final TextEditingController messageController =
      TextEditingController();

  bool isLoading = false;

  String selectedType = "Lỗi hệ thống";

  final List<String> supportTypes = [
    "Lỗi hệ thống",
    "Thanh toán",
    "Tài khoản",
    "Góp ý",
    "Khác",
  ];

  Future<void> sendSupportRequest() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      setState(() {
        isLoading = true;
      });

      final user = FirebaseAuth.instance.currentUser;

      final docRef = await FirebaseFirestore.instance
          .collection("support_requests")
          .add({
        "uid": user?.uid,
        "email": user?.email,
        "title": titleController.text.trim(),
        "message": messageController.text.trim(),
        "type": selectedType,
        "status": "pending",
        "createdAt": Timestamp.now(),
      });

      if (user?.uid != null) {
        await FirebaseFirestore.instance.collection('notifications').add({
          'receiverId': user!.uid,
          'senderId': 'system',
          'senderName': 'Edutalk',
          'type': 'support_pending',
          'postId': docRef.id,
          'isRead': false,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Gửi hỗ trợ thành công"),
          ),
        );

        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Lỗi: $e"),
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    titleController.dispose();
    messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff4f6fb),

      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,

        iconTheme: const IconThemeData(
          color: Colors.black,
        ),

        title: const Text(
          "Gửi hỗ trợ",
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),

          child: Form(
            key: _formKey,

            child: Container(
              padding: const EdgeInsets.all(22),

              decoration: BoxDecoration(
                color: Colors.white,

                borderRadius: BorderRadius.circular(30),

                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),

              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,

                children: [
                  // =========================================
                  // ICON
                  // =========================================
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,

                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Color(0xff2563eb),
                            Color(0xff06b6d4),
                          ],
                        ),

                        shape: BoxShape.circle,
                      ),

                      child: const Icon(
                        Icons.support_agent_rounded,
                        color: Colors.white,
                        size: 40,
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  const Center(
                    child: Text(
                      "Yêu cầu hỗ trợ",
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Color(0xff111827),
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  const Center(
                    child: Text(
                      "Hãy mô tả vấn đề bạn đang gặp phải để đội ngũ hỗ trợ giúp bạn nhanh hơn.",
                      textAlign: TextAlign.center,

                      style: TextStyle(
                        fontSize: 14,
                        height: 1.6,
                        color: Color(0xff374151),
                      ),
                    ),
                  ),

                  const SizedBox(height: 30),

                  // =========================================
                  // TYPE
                  // =========================================
                  const Text(
                    "Loại hỗ trợ",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xff111827),
                    ),
                  ),

                  const SizedBox(height: 10),

                  DropdownButtonFormField<String>(
                    value: selectedType,

                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                    ),

                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xfff9fafb),

                      contentPadding:
                          const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 18,
                      ),

                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),

                      enabledBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),

                        borderSide: const BorderSide(
                          color: Color(0xffe5e7eb),
                        ),
                      ),

                      focusedBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),

                        borderSide: const BorderSide(
                          color: Color(0xff2563eb),
                          width: 1.5,
                        ),
                      ),
                    ),

                    items: supportTypes.map((e) {
                      return DropdownMenuItem(
                        value: e,
                        child: Text(e),
                      );
                    }).toList(),

                    onChanged: (value) {
                      setState(() {
                        selectedType = value!;
                      });
                    },
                  ),

                  const SizedBox(height: 24),

                  // =========================================
                  // TITLE
                  // =========================================
                  const Text(
                    "Tiêu đề",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xff111827),
                    ),
                  ),

                  const SizedBox(height: 10),

                  TextFormField(
                    controller: titleController,

                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                    ),

                    validator: (value) {
                      if (value == null ||
                          value.trim().isEmpty) {
                        return "Vui lòng nhập tiêu đề";
                      }
                      return null;
                    },

                    decoration: InputDecoration(
                      hintText: "Nhập tiêu đề hỗ trợ",

                      hintStyle: const TextStyle(
                        color: Colors.black54,
                        fontSize: 14,
                      ),

                      filled: true,
                      fillColor: const Color(0xfff9fafb),

                      contentPadding:
                          const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 18,
                      ),

                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),

                      enabledBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),

                        borderSide: const BorderSide(
                          color: Color(0xffe5e7eb),
                        ),
                      ),

                      focusedBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(18),

                        borderSide: const BorderSide(
                          color: Color(0xff2563eb),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // =========================================
                  // MESSAGE
                  // =========================================
                  const Text(
                    "Nội dung",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xff111827),
                    ),
                  ),

                  const SizedBox(height: 10),

                  TextFormField(
                    controller: messageController,

                    maxLines: 7,

                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      height: 1.6,
                    ),

                    validator: (value) {
                      if (value == null ||
                          value.trim().isEmpty) {
                        return "Vui lòng nhập nội dung";
                      }
                      return null;
                    },

                    decoration: InputDecoration(
                      hintText:
                          "Mô tả chi tiết vấn đề của bạn...",

                      hintStyle: const TextStyle(
                        color: Colors.black54,
                        fontSize: 14,
                      ),

                      filled: true,
                      fillColor: const Color(0xfff9fafb),

                      contentPadding:
                          const EdgeInsets.all(18),

                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(22),
                        borderSide: BorderSide.none,
                      ),

                      enabledBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(22),

                        borderSide: const BorderSide(
                          color: Color(0xffe5e7eb),
                        ),
                      ),

                      focusedBorder: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(22),

                        borderSide: const BorderSide(
                          color: Color(0xff2563eb),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 35),

                  // =========================================
                  // BUTTON
                  // =========================================
                  SizedBox(
                    width: double.infinity,
                    height: 58,

                    child: ElevatedButton(
                      onPressed: isLoading
                          ? null
                          : sendSupportRequest,

                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            const Color(0xff1e293b),

                        elevation: 0,

                        shape: RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(20),
                        ),
                      ),

                      child: isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,

                              child:
                                  CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2.5,
                              ),
                            )
                          : const Text(
                              "Gửi hỗ trợ",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight:
                                    FontWeight.bold,
                                letterSpacing: 0.3,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}