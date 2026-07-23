import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'Setting.dart';
import 'Premium_screen.dart';
import 'ThaoLuan.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'free_usage_store.dart';
import '../services/premium_theme_helper.dart';
import '../models/user_model.dart';

// ── CUSTOM FORMATTER CHUẨN: KHÔNG BỊ THỤT SỐ KHI NHẬP NGÀY SINH ──
class DateTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Lấy chuỗi mới và loại bỏ toàn bộ ký tự không phải là số
    String newText = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Giới hạn tối đa 8 chữ số (DDMMYYYY)
    if (newText.length > 8) {
      newText = newText.substring(0, 8);
    }

    final buffer = StringBuffer();
    for (int i = 0; i < newText.length; i++) {
      buffer.write(newText[i]);
      // Chèn dấu '/' sau vị trí số thứ 2 (ngày) và số thứ 4 (tháng)
      if ((i == 1 || i == 3) && i != newText.length - 1) {
        buffer.write('/');
      }
    }

    final resultText = buffer.toString();

    return TextEditingValue(
      text: resultText,
      selection: TextSelection.collapsed(offset: resultText.length),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  final String username;
  final ValueChanged<int>? onChangeTab;

  const ProfileScreen({super.key, this.username = "Name", this.onChangeTab});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _dobController;

  final ImagePicker _picker = ImagePicker();
  File? _imageFile;
  String? _photoUrl; // Biến lưu link ảnh từ Cloudinary

  String _displayName = "";
  bool _isUpdating = false;

  // Premium Palette
  static const Color primaryNavy = Color(0xFF001C3D);
  static const Color accentOrange = Color(0xFFFF9100);
  static const Color warmBg = Color(0xFFFFF9EE);

  @override
  void initState() {
    super.initState();
    final user = FirebaseAuth.instance.currentUser;
    String userEmail = user?.email ?? "Chưa có email";
    String displayName = user?.displayName ?? "";

    if (displayName.isEmpty && userEmail.contains('@')) {
      displayName = userEmail.split('@')[0];
    } else if (displayName.isEmpty) {
      displayName = widget.username;
    }

    _displayName = displayName;

    _nameController = TextEditingController(text: displayName);
    _emailController = TextEditingController(text: userEmail);
    _phoneController = TextEditingController(text: "");
    _dobController = TextEditingController(text: "");

    _loadUserData();
  }

  void _showTopNotification({
    required String message,
    required Color backgroundColor,
    IconData icon = Icons.info_outline,
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 10,
        left: 20,
        right: 20,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(icon, color: Colors.white, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    message,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    Future.delayed(const Duration(seconds: 3), () {
      overlayEntry.remove();
    });
  }

  Future<void> _loadUserData() async {
    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid == null) return;

      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .get();

      if (doc.exists && mounted) {
        final data = doc.data()!;
        setState(() {
          _phoneController.text = data['phone'] ?? "";
          _dobController.text = data['dob'] ?? "";
          _photoUrl = data['photoUrl']; // Lấy link ảnh từ Firestore về

          if ((data['name'] ?? "").toString().isNotEmpty) {
            _displayName = data['name'];
            _nameController.text = _displayName;
          }
        });
      }
    } catch (e) {
      debugPrint("Lỗi load dữ liệu: $e");
    }
  }

  Future<void> _handleUpdate() async {
    final phone = _phoneController.text.trim();
    final dob = _dobController.text.trim();

    if (phone.isEmpty && dob.isEmpty) {
      _showTopNotification(
        message: "Vui lòng nhập số điện thoại hoặc ngày sinh!",
        backgroundColor: Colors.orange,
        icon: Icons.warning_amber_rounded,
      );
      return;
    }

    if (dob.isNotEmpty && dob.length < 10) {
      _showTopNotification(
        message: "Ngày sinh chưa đúng định dạng DD/MM/YYYY",
        backgroundColor: Colors.orange,
        icon: Icons.date_range_outlined,
      );
      return;
    }

    setState(() => _isUpdating = true);

    try {
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid == null) throw Exception("Chưa đăng nhập");

      await FirebaseFirestore.instance.collection('users').doc(uid).set({
        'phone': phone,
        'dob': dob,
        'updated_at': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      if (mounted) {
        _showTopNotification(
          message: "Cập nhật thông tin thành công!",
          backgroundColor: const Color.fromARGB(255, 190, 193, 190),
          icon: Icons.check_circle_outline_rounded,
        );
      }
    } catch (e) {
      if (mounted) {
        _showTopNotification(
          message: "Lỗi cập nhật: $e",
          backgroundColor: Colors.redAccent,
          icon: Icons.error_outline_rounded,
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 80,
      );
      
      if (image != null) {
        setState(() {
          _imageFile = File(image.path);
          _isUpdating = true; // Bật vòng xoay loading
        });

        final uid = FirebaseAuth.instance.currentUser?.uid;
        if (uid == null) throw Exception("Chưa đăng nhập");

        // 1. GỌI API ĐẨY ẢNH LÊN CLOUDINARY
        const cloudName = "edutalk-app"; // Thay tên của ông vào đây
        const uploadPreset = "edutalk_avatars"; // Thay preset vào đây (Nhớ set Unsigned trên web)
        
        final url = Uri.parse("https://api.cloudinary.com/v1_1/$cloudName/image/upload");
        final request = http.MultipartRequest('POST', url)
          ..fields['upload_preset'] = uploadPreset
          ..files.add(await http.MultipartFile.fromPath('file', _imageFile!.path));

        final response = await request.send();
        
        if (response.statusCode != 200) {
          throw Exception("Lỗi khi up ảnh lên Cloudinary");
        }

        // 2. LẤY LINK ẢNH TRẢ VỀ
        final responseData = await response.stream.bytesToString();
        final jsonMap = jsonDecode(responseData);
        final downloadUrl = jsonMap['secure_url']; // Link https của ảnh

        // 3. LƯU LINK ĐÓ VÀO FIRESTORE CỦA USER
        await FirebaseFirestore.instance.collection('users').doc(uid).set({
          'photoUrl': downloadUrl,
        }, SetOptions(merge: true));
        
        await FirebaseAuth.instance.currentUser?.updatePhotoURL(downloadUrl);
        UserAvatarCache.clear(uid);

        // 4. CẬP NHẬT GIAO DIỆN
        if (mounted) {
          setState(() {
            _photoUrl = downloadUrl;
            _isUpdating = false;
          });
          _showTopNotification(
            message: "Đã cập nhật ảnh đại diện mới!",
            backgroundColor: const Color.fromARGB(255, 180, 180, 181),
            icon: Icons.add_a_photo_outlined,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUpdating = false);
        _showTopNotification(
          message: "Lỗi khi up ảnh: $e",
          backgroundColor: Colors.redAccent,
          icon: Icons.error_outline,
        );
      }
    }
  }

  void _showImagePickerOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        color: Colors.white.withOpacity(0.2),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                "Thay đổi ảnh đại diện",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color.fromARGB(255, 0, 0, 0),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _pickerOption(
                    icon: Icons.photo_library_rounded,
                    label: "Thư viện",
                    onTap: () {
                      Navigator.pop(context);
                      _pickImage(ImageSource.gallery);
                    },
                  ),
                  _pickerOption(
                    icon: Icons.camera_alt_rounded,
                    label: "Máy ảnh",
                    onTap: () {
                      Navigator.pop(context);
                      _pickImage(ImageSource.camera);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pickerOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color.fromARGB(255, 0, 0, 0).withOpacity(0.4),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: Stack(
          children: [
            _buildHeaderBackground(),
            _buildSettingsButton(),
            _buildMainContent(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderBackground() {
    return Container(
      height: 340,
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomRight,
          colors: [
            Color.fromARGB(255, 46, 108, 189),
            Color.fromARGB(255, 25, 199, 170),
            Color.fromARGB(255, 34, 197, 197),
          ],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(40)),
      ),
    );
  }

  Widget _buildSettingsButton() {
    return Positioned(
      top: 50,
      right: 20,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SettingScreen()),
          ),
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.settings_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    return Column(
      children: [
        const SizedBox(height: 60),
        _buildAvatarSection(),
        const SizedBox(height: 16),
        _buildUserIdentity(),
        const SizedBox(height: 30),
        _buildPremiumCard(),
        const SizedBox(height: 20),
        _buildInfoForm(),
        const SizedBox(height: 120),
      ],
    );
  }

  Widget _buildAvatarSection() {
    return Center(
      child: GestureDetector(
        onTap: _showImagePickerOptions,
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.3),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 70,
                backgroundColor: Colors.white.withOpacity(0.2),
                // Ưu tiên hiển thị file nếu vừa chọn xong, không có thì lấy ảnh mạng
                backgroundImage: _imageFile != null
                    ? FileImage(_imageFile!)
                    : (_photoUrl != null && _photoUrl!.isNotEmpty
                        ? NetworkImage(_photoUrl!) as ImageProvider
                        : null),
                // Chỉ hiện chữ cái khi chưa có file lẫn ảnh mạng
                child: (_imageFile == null && (_photoUrl == null || _photoUrl!.isEmpty))
                    ? Text(
                        _displayName.isNotEmpty
                            ? _displayName[0].toUpperCase()
                            : "?",
                        style: const TextStyle(
                          fontSize: 60,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      )
                    : null,
              ),
            ),
            Positioned(
              bottom: 5,
              right: 5,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xff06b6d4),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                ),
                child: const Icon(
                  Icons.camera_alt_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserIdentity() {
    return Column(
      children: [
        Text(
          _displayName,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: Colors.white,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 6),
      ],
    );
  }

  Widget _buildPremiumCard() {
    return ValueListenableBuilder<UserModel?>(
      valueListenable: currentUserNotifier,
      builder: (context, user, _) {
        final theme = PremiumTheme.getTheme(user?.plan, user?.isPremium ?? false);
        final bool isPremium = user?.isPremium ?? false;

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 20),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: theme.bgColor,
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: theme.accentColor.withOpacity(0.3),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: theme.gradientColors,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      theme.icon,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isPremium ? theme.title : "Nâng cấp Premium ✨",
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          isPremium ? "Sử dụng không giới hạn" : "Mở khóa toàn bộ tính năng",
                          style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildProgressBar(theme, user?.usageCount ?? 0, isPremium),
              const SizedBox(height: 20),
              _buildPremiumButton(theme, isPremium),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProgressBar(PremiumTheme theme, int usageCount, bool isPremium) {
    double progress = isPremium ? 1.0 : ((3 - usageCount) / 3).clamp(0.0, 1.0);
    int remaining = (3 - usageCount).clamp(0, 3);

    return Column(
      children: [
        Stack(
          children: [
            Container(
              height: 10,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 600),
                  curve: Curves.easeOutBack,
                  height: 10,
                  width: constraints.maxWidth * progress,
                  decoration: BoxDecoration(
                    color: theme.accentColor,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(color: theme.accentColor.withOpacity(0.4), blurRadius: 8)
                    ],
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: Text(
            isPremium ? "TRẠNG THÁI: UNLIMITED" : "DÙNG THỬ: $remaining/3 LƯỢT",
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 0.5,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPremiumButton(PremiumTheme theme, bool isPremium) {
    return Container(
      width: double.infinity,
      height: 54,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: theme.gradientColors,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: theme.gradientColors.first.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: () async {
          final targetTab = await Navigator.push<int>(
            context,
            MaterialPageRoute(
              builder: (_) => PremiumScreen(onTabChange: widget.onChangeTab),
            ),
          );
          if (targetTab != null && widget.onChangeTab != null) {
            widget.onChangeTab!(targetTab);
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
        ),
        child: Text(
          isPremium ? "Quản lý gói" : "Xem gói Premium",
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoForm() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.person_pin_outlined,
                color: Color(0xFF2563EB),
                size: 24,
              ),
              SizedBox(width: 12),
              Text(
                "Thông tin cá nhân",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: primaryNavy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          _buildTextField(
            "Họ và tên",
            "Nhập tên của bạn",
            Icons.person_outline,
            _nameController,
            readOnly: true,
          ),
          _buildTextField(
            "Email",
            "example@email.com",
            Icons.email_outlined,
            _emailController,
            readOnly: true,
          ),
          _buildTextField(
            "Số điện thoại",
            "Nhập số điện thoại...",
            Icons.phone_outlined,
            _phoneController,
            keyboardType: TextInputType.phone,
          ),

          // Ô nhập Ngày sinh đã fix hoàn toàn lỗi thụt ký tự
          _buildTextField(
            "Ngày sinh",
            "DD/MM/YYYY",
            Icons.calendar_today_outlined,
            _dobController,
            keyboardType: TextInputType.number,
            inputFormatters: [DateTextFormatter()],
          ),

          const SizedBox(height: 8),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isUpdating ? null : _handleUpdate,
              icon: _isUpdating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Icon(Icons.save_rounded, color: Colors.white),
              label: Text(
                _isUpdating ? "Đang lưu..." : "Cập nhật thông tin",
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                disabledBackgroundColor: const Color(0xFF93C5FD),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    String hint,
    IconData icon,
    TextEditingController controller, {
    bool readOnly = false,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Color(0xff1e293b),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            readOnly: readOnly,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
            style: TextStyle(
              color: readOnly ? const Color(0xff94a3b8) : Colors.black,
              fontWeight: FontWeight.w500,
              fontSize: 15,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Color(0xff94a3b8)),
              prefixIcon: Icon(icon, size: 22, color: const Color(0xff94a3b8)),
              filled: true,
              fillColor: readOnly
                  ? const Color(0xfff1f5f9)
                  : const Color(0xfff8fafc),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xffe2e8f0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Color(0xffe2e8f0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(
                  color: readOnly
                      ? const Color(0xffe2e8f0)
                      : const Color(0xFF2563EB),
                  width: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}