import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../services/admin_service.dart';
import '../../models/user_model.dart';

class PremiumManagementScreen extends StatefulWidget {
  const PremiumManagementScreen({super.key});

  @override
  State<PremiumManagementScreen> createState() =>
      _PremiumManagementScreenState();
}

class _PremiumManagementScreenState extends State<PremiumManagementScreen> {
  final AdminService _adminService = AdminService();

  String searchQuery = '';

  String formatCurrency(num amount) {
    String str = amount.toStringAsFixed(0);
    String result = '';
    int count = 0;
    for (int i = str.length - 1; i >= 0; i--) {
      result = str[i] + result;
      count++;
      if (count == 3 && i > 0) {
        result = '.$result';
        count = 0;
      }
    }
    return '$result ₫';
  }

  Color _getLevelColor(SubscriptionPlan plan) {
    switch (plan) {
      case SubscriptionPlan.monthly:
        return const Color(0xFF2563EB);
      case SubscriptionPlan.yearly:
        return const Color(0xFFFF8000);
      case SubscriptionPlan.lifetime:
        return const Color(0xFF8B5CF6);
      default:
        return Colors.grey;
    }
  }

  String _getLevelLabel(SubscriptionPlan plan) {
    switch (plan) {
      case SubscriptionPlan.monthly:
        return 'Gói Tháng';
      case SubscriptionPlan.yearly:
        return 'Gói Năm';
      case SubscriptionPlan.lifetime:
        return 'Gói Trọn Đời';
      default:
        return 'Free';
    }
  }

  IconData _getLevelIcon(SubscriptionPlan plan) {
    switch (plan) {
      case SubscriptionPlan.monthly:
        return Icons.flash_on_rounded;
      case SubscriptionPlan.yearly:
        return Icons.shield_rounded;
      case SubscriptionPlan.lifetime:
        return Icons.workspace_premium_rounded;
      default:
        return Icons.person_outline_rounded;
    }
  }

