import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../provider/Themenotifier.dart';
import 'Login.dart';
import 'ChangePass.dart';
import 'privacy_policy_screen.dart';
import 'terms_screen.dart';
import '../services/notification_service.dart';

class SettingScreen extends StatefulWidget {
  const SettingScreen({super.key});

  @override
  State<SettingScreen> createState() => _SettingScreenState();
}

class _SettingScreenState extends State<SettingScreen> {
  bool _isNotificationEnabled = true;

  @override
  void initState() {
    super.initState();
    _loadNotificationSetting();
  }

  Future<void> _loadNotificationSetting() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final doc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      if (doc.exists && mounted) {
        setState(() {
          _isNotificationEnabled = doc.data()?['isNotificationEnabled'] ?? true;
        });
      }
    }
  }

  Future<void> _toggleNotification(bool val) async {
    setState(() {
      _isNotificationEnabled = val;
    });
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      // 1. Lưu tùy chọn vào Firestore
      await FirebaseFirestore.instance.collection('users').doc(user.uid).update({
        'isNotificationEnabled': val,
      });

      // 2. Cập nhật FCM token tương ứng (nếu bật thì lưu token, nếu tắt thì xóa token)
      await NotificationService.getAndSaveToken();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeNotifier>(
      builder: (context, themeNotifier, _) {
        const isDark = false;

        // Màu sắc thích nghi theo theme
        final bgColor = const Color(0xFFF6F7FB);
        final cardColor = Colors.white;
        final textColor = const Color(0xFF1e293b);
        final subtitleColor = Colors.grey;
        final dividerColor = const Color(0xFFF1F5F9);

        return Scaffold(
          backgroundColor: bgColor,
          body: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            child: Column(
              children: [
                _buildHeader(isDark),
                _buildMainContent(
                  themeNotifier: themeNotifier,
                  isDark: isDark,
                  bgColor: bgColor,
                  cardColor: cardColor,
                  textColor: textColor,
                  subtitleColor: subtitleColor,
                  dividerColor: dividerColor,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      height: 220,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomRight,
          colors: [Color(0xff1e3a8a), Color(0xff312e81), Color(0xff0f766e)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),
              IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios,
                  color: Colors.white,
                  size: 20,
                ),
                onPressed: () => Navigator.pop(context),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.settings,
                      color: Color(0xff4DD0E1),
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 15),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Cài đặt",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        "Tùy chỉnh ứng dụng theo ý bạn",
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainContent({
    required ThemeNotifier themeNotifier,
    required bool isDark,
    required Color bgColor,
    required Color cardColor,
    required Color textColor,
    required Color subtitleColor,
    required Color dividerColor,
  }) {
    return Column(
      children: [
        const SizedBox(height: 20),

        // ── Cài đặt chung ──────────────────────────────────────
        _buildSection(
          title: "Cài đặt chung",
          cardColor: cardColor,
          textColor: textColor,
          dividerColor: dividerColor,
          items: [
            _buildToggleItem(
              icon: Icons.notifications_none_rounded,
              iconColor: const Color(0xff2563eb),
              bgColor: isDark
                  ? const Color(0xFF1E3A5F)
                  : const Color(0xffeff6ff),
              title: "Thông báo",
              subtitle: "Nhận thông báo từ ứng dụng",
              value: _isNotificationEnabled,
              textColor: textColor,
              subtitleColor: subtitleColor,
              onChanged: _toggleNotification,
            ),

            _buildNavigationItem(
              icon: Icons.language_rounded,
              iconColor: const Color(0xff059669),
              bgColor: isDark
                  ? const Color(0xFF0F3A2A)
                  : const Color(0xffecfeff),
              title: "Ngôn ngữ",
              subtitle: "Tiếng Việt",
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () {},
            ),
          ],
        ),
        const SizedBox(height: 20),

        // ── Bảo mật & Quyền riêng tư ───────────────────────────
        _buildSection(
          title: "Bảo mật & Quyền riêng tư",
          cardColor: cardColor,
          textColor: textColor,
          dividerColor: dividerColor,
          items: [
            // ── ĐỔI MẬT KHẨU → mở ChangePasswordScreen ────────
            _buildNavigationItem(
              icon: Icons.lock_outline_rounded,
              iconColor: const Color(0xfff59e0b),
              bgColor: isDark
                  ? const Color(0xFF3D2A00)
                  : const Color(0xfffff7ed),
              title: "Đổi mật khẩu",
              subtitle: "Cập nhật mật khẩu của bạn",
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ChangePasswordScreen(),
                  ),
                );
              },
            ),

            _buildNavigationItem(
              icon: Icons.security_outlined,
              iconColor: const Color(0xff6366f1),
              bgColor: isDark
                  ? const Color(0xFF1E1B4B)
                  : const Color(0xffeef2ff),
              title: "Chính sách bảo mật",
              subtitle: "Xem cách chúng tôi bảo vệ dữ liệu",
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const PrivacyPolicyScreen(),
                  ),
                );
              },
            ),

            _buildNavigationItem(
              icon: Icons.description_outlined,
              iconColor: const Color(0xff06b6d4),
              bgColor: isDark
                  ? const Color(0xFF0C2D38)
                  : const Color(0xffecfeff),
              title: "Điều khoản sử dụng",
              subtitle: "Xem điều khoản & điều kiện",
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const TermsScreen()),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 20),

        // ── Tài khoản ──────────────────────────────────────────
        _buildSection(
          cardColor: cardColor,
          textColor: textColor,
          dividerColor: dividerColor,
          items: [
            // Đăng xuất
            _buildNavigationItem(
              icon: Icons.logout_rounded,
              iconColor: const Color(0xffef4444),
              bgColor: isDark
                  ? const Color(0xFF3D0F0F)
                  : const Color(0xfffef2f2),
              title: "Đăng xuất",
              subtitle: "Thoát khỏi tài khoản hiện tại",
              titleColor: const Color(0xffef4444),
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () async {
                final shouldLogout = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: cardColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    title: Row(
                      children: [
                        const Icon(
                          Icons.logout_rounded,
                          color: Color(0xffef4444),
                        ),
                        const SizedBox(width: 10),
                        Text("Đăng xuất", style: TextStyle(color: textColor)),
                      ],
                    ),
                    content: Text(
                      "Bạn có chắc chắn muốn đăng xuất không?",
                      style: TextStyle(color: subtitleColor),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text(
                          "Hủy",
                          style: TextStyle(
                            color: Colors.grey,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text(
                          "Đăng xuất",
                          style: TextStyle(
                            color: Color(0xffef4444),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
                if (shouldLogout == true && mounted) {
                  // Reset theme về light khi logout
                  context.read<ThemeNotifier>().reset();
                  await AuthService().signOut();
                  if (!mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              },
            ),

            // Xóa tài khoản
            _buildNavigationItem(
              icon: Icons.delete_outline_rounded,
              iconColor: const Color(0xffef4444),
              bgColor: isDark
                  ? const Color(0xFF3D0F0F)
                  : const Color(0xfffef2f2),
              title: "Xóa tài khoản",
              subtitle: "Xóa vĩnh viễn tài khoản của bạn",
              titleColor: const Color(0xffef4444),
              textColor: textColor,
              subtitleColor: subtitleColor,
              onTap: () async {
                final shouldDelete = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: cardColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    title: Row(
                      children: [
                        const Icon(
                          Icons.warning_amber_rounded,
                          color: Colors.red,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          "Xóa tài khoản",
                          style: TextStyle(color: textColor),
                        ),
                      ],
                    ),
                    content: Text(
                      "Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn.",
                      style: TextStyle(color: subtitleColor),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: Text(
                          "Hủy",
                          style: TextStyle(
                            color: subtitleColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text(
                          "Xóa vĩnh viễn",
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
                if (shouldDelete == true && mounted) {
                  showDialog(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const Center(
                      child: CircularProgressIndicator(color: Colors.red),
                    ),
                  );
                  try {
                    final result = await AuthService().deleteAccount();
                    if (!mounted) return;
                    Navigator.pop(context);
                    if (result['status'] == 'success') {
                      context.read<ThemeNotifier>().reset();
                      Navigator.popUntil(context, (route) => route.isFirst);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Đã xóa tài khoản vĩnh viễn!"),
                          backgroundColor: Colors.red,
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            result['message'] ?? "Xóa tài khoản thất bại",
                          ),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  } catch (e) {
                    if (!mounted) return;
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Lỗi: $e"),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
            ),
          ],
        ),

        const SizedBox(height: 30),
        Text(
          "AI Tư vấn tuyển sinh",
          style: TextStyle(color: subtitleColor, fontSize: 13),
        ),
        Text(
          "Phiên bản 1.0.0",
          style: TextStyle(color: subtitleColor, fontSize: 12),
        ),
        const SizedBox(height: 100),
      ],
    );
  }

  // ── Section wrapper ────────────────────────────────────────────────────────
  Widget _buildSection({
    String? title,
    required Color cardColor,
    required Color textColor,
    required Color dividerColor,
    required List<Widget> items,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(left: 20, top: 20, bottom: 10),
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
            ),
          if (title != null) Divider(height: 1, color: dividerColor),
          ...items.asMap().entries.map((entry) {
            int idx = entry.key;
            Widget item = entry.value;
            return Column(
              children: [
                item,
                if (idx < items.length - 1)
                  Padding(
                    padding: const EdgeInsets.only(left: 70),
                    child: Divider(height: 1, color: dividerColor),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }

  // ── Toggle item ────────────────────────────────────────────────────────────
  Widget _buildToggleItem({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    required String subtitle,
    required bool value,
    required Color textColor,
    required Color subtitleColor,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _buildIcon(icon, iconColor, bgColor),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                    color: textColor,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: subtitleColor, fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xff2563eb),
          ),
        ],
      ),
    );
  }

  // ── Navigation item ────────────────────────────────────────────────────────
  Widget _buildNavigationItem({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    required String subtitle,
    required Color textColor,
    required Color subtitleColor,
    Color? titleColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            _buildIcon(icon, iconColor, bgColor),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: titleColor ?? textColor,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(color: subtitleColor, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 14, color: subtitleColor),
          ],
        ),
      ),
    );
  }

  Widget _buildIcon(IconData icon, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
      child: Icon(icon, color: color, size: 22),
    );
  }
}
