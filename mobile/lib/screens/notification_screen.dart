import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:ui_login_out/services/post_service.dart';
import 'package:ui_login_out/models/post_model.dart';
import 'support_screen.dart';

// Hàm tính thời gian nội bộ (Chỉ dùng riêng trong file này để khỏi báo lỗi)
String _getTimeAgo(DateTime dateTime) {
  Duration diff = DateTime.now().difference(dateTime);
  if (diff.inDays > 365) return "${(diff.inDays / 365).floor()} năm trước";
  if (diff.inDays > 30) return "${(diff.inDays / 30).floor()} tháng trước";
  if (diff.inDays > 0) return "${diff.inDays} ngày trước";
  if (diff.inHours > 0) return "${diff.inHours} giờ trước";
  if (diff.inMinutes > 0) return "${diff.inMinutes} phút trước";
  return "Vừa xong";
}

// ===========================================================================
// TRANG THÔNG BÁO (FULL SCREEN)
// ===========================================================================
class NotificationScreen extends StatefulWidget {
  // Callback để truyền ID bài viết về trang Thảo Luận
  final Function(String) onOpenPost; 

  const NotificationScreen({super.key, required this.onOpenPost});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  bool _isUnreadOnly = false;
  final Set<String> _readInSession = {};

  Future<void> _markAsRead(NotificationModel notif) async {
    if (notif.id == null) return;
    setState(() => _readInSession.add(notif.id!));
    await PostService().markNotificationAsRead(notif.id!);
  }

  Future<void> _markAllAsRead(List<NotificationModel> notifs) async {
    final unread = notifs.where((n) => !n.isRead && !_readInSession.contains(n.id)).toList();
    if (unread.isEmpty) return;
    setState(() {
      for (final n in unread) {
        if (n.id != null) _readInSession.add(n.id!);
      }
    });
    await PostService().markAllNotificationsAsRead(
      unread.map((n) => n.id!).where((id) => id.isNotEmpty).toList(),
    );
  }

  bool _isRead(NotificationModel notif) =>
      notif.isRead || _readInSession.contains(notif.id);

