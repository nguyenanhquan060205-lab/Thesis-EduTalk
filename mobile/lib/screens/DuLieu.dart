import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:ui_login_out/screens/free_usage_store.dart';
import 'package:ui_login_out/services/premium_theme_helper.dart';
import 'Premium_screen.dart';
import '../models/user_model.dart';
import '../widgets/premium_upgrade_dialog.dart';

class DuLieuScreen extends StatefulWidget {
  final ValueChanged<int>? onChangeTab;
  final Function(
    double totalScore,
    List<String> subjects,
    List<double> scoresDetail,
  )?
  onOPenPhanTich;
  const DuLieuScreen({super.key, this.onChangeTab, this.onOPenPhanTich});

  @override
  State<DuLieuScreen> createState() => DuLieuScreenState();
}

class DuLieuScreenState extends State<DuLieuScreen> {
  String region = "Cả nước";
  String group = "A00";
  bool _showScoreError = false;

  final Map<String, List<String>> subjectsMap = {
    "A00": ["Toán", "Lý", "Hóa"],
    "A01": ["Toán", "Lý", "Anh"],
    "B00": ["Toán", "Hóa", "Sinh"],
    "C00": ["Văn", "Sử", "Địa"],
    "D01": ["Toán", "Văn", "Anh"],
  };

  final Map<String, String> groupTitleMap = {
    "A00": "A00 - Toán, Lý, Hóa",
    "A01": "A01 - Toán, Lý, Anh",
    "B00": "B00 - Toán, Hóa, Sinh",
    "C00": "C00 - Văn, Sử, Địa",
    "D01": "D01 - Toán, Văn, Anh",
  };

  List<String> subjects = ["Toán", "Lý", "Hóa"];

  final List<TextEditingController> scores = [
    TextEditingController(text: "0.0"),
    TextEditingController(text: "0.0"),
    TextEditingController(text: "0.0"),
  ];

  double get _totalScore => scores.fold(
    0.0,
    (sum, c) => sum + (double.tryParse(c.text.replaceAll(',', '.')) ?? 0.0),
  );

  bool get _hasValidScores => scores.every(
    (c) => (double.tryParse(c.text.replaceAll(',', '.')) ?? 0.0) > 0.0,
  );

  void changeGroup(String value) {
    setState(() {
      group = value;
      subjects = subjectsMap[value]!;
    });
  }

  void _changeScore(int index, double delta) {
    final current =
        double.tryParse(scores[index].text.replaceAll(',', '.')) ?? 0.0;
    final next = (current + delta).clamp(0.0, 10.0);
    scores[index].text = next.toStringAsFixed(1);
    setState(() {});
  }

  void _normalizeScore(int index) {
    String text = scores[index].text.replaceAll(',', '.');
    double? value = double.tryParse(text);

    // Nếu nhập 2 chữ số không có dấu chấm (vd: "85") → hiểu là "8.5"
    if (value == null || (value > 10 && !text.contains('.'))) {
      if (text.length == 2 && !text.contains('.')) {
        text = '${text[0]}.${text[1]}';
        value = double.tryParse(text);
      }
    }

    final normalized = (value ?? 0.0).clamp(0.0, 10.0);
    scores[index].text = normalized.toStringAsFixed(1);
    setState(() {});
  }

  void resetForm() {
    setState(() {
      region = "Cả nước";
      group = "A00";
      subjects = subjectsMap[group]!;
      for (var controller in scores) {
        controller.text = "0.0";
      }
    });
  }

