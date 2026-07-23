import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'dart:async';
import '../services/payment_service.dart';

class BankTransferSheet extends StatefulWidget {
  final String planName;
  final String planCode;
  final String userId;
  final int price;
  final String paymentCode; // ETxxxxxx
  final String orderId; // Numeric ID

  const BankTransferSheet({
    Key? key,
    required this.planName,
    required this.planCode,
    required this.userId,
    required this.price,
    required this.paymentCode,
    required this.orderId,
  }) : super(key: key);

  @override
  State<BankTransferSheet> createState() => _BankTransferSheetState();
}

class _BankTransferSheetState extends State<BankTransferSheet> {
  StreamSubscription? _subscription;
  final Set<String> _copiedFields = {};

  final String bankId = "OCB";
  final String accountNo = "0385274441";
  final String accountName = "EduTalk Company";

  @override
  void initState() {
    super.initState();
    _listenToTransactionStatus();
  }

  void _listenToTransactionStatus() {
    // CHỈ lắng nghe trạng thái của ĐÚNG đơn hàng này
    _subscription = PaymentService()
        .listenTransactionStatus(widget.orderId)
        .listen((status) {
          if (status == "success" && mounted) {
            _subscription?.cancel();
            // Pop 2 lần để đóng cả BankTransferSheet và PaymentSelectionScreen
            Navigator.pop(context); // Đóng Sheet hiện tại
            Navigator.pop(
              context,
            ); // Đóng màn hình PaymentSelectionScreen bên dưới
          }
        });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _copyToClipboard(String fieldId, String text) {
    Clipboard.setData(ClipboardData(text: text));
    setState(() {
      _copiedFields.add(fieldId);
    });
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copiedFields.remove(fieldId);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final String qrUrl =
        "https://img.vietqr.io/image/$bankId-$accountNo-qr_only.png?amount=${widget.price}&addInfo=${widget.paymentCode}&accountName=$accountName";

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF005A3C).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.account_balance_rounded,
                    color: Color(0xFF005A3C),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Quét mã thanh toán",
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    Text(
                      "EduTalk Premium - Thanh toán an toàn",
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        qrUrl,
                        width: 200,
                        height: 200,
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return const SizedBox(
                            width: 200,
                            height: 200,
                            child: Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.qr_code_scanner_rounded,
                            size: 14,
                            color: Color(0xFF2563EB),
                          ),
                          SizedBox(width: 6),
                          Text(
                            "VietQR - Quét bằng mọi app Bank",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 24),
            _buildInfoRow(
              "Ngân hàng",
              "OCB - Ngân hàng Phương Đông",
              leading: Container(
                width: 24,
                height: 24,
                margin: const EdgeInsets.only(right: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFF005A3C),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text(
                    "O",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
            _buildInfoRow(
              "Số tài khoản",
              accountNo,
              isMono: true,
              canCopy: true,
              fieldId: "stk",
            ),
            _buildInfoRow("Chủ tài khoản", accountName),
            _buildInfoRow(
              "Số tiền",
              "${widget.price}đ",
              isRed: true,
              isLarge: true,
            ),
            _buildInfoRow(
              "Nội dung CK",
              widget.paymentCode,
              isMono: true,
              canCopy: true,
              fieldId: "content",
              isBold: true,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFEF3C7)),
              ),
            ),
            const SizedBox(height: 32),
            Column(
              children: [
                Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            "Hệ thống đang kiểm tra giao dịch của bạn!",
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: const Text(
                      "Tôi đã chuyển khoản",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    "Đóng",
                    style: TextStyle(
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value, {
    bool isMono = false,
    bool canCopy = false,
    bool isRed = false,
    bool isLarge = false,
    bool isBold = false,
    String? fieldId,
    Widget? leading,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (leading != null) leading,
                Flexible(
                  child: Text(
                    value,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      fontSize: isLarge ? 18 : 14,
                      fontFamily: isMono ? 'Courier' : null,
                      fontWeight: (isBold || isLarge)
                          ? FontWeight.w900
                          : FontWeight.w700,
                      color: isRed
                          ? const Color(0xFFEF4444)
                          : const Color(0xFF1E293B),
                    ),
                  ),
                ),
                if (canCopy && fieldId != null)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: InkWell(
                      onTap: () => _copyToClipboard(fieldId, value),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        child: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: Icon(
                            _copiedFields.contains(fieldId)
                                ? Icons.check_rounded
                                : Icons.copy_rounded,
                            key: ValueKey(_copiedFields.contains(fieldId)),
                            size: 18,
                            color: _copiedFields.contains(fieldId)
                                ? Colors.green
                                : const Color(0xFF2563EB),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
