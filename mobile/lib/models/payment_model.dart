enum PaymentMethod { momo, bankTransfer }
enum PaymentStatus { pending, success, failed, cancelled }

class PlanInfo {
  final String code;         // monthly | yearly | lifetime
  final String name;         // Gói Tháng | Gói Năm | Gói Trọn Đời
  final int amount;          // 29000 | 216000 | 499000
  final int durationDays;    // 30 | 365 | -1

  const PlanInfo({
    required this.code,
    required this.name,
    required this.amount,
    required this.durationDays,
  });

  static const Map<String, PlanInfo> plans = {
    'monthly': PlanInfo(
      code:         'monthly',
      name:         'Gói Tháng',
      amount:       29000,
      durationDays: 30,
    ),
    'yearly': PlanInfo(
      code:         'yearly',
      name:         'Gói Năm',
      amount:       216000,
      durationDays: 365,
    ),
    'lifetime': PlanInfo(
      code:         'lifetime',
      name:         'Gói Trọn Đời',
      amount:       499000,
      durationDays: -1,
    ),
  };
}

class PaymentResponse {
  final bool success;
  final String? payUrl;      // MoMo
  final String? deeplink;    // MoMo
  final String? qrCode;      // MoMo QR hoặc Bank QR URL
  final String? orderId;
  final String? paymentCode; // Bank (SePay)
  final String? plan;
  final String? planName;
  final int? amount;
  final String? message;

  PaymentResponse({
    required this.success,
    this.payUrl,
    this.deeplink,
    this.qrCode,
    this.orderId,
    this.paymentCode,
    this.plan,
    this.planName,
    this.amount,
    this.message,
  });

  factory PaymentResponse.fromJson(Map<String, dynamic> json) {
    return PaymentResponse(
      success:     json['success'] ?? false,
      payUrl:      json['payUrl'],
      deeplink:    json['deeplink'],
      qrCode:      json['qrCode'], // MoMo: qrCodeUrl, Bank: N/A in response but maybe later
      orderId:     json['orderId'],
      paymentCode: json['paymentCode'],
      plan:        json['plan'] ?? json['planCode'],
      planName:    json['planName'],
      amount:      json['amount'] != null ? int.tryParse(json['amount'].toString()) : null,
      message:     json['message'] ?? json['error'],
    );
  }
}
