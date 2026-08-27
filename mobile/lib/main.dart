import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'package:ui_login_out/screens/home.dart';
import 'package:ui_login_out/services/auth_service.dart';
import 'firebase_options.dart';
import 'screens/Login.dart';
import 'screens/admin/admin_layout.dart';
import 'provider/Themenotifier.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'services/notification_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

void main() async {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    FlutterError.onError = (details) {
      debugPrint('\n===== FLUTTER ERROR =====');
      debugPrint(details.exceptionAsString());
      debugPrint(details.stack.toString());
    };

    debugPrint('[STEP 1] Firebase init...');
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    debugPrint('[STEP 2] dotenv load...');
    await dotenv.load(fileName: ".env");
    debugPrint('[STEP 3] AppCheck activate...');
    try {
      await FirebaseAppCheck.instance.activate(
        androidProvider: kDebugMode
            ? AndroidProvider.debug
            : AndroidProvider.playIntegrity,
        appleProvider: kDebugMode
            ? AppleProvider.debug
            : AppleProvider.appAttest,
      );
    } catch (e) {
      debugPrint('[STEP 3 ERROR] AppCheck error (ignored): $e');
    }
    debugPrint('[STEP 4] NotificationService init (background)...');
    // Chạy background — không block runApp
    NotificationService.initialize().catchError((e) {
      debugPrint('[STEP 4 ERROR] Notification init error: $e');
    });
    debugPrint('[STEP 5] runApp...');
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    runApp(
      ChangeNotifierProvider(
        create: (_) => ThemeNotifier(),
        child: const MyApp(),
      ),
    );
    debugPrint('[STEP 6] runApp done!');
  }, (error, stack) {
    debugPrint('\n===== UNCAUGHT ASYNC ERROR =====');
    debugPrint(error.toString());
    debugPrint(stack.toString());
  });
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'EduTalk',

      // ── Theme mode: Luôn luôn là Light mode ──
      themeMode: ThemeMode.light,

      // ── Light Theme ─────────────────────────────────────────────
      theme: ThemeData(
        brightness: Brightness.light,
        fontFamily: '.AppleSystemUIFont',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF6F7FB),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF1E293B),
          elevation: 0,
        ),
        cardColor: Colors.white,
        textTheme: const TextTheme().apply(
          fontFamily: '.AppleSystemUIFont',
          bodyColor: Color(0xFF1E293B),
          displayColor: Color(0xFF1E293B),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Future<Map<String, dynamic>?>? _docFuture;
  String? _cachedUid;

  Future<Map<String, dynamic>?> _getDoc(String uid) {
    if (_cachedUid != uid || _docFuture == null) {
      _cachedUid = uid;
      _docFuture = AuthService().getUserInfo(uid);
    }
    return _docFuture!;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return const _LoadingScreen();
        }

        final user = authSnapshot.data;
        print('AUTH STATE: user = ${user?.uid}');

        if (user == null) {
          _docFuture = null;
          _cachedUid = null;
          return const LoginScreen();
        }

        // Khi user đăng nhập, reload theme setting từ Firestore
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            context.read<ThemeNotifier>().reloadForUser();
          }
        });

        final String name =
            user.displayName ?? user.email?.split('@')[0] ?? 'Bạn';

        return FutureBuilder<Map<String, dynamic>?>(
          future: _getDoc(user.uid),
          builder: (context, docSnapshot) {
            print(
              'DOC STATE: ${docSnapshot.connectionState} '
              'hasError=${docSnapshot.hasError} '
              'exists=${docSnapshot.data != null}',
            );

            if (docSnapshot.connectionState == ConnectionState.waiting) {
              return const _LoadingScreen();
            }

            if (docSnapshot.hasError) {
              print('DOC ERROR: ${docSnapshot.error}');
              return HomeScreen(userName: name);
            }

            if (!docSnapshot.hasData || docSnapshot.data == null) {
              print('DOC: không tồn tại → HomeScreen');
              return HomeScreen(userName: name);
            }

            final String role = docSnapshot.data!['role'] ?? 'user';
            print('DOC: role=$role → vào HomeScreen');
            if (role == 'admin') return const AdminLayout();
            return HomeScreen(userName: name);
          },
        );
      },
    );
  }
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF121212),
      body: Center(child: CircularProgressIndicator(color: Color(0xFF4DD0E1))),
    );
  }
}