  int _getLevelPrice(SubscriptionPlan plan) {
    switch (plan) {
      case SubscriptionPlan.monthly:
        return 29000;
      case SubscriptionPlan.yearly:
        return 216000;
      case SubscriptionPlan.lifetime:
        return 499000;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: StreamBuilder<List<UserModel>>(
        stream: _adminService.getUsersStream(),
        builder: (context, userSnapshot) {
          return StreamBuilder<QuerySnapshot>(
            stream: _adminService.getSuccessfulTransactionsStream(),
            builder: (context, transSnapshot) {
              if (userSnapshot.hasError) {
                return Center(child: SelectableText("Lỗi tải user: ${userSnapshot.error}", style: const TextStyle(color: Colors.red)));
              }
              if (transSnapshot.hasError) {
                return Center(child: SelectableText("Lỗi tải doanh thu: ${transSnapshot.error}", style: const TextStyle(color: Colors.red)));
              }
              if (userSnapshot.connectionState == ConnectionState.waiting ||
                  transSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final allUsers = userSnapshot.data ?? [];

              // Lọc chỉ lấy premium users
              final premiumUsers = allUsers.where((user) {
                return user.isPremium == true;
              }).toList();

              // Tính tổng doanh thu từ transactions
              final transactions = transSnapshot.data?.docs ?? [];
              int totalRevenue = 0;
              for (var doc in transactions) {
                final data = doc.data() as Map<String, dynamic>;
                if (data['status']?.toString().toLowerCase() != 'success') continue;
                
                num amt = 0;
                if (data['amount'] is num) {
                  amt = data['amount'];
                } else if (data['amount'] is String) {
                  amt = num.tryParse(data['amount']) ?? 0;
                }
                totalRevenue += amt.toInt();
              }

              // Đếm theo level
              final monthlyCount = premiumUsers
                  .where((u) => u.plan == SubscriptionPlan.monthly)
                  .length;
              final yearlyCount = premiumUsers
                  .where((u) => u.plan == SubscriptionPlan.yearly)
                  .length;
              final lifetimeCount = premiumUsers
                  .where((u) => u.plan == SubscriptionPlan.lifetime)
                  .length;

              // Filter theo search
              final filteredUsers = premiumUsers
                  .where(
                    (user) => user.name.toLowerCase().contains(
                      searchQuery.toLowerCase(),
                    ),
                  )
                  .toList();

              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                child: Column(
                  children: [
                    _buildHeader(premiumUsers.length, totalRevenue),
                    const SizedBox(height: 16),
                    _buildLevelBreakdown(
                      monthlyCount,
                      yearlyCount,
                      lifetimeCount,
                    ),
                    const SizedBox(height: 16),
                    _buildRevenueStats(totalRevenue),
                    const SizedBox(height: 16),
                    _buildPremiumList(filteredUsers),
                    const SizedBox(height: 100),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildHeader(int count, int revenue) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1E40AF), Color(0xFF2563EB), Color(0xFF3B82F6)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quản lý Premium',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _buildHeaderCard(
                  Icons.diamond_rounded,
                  Colors.amber,
                  'Thành viên',
                  '$count',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildHeaderCard(
                  Icons.monetization_on_rounded,
                  Colors.greenAccent,
                  'Doanh thu',
                  '${(revenue / 1000000).toStringAsFixed(1)}M',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(
    IconData icon,
    Color iconColor,
    String label,
    String value,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 16),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(color: Colors.orange[100], fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildLevelBreakdown(int monthly, int yearly, int lifetime) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bar_chart_rounded, color: Color(0xFF2563EB), size: 18),
              SizedBox(width: 8),
              Text(
                'Phân bổ theo gói',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildLevelCard(
                  'Tháng',
                  monthly,
                  _getLevelColor(SubscriptionPlan.monthly),
                  _getLevelIcon(SubscriptionPlan.monthly),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildLevelCard(
                  'Năm',
                  yearly,
                  _getLevelColor(SubscriptionPlan.yearly),
                  _getLevelIcon(SubscriptionPlan.yearly),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildLevelCard(
                  'Trọn Đời',
                  lifetime,
                  _getLevelColor(SubscriptionPlan.lifetime),
                  _getLevelIcon(SubscriptionPlan.lifetime),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLevelCard(String label, int count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: color.withOpacity(0.8),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueStats(int total) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.trending_up_rounded, color: Colors.green, size: 18),
              SizedBox(width: 8),
              Text(
                'Thống kê doanh thu',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue[50]!, Colors.blue[100]!],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tổng doanh thu',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: Colors.black87,
                  ),
                ),
                Text(
                  formatCurrency(total),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            'Gói Tháng',
            formatCurrency(_getLevelPrice(SubscriptionPlan.monthly)),
          ),
          _buildDetailRow(
            'Gói Năm',
            formatCurrency(_getLevelPrice(SubscriptionPlan.yearly)),
          ),
          _buildDetailRow(
            'Gói Trọn Đời',
            formatCurrency(_getLevelPrice(SubscriptionPlan.lifetime)),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumList(List<UserModel> users) {
    if (users.isEmpty) {
      return Column(
        children: [
          const SizedBox(height: 40),
          Icon(Icons.diamond_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Chưa có thành viên Premium',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: users.length,
      itemBuilder: (context, index) {
        final user = users[index];
        final SubscriptionPlan plan = user.plan;
        final Color levelColor = _getLevelColor(plan);
        final int userContribution = _getLevelPrice(plan);

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [levelColor.withOpacity(0.8), levelColor],
                  ),
                  borderRadius: BorderRadius.circular(25),
                  boxShadow: [
                    BoxShadow(
                      color: levelColor.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 22,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            user.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: levelColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _getLevelIcon(plan),
                                color: levelColor,
                                size: 11,
                              ),
                              const SizedBox(width: 3),
                              Text(
                                _getLevelLabel(plan),
                                style: TextStyle(
                                  color: levelColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Text(
                      user.email,
                      style: const TextStyle(color: Colors.grey, fontSize: 11),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Premium từ: ${user.premiumStart != null ? user.premiumStart!.toIso8601String().substring(0, 10) : "N/A"}',
                      style: const TextStyle(color: Colors.grey, fontSize: 10),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Đóng góp',
                    style: TextStyle(color: Colors.grey, fontSize: 10),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    formatCurrency(userContribution),
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
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
}
