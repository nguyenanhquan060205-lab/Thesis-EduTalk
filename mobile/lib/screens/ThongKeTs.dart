import 'dart:math' as math;
import 'package:flutter/material.dart';

class ThongKeTs extends StatelessWidget {
  final Function(int)? onTabChange;

  const ThongKeTs({super.key, this.onTabChange});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FA),
      extendBody: true,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 110),
          child: Column(
            children: [
              _buildHeader(),
              Transform.translate(
                offset: const Offset(0, -24),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      _buildModelCard(),
                      const SizedBox(height: 16),
                      _buildImpactCard(),
                      const SizedBox(height: 16),
                      _buildTopScoreCard(),
                      const SizedBox(height: 16),
                      _buildRegionCard(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: _buildFab(context),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  // ───────────────────────── HEADER ─────────────────────────
  Widget _buildHeader() {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        bottomLeft: Radius.circular(40),
        bottomRight: Radius.circular(40),
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 58),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF065F63), Color(0xFF0F4C81)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
        ),
        child: Column(
          children: [
            const SizedBox(height: 6),
            // Top badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: Colors.white.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.analytics_rounded,
                    size: 13,
                    color: Color(0xFF7DD3FA),
                  ),
                  SizedBox(width: 6),
                  Text(
                    'HỆ THỐNG PHÂN TÍCH',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF7DD3FA),
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Dữ Liệu Hệ Thống',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Phân tích chuyên sâu từ Random Forest\nvới 200 cây quyết định',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.6,
                color: Colors.white.withOpacity(0.68),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            color: Colors.white.withOpacity(0.6),
          ),
        ),
      ],
    );
  }

  // ───────────────────────── MODEL CARD ─────────────────────────
  Widget _buildModelCard() {
    return _sectionCard(
      accentColor: const Color(0xFF22C55E),
      title: 'Đánh Giá Mô Hình',
      icon: Icons.show_chart_rounded,
      trailing: _ActiveBadge(),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.3,
        children: const [
          _MetricItem(
            icon: Icons.gps_fixed_rounded,
            iconColor: Color(0xFF3B82F6),
            gradientColor: Color(0xFFEFF6FF),
            label: 'ACCURACY',
            value: '94.5%',
          ),
          _MetricItem(
            icon: Icons.bolt_rounded,
            iconColor: Color(0xFFA855F7),
            gradientColor: Color(0xFFFAF5FF),
            label: 'PRECISION',
            value: '92.1%',
          ),
          _MetricItem(
            icon: Icons.shield_rounded,
            iconColor: Color(0xFF14B8A6),
            gradientColor: Color(0xFFF0FDFA),
            label: 'RECALL',
            value: '93.8%',
          ),
          _MetricItem(
            icon: Icons.balance_rounded,
            iconColor: Color(0xFFF97316),
            gradientColor: Color(0xFFFFF7ED),
            label: 'F1-SCORE',
            value: '92.9%',
          ),
        ],
      ),
    );
  }

  // ───────────────────────── IMPACT CARD ─────────────────────────
  Widget _buildImpactCard() {
    final items = [
      ('Năng động', 0.58, const Color(0xFFF97316)),
      ('Toán', 0.77, const Color(0xFF3B82F6)),
      ('Lý', 0.69, const Color(0xFF14B8A6)),
      ('Sáng tạo', 0.42, const Color(0xFFA855F7)),
      ('Logic', 0.88, const Color(0xFF22C55E)),
      ('Hóa', 0.35, const Color(0xFFEF4444)),
    ];

    return _sectionCard(
      accentColor: const Color(0xFFF97316),
      title: 'Mức Độ Ảnh Hưởng',
      icon: Icons.bar_chart_rounded,
      child: Column(
        children: items.map((item) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 7),
            child: Row(
              children: [
                SizedBox(
                  width: 68,
                  child: Text(
                    item.$1,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF4B5563),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Stack(
                    children: [
                      Container(
                        height: 14,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      FractionallySizedBox(
                        widthFactor: item.$2,
                        child: Container(
                          height: 14,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [item.$3.withOpacity(0.7), item.$3],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: item.$3.withOpacity(0.35),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: 36,
                  child: Text(
                    '${(item.$2 * 100).toInt()}%',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: item.$3,
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ───────────────────────── TOP SCORE CARD ─────────────────────────
  Widget _buildTopScoreCard() {
    final schools = [
      (
        'ĐH Bách Khoa HN',
        'Khoa học máy tính',
        '29.42',
        const Color(0xFFFEF3C7),
        const Color(0xFFD97706),
        Icons.looks_one_rounded,
      ),
      (
        'ĐH Ngoại Thương',
        'Kinh tế đối ngoại',
        '28.5',
        const Color(0xFFF1F5F9),
        const Color(0xFF64748B),
        Icons.looks_two_rounded,
      ),
      (
        'ĐH Y Hà Nội',
        'Y khoa',
        '28.15',
        const Color(0xFFFFF7ED),
        const Color(0xFFEA7C1A),
        Icons.looks_3_rounded,
      ),
      (
        'ĐH Công Nghệ',
        'CNTT',
        '27.85',
        const Color(0xFFF0FDF4),
        const Color(0xFF16A34A),
        Icons.looks_4_rounded,
      ),
    ];

    return _sectionCard(
      accentColor: const Color(0xFFEF4444),
      title: 'Top Điểm Chuẩn 2024',
      icon: Icons.workspace_premium_rounded,
      child: Column(
        children: schools.asMap().entries.map((entry) {
          int i = entry.key;
          var s = entry.value;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: s.$4,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: s.$5.withOpacity(0.15), width: 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: s.$5.withOpacity(0.15),
                  ),
                  child: Icon(s.$6, size: 20, color: s.$5),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.$1,
                        style: const TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        s.$2,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF9CA3AF),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: s.$5.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    s.$3,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: s.$5,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ───────────────────────── REGION CARD ─────────────────────────
  Widget _buildRegionCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 20,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.map_rounded,
                  color: Color(0xFF2563EB),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Phân Bố Khu Vực',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Center(child: _RegionDonutChart()),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _LegendItem(
                  color: Color(0xFF3B82F6),
                  text: 'Miền Bắc',
                  percent: '45%',
                ),
                _LegendDivider(),
                _LegendItem(
                  color: Color(0xFF10B981),
                  text: 'Miền Nam',
                  percent: '33%',
                ),
                _LegendDivider(),
                _LegendItem(
                  color: Color(0xFFF59E0B),
                  text: 'Miền Trung',
                  percent: '22%',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────── SECTION CARD ─────────────────────────
  Widget _sectionCard({
    required Color accentColor,
    required String title,
    required IconData icon,
    required Widget child,
    Widget? trailing,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border(left: BorderSide(color: accentColor, width: 3.5)),
        boxShadow: [
          BoxShadow(
            color: accentColor.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
          const BoxShadow(
            color: Color(0x08000000),
            blurRadius: 12,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: accentColor, size: 17),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  // ───────────────────────── FAB ─────────────────────────
  Widget _buildFab(BuildContext context) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        onTabChange?.call(2);
      },
      borderRadius: BorderRadius.circular(35),
      child: Container(
        height: 62,
        width: 62,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [
              Color.fromARGB(255, 25, 199, 170),
              Color.fromARGB(255, 34, 197, 197),
              Color.fromARGB(255, 46, 108, 189),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xff2563eb).withOpacity(0.22),
              blurRadius: 18,
              spreadRadius: 2,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: const Center(
          child: Icon(
            Icons.auto_awesome_rounded,
            color: Colors.white,
            size: 30,
          ),
        ),
      ),
    );
  }

  // ───────────────────────── BOTTOM BAR ─────────────────────────
  Widget _buildBottomBar(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 72,
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 14,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _navItem(context, Icons.home_rounded, "Trang chủ", 0),
          _navItem(context, Icons.chat_bubble_rounded, "Thảo luận", 1),
          const SizedBox(width: 50),
          _navItem(context, Icons.history_rounded, "Lịch sử", 3),
          _navItem(context, Icons.person_rounded, "Cá nhân", 4),
        ],
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    IconData icon,
    String label,
    int index,
  ) {
    return InkWell(
      onTap: () {
        Navigator.pop(context);
        onTabChange?.call(index);
      },
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        width: 68,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 26, color: Colors.grey),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11.5,
                color: Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ───────────────────────── ACTIVE BADGE ─────────────────────────
class _ActiveBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF22C55E).withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 6, color: Colors.white),
          SizedBox(width: 5),
          Text(
            'ACTIVE',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── METRIC ITEM ─────────────────────────
class _MetricItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color gradientColor;
  final String label;
  final String value;
  const _MetricItem({
    required this.icon,
    required this.iconColor,
    required this.gradientColor,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: gradientColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: iconColor.withOpacity(0.15), width: 1),
      ),
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: iconColor.withOpacity(0.8),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
            ),
          ),
        ],
      ),
    );
  }
}

// ───────────────────────── LEGEND ─────────────────────────
class _LegendDivider extends StatelessWidget {
  const _LegendDivider();
  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 30, color: const Color(0xFFE5E7EB));
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String text;
  final String percent;
  const _LegendItem({
    required this.color,
    required this.text,
    required this.percent,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF4B5563),
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          percent,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
      ],
    );
  }
}

// ───────────────────────── DONUT CHART ─────────────────────────
class _RegionDonutChart extends StatelessWidget {
  const _RegionDonutChart();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 190,
      height: 190,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(size: const Size(190, 190), painter: _DonutPainter()),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Tổng',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade500,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                '100%',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 1),
              Text(
                'học sinh',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 32.0;
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(strokeWidth / 2);

    final colors = [
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
    ];
    final values = [0.45, 0.33, 0.22];
    const gap = 0.015; // small gap between segments

    double startAngle = -math.pi / 2;

    for (int i = 0; i < values.length; i++) {
      final sweepAngle = 2 * math.pi * values[i] - gap;
      final paint = Paint()
        ..color = colors[i]
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(arcRect, startAngle, sweepAngle, false, paint);
      startAngle += sweepAngle + gap;
    }

    // Subtle inner shadow ring
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawCircle(
      size.center(Offset.zero),
      size.width / 2 - strokeWidth,
      shadowPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
