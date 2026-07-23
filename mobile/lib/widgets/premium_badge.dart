import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax/iconsax.dart';

enum PremiumBadgeSize { small, medium, large }

class PremiumBadge extends StatelessWidget {
  final bool isPremium;
  final PremiumBadgeSize size;

  const PremiumBadge({
    super.key,
    required this.isPremium,
    this.size = PremiumBadgeSize.medium,
  });

  @override
  Widget build(BuildContext context) {
    if (!isPremium) return const SizedBox.shrink();

    double iconSize;
    double padding;
    switch (size) {
      case PremiumBadgeSize.small:
        iconSize = 14;
        padding = 6;
        break;
      case PremiumBadgeSize.medium:
        iconSize = 24;
        padding = 10;
        break;
      case PremiumBadgeSize.large:
        iconSize = 40;
        padding = 16;
        break;
    }

    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFD700), Color(0xFFF59E0B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: 2,
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.5), width: 1.5),
      ),
      child: Icon(
        Iconsax.crown,
        color: Colors.white,
        size: iconSize,
      ).animate(onPlay: (c) => c.repeat()).shimmer(
            duration: 2.seconds,
            color: Colors.white70,
          ),
    );
  }
}
