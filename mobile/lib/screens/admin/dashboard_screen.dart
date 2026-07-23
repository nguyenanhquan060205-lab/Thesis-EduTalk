import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../../services/admin_service.dart';
import '../../models/user_model.dart';

class DashboardScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigate;

  const DashboardScreen({super.key, this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final AdminService _adminService = AdminService();
  String _revenueFilter = 'total'; // 'today', 'month', 'year', 'total'

  final currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

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
                return Center(child: SelectableText("Lỗi tải user: ${userSnapshot.error}"));
              }
              if (transSnapshot.hasError) {
                return Center(child: SelectableText("Lỗi tải doanh thu: ${transSnapshot.error}"));
              }
              if (userSnapshot.connectionState == ConnectionState.waiting ||
                  transSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final users = userSnapshot.data ?? [];
              final premiumUsers = users
                  .where((u) => u.isPremium == true)
                  .length;

              final transactions = transSnapshot.data?.docs ?? [];

              // Tính doanh thu theo filter
              final filteredRevenue = _calculateRevenue(
                transactions,
                _revenueFilter,
              );
              final totalRevenue = _calculateRevenue(transactions, 'total');

              return SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 100),
                child: Column(
                  children: [
                    _buildHeader(users.length, premiumUsers, totalRevenue),
                    _buildMainContent(
                      users.length,
                      premiumUsers,
                      transactions,
                      filteredRevenue,
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  double _calculateRevenue(
    List<QueryDocumentSnapshot> transactions,
    String filter,
  ) {
    final now = DateTime.now();
    double revenue = 0;

    for (var doc in transactions) {
      final data = doc.data() as Map<String, dynamic>;
      final status = data['status']?.toString().toLowerCase();
      // Chỉ tính doanh thu cho giao dịch success
      if (status != 'success') continue;

      double amount = 0;
      if (data['amount'] != null) {
        if (data['amount'] is num) {
          amount = (data['amount'] as num).toDouble();
        } else if (data['amount'] is String) {
          amount = double.tryParse(data['amount']) ?? 0;
        }
      }

      final timestamp = data['timestamp'] ?? data['createdAt'];

      if (filter == 'total') {
        revenue += amount;
      } else if (timestamp != null) {
        DateTime txDate = now;
        if (timestamp is Timestamp) {
          txDate = timestamp.toDate();
        } else if (timestamp is int) {
          txDate = DateTime.fromMillisecondsSinceEpoch(timestamp);
        } else if (timestamp is String) {
          txDate = DateTime.tryParse(timestamp) ?? now;
        }

        switch (filter) {
          case 'today':
            if (txDate.year == now.year &&
                txDate.month == now.month &&
                txDate.day == now.day) {
              revenue += amount;
            }
            break;
          case 'month':
            if (txDate.year == now.year && txDate.month == now.month) {
              revenue += amount;
            }
            break;
          case 'year':
            if (txDate.year == now.year) {
              revenue += amount;
            }
            break;
        }
      }
    }
    return revenue;
  }

  Widget _buildHeader(int totalUsers, int premiumUsers, double revenue) {
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.analytics_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'EduTalk Business',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Text(
                    'Doanh thu & Chỉ số',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "TỔNG DOANH THU",
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  currencyFormat.format(revenue),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _buildQuickStat(
                      "Người dùng",
                      "$totalUsers",
                      Icons.people_outline_rounded,
                    ),
                    const SizedBox(width: 40),
                    _buildQuickStat(
                      "Premium",
                      "$premiumUsers",
                      Icons.star_outline_rounded,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickStat(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: Colors.white60, size: 18),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            Text(
              label,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMainContent(
    int users,
    int premium,
    List<QueryDocumentSnapshot> transactions,
    double filteredRevenue,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          const SizedBox(height: 24),
          _buildRevenueSection(filteredRevenue),
          const SizedBox(height: 16),
          _buildQuickActionSection(users, premium),
          const SizedBox(height: 16),
          _buildRecentTransactionsSection(),
        ],
      ),
    );
  }

  // =========================================================================
  // DOANH THU VỚI BỘ LỌC
  // =========================================================================

  Widget _buildRevenueSection(double filteredRevenue) {
    return _buildContainerSection(
      title: 'Thống kê doanh thu',
      icon: Icons.trending_up_rounded,
      iconColor: const Color(0xFF059669),
      child: Column(
        children: [
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildRevenueChip(
                  'today',
                  'Hôm nay',
                  Icons.calendar_today_rounded,
                ),
                const SizedBox(width: 8),
                _buildRevenueChip(
                  'month',
                  'Tháng này',
                  Icons.calendar_today_rounded,
                ),
                const SizedBox(width: 8),
                _buildRevenueChip(
                  'year',
                  'Năm nay',
                  Icons.calendar_today_rounded,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Revenue display
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFCBE5FF),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getFilterLabel(_revenueFilter),
                  style: TextStyle(
                    color: Colors.blue[700],
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  currencyFormat.format(filteredRevenue),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 24,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getFilterLabel(String filter) {
    switch (filter) {
      case 'today':
        return 'Doanh thu hôm nay';
      case 'month':
        return 'Doanh thu tháng ${DateTime.now().month}';
      case 'year':
        return 'Doanh thu năm ${DateTime.now().year}';
      default:
        return 'Tổng doanh thu';
    }
  }

  Widget _buildRevenueChip(String value, String label, IconData icon) {
    final isSelected = _revenueFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _revenueFilter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE2E8F0) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 14, color: Colors.grey[600]),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: Colors.grey[800],
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // GIAO DỊCH GẦN ĐÂY
  // =========================================================================

  Widget _buildRecentTransactionsSection() {
    return _buildContainerSection(
      title: 'Giao dịch gần đây',
      icon: Icons.history_rounded,
      iconColor: const Color(0xFF2563EB),
      child: StreamBuilder<QuerySnapshot>(
        stream: _adminService.getRecentTransactionsStream(limit: 5),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: SelectableText("Lỗi giao dịch: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          }
          if (!snapshot.hasData)
            return const Center(child: CircularProgressIndicator());
          final docs = snapshot.data!.docs;

          if (docs.isEmpty) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(
                  "Chưa có giao dịch nào",
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            );
          }

          return Column(
            children: docs.map((doc) {
              final data = doc.data() as Map<String, dynamic>;
              final amount = ((data['amount'] ?? 0) as num).toDouble();
              final status = data['status'] ?? 'pending';
              final userName =
                  data['userName'] ?? data['userEmail'] ?? 'Người dùng';
              final planName = data['plan'] ?? 'Gói cước';

              return _buildTransactionItem(
                userName: userName.toString(),
                planName: planName.toString(),
                amount: currencyFormat.format(amount),
                isSuccess: status == 'success',
              );
            }).toList(),
          );
        },
      ),
    );
  }

  Widget _buildTransactionItem({
    required String userName,
    required String planName,
    required String amount,
    required bool isSuccess,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF3F4F6)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isSuccess
                  ? const Color(0xFF059669).withOpacity(0.1)
                  : Colors.orange.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isSuccess
                  ? Icons.check_circle_rounded
                  : Icons.access_time_rounded,
              color: isSuccess ? const Color(0xFF059669) : Colors.orange,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$userName đã mua $planName',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  isSuccess ? 'Thành công' : 'Đang xử lý',
                  style: TextStyle(
                    color: isSuccess ? const Color(0xFF059669) : Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Text(
            amount,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 14,
              color: Color(0xFF1E3A8A),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // QUẢN LÝ NHANH
  // =========================================================================

  Widget _buildQuickActionSection(int users, int premium) {
    return _buildContainerSection(
      title: 'Quản lý nhanh',
      icon: Icons.settings_suggest_rounded,
      iconColor: const Color(0xFF2563EB),
      child: Column(
        children: [
          _buildActionItem(
            Icons.people_alt_rounded,
            'Người dùng',
            '$users thành viên',
            const Color(0xFF2563EB),
            onTap: () => widget.onNavigate?.call(1),
          ),
          _buildActionItem(
            Icons.diamond_rounded,
            'Premium',
            '$premium thành viên',
            const Color(0xFF8B5CF6),
            onTap: () => widget.onNavigate?.call(3),
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem(
    IconData icon,
    String title,
    String sub,
    Color color, {
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF3F4F6)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    sub,
                    style: const TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 14,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // CONTAINER CHUNG
  // =========================================================================

  Widget _buildContainerSection({
    required String title,
    required IconData icon,
    required Color iconColor,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor, size: 18),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1F2937),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
