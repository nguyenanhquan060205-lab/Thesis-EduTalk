import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  Future<Map<String, dynamic>> register(
    String name,
    String email,
    String password,
  ) async {
    try {
      UserCredential userCredential = await _auth
          .createUserWithEmailAndPassword(email: email, password: password);
      await userCredential.user!.updateDisplayName(name);
      await userCredential.user!.sendEmailVerification();

      String uid = userCredential.user!.uid;
      UserModel newUser = UserModel(
        uid: uid,
        name: name,
        email: email,
        role: UserRole.user,
        createdAt: DateTime.now(),
        isPremium: false,
        usageCount: 0,
      );
      await _firestore.collection('users').doc(uid).set(newUser.toMap());

      print("Register OK — uid: $uid");
      return {"status": "success"};
    } on FirebaseAuthException catch (e) {
      print("FirebaseAuth lỗi: ${e.code} — ${e.message}");
      if (e.code == 'weak-password') {
        return {"status": "Mật khẩu quá yếu."};
      } else if (e.code == 'email-already-in-use') {
        return {"status": "Email này đã được đăng ký."};
      }
      return {"status": e.message ?? "Lỗi đăng ký"};
    } catch (e) {
      print("Lỗi register: $e");
      return {"status": "Lỗi hệ thống: $e"};
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (email != 'admin@edutalk.com' && !userCredential.user!.emailVerified) {
        await _auth.signOut();
        return {
          "status":
              "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.",
        };
      }

      String uid = userCredential.user!.uid;
      DocumentSnapshot userDoc = await _firestore
          .collection('users')
          .doc(uid)
          .get();

      if (userDoc.exists) {
        String role = userDoc.get('role') ?? 'user';
        print("Login OK — role: $role");
        return {"status": "success", "role": role};
      } else {
        return {"status": "Không tìm thấy dữ liệu người dùng."};
      }
    } on FirebaseAuthException catch (e) {
      print("FirebaseAuth lỗi: ${e.code}");
      if (e.code == 'user-not-found' ||
          e.code == 'wrong-password' ||
          e.code == 'invalid-credential') {
        return {"status": "Sai email hoặc mật khẩu."};
      }
      return {"status": e.message ?? "Lỗi đăng nhập"};
    } catch (e) {
      print("Lỗi login: $e");
      return {"status": "Lỗi hệ thống: $e"};
    }
  }

  Future<Map<String, dynamic>> signInWithGoogle() async {
    try {
      await _googleSignIn.disconnect().catchError((_) {});

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        return {"status": "Đã hủy đăng nhập Google."};
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      UserCredential userCredential = await _auth.signInWithCredential(
        credential,
      );
      final user = userCredential.user!;

      final userDocRef = _firestore.collection('users').doc(user.uid);
      final userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        UserModel newUser = UserModel(
          uid: user.uid,
          name: user.displayName ?? '',
          email: user.email ?? '',
          role: UserRole.user,
          createdAt: DateTime.now(),
          isPremium: false,
          usageCount: 0,
        );
        await userDocRef.set(newUser.toMap());
        print("Google login — user mới, đã lưu Firestore");
        return {"status": "success", "role": "user"};
      } else {
        String role = userDoc.get('role') ?? 'user';
        print("Google login — user cũ, role: $role");
        return {"status": "success", "role": role};
      }
    } on FirebaseAuthException catch (e) {
      print("FirebaseAuth Google lỗi: ${e.code} — ${e.message}");
      return {"status": e.message ?? "Lỗi đăng nhập Google"};
    } catch (e) {
      print("Lỗi Google login: $e");
      return {"status": "Lỗi hệ thống: $e"};
    }
  }

  Future<void> resendVerificationEmail(String email, String password) async {
    try {
      UserCredential userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      await userCredential.user!.sendEmailVerification();
      await _auth.signOut();
    } catch (_) {}
  }

  Future<void> signOut() async {
    try {
      print("Đang đăng xuất...");
      await _googleSignIn.signOut();
      await _auth.signOut();
      print("Đăng xuất thành công.");
    } catch (e) {
      print("Error during sign out: $e");
    }
  }

  Future<Map<String, dynamic>> deleteAccount() async {
    try {
      final User? user = _auth.currentUser;
      if (user == null) {
        return {"status": "error", "message": "Không tìm thấy người dùng"};
      }

      final String uid = user.uid;

      print("Đang xóa lịch sử dự đoán...");
      final historySnapshot = await _firestore
          .collection('predictions')
          .doc(uid)
          .collection('history')
          .get();

      for (var doc in historySnapshot.docs) {
        await doc.reference.delete();
      }
      print("Đã xóa ${historySnapshot.docs.length} lịch sử dự đoán");

      print("Đang xóa user document...");
      await _firestore.collection('users').doc(uid).delete();

      print("Đang xóa tài khoản Authentication...");
      await user.delete();

      await _googleSignIn.signOut();

      print("Xóa tài khoản thành công!");
      return {"status": "success"};
    } on FirebaseAuthException catch (e) {
      print("FirebaseAuth lỗi khi xóa: ${e.code} — ${e.message}");
      if (e.code == 'requires-recent-login') {
        return {
          "status": "error",
          "message":
              "Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi xóa tài khoản",
        };
      }
      return {"status": "error", "message": e.message ?? "Lỗi xóa tài khoản"};
    } catch (e) {
      print("Lỗi xóa tài khoản: $e");
      return {"status": "error", "message": e.toString()};
    }
  }

  Stream<User?> get user => _auth.authStateChanges();
}
