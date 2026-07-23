import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:ui_login_out/screens/free_usage_store.dart';
import 'package:ui_login_out/services/premium_theme_helper.dart';
import '../models/user_model.dart';
import 'payment_selection_screen.dart';

class PremiumScreen extends StatelessWidget {
  final ValueChanged<int>? onTabChange;

  const PremiumScreen({super.key, this.onTabChange});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      extendBodyBehindAppBar: true,
      extendBody: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            color: Colors.white,
            size: 20,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: Column(
          children: [
            _buildHeader(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  _buildComparisonCard(),
                  const SizedBox(height: 20),
                  _buildPricingPlans(context),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: _buildFab(context),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  void _goToTab(BuildContext context, int index) {
    Navigator.pop(context);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      onTabChange?.call(index);
    });
  }

  Widget _buildFab(BuildContext context) {
    return InkWell(
      onTap: () => _goToTab(context, 2),
      borderRadius: BorderRadius.circular(35),
      child: Container(
        height: 65,
        width: 65,
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
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: const Center(
          child: Icon(
            Icons.auto_awesome_rounded,
            color: Colors.white,
            size: 35,
          ),
        ),
      ),
    );
  }

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
          _navItem(context, Icons.home_rounded, "Trang chủ", false, 0),
          _navItem(context, Icons.chat_bubble_rounded, "Thảo luận", false, 1),
          const SizedBox(width: 50),
          _navItem(context, Icons.history_rounded, "Lịch sử", false, 3),
          _navItem(context, Icons.person_rounded, "Cá nhân", true, 4),
        ],
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    IconData icon,
    String label,
    bool active,
    int index,
  ) {
    return InkWell(
      onTap: () {
        if (!active) {
          _goToTab(context, index);
        }
      },
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        width: 68,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 26,
              color: active ? const Color(0xff2563eb) : Colors.grey,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: active ? FontWeight.w600 : FontWeight.w500,
                color: active ? const Color(0xff2563eb) : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final theme = PremiumTheme.getTheme(
          user?.plan,
          user?.isPremium ?? false,
        );
        final bool isPremium = user?.isPremium ?? false;
        final int remaining = (3 - (user?.usageCount ?? 0)).clamp(0, 3);

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(24, 100, 24, 40),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: isPremium
                  ? theme.gradientColors
                  : [
                      const Color(0xFFFF8F00),
                      const Color(0xFFFF5D00),
                      const Color(0xFFE6007E),
                    ],
            ),
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(40),
            ),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withOpacity(0.2),
                    width: 1.5,
                  ),
                ),
                child: Icon(
                  isPremium ? theme.icon : Icons.workspace_premium_rounded,
                  color: const Color(0xFFFFD700),
                  size: 40,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                isPremium ? theme.title : "Nâng cấp Premium",
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                isPremium
                    ? "Cảm ơn bạn đã đồng hành cùng EduTalk!"
                    : "Trải nghiệm đầy đủ tính năng của EduTalk",
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 30),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  vertical: 20,
                  horizontal: 16,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Column(
                  children: [
                    Text(
                      isPremium
                          ? "Trạng thái tài khoản"
                          : "Lượt dùng thử còn lại",
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      isPremium
                          ? (user?.plan == SubscriptionPlan.lifetime
                                ? "KHÔNG GIỚI HẠN"
                                : "CÒN ${user?.premiumExpiry?.difference(DateTime.now()).inDays ?? 0} NGÀY")
                          : "$remaining / 3",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: isPremium ? 32 : 48,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isPremium
                          ? (user?.plan == SubscriptionPlan.lifetime
                                ? "Vĩnh viễn"
                                : "Hết hạn: ${user?.premiumExpiry?.day}/${user?.premiumExpiry?.month}/${user?.premiumExpiry?.year}")
                          : "...",
                      style: const TextStyle(
                        color: Color(0xFFFFD700),
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildComparisonCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Text(
              "So sánh gói dịch vụ",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Color(0xFF14213D),
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: const [
                _ComparisonItem(
                  title: "Miễn phí: 3 lần tư vấn",
                  subtitle: "Chỉ được sử dụng 3 lần đầu tiên",
                  isPositive: false,
                ),
                _ComparisonItem(
                  title: "Premium: Không giới hạn",
                  subtitle: "Tư vấn không giới hạn số lần",
                  isPositive: true,
                ),
                _ComparisonItem(
                  title: "AI phân tích chuyên sâu",
                  subtitle: "Độ chính xác cao hơn với mô hình nâng cao",
                  isPositive: true,
                ),
                _ComparisonItem(
                  title: "Lưu lịch sử vĩnh viễn",
                  subtitle: "Không bị giới hạn số lượng kết quả lưu trữ",
                  isPositive: true,
                ),
                _ComparisonItem(
                  title: "Hỗ trợ ưu tiên",
                  subtitle: "Được hỗ trợ nhanh chóng qua nhiều kênh",
                  isPositive: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricingPlans(BuildContext context) {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final bool isPremium = user?.isPremiumActive ?? false;
        final SubscriptionPlan currentPlan =
            user?.plan ?? SubscriptionPlan.none;

        int refundAmount = 0;
        if (isPremium &&
            user?.premiumExpiry != null &&
            currentPlan != SubscriptionPlan.lifetime) {
          final remainingDays = user!.premiumExpiry!
              .difference(DateTime.now())
              .inDays;
          if (remainingDays > 0) {
            if (currentPlan == SubscriptionPlan.monthly) {
              refundAmount = (remainingDays / 30 * 29000).round();
            } else if (currentPlan == SubscriptionPlan.yearly) {
              refundAmount = (remainingDays * (216000 / 365)).round();
            }
          }
        }

        return Column(
          children: [
            if (current_plan_info(user)) _buildCurrentPlanStatus(user!),

            _buildPlanCard(
              context: context,
              title: "Gói Tháng",
              subtitle: "Linh hoạt, chuyên nghiệp",
              price: "29.000",
              unit: "đ/tháng",
              details: "",
              color: const Color(0xFF2563EB),
              icon: Icons.flash_on_rounded,
              buttonIcon: Icons.auto_awesome_rounded,
              buttonText: currentPlan == SubscriptionPlan.monthly
                  ? "Đang sử dụng"
                  : "Mua gói Tháng",
              isActive: currentPlan == SubscriptionPlan.monthly,
              isLocked:
                  currentPlan == SubscriptionPlan.yearly ||
                  currentPlan == SubscriptionPlan.lifetime,
            ),
            const SizedBox(height: 16),
            _buildPlanCard(
              context: context,
              title: "Gói Năm",
              subtitle: "Tiết kiệm 40% - Tốt nhất",
              price: "216.000",
              unit: "đ/năm",
              details: "Chỉ ~18.000đ/tháng",
              color: const Color(0xFFFF8000),
              icon: Icons.shield_rounded,
              buttonIcon: Icons.workspace_premium_rounded,
              buttonText: currentPlan == SubscriptionPlan.yearly
                  ? "Đang sử dụng"
                  : (currentPlan == SubscriptionPlan.monthly
                        ? "Nâng cấp gói Năm"
                        : "Mua gói Năm"),
              isActive: currentPlan == SubscriptionPlan.yearly,
              isLocked: currentPlan == SubscriptionPlan.lifetime,
              isBestValue: true,
              oldPrice: "348.000đ",
              savings: "Tiết kiệm 132.000đ",
              refundAmount: currentPlan == SubscriptionPlan.monthly
                  ? refundAmount
                  : 0,
            ),
            const SizedBox(height: 16),
            _buildPlanCard(
              context: context,
              title: "Gói Vĩnh Viễn",
              subtitle: "Một lần thanh toán, sử dụng mãi mãi",
              price: "499.000",
              unit: "đ",
              details: "Thanh toán một lần, không cần gia hạn",
              color: const Color(0xFF8B5CF6),
              icon: Icons.workspace_premium_rounded,
              buttonIcon: Icons.workspace_premium_rounded,
              buttonText: currentPlan == SubscriptionPlan.lifetime
                  ? "Đang sử dụng"
                  : "Mua gói Vĩnh Viễn",
              isActive: currentPlan == SubscriptionPlan.lifetime,
              refundAmount:
                  (currentPlan == SubscriptionPlan.monthly ||
                      currentPlan == SubscriptionPlan.yearly)
                  ? refundAmount
                  : 0,
            ),
          ],
        );
      },
    );
  }

  bool current_plan_info(UserModel? user) {
    return user != null && user.isPremiumActive;
  }

  Widget _buildCurrentPlanStatus(UserModel user) {
    final expiryStr = user.plan == SubscriptionPlan.lifetime
        ? "Vĩnh viễn"
        : (user.premiumExpiry != null
              ? "Hết hạn vào: ${user.premiumExpiry!.day}/${user.premiumExpiry!.month}/${user.premiumExpiry!.year}"
              : "");
    return Container();
  }

  void _onBuyPressed(
    BuildContext context,
    String planName,
    int price,
    bool isLocked,
    bool isActive,
  ) {
    if (isLocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Bạn không thể hạ cấp gói dịch vụ")),
      );
      return;
    }
    if (isActive) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Vui lòng đăng nhập để thực hiện thanh toán"),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => PaymentSelectionScreen(
        planName: planName,
        userId: user.uid,
        planPrice: price.toDouble(),
      ),
    );
  }

  Widget _buildPlanCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required String price,
    required String unit,
    required String details,
    required Color color,
    required IconData icon,
    required IconData buttonIcon,
    required String buttonText,
    bool isBestValue = false,
    String? oldPrice,
    String? savings,
    bool isActive = false,
    bool isLocked = false,
    int refundAmount = 0,
  }) {
    int basePrice = int.parse(price.replaceAll('.', ''));
    int finalPrice = (basePrice - refundAmount).clamp(
      1000,
      basePrice,
    ); // Tối thiểu 1000đ

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: isBestValue
            ? Border.all(color: const Color(0xFFFFD700), width: 2)
            : (isActive ? Border.all(color: color, width: 2) : null),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(isBestValue ? 0.15 : 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Opacity(
        opacity: isLocked ? 0.5 : 1.0,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(32),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color, color.withOpacity(0.8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          subtitle,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    if (isBestValue)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade400,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: const [
                            Icon(
                              Icons.workspace_premium_rounded,
                              color: Colors.white,
                              size: 14,
                            ),
                            SizedBox(width: 4),
                            Text(
                              "Ưu đãi nhất",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Icon(
                        icon,
                        color: Colors.white.withOpacity(0.5),
                        size: 28,
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (refundAmount > 0) ...[
                      Text(
                        "Giá cũ: ${basePrice.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')}đ",
                        style: const TextStyle(
                          color: Colors.grey,
                          decoration: TextDecoration.lineThrough,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                    ],
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          finalPrice.toString().replaceAllMapped(
                            RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                            (Match m) => '${m[1]}.',
                          ),
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          unit,
                          style: const TextStyle(
                            fontSize: 16,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    if (refundAmount > 0) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          "Đã trừ ${refundAmount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')}đ từ gói cũ",
                          style: const TextStyle(
                            color: Color(0xFF4338CA),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                    if (oldPrice != null && refundAmount == 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            oldPrice,
                            style: const TextStyle(
                              color: Colors.grey,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              savings!,
                              style: const TextStyle(
                                color: Color(0xFF166534),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 10),
                    Text(
                      details,
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isActive
                              ? [Colors.grey, Colors.grey]
                              : [color, color.withOpacity(0.9)],
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          if (!isActive)
                            BoxShadow(
                              color: color.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 6),
                            ),
                        ],
                      ),
                      child: ElevatedButton.icon(
                        onPressed: () => _onBuyPressed(
                          context,
                          title,
                          finalPrice,
                          isLocked,
                          isActive,
                        ),
                        icon: Icon(
                          isActive ? Icons.check_circle_rounded : buttonIcon,
                          color: Colors.white,
                          size: 20,
                        ),
                        label: Text(
                          buttonText,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ComparisonItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isPositive;

  const _ComparisonItem({
    required this.title,
    required this.subtitle,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    final Color color = isPositive
        ? const Color(0xFF16A34A)
        : const Color(0xFFEF4444);
    final IconData icon = isPositive
        ? Icons.check_rounded
        : Icons.close_rounded;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
