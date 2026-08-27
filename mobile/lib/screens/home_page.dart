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

// ─── Dữ liệu 15 tổ hợp HUIT (hardcode giao diện) ───────────────────────────
class _Combo {
  final String code;
  final String mon1;
  final String mon2;
  final String mon3;
  const _Combo(this.code, this.mon1, this.mon2, this.mon3);
}

const List<_Combo> _huitCombos = [
  _Combo('A00', 'Toán', 'Vật lý', 'Hóa học'),
  _Combo('A01', 'Toán', 'Vật lý', 'Tiếng Anh'),
  _Combo('B00', 'Toán', 'Hóa học', 'Sinh học'),
  _Combo('B08', 'Toán', 'Sinh học', 'Tiếng Anh'),
  _Combo('C00', 'Ngữ văn', 'Lịch sử', 'Địa lý'),
  _Combo('C01', 'Ngữ văn', 'Toán', 'Vật lý'),
  _Combo('C02', 'Ngữ văn', 'Toán', 'Hóa học'),
  _Combo('C03', 'Ngữ văn', 'Toán', 'Lịch sử'),
  _Combo('D01', 'Toán', 'Ngữ văn', 'Tiếng Anh'),
  _Combo('D07', 'Toán', 'Hóa học', 'Tiếng Anh'),
  _Combo('D09', 'Toán', 'Lịch sử', 'Tiếng Anh'),
  _Combo('D14', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử'),
  _Combo('D15', 'Ngữ văn', 'Địa lý', 'Tiếng Anh'),
  _Combo('X01', 'Toán', 'Ngữ văn', 'KT & Pháp luật'),
  _Combo('X26', 'Toán', 'Tin học', 'Tiếng Anh'),
];

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
  String _userName = 'Bạn';

  @override
  void initState() {
    super.initState();
    _loadUserSession();
  }

  void _loadUserSession() {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      setState(() {
        _userName = user.displayName ?? user.email?.split('@')[0] ?? 'Bạn';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final double topPad = MediaQuery.of(context).padding.top;
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: Column(
            children: [
              // ── Header Banner ────────────────────────────────────────────
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.fromLTRB(20, topPad + 20, 20, 100),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Color(0xFF1E40AF), // HUIT blue – match web #2563EB
                          Color(0xFF1D4ED8),
                          Color(0xFF0F766E),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.vertical(
                        bottom: Radius.circular(40),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── HUIT Badge pill ──────────────────────────────
                        RepaintBoundary(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(35),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withAlpha(60),
                              ),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.school_rounded,
                                  color: Colors.white,
                                  size: 14,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  'HUIT EduTalk · Tuyển sinh 2026',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // ── Greeting ─────────────────────────────────────
                        const Text(
                          'Xin chào',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$_userName 👋',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Đại học Công Thương TP.HCM',
                          style: TextStyle(
                            color: Colors.white60,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // ── Premium/Free account card ────────────────────
                        _freeAccountCard(context),
                        const SizedBox(height: 16),

                        // ── Bắt đầu tư vấn ──────────────────────────────
                        _batDauTuVan(context),
                      ],
                    ),
                  ),

                  // ── Quick action cards (overlap) ──────────────────────
                  Positioned(
                    bottom: -75,
                    left: 20,
                    right: 20,
                    child: Row(
                      children: [
                        Expanded(
                          child: _homeCard(
                            context,
                            icon: Icons.history_rounded,
                            title: 'Lịch sử',
                            subtitle: 'Xem lại kết quả',
                            iconColor: const Color(0xFF2563EB),
                            iconBackground: const Color(0xFFEFF6FF),
                            onTap: () => widget.onChangeTab?.call(3),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _homeCard(
                            context,
                            icon: Icons.forum_rounded,
                            title: 'Thảo luận',
                            subtitle: 'Trao đổi cộng đồng',
                            iconColor: const Color(0xFF059669),
                            iconBackground: const Color(0xFFD1FAE5),
                            onTap: () => widget.onChangeTab?.call(1),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // ── Body content (below header overlap) ─────────────────────
              const SizedBox(height: 96),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      // ── HUIT Stats row ─────────────────────────────────
                      RepaintBoundary(child: _StatsRow()),
                      const SizedBox(height: 16),

                      // ── Trending majors ────────────────────────────────
                      const TrendingMajorsCard(),
                      const SizedBox(height: 16),

                      // ── Tổ hợp xét tuyển HUIT ─────────────────────────
                      RepaintBoundary(child: _TohopCard()),
                      const SizedBox(height: 16),

                      // ── Khám phá thêm ─────────────────────────────────
                      _khamPhaThem(context),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
    );
  }


  // ── Premium / Free Account Card ─────────────────────────────────────────
  Widget _freeAccountCard(BuildContext context) {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final theme = PremiumTheme.getTheme(
          user?.plan,
          user?.isPremium ?? false,
        );
        final bool isPremium = user?.isPremium ?? false;
        final String displayName = user?.name ?? _userName;
        final String initial =
            displayName.isNotEmpty ? displayName[0].toUpperCase() : '?';

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: theme.bgColor,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: theme.accentColor.withAlpha(76),
              width: 1.2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Avatar
                  Container(
                    width: 50,
                    height: 50,
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
                        initial,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Plan badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: theme.accentColor.withAlpha(38),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: theme.accentColor.withAlpha(76),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                theme.icon,
                                color: theme.accentColor,
                                size: 13,
                              ),
                              const SizedBox(width: 5),
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
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isPremium
                        ? 'Gói: ${user?.planDisplayName ?? "Premium"}'
                        : 'Dùng thử: ${3 - (user?.usageCount ?? 0)}/3 lượt còn',
                    style: TextStyle(
                      color: Colors.white.withAlpha(230),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const PremiumScreen(),
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: theme.gradientColors,
                        ),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: theme.gradientColors.first.withAlpha(76),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Text(
                        isPremium ? 'Chi tiết' : 'Nâng cấp',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
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

  // ── Bắt đầu tư vấn HUIT ─────────────────────────────────────────────────
  Widget _batDauTuVan(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(30),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withAlpha(35), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '✨ Tìm ngành HUIT phù hợp với bạn',
            style: TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'AI phân tích điểm thi → gợi ý trong 39 ngành của HUIT theo 15 tổ hợp xét tuyển.',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 18),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => widget.onChangeTab?.call(2),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF19C7AA),
                      Color(0xFF22C5C5),
                      Color(0xFF2E6CBD),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF19C7AA).withAlpha(76),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Bắt đầu tư vấn ngay',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Home Quick Card ──────────────────────────────────────────────────────
  Widget _homeCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color iconColor,
    required Color iconBackground,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(
              color: Color(0x18000000),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: iconBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 26),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // ── Khám phá thêm ───────────────────────────────────────────────────────
  Widget _khamPhaThem(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
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
              Icon(Icons.explore_rounded, color: Color(0xFF2563EB), size: 18),
              SizedBox(width: 6),
              Text(
                'Khám phá thêm',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _moreItem(
            context,
            icon: Icons.bar_chart_rounded,
            iconColor: const Color(0xFF2563EB),
            iconBg: const Color(0xFFEFF6FF),
            title: 'Dữ liệu & Báo cáo',
            subtitle: 'Thống kê tuyển sinh HUIT',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ThongKeTs(onTabChange: widget.onChangeTab),
              ),
            ),
          ),
          const SizedBox(height: 8),
          _moreItem(
            context,
            icon: Icons.score_rounded,
            iconColor: const Color(0xFFD97706),
            iconBg: const Color(0xFFFFF7ED),
            title: 'Điểm chuẩn HUIT',
            subtitle: 'Xem điểm chuẩn các năm',
            onTap: () {
              // TODO: điều hướng tới màn hình điểm chuẩn
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Tính năng đang phát triển 🚧'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          _moreItem(
            context,
            icon: Icons.info_outline_rounded,
            iconColor: const Color(0xFF9333EA),
            iconBg: const Color(0xFFF5F3FF),
            title: 'Về chúng tôi',
            subtitle: 'Giới thiệu EduTalk HUIT',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AboutScreen()),
            ),
          ),
          const SizedBox(height: 8),
          _moreItem(
            context,
            icon: Icons.phone_outlined,
            iconColor: const Color(0xFF0F766E),
            iconBg: const Color(0xFFECFEFF),
            title: 'Liên hệ hỗ trợ',
            subtitle: 'Gửi câu hỏi cho chúng tôi',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SupportScreen()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _moreItem(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEEF2F7)),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
              child: Icon(icon, color: iconColor, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.black87,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded,
                size: 14, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

// ─── Stats Row Widget ────────────────────────────────────────────────────────
class _StatsRow extends StatelessWidget {
  const _StatsRow();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: const Row(
        children: [
          Expanded(
            child: _StatChip(
              value: '39',
              label: 'Ngành học',
              icon: Icons.school_rounded,
              color: Color(0xFF2563EB),
            ),
          ),
          _Divider(),
          Expanded(
            child: _StatChip(
              value: '15',
              label: 'Tổ hợp',
              icon: Icons.grid_view_rounded,
              color: Color(0xFF0F766E),
            ),
          ),
          _Divider(),
          Expanded(
            child: _StatChip(
              value: '2026',
              label: 'Tuyển sinh',
              icon: Icons.calendar_today_rounded,
              color: Color(0xFF9333EA),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  const _StatChip({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withAlpha(25),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: color,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF64748B),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 48, color: const Color(0xFFE2E8F0));
  }
}

// ─── Tổ hợp xét tuyển HUIT Card ─────────────────────────────────────────────
class _TohopCard extends StatefulWidget {
  const _TohopCard();

  @override
  State<_TohopCard> createState() => _TohopCardState();
}

class _TohopCardState extends State<_TohopCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    // Hiển thị 5 hàng đầu khi collapsed, tất cả khi expanded
    final displayList = _expanded ? _huitCombos : _huitCombos.take(5).toList();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.checklist_rounded,
                    color: Color(0xFF2563EB),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tổ hợp xét tuyển HUIT',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        '15 tổ hợp · Năm 2026',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Table header ─────────────────────────────────────────────────
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF2563EB),
              borderRadius: BorderRadius.vertical(top: Radius.circular(10)),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 44,
                  child: Text(
                    'Tổ hợp',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Môn 1',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Môn 2',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Môn 3',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Rows (lazy builder) ──────────────────────────────────────────
          Container(
            margin: const EdgeInsets.only(left: 16, right: 16),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(10)),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayList.length,
              separatorBuilder: (_, _) =>
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
              itemBuilder: (_, i) => _ComboRow(combo: displayList[i], odd: i.isOdd),
            ),
          ),

          // ── Expand / collapse button ─────────────────────────────────────
          TextButton(
            onPressed: () => setState(() => _expanded = !_expanded),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _expanded ? 'Thu gọn' : 'Xem tất cả 15 tổ hợp',
                  style: const TextStyle(
                    color: Color(0xFF2563EB),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  color: const Color(0xFF2563EB),
                  size: 18,
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }
}

// ─── Single combo row (const-optimized) ─────────────────────────────────────
class _ComboRow extends StatelessWidget {
  final _Combo combo;
  final bool odd;

  const _ComboRow({required this.combo, required this.odd});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: odd ? const Color(0xFFF8FAFC) : Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withAlpha(20),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                combo.code,
                style: const TextStyle(
                  color: Color(0xFF2563EB),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          Expanded(
            child: Text(
              combo.mon1,
              style: const TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ),
          Expanded(
            child: Text(
              combo.mon2,
              style: const TextStyle(fontSize: 12, color: Colors.black87),
            ),
          ),
          Expanded(
            child: Text(
              combo.mon3,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF64748B),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