  void scrollToTop() {
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
    );
  }

  final ScrollController _scrollController = ScrollController();
  final GlobalKey _scoreRowKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    for (final c in scores) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final controller in scores) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _handleAnalyze() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final doc = await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .get();
    if (!doc.exists) return;
    final userData = UserModel.fromDocument(doc);

    // Ưu tiên check Premium trước. Nếu là Premium Active thì cho qua luôn, không check lượt.
    if (userData.isPremiumActive) {
      final List<double> scoresDetail = scores
          .map((c) => double.tryParse(c.text.replaceAll(',', '.')) ?? 0.0)
          .toList();
      widget.onOPenPhanTich?.call(_totalScore, subjects, scoresDetail);
    }
    // Nếu KHÔNG phải Premium, lúc này mới check lượt dùng thử.
    else if (userData.usageCount >= userData.freeLimit) {
      if (mounted) _showUpgradeBottomSheet();
    }
    // Trường hợp chưa hết lượt dùng thử.
    else {
      final List<double> scoresDetail = scores
          .map((c) => double.tryParse(c.text.replaceAll(',', '.')) ?? 0.0)
          .toList();
      widget.onOPenPhanTich?.call(_totalScore, subjects, scoresDetail);
    }
  }

  void _showUpgradeBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Lottie.asset(
              'assets/Live chatbot.json', // Local Robot animation
              height: 180,
            ),
            const SizedBox(height: 24),
            const Text(
              "Bạn đã dùng hết lượt miễn phí",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            const Text(
              "Để tiếp tục sử dụng tính năng AI phân tích chuyên sâu và không giới hạn lượt dùng, hãy nâng cấp lên gói Premium ngay nhé!",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 15),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PremiumScreen(),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xff2563eb),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  "Nâng cấp Premium 👑",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Để sau", style: TextStyle(color: Colors.grey)),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      body: SafeArea(
        child: SingleChildScrollView(
          controller: _scrollController,
          physics: const ClampingScrollPhysics(),
          child: Column(
            children: [
              SizedBox(
                height: 740,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    _buildHeader(),
                    Positioned(
                      top: 300,
                      left: 20,
                      right: 20,
                      child: _buildFormCard(),
                    ),
                  ],
                ),
              ),
              _buildAnalyzeButton(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      height: 370,
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xff1e3a8a), Color(0xff312e81), Color(0xff0f766e)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildTopBar(),
          const SizedBox(height: 34),
          const Text(
            "Hồ Sơ Học Tập",
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            "Nhập điểm tổ hợp môn bạn muốn xét",
            style: TextStyle(fontSize: 15, height: 1.4, color: Colors.white70),
          ),
          const SizedBox(height: 20),
          _buildTrialCard(),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Row(
      children: [
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xff1d4ed8).withOpacity(.4),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color.fromARGB(60, 7, 7, 255)),
          ),
          child: const Text(
            "Bước 1/2",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildTrialCard() {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final theme = PremiumTheme.getTheme(
          user?.plan,
          user?.isPremium ?? false,
        );
        final bool isPremium = user?.isPremiumActive ?? false;
        final int remaining = (3 - (user?.usageCount ?? 0)).clamp(0, 3);

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          decoration: BoxDecoration(
            color: theme.bgColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: theme.accentColor.withOpacity(0.6),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  isPremium ? theme.title : "Còn $remaining/3 lượt dùng thử",
                  style: TextStyle(
                    color: isPremium ? Colors.white : const Color(0xffffe08a),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                height: 50,
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: theme.gradientColors),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const PremiumScreen(),
                      ),
                    );
                  },
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(theme.icon, color: Colors.white, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        isPremium ? "Chi tiết" : "Nâng cấp",
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 18,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle(
            "Khu vực ưu tiên",
            textColor: Colors.black,
            bgColor: const Color.fromARGB(199, 255, 255, 255),
          ),
          const SizedBox(height: 12),
          _buildRegionDropdown(),
          const SizedBox(height: 24),
          _buildSectionTitle(
            "Tổ hợp môn",
            textColor: const Color.fromARGB(255, 6, 19, 40),
          ),
          const SizedBox(height: 12),
          _buildGroupDropdown(),
          const SizedBox(height: 28),
          _buildScoreRow(key: _scoreRowKey),
          if (_showScoreError && !_hasValidScores) ...[
            const SizedBox(height: 10),
            Row(
              children: const [
                Icon(
                  Icons.error_outline_rounded,
                  size: 14,
                  color: Color(0xffef4444),
                ),
                SizedBox(width: 6),
                Text(
                  "Bạn phải nhập điểm cho tất cả môn",
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xffef4444),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionTitle(
    String title, {
    Color textColor = const Color(0xff374151),
    Color? bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildRegionDropdown() {
    const regionItems = ["Cả nước", "Miền Bắc", "Miền Trung", "Miền Nam"];
    return DropdownButtonFormField<String>(
      value: region,
      isExpanded: true,
      onChanged: (value) {
        if (value == null) return;
        setState(() => region = value);
      },
      icon: const Icon(
        Icons.keyboard_arrow_down_rounded,
        color: Color(0xff9ca3af),
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.all(5),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xffd6dbe7), width: 1.4),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xff3b82f6), width: 1.8),
        ),
      ),
      dropdownColor: Colors.white,
      borderRadius: BorderRadius.circular(20),
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: Colors.black87,
      ),
      items: regionItems.map((val) {
        return DropdownMenuItem<String>(
          value: val,
          child: StatefulBuilder(
            builder: (context, setItemState) {
              bool isHovered = false;
              return StatefulBuilder(
                builder: (context, setHover) {
                  return MouseRegion(
                    onEnter: (_) => setHover(() => isHovered = true),
                    onExit: (_) => setHover(() => isHovered = false),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 3,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: isHovered
                            ? const Color(0xffeff6ff)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        val,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isHovered
                              ? const Color(0xff2563eb)
                              : Colors.black87,
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildGroupDropdown() {
    return DropdownButtonFormField<String>(
      value: group,
      onChanged: (value) {
        if (value == null) return;
        changeGroup(value);
      },
      isExpanded: true,
      icon: const Icon(
        Icons.keyboard_arrow_down_rounded,
        color: Color(0xff2563eb),
      ),
      decoration: _dropdownDecoration(
        fillColor: const Color(0xffeef4ff),
        borderColor: const Color(0xffbfdbfe),
      ),
      dropdownColor: Colors.white,
      borderRadius: BorderRadius.circular(20),
      style: const TextStyle(
        color: Color(0xff1e40af),
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
      selectedItemBuilder: (context) {
        return groupTitleMap.entries.map((entry) {
          return Align(
            alignment: Alignment.centerLeft,
            child: Text(
              entry.value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xff1e40af),
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          );
        }).toList();
      },
      items: groupTitleMap.entries.map((entry) {
        return DropdownMenuItem<String>(
          value: entry.key,
          child: StatefulBuilder(
            builder: (context, setHover) {
              bool isHovered = false;
              return StatefulBuilder(
                builder: (context, setH) {
                  return MouseRegion(
                    onEnter: (_) => setH(() => isHovered = true),
                    onExit: (_) => setH(() => isHovered = false),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isHovered
                            ? const Color(0xffeef4ff)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        entry.value,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: isHovered
                              ? const Color(0xff2563eb)
                              : const Color(0xff1e40af),
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        );
      }).toList(),
    );
  }

  InputDecoration _dropdownDecoration({
    required Color fillColor,
    required Color borderColor,
  }) {
    return InputDecoration(
      filled: true,
      fillColor: fillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: borderColor, width: 1.6),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: borderColor, width: 2),
      ),
    );
  }

  Widget _buildScoreRow({Key? key}) {
    return Row(
      key: key,
      children: List.generate(subjects.length, (index) {
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: index == subjects.length - 1 ? 0 : 12,
            ),
            child: _buildScoreCard(
              label: subjects[index].toUpperCase(),
              controller: scores[index],
              index: index,
            ),
          ),
        );
      }),
    );
  }

  Widget _buildScoreCard({
    required String label,
    required TextEditingController controller,
    required int index,
  }) {
    final bool hasError =
        _showScoreError &&
        (double.tryParse(controller.text.replaceAll(',', '.')) ?? 0.0) <= 0.0;

    return Column(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: hasError ? const Color(0xfffff5f5) : const Color(0xfff8fafc),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: hasError
                  ? const Color(0xffef4444)
                  : const Color(0xffeef2f7),
              width: hasError ? 1.6 : 1.0,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: hasError
                      ? const Color(0xffef4444)
                      : const Color(0xff1d4ed8),
                ),
              ),
              const SizedBox(height: 8),
              Container(
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xffe5e7eb)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A000000),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: controller,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        textAlign: TextAlign.center,
                        onTap: () {
                          controller.selection = TextSelection(
                            baseOffset: 0,
                            extentOffset: controller.text.length,
                          );
                        },
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                          _ScoreInputFormatter(),
                        ],
                        onFieldSubmitted: (_) => _normalizeScore(index),
                        onEditingComplete: () => _normalizeScore(index),

                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xff6b7280),
                        ),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    Container(
                      width: 28,
                      margin: const EdgeInsets.only(right: 6),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: () => _changeScore(index, 0.1),
                            child: const Padding(
                              padding: EdgeInsets.all(1),
                              child: Icon(
                                Icons.keyboard_arrow_up_rounded,
                                size: 18,
                                color: Color(0xff9ca3af),
                              ),
                            ),
                          ),
                          InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: () => _changeScore(index, -0.1),
                            child: const Padding(
                              padding: EdgeInsets.all(1),
                              child: Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 18,
                                color: Color(0xff9ca3af),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyzeButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () async {
            if (!_hasValidScores) {
              setState(() => _showScoreError = true);
              final ctx = _scoreRowKey.currentContext;
              if (ctx != null) {
                Scrollable.ensureVisible(
                  ctx,
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeOut,
                  alignment: 0.3,
                );
              }
              return;
            }
            setState(() => _showScoreError = false);
            await _handleAnalyze();
          },
          style: ElevatedButton.styleFrom(
            elevation: 8,
            shadowColor: const Color(0x332563eb),
            backgroundColor: const Color(0xff2563eb),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(22),
            ),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "Phân tích AI",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              SizedBox(width: 10),
              Icon(Icons.arrow_forward_rounded, size: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScoreInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(',', '.');
    if (text.isEmpty) return newValue.copyWith(text: '');

    // Chỉ cho phép số và dấu chấm
    if (!RegExp(r'^[\d.]*$').hasMatch(text)) return oldValue;

    // Không cho nhiều hơn 1 dấu chấm
    if (text.split('.').length > 2) return oldValue;

    // Không cho nhập nếu giá trị vượt 10
    final parsed = double.tryParse(text);
    if (parsed != null && parsed > 10.0) return oldValue;

    return newValue.copyWith(text: text);
  }
}
