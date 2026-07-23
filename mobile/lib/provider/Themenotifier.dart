import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class ThemeNotifier extends ChangeNotifier {
  bool _isDarkMode = false;
  bool _isLoading = false;

  bool get isDarkMode => _isDarkMode;
  bool get isLoading => _isLoading;
  ThemeMode get themeMode => _isDarkMode ? ThemeMode.dark : ThemeMode.light;

  ThemeNotifier() {
    _loadFromFirestore();
  }

  /// Load setting từ Firestore khi khởi động
  Future<void> _loadFromFirestore() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      if (doc.exists) {
        final data = doc.data();
        _isDarkMode = data?['isDarkMode'] ?? false;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('ThemeNotifier load error: $e');
    }
  }

  /// Gọi khi user đăng nhập để reload setting đúng tài khoản
  Future<void> reloadForUser() async {
    await _loadFromFirestore();
  }

  /// Toggle dark/light mode và lưu lên Firestore
  Future<void> toggleTheme(bool value) async {
    _isDarkMode = value;
    notifyListeners(); // Cập nhật UI ngay lập tức

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      await FirebaseFirestore.instance.collection('users').doc(user.uid).update(
        {'isDarkMode': _isDarkMode},
      );
    } catch (e) {
      debugPrint('ThemeNotifier save error: $e');
    }
  }

  /// Reset về light mode (gọi khi logout)
  void reset() {
    _isDarkMode = false;
    notifyListeners();
  }
}
