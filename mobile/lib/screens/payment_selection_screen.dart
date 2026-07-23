import 'package:flutter/material.dart';
import '../widgets/bank_transfer_sheet.dart';
import '../services/payment_service.dart';
import '../models/payment_model.dart';
import 'package:lottie/lottie.dart';

class PaymentSelectionScreen extends StatefulWidget {
  final String planName;
  final String userId;
  final double planPrice;

  const PaymentSelectionScreen({
    Key? key,
    required this.planName,
    required this.userId,
    required this.planPrice,
  }) : super(key: key);

  @override
  State<PaymentSelectionScreen> createState() => _PaymentSelectionScreenState();
}

class _PaymentSelectionScreenState extends State<PaymentSelectionScreen> {
  PaymentMethod? _selectedMethod;
  bool _isLoading = false;

  String get _planCode {
    switch (widget.planName) {
      case 'Gói Tháng': return 'monthly';
      case 'Gói Năm': return 'yearly';
      case 'Gói Trọn Đời': return 'lifetime';
      default: return 'monthly';
    }
  }

  void _onConfirm() async {
    if (_selectedMethod == null) return;

    setState(() => _isLoading = true);
    
    try {
      // 1. Lấy thông tin giá nâng cấp (Preview)
      final preview = await PaymentService().getUpgradePreview(widget.userId, _planCode);
      
      if (mounted && preview != null && (preview['creditAmount'] ?? 0) > 0) {
        setState(() => _isLoading = false);
        // Hiện thông báo chi tiết nâng cấp
        final bool? confirm = await _showUpgradeConfirmation(preview);
        if (confirm != true) return;
        setState(() => _isLoading = true);
      }

      if (_selectedMethod == PaymentMethod.momo) {
        final res = await PaymentService().createMomoPayment(
          userId: widget.userId,
          planCode: _planCode,
          orderInfo: "EduTalk Premium ${widget.planName}",
        );
        if (res.payUrl != null) {
          // Lắng nghe trạng thái MoMo qua Firestore
          _listenToTransactionStatus(res.orderId ?? "");
          await PaymentService().openMomoPayment(res.payUrl!, deeplink: res.deeplink);
        }
      } else {
        final res = await PaymentService().createBankPayment(
          userId: widget.userId,
          planCode: _planCode,
        );
        if (mounted) {
          Navigator.pop(context);
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
            builder: (_) => BankTransferSheet(
              planName: widget.planName,
              planCode: _planCode,
              userId: widget.userId,
              price: res.amount ?? widget.planPrice.toInt(),
              paymentCode: res.paymentCode ?? "", // Hiện ETxxxxxx
              orderId: res.orderId ?? "",        // Lắng nghe Firestore ID (số)
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Lỗi: $e")),
        );
      }
    } finally {
      if (mounted && _selectedMethod == PaymentMethod.momo) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _listenToTransactionStatus(String orderId) {
    // Lắng nghe giao dịch MoMo
    PaymentService().listenTransactionStatus(orderId).listen((status) {
      if (status == "success" && mounted) {
        // Tự động đóng màn hình chọn khi thành công để quay về Premium_screen
        Navigator.of(context, rootNavigator: true).pop();
      }
    });
  }

  Future<bool?> _showUpgradeConfirmation(Map<String, dynamic> preview) {
    final int original = preview['originalPrice'];
    final int credit = preview['creditAmount'];
    final int finalPrice = preview['finalPrice'];
    final int days = preview['daysLeft'];

    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text("Xác nhận nâng cấp", style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Bạn còn $days ngày của gói cũ."),
            const SizedBox(height: 8),
            _rowInfo("Giá trị còn lại:", "- ${credit}đ", color: Colors.green),
            _rowInfo("Giá gói mới:", "${original}đ"),
            const Divider(),
            _rowInfo("Cần thanh toán:", "${finalPrice}đ", isBold: true, color: const Color(0xFF2563EB)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Hủy", style: TextStyle(color: Colors.grey))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text("Xác nhận thanh toán", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _rowInfo(String label, String value, {Color? color, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14)),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Chọn phương thức", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ],
          ),
          Text("${widget.planName} - ${widget.planPrice.toInt()}đ", style: const TextStyle(fontSize: 16, color: Colors.grey)),
          const SizedBox(height: 20),
          _buildOption(PaymentMethod.momo, "Ví MoMo", "Thanh toán qua ví MoMo hoặc quét QR", Icons.wallet, const Color(0xFFAE2070), true),
          const SizedBox(height: 12),
          _buildOption(PaymentMethod.bankTransfer, "Chuyển khoản", "Chuyển khoản và gửi ảnh xác nhận", Icons.account_balance, const Color(0xFF2563EB), false),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _selectedMethod == null || _isLoading ? null : _onConfirm,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Tiếp tục thanh toán", style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOption(PaymentMethod method, String title, String sub, IconData icon, Color color, bool isRecommended) {
    bool isSelected = _selectedMethod == method;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = method),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: isSelected ? color : Colors.grey.shade300, width: 2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  if (isRecommended) ...[const SizedBox(width: 8), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(4)), child: const Text("Khuyến nghị", style: TextStyle(color: Colors.green, fontSize: 10)))]
                ]),
                Text(sub, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ]),
            ),
            if (isSelected) Icon(Icons.check_circle, color: color),
          ],
        ),
      ),
    );
  }
}
