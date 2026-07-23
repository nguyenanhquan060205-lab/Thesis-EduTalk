import 'package:cloud_firestore/cloud_firestore.dart';

class PostModel {
  String? id;
  final String authorId; 
  final String content;
  final String? imageUrl; 
  final List<String> tags;
  final String authorName;
  final String authorBio;
  final DateTime createdAt;
  final int interactionCount;
  final int reportCount; 
  final bool isPending; 
  final List<String> upvotedBy;
  final List<String> reportedBy;
  final int commentCount; // Biến đếm hiển thị số cmt ra ngoài

  PostModel({
    this.id,
    required this.authorId,
    required this.content,
    this.imageUrl,
    required this.tags,
    required this.authorName,
    required this.authorBio,
    required this.createdAt,
    this.interactionCount = 0,
    this.reportCount = 0,
    this.isPending = false,
    this.upvotedBy = const [], 
    this.reportedBy = const [], 
    this.commentCount = 0,
  });

  Map<String, dynamic> toMap() {
    return {
      'authorId': authorId,
      'content': content,
      'imageUrl': imageUrl,
      'tags': tags,
      'authorName': authorName,
      'authorBio': authorBio,
      'createdAt': createdAt, 
      'interactionCount': interactionCount,
      'reportCount': reportCount,
      'isPending': isPending,
      'upvotedBy': upvotedBy,
      'reportedBy': reportedBy,
      'commentCount': commentCount,
    };
  }

  factory PostModel.fromMap(Map<String, dynamic> map, String documentId) {
    return PostModel(
      id: documentId,
      authorId: map['authorId'] ?? '',
      content: map['content'] ?? '',
      imageUrl: map['imageUrl'], 
      tags: List<String>.from(map['tags'] ?? []),
      authorName: map['authorName'] ?? '',
      authorBio: map['authorBio'] ?? '',
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      interactionCount: map['interactionCount'] ?? 0,
      reportCount: map['reportCount'] ?? 0,
      isPending: map['isPending'] ?? false,
      upvotedBy: List<String>.from(map['upvotedBy'] ?? []),
      reportedBy: List<String>.from(map['reportedBy'] ?? []),
      commentCount: map['commentCount'] ?? 0,
    );
  }
}

// ===========================================================================
// MODEL CHO BÌNH LUẬN (CHỨA PARENT ID ĐỂ THỤT LÙI DÒNG)
// ===========================================================================
class CommentModel {
  String? id;
  final String authorId;
  final String authorName;
  final String content;
  final String? imageUrl;
  final DateTime createdAt;
  final int interactionCount; 
  final List<String> upvotedBy; 
  final String? replyToName; 
  final String? parentId; 

  CommentModel({
    this.id,
    required this.authorId,
    required this.authorName,
    required this.content,
    this.imageUrl, 
    required this.createdAt,
    this.interactionCount = 0,
    this.upvotedBy = const [],
    this.replyToName,
    this.parentId, 
  });

  Map<String, dynamic> toMap() {
    return {
      'authorId': authorId,
      'authorName': authorName,
      'content': content,
      'imageUrl': imageUrl, 
      'createdAt': createdAt,
      'interactionCount': interactionCount,
      'upvotedBy': upvotedBy,
      'replyToName': replyToName,
      'parentId': parentId, 
    };
  }

  factory CommentModel.fromMap(Map<String, dynamic> map, String documentId) {
    return CommentModel(
      id: documentId,
      authorId: map['authorId'] ?? '',
      authorName: map['authorName'] ?? '',
      content: map['content'] ?? '',
      imageUrl: map['imageUrl'], 
      createdAt: (map['createdAt'] as Timestamp).toDate(),
      interactionCount: map['interactionCount'] ?? 0,
      upvotedBy: List<String>.from(map['upvotedBy'] ?? []),
      replyToName: map['replyToName'],
      parentId: map['parentId'], 
    );
  }
}

class NotificationModel {
  final String? id;
  final String receiverId;
  final String senderId;   
  final String senderName;
  final String type;       // 'like', 'comment', 'reply'
  final String postId;
  final DateTime createdAt;
  final bool isRead;       // Trạng thái đã đọc

  NotificationModel({
    this.id,
    required this.receiverId,
    required this.senderId,
    required this.senderName,
    required this.type,
    required this.postId,
    required this.createdAt,
    this.isRead = false,
  });

  factory NotificationModel.fromMap(Map<String, dynamic> map, String documentId) {
    return NotificationModel(
      id: documentId,
      receiverId: map['receiverId'] ?? '',
      senderId: map['senderId'] ?? '',
      senderName: map['senderName'] ?? '',
      type: map['type'] ?? '',
      postId: map['postId'] ?? '',
      isRead: map['isRead'] ?? false,
      createdAt: map['createdAt'] != null 
          ? (map['createdAt'] as Timestamp).toDate() 
          : DateTime.now(),
    );
  }
}