#!/bin/bash

# Recreate PredictionModel
cat << 'EOF' > lib/models/prediction_model.dart
import 'package:cloud_firestore/cloud_firestore.dart';

class PredictionModel {
  final String id;
  final String predictedMajor;
  final double totalScore;
  final dynamic createdAt;
  final List<dynamic> recommendations;
  final Map<String, dynamic> rawData;

  PredictionModel({
    required this.id,
    required this.predictedMajor,
    required this.totalScore,
    required this.createdAt,
    required this.recommendations,
    required this.rawData,
  });

  factory PredictionModel.fromMap(Map<String, dynamic> map, String id) {
    return PredictionModel(
      id: id,
      predictedMajor: map['predicted_major'] ?? '',
      totalScore: (map['total_score'] as num?)?.toDouble() ?? 0.0,
      createdAt: map['created_at'],
      recommendations: map['recommendations'] ?? [],
      rawData: map,
    );
  }

  Map<String, dynamic> data() => rawData;
  Map<String, dynamic> toDisplayMap() => rawData;
}
EOF

# Add missing imports using sed
sed -i '' '1i\
import '\''package:ui_login_out/services/auth_service.dart'\'';\
' lib/screens/ThaoLuan.dart

sed -i '' '1i\
import '\''package:ui_login_out/services/auth_service.dart'\'';\
' lib/screens/Profile.dart

sed -i '' '1i\
import '\''package:cloud_firestore/cloud_firestore.dart'\'';\
' lib/screens/LichSu.dart

sed -i '' '1i\
import '\''package:firebase_auth/firebase_auth.dart'\'';\
' lib/screens/Register.dart

sed -i '' '1i\
import '\''package:cloud_firestore/cloud_firestore.dart'\'';\
' lib/screens/admin/dashboard_screen.dart

sed -i '' '1i\
import '\''package:cloud_firestore/cloud_firestore.dart'\'';\
' lib/screens/admin/premium_management_screen.dart

sed -i '' '1i\
import '\''package:cloud_firestore/cloud_firestore.dart'\'';\
' lib/screens/admin/admin_layout.dart

sed -i '' '1i\
import '\''package:firebase_auth/firebase_auth.dart'\'';\
' lib/screens/ChangePass.dart

# Fix support_request_screen.dart syntax
sed -i '' 's/ScaffoldMessenger.of(context).showSnackBar(/ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Lỗi"))/g' lib/screens/support_request_screen.dart

# Fix admin_service.dart mapping
sed -i '' 's/UserModel.fromMap(Map<String, dynamic>.from(e))/UserModel.fromMap(Map<String, dynamic>.from(e), e['\''id'\''] ?? '\'''\'')/g' lib/services/admin_service.dart

# Fix post_service.dart mapping for notifications
sed -i '' 's/NotificationModel.fromMap(Map<String, dynamic>.from(e))/NotificationModel.fromMap(Map<String, dynamic>.from(e), e['\''id'\''] ?? '\'''\'')/g' lib/services/post_service.dart

# Replace getComments and getCommentsStream in post_service.dart
cat << 'EOF' > fix_comments.py
import re
with open("lib/services/post_service.dart", "r") as f:
    content = f.read()

old_comments = """  Future<List<Map<String, dynamic>>> getComments(String postId) async {
    final result = await ApiClient.get('/api/v1/posts/$postId/comments');
    if (result['data'] == null) return [];
    return List<Map<String, dynamic>>.from(result['data']);
  }

  Stream<List<Map<String, dynamic>>> getCommentsStream(String postId) async* {
    while (true) {
      yield await getComments(postId);
      await Future.delayed(const Duration(seconds: 15));
    }
  }"""

new_comments = """  Future<List<CommentModel>> getComments(String postId) async {
    final result = await ApiClient.get('/api/v1/posts/$postId/comments');
    if (result['data'] == null) return [];
    return (result['data'] as List).map((e) => CommentModel.fromMap(Map<String, dynamic>.from(e), e['id'] ?? '')).toList();
  }

  Stream<List<CommentModel>> getCommentsStream(String postId) async* {
    while (true) {
      yield await getComments(postId);
      await Future.delayed(const Duration(seconds: 15));
    }
  }
  
  Future<void> upvoteComment(String postId, String commentId, String uid) async {
    await ApiClient.post('/api/v1/posts/$postId/comments/$commentId/upvote', withAuth: true);
  }"""

content = content.replace(old_comments, new_comments)
with open("lib/services/post_service.dart", "w") as f:
    f.write(content)
EOF
python3 fix_comments.py

# Re-run dart analyze to check if we fixed everything
dart analyze