  Future<void> _openPost(BuildContext context, NotificationModel notif) async {
    await _markAsRead(notif);
    if (context.mounted) {
      if (notif.type == 'support' || notif.type == 'support_pending') {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const SupportScreen()),
        );
      } else {
        // 1. Kích hoạt Callback để truyền ID về trang Thảo Luận
        widget.onOpenPost(notif.postId); 
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        // ĐÃ SỬA: Custom nút Back để đóng màn hình thông báo
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 20),
          onPressed: () {
            Navigator.pop(context); // Trở về trang Thảo Luận
          },
        ),
        title: const Text(
          "Thông báo", 
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _TabPill(label: "Tất cả", active: !_isUnreadOnly, onTap: () => setState(() => _isUnreadOnly = false)),
                const SizedBox(width: 8),
                _TabPill(label: "Chưa đọc", active: _isUnreadOnly, onTap: () => setState(() => _isUnreadOnly = true)),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: currentUser == null
                ? const Center(child: Text("Bạn cần đăng nhập để xem thông báo.", style: TextStyle(color: Colors.grey)))
                : StreamBuilder<List<NotificationModel>>(
                    stream: PostService().getNotificationsStream(currentUser.uid),
                    builder: (context, snapshot) {
                      if (snapshot.hasError) {
                        return Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: SelectableText(
                              "Lỗi tải thông báo: ${snapshot.error}",
                              style: const TextStyle(color: Colors.red),
                            ),
                          ),
                        );
                      }

                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      final allNotifs = snapshot.data ?? [];
                      var notifs = _isUnreadOnly
                          ? allNotifs.where((n) => !_isRead(n)).toList()
                          : allNotifs;

                      if (notifs.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.notifications_off_outlined, size: 64, color: Colors.grey.shade300),
                              const SizedBox(height: 16),
                              Text(
                                _isUnreadOnly ? "Không có thông báo chưa đọc." : "Chưa có thông báo nào.",
                                style: const TextStyle(color: Colors.grey, fontSize: 16),
                              ),
                            ],
                          ),
                        );
                      }

                      final unreadNotifs = notifs.where((n) => !_isRead(n)).toList();
                      final readNotifs = notifs.where((n) => _isRead(n)).toList();

                      return ListView(
                        padding: const EdgeInsets.only(bottom: 24),
                        children: [
                          if (!_isUnreadOnly && unreadNotifs.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text("Mới", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  GestureDetector(
                                    onTap: () => _markAllAsRead(allNotifs),
                                    child: const Text("Đọc tất cả", style: TextStyle(fontSize: 14, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                            ),
                            ...unreadNotifs.map((n) => _NotifItem(
                              notif: n,
                              isRead: false,
                              onTap: () => _openPost(context, n),
                            )),
                          ],

                          if (!_isUnreadOnly && readNotifs.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: const Text("Trước đó", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            ),
                            ...readNotifs.map((n) => _NotifItem(
                              notif: n,
                              isRead: true,
                              onTap: () => _openPost(context, n),
                            )),
                          ],

                          if (_isUnreadOnly) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text("Chưa đọc", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  GestureDetector(
                                    onTap: () => _markAllAsRead(allNotifs),
                                    child: const Text("Đọc tất cả", style: TextStyle(fontSize: 14, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                            ),
                            ...notifs.map((n) => _NotifItem(
                              notif: n,
                              isRead: false,
                              onTap: () => _openPost(context, n),
                            )),
                          ],
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotifItem extends StatelessWidget {
  final NotificationModel notif;
  final bool isRead;
  final VoidCallback onTap;

  const _NotifItem({required this.notif, required this.isRead, required this.onTap});

  IconData _subIcon(String type) {
    if (type == 'like') return Icons.favorite;
    if (type == 'reply') return Icons.reply_rounded;
    if (type == 'support' || type == 'support_pending') return Icons.support_agent_rounded;
    return Icons.mode_comment;
  }

  Color _subIconColor(String type) {
    if (type == 'like') return Colors.redAccent;
    if (type == 'support' || type == 'support_pending') return Colors.green;
    return Colors.blueAccent;
  }

  String _message(String type) {
    if (type == 'like') return "đã thích bài viết của bạn.";
    if (type == 'comment') return "đã bình luận vào bài viết của bạn.";
    if (type == 'reply') return "đã trả lời bình luận của bạn.";
    if (type == 'support') return "đã phản hồi yêu cầu hỗ trợ của bạn.";
    if (type == 'support_pending') return "đã tiếp nhận yêu cầu hỗ trợ của bạn. Yêu cầu của bạn sẽ được gửi đến admin để xử lý và phản hồi lại sau.";
    return "đã tương tác với bài viết của bạn.";
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: isRead ? Colors.transparent : const Color(0xFFF0F5FF),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: 60, height: 60,
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: const Color(0xFFE7EAEE),
                    child: Text(
                      notif.senderName.isNotEmpty ? notif.senderName[0].toUpperCase() : "U",
                      style: const TextStyle(fontSize: 20, color: Colors.black54),
                    ),
                  ),
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: Icon(_subIcon(notif.type), size: 16, color: _subIconColor(notif.type)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    text: TextSpan(
                      style: const TextStyle(color: Colors.black87, fontSize: 14, height: 1.4),
                      children: [
                        TextSpan(text: "${notif.senderName} ", style: const TextStyle(fontWeight: FontWeight.bold)),
                        TextSpan(text: _message(notif.type)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getTimeAgo(notif.createdAt), // Dùng hàm nội bộ
                    style: TextStyle(
                      fontSize: 13,
                      color: isRead ? Colors.grey.shade500 : const Color(0xFF2563EB),
                      fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            if (!isRead) ...[
              const SizedBox(width: 8),
              Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle)),
            ],
          ],
        ),
      ),
    );
  }
}

class _TabPill extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TabPill({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFFEAF1FF) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(fontWeight: FontWeight.bold, color: active ? const Color(0xFF2563EB) : Colors.black54),
        ),
      ),
    );
  }
}