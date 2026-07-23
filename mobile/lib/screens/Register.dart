import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/auth_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final AuthService _authService = AuthService();
  bool _obscurePassword = true;
  Timer? _verifyTimer;

  // Biến dùng để lưu trữ và hiển thị thông báo lỗi ngay dưới ô mật khẩu
  String? _passwordError;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _verifyTimer?.cancel();
    super.dispose();
  }

  // Hàm kiểm tra định dạng mật khẩu bằng Regular Expression
  bool _validatePassword(String password) {
    if (password.isEmpty) {
      setState(() {
        _passwordError = "Vui lòng nhập mật khẩu";
      });
      return false;
    }

    // Kiểm tra độ dài tối thiểu 8 ký tự
    if (password.length < 8) {
      setState(() {
        _passwordError = "Mật khẩu phải có tối thiểu 8 ký tự";
      });
      return false;
    }

    // Kiểm tra chữ hoa, số và ký tự đặc biệt
    final hasUppercase = RegExp(r'[A-Z]').hasMatch(password);
    final hasDigits = RegExp(r'[0-9]').hasMatch(password);
    final hasSpecialCharacters = RegExp(
      r'[!@#$%^&*(),.?":{}|<>]',
    ).hasMatch(password);

    if (!hasUppercase || !hasDigits || !hasSpecialCharacters) {
      setState(() {
        _passwordError = "Mật khẩu phải bao gồm: Chữ hoa, số và kí tự đặc biệt";
      });
      return false;
    }

    // Nếu hợp lệ, xóa thông báo lỗi
    setState(() {
      _passwordError = null;
    });
    return true;
  }

  void _handleRegister() async {
    String name = _nameController.text.trim();
    String email = _emailController.text.trim();
    String password = _passwordController.text.trim();

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền đầy đủ thông tin")),
      );
      return;
    }

    // Gọi hàm validate mật khẩu, nếu không thỏa mãn thì dừng lại
    if (!_validatePassword(password)) {
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    final Map<String, dynamic>? result = await _authService.register(
      name,
      email,
      password,
    );

    if (!mounted) return;
    Navigator.pop(context);

    if (result != null && result["status"] == "success") {
      await _authService.signOut();
      if (!mounted) return;
      _showVerifyEmailDialog(email, password);
    } else {
      String errorMessage = result?["status"]?.toString() ?? "Đăng ký thất bại";
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Lỗi: $errorMessage"),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showVerifyEmailDialog(String email, String password) {
    _verifyTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      try {
        final credential = await FirebaseAuth.instance
            .signInWithEmailAndPassword(email: email, password: password);
        await credential.user?.reload();
        final refreshed = FirebaseAuth.instance.currentUser;

        if (refreshed != null && refreshed.emailVerified) {
          timer.cancel();
          await _authService.signOut();
          if (!mounted) return;
          Navigator.of(context, rootNavigator: true).pop(); // đóng dialog
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("✅ Email đã xác thực! Vui lòng đăng nhập."),
              backgroundColor: Color(0xFF4CAF50),
              duration: Duration(seconds: 3),
            ),
          );
          Navigator.pop(context); // về Login
        } else {
          await _authService.signOut();
        }
      } catch (_) {
        // Chưa verified hoặc lỗi tạm thời, tiếp tục chờ
      }
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.mark_email_unread, color: Color(0xFF9575CD)),
            SizedBox(width: 8),
            Text('Xác thực email'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Chúng tôi đã gửi email xác thực đến:\n$email\n\nVui lòng kiểm tra hộp thư và nhấn vào link xác thực.',
              style: const TextStyle(height: 1.6),
            ),
            const SizedBox(height: 20),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF9575CD),
                  ),
                ),
                SizedBox(width: 10),
                Text(
                  'Đang chờ xác thực...',
                  style: TextStyle(color: Color(0xFF9575CD), fontSize: 13),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              _verifyTimer?.cancel();
              Navigator.of(ctx).pop();
              Navigator.pop(context);
            },
            child: const Text(
              'Về đăng nhập',
              style: TextStyle(color: Color(0xFF9575CD)),
            ),
          ),
        ],
      ),
    ).then((_) => _verifyTimer?.cancel());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF4A148C), Color(0xFF121212)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 30),
            child: Column(
              children: [
                const SizedBox(height: 60),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.psychology_outlined,
                    size: 80,
                    color: Color(0xFFBA68C8),
                  ),
                ),
                const SizedBox(height: 40),
                const Text(
                  'Tạo tài khoản',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Tham gia cộng đồng EduTalk ngay hôm nay.',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 50),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'TÊN HIỂN THỊ',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _nameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(
                            Icons.person_outline,
                            color: Colors.white70,
                          ),
                          hintText: 'Nhập tên của bạn...',
                          hintStyle: const TextStyle(color: Colors.white38),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.1),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'EMAIL',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _emailController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(
                            Icons.mail_outline,
                            color: Colors.white70,
                          ),
                          hintText: 'email@example.com',
                          hintStyle: const TextStyle(color: Colors.white38),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.1),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'MẬT KHẨU',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 10),
                      // ── PASSWORD FIELD ĐÃ ĐƯỢC CẬP NHẬT ──
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: const TextStyle(color: Colors.white),
                        // Thêm onChanged để kiểm tra ngay lập tức khi người dùng gõ phím (Realtime validation)
                        onChanged: (value) {
                          if (_passwordError != null) {
                            _validatePassword(value);
                          }
                        },
                        decoration: InputDecoration(
                          prefixIcon: const Icon(
                            Icons.lock_outline,
                            color: Colors.white70,
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              color: Colors.white54,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          hintText: '........',
                          hintStyle: const TextStyle(color: Colors.white38),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.1),
                          // Gán thông báo lỗi vào đây, Flutter tự động style màu đỏ và đẩy xuống dưới box nhập
                          errorText: _passwordError,
                          errorMaxLines:
                              2, // Đảm bảo hiển thị đủ nội dung khi chuỗi lỗi dài
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: BorderSide.none,
                          ),
                          // Giữ nguyên viền khi có lỗi (hoặc tùy biến màu viền lỗi tại đây nếu muốn)
                          errorBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: const BorderSide(
                              color: Colors.redAccent,
                              width: 1,
                            ),
                          ),
                          focusedErrorBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(15),
                            borderSide: const BorderSide(
                              color: Colors.redAccent,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),
                      Container(
                        width: double.infinity,
                        height: 55,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF9575CD), Color(0xFF673AB7)],
                          ),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: ElevatedButton(
                          onPressed: _handleRegister,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Đăng ký',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(width: 10),
                              Icon(Icons.arrow_forward, color: Colors.white),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Đã có tài khoản? ',
                      style: TextStyle(color: Colors.white70),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const Text(
                        'Đăng nhập',
                        style: TextStyle(
                          color: Color(0xFFBA68C8),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
