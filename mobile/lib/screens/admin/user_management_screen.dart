import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../models/user_model.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  final AdminService _adminService = AdminService();

  String searchQuery = '';
  String filterType = 'all';

  final List<SubscriptionPlan> premiumLevels = [
    SubscriptionPlan.none,
    SubscriptionPlan.monthly,
    SubscriptionPlan.yearly,
    SubscriptionPlan.lifetime,
  ];

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

  void deleteUser(String docId, String username) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Xác nhận xóa', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text('Bạn có chắc muốn xóa người dùng "$username"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          TextButton(
            onPressed: () {
              _adminService.deleteUser(docId);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Đã xóa người dùng thành công!'), backgroundColor: Colors.redAccent),
              );
            },
            child: const Text('Xóa', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showPremiumLevelDialog(String docId, String username, SubscriptionPlan plan) {
    showDialog(
      context: context,
      builder: (context) {
        SubscriptionPlan selectedPlan = plan;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: const Text('Gán gói Premium', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Chọn gói Premium cho "$username"',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  ...premiumLevels.map((plan) {
                    final isSelected = selectedPlan == plan;
                    final color = _getLevelColor(plan);
                    return GestureDetector(
                      onTap: () => setDialogState(() => selectedPlan = plan),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? color.withOpacity(0.1) : const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? color : const Color(0xFFE5E7EB),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(_getLevelIcon(plan), color: color, size: 20),
                            const SizedBox(width: 12),
                            Text(
                              _getLevelLabel(plan),
                              style: TextStyle(
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? color : Colors.grey[700],
                                fontSize: 14,
                              ),
                            ),
                            const Spacer(),
                            if (isSelected)
                              Icon(Icons.check_circle_rounded, color: color, size: 20),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Hủy'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final isPremium = selectedPlan != SubscriptionPlan.none;

                    _adminService.updatePremiumStatus(
                      docId,
                      plan: selectedPlan,
                      isPremium: isPremium,
                    );
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('Xác nhận', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: StreamBuilder<List<UserModel>>(
        stream: _adminService.getUsersStream(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final allUsers = snapshot.data ?? [];

          final filteredUsers = allUsers.where((user) {
            if (user.email.trim().isEmpty) return false;
            final matchesSearch = user.name.toLowerCase().contains(searchQuery.toLowerCase());
            bool matchesFilter = true;
            if (filterType == 'premium') matchesFilter = user.isPremium == true;
            if (filterType == 'free') matchesFilter = user.isPremium == false;
            return matchesSearch && matchesFilter;
          }).toList();

          return Column(
            children: [
              _buildHeader(filteredUsers.length),
              _buildSearchAndFilter(),
              Expanded(
                child: filteredUsers.isEmpty ? _buildEmptyState() : _buildUserList(filteredUsers),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeader(int count) {
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
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quản lý người dùng',
              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
          Text('$count người dùng', style: const TextStyle(color: Colors.white70, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter() {
    return Container(
      transform: Matrix4.translationValues(0, -20, 0),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))],
      ),
      child: Column(
        children: [
          TextField(
            onChanged: (val) => setState(() => searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Tìm kiếm người dùng...',
              hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
              prefixIcon: const Icon(Icons.search_rounded, color: Colors.grey, size: 20),
              filled: true,
              fillColor: const Color(0xFFF3F4F6),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildFilterChip('all', 'Tất cả'),
              const SizedBox(width: 8),
              _buildFilterChip('premium', 'Premium'),
              const SizedBox(width: 8),
              _buildFilterChip('free', 'Miễn phí'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String type, String label) {
    final isSelected = filterType == type;
    return GestureDetector(
      onTap: () => setState(() => filterType = type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.person_off_rounded, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Text('Không tìm thấy người dùng', style: TextStyle(color: Colors.grey[500])),
      ],
    );
  }

  Widget _buildUserList(List<UserModel> filteredUsers) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      itemCount: filteredUsers.length,
      itemBuilder: (context, index) {
        final user = filteredUsers[index];
        final String docId = user.uid;
        final SubscriptionPlan plan = user.plan;
        final Color levelColor = _getLevelColor(plan);

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3))],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [levelColor.withOpacity(0.8), levelColor],
                      ),
                      shape: BoxShape.circle,
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
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(user.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  overflow: TextOverflow.ellipsis),
                            ),
                            if (user.isPremium == true) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: levelColor.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(_getLevelIcon(plan), color: levelColor, size: 12),
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
                          ],
                        ),
                        Text(user.email, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showPremiumLevelDialog(docId, user.name, plan),
                      icon: Icon(_getLevelIcon(plan), size: 15),
                      label: Text(
                        user.isPremium == true ? 'Đổi gói' : 'Cấp Premium',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: user.isPremium == true
                            ? levelColor.withOpacity(0.1)
                            : const Color(0xFFF3F4F6),
                        foregroundColor: user.isPremium == true ? levelColor : Colors.grey[700],
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () => deleteUser(docId, user.name),
                    icon: const Icon(Icons.delete_outline_rounded, size: 15),
                    label: const Text('Xóa', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFEF2F2),
                      foregroundColor: const Color(0xFFEF4444),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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