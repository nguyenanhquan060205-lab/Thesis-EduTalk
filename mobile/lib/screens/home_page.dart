import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:ui_login_out/screens/free_usage_store.dart';
import 'package:ui_login_out/services/premium_theme_helper.dart';
import 'Premium_screen.dart';
import 'ThongKeTs.dart';
import 'about_screen.dart';
import 'support_screen.dart';
import '../models/user_model.dart';
import 'trending_majors_card.dart';

class HomePage extends StatefulWidget {
  final ValueChanged<int>? onChangeTab;
  final VoidCallback? onOpenAbout;
  final VoidCallback? onOpenContact;

  const HomePage({
    super.key,
    this.onChangeTab,
    this.onOpenContact,
    this.onOpenAbout,
  });

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _userName = "Bạn";

  @override
  void initState() {
    super.initState();
    _loadUserSession();
  }

  void _loadUserSession() {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      setState(() {
        _userName = user.displayName ?? user.email?.split('@')[0] ?? "Bạn";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xff1e3a8a),
                          Color(0xff312e81),
                          Color(0xff0f766e),
                        ],
                      ),
                      borderRadius: BorderRadius.vertical(
                        bottom: Radius.circular(40),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Xin chào",
                          style: TextStyle(color: Colors.white70),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          "$_userName 👋",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 20),
                        freeAcountCard(context),
                        const SizedBox(height: 20),
                        BatDauTuVan(context),
                      ],
                    ),
                  ),
                  Positioned(
                    bottom: -75,
                    left: 20,
                    right: 20,
                    child: Row(
                      children: [
                        Expanded(
                          child: homeCard(
                            context,
                            icon: Icons.history,
                            title: "Lịch sử",
                            subtitle: "Xem lại kết quả",
                            iconColor: const Color(0xff2563eb),
                            iconBackground: const Color(0xffeff6ff),
                            onTap: () {
                              widget.onChangeTab?.call(3);
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: homeCard(
                            context,
                            icon: Icons.forum,
                            title: "Thảo luận",
                            subtitle: "Trao đổi với bạn bè",
                            iconColor: const Color(0xff059669),
                            iconBackground: const Color(0xffd1fae5),
                            onTap: () {
                              widget.onChangeTab?.call(1);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 90),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    const TrendingMajorsCard(),
                    const SizedBox(height: 16),
                    KhamPhaThem(context),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget KhamPhaThem(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.explore, color: Color(0xff2563eb), size: 18),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  "Khám phá thêm",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.black,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          moreItems(
            context,
            icon: Icons.bar_chart,
            iconColor: const Color(0xff2563eb),
            iconBackground: const Color(0xffeff6ff),
            title: "Dữ liệu & Báo cáo",
            subtitle: "Thống kê tuyển sinh",
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) =>
                      ThongKeTs(onTabChange: widget.onChangeTab),
                ),
              );
            },
          ),
          const SizedBox(height: 10),
          moreItems(
            context,
            icon: Icons.info_outline,
            iconColor: const Color(0xff9333ea),
            iconBackground: const Color(0xfff5f3ff),
            title: "Về chúng tôi",
            subtitle: "Giới thiệu về EduTalk",
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AboutScreen()),
              );
              widget.onOpenAbout?.call();
            },
          ),
          const SizedBox(height: 10),
          moreItems(
            context,
            icon: Icons.phone_outlined,
            iconColor: const Color(0xff0f766e),
            iconBackground: const Color(0xffecfeff),
            title: "Liên hệ hỗ trợ",
            subtitle: "Gửi câu hỏi cho chúng tôi",
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SupportScreen()),
              );
              widget.onOpenContact?.call();
            },
          ),
        ],
      ),
    );
  }

  Widget moreItems(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required Color iconBackground,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xfff8fafc),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xffeef2f7), width: 1),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget freeAcountCard(BuildContext context) {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final theme = PremiumTheme.getTheme(
          user?.plan,
          user?.isPremium ?? false,
        );
        final bool isPremium = user?.isPremium ?? false;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.bgColor, // Semi-transparent blending
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: theme.accentColor.withOpacity(0.3),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Avatar Circle with Gradient
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: theme.gradientColors,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      border: Border.all(color: Colors.white24, width: 2),
                    ),
                    child: Center(
                      child: Text(
                        (user?.name ?? _userName)[0].toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Info Column
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badge Pill
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: theme.accentColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: theme.accentColor.withOpacity(0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                theme.icon,
                                color: theme.accentColor,
                                size: 14,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                theme.title,
                                style: TextStyle(
                                  color: theme.accentColor,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Action Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isPremium
                        ? "Gói hiện tại: ${user?.planDisplayName ?? 'Premium'}"
                        : "Dùng thử: ${3 - (user?.usageCount ?? 0)}/3 lượt còn lại",
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.9),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const PremiumScreen(),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: theme.gradientColors),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: theme.gradientColors.first.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Text(
                        isPremium ? "Chi tiết" : "Nâng cấp",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget BatDauTuVan(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.14), width: 1),
      ),
      child: Column(
        children: [
          const Text(
            "✨ Chọn ngành đúng sáng tương lai",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            "Hệ thống AI của chúng tôi đang chờ để phân tích dữ liệu cùng bạn.",
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 20),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                widget.onChangeTab?.call(2);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color.fromARGB(255, 25, 199, 170),
                      Color.fromARGB(255, 34, 197, 197),
                      Color.fromARGB(255, 46, 108, 189),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  "Bắt đầu tư vấn mới ->",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget homeCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color iconColor,
    required Color iconBackground,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(25),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(25),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 55,
              height: 55,
              decoration: BoxDecoration(
                color: iconBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 28),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 13,
                color: Color.fromARGB(255, 66, 66, 66),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
