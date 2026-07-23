import 'package:flutter/material.dart';
import '../models/user_model.dart';

class PremiumTheme {
  final String title;
  final List<Color> gradientColors;
  final IconData icon;
  final Color accentColor;
  final Color textColor;
  final Color bgColor;

  PremiumTheme({
    required this.title,
    required this.gradientColors,
    required this.icon,
    required this.accentColor,
    required this.textColor,
    required this.bgColor,
  });

  static PremiumTheme getTheme(SubscriptionPlan? plan, bool isPremium) {
    // 1. TÀI KHOẢN MIỄN PHÍ - Màu Xám đen huyền bí
    if (!isPremium || plan == null || plan == SubscriptionPlan.none) {
      return PremiumTheme(
        title: "Tài khoản Miễn phí",
        gradientColors: [const Color(0xFFFEBB36), const Color(0xFFFF9B30), const Color(0xFFF48200)],
        icon: Icons.person_outline,
        accentColor: const Color(0xFFEAB308),
        textColor: const Color(0xFFFFE08A),
        bgColor: const Color.fromARGB(255, 110, 104, 104).withOpacity(0.6),
      );
    }

    // 2. GÓI THÁNG - Màu Xanh Dương (Màu cũ ban đầu)
    if (plan == SubscriptionPlan.monthly) {
      return PremiumTheme(
        title: "Premium Tháng",
        gradientColors: [const Color(0xFF3B82F6), const Color(0xFF2563EB)],
        icon: Icons.workspace_premium_rounded,
        accentColor: const Color(0xFF93C5FD),
        textColor: Colors.white,
        bgColor: const Color(0xFF1E40AF).withOpacity(0.8),
      );
    }

    // 3. GÓI NĂM - Màu Cam/Vàng (Màu cũ ban đầu)
    if (plan == SubscriptionPlan.yearly) {
      return PremiumTheme(
        title: "Premium Năm",
        gradientColors: [const Color(0xFFF59E0B), const Color(0xFFD97706)],
        icon: Icons.stars_rounded,
        accentColor: const Color(0xFFFDE68A),
        textColor: Colors.white,
        bgColor: const Color(0xFF92400E).withOpacity(0.8),
      );
    }

    // 4. GÓI TRỌN ĐỜI - Màu Tím (Màu cũ ban đầu)
    if (plan == SubscriptionPlan.lifetime) {
      return PremiumTheme(
        title: "Premium Trọn Đời",
        gradientColors: [const Color(0xFF8B5CF6), const Color(0xFF7C3AED)],
        icon: Icons.diamond_rounded,
        accentColor: const Color(0xFFDDD6FE),
        textColor: Colors.white,
        bgColor: const Color(0xFF5B21B6).withOpacity(0.8),
      );
    }

    // Mặc định
    return PremiumTheme(
      title: "Premium Member",
      gradientColors: [const Color(0xFF2563EB), const Color(0xFF1D4ED8)],
      icon: Icons.verified_rounded,
      accentColor: const Color(0xFF93C5FD),
      textColor: Colors.white,
      bgColor: Colors.black.withOpacity(0.6),
    );
  }
}
