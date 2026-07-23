import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart'; 
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ui_login_out/services/post_service.dart';
import 'package:ui_login_out/models/post_model.dart';
import 'package:share_plus/share_plus.dart';

import 'notification_screen.dart';

// ===========================================================================
// HÀM TÍNH THỜI GIAN TRÔI QUA
// ===========================================================================
String getTimeAgo(DateTime dateTime) {
  Duration diff = DateTime.now().difference(dateTime);
  if (diff.inDays > 365) return "${(diff.inDays / 365).floor()} năm trước";
  if (diff.inDays > 30) return "${(diff.inDays / 30).floor()} tháng trước";
  if (diff.inDays > 0) return "${diff.inDays} ngày trước";
  if (diff.inHours > 0) return "${diff.inHours} giờ trước";
  if (diff.inMinutes > 0) return "${diff.inMinutes} phút trước";
  return "Vừa xong";
}

// ===========================================================================
// BIẾN TOÀN CỤC: LƯU BẢN NHÁP TẠM THỜI 
// ===========================================================================
class PostDraft {
  static String content = "";
  static List<String> selectedTopics = ["Tư vấn ngành"];
  static String selectedBlock = "A00";
  static File? image;
}

// ===========================================================================
// CACHE VÀ WIDGET LOAD ẢNH ĐẠI DIỆN DÙNG CHUNG
// ===========================================================================
class UserAvatarCache {
  static final Map<String, String?> _cache = {};
  static final Map<String, Future<DocumentSnapshot>> _pending = {};

  static Future<String?> getPhotoUrl(String userId) async {
    if (_cache.containsKey(userId)) {
      return _cache[userId];
    }
    if (_pending.containsKey(userId)) {
      try {
        final doc = await _pending[userId]!;
        if (doc.exists) {
          final data = doc.data() as Map<String, dynamic>?;
          _cache[userId] = data?['photoUrl'];
        } else {
          _cache[userId] = null;
        }
      } catch (_) {
        _cache[userId] = null;
      }
      return _cache[userId];
    }

    final future = FirebaseFirestore.instance.collection('users').doc(userId).get();
    _pending[userId] = future;
    try {
      final doc = await future;
      if (doc.exists) {
        final data = doc.data() as Map<String, dynamic>?;
        _cache[userId] = data?['photoUrl'];
      } else {
        _cache[userId] = null;
      }
    } catch (_) {
      _cache[userId] = null;
    } finally {
      _pending.remove(userId);
    }
    return _cache[userId];
  }

  static void clear(String userId) {
    _cache.remove(userId);
  }
}

class UserAvatar extends StatefulWidget {
  final String userId;
  final double radius;
  final String defaultLetter;

  const UserAvatar({
    super.key,
    required this.userId,
    required this.radius,
    required this.defaultLetter,
  });

  @override
  State<UserAvatar> createState() => _UserAvatarState();
}

class _UserAvatarState extends State<UserAvatar> {
  String? _photoUrl;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAvatar();
  }

  @override
  void didUpdateWidget(UserAvatar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.userId != widget.userId) {
      _loadAvatar();
    }
  }

  void _loadAvatar() {
    UserAvatarCache.getPhotoUrl(widget.userId).then((url) {
      if (mounted) {
        setState(() {
          _photoUrl = url;
          _loading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_photoUrl != null && _photoUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: widget.radius,
        backgroundImage: NetworkImage(_photoUrl!),
      );
    }
    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: const Color(0xFFE7EAEE),
      child: Text(
        widget.defaultLetter.isNotEmpty ? widget.defaultLetter[0].toUpperCase() : "U",
        style: TextStyle(fontSize: widget.radius * 0.8, color: Colors.black87),
      ),
    );
  }
}

class ThaoLuanScreen extends StatefulWidget {
  const ThaoLuanScreen({super.key});

  @override
  State<ThaoLuanScreen> createState() => _ThaoLuanScreenState();
}

class _ThaoLuanScreenState extends State<ThaoLuanScreen> {
  String activeTab = "Mới nhất";
  String _searchKeyword = "";

  void changeTab(String tab) => setState(() {
    activeTab = tab;
    _searchKeyword = ""; 
  });

  void _onSearch(String keyword) => setState(() => _searchKeyword = keyword.trim().toLowerCase());

  void openCreatePostSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _CreatePostSheet(),
    );
  }

  Stream<List<PostModel>> _getPostsStream() {
    final service = PostService();
    final user = FirebaseAuth.instance.currentUser;

    if (activeTab == "Của Tôi" && user != null) {
      return service.getMyPostsStream(user.uid);
    } else if (activeTab == "Nổi bật") {
      return FirebaseFirestore.instance
          .collection('posts')
          .where('isPending', isEqualTo: false)
          .orderBy('interactionCount', descending: true)
          .snapshots()
          .map((snapshot) => snapshot.docs
              .map((doc) => PostModel.fromMap(doc.data(), doc.id))
              .toList());
    }
    return service.getPostsStream();
  }

  List<PostModel> _applySearch(List<PostModel> posts) {
    if (_searchKeyword.isEmpty) return posts;
    return posts.where((p) {
      final inContent = p.content.toLowerCase().contains(_searchKeyword);
      final inAuthor = p.authorName.toLowerCase().contains(_searchKeyword);
      final inTags = p.tags.any((t) => t.toLowerCase().contains(_searchKeyword));
      return inContent || inAuthor || inTags;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              _TopSection(
                activeTab: activeTab,
                onTabChanged: changeTab,
                onSearch: _onSearch,
              ),
              const SizedBox(height: 18),
              _ComposerSection(onTap: openCreatePostSheet),
              const SizedBox(height: 18),

              StreamBuilder<List<PostModel>>(
                stream: _getPostsStream(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: Padding(padding: EdgeInsets.all(20.0), child: CircularProgressIndicator()));
                  }
                  if (snapshot.hasError) {
                    return const Center(child: Text("Đã xảy ra lỗi hệ thống."));
                  }

                  final posts = _applySearch(snapshot.data ?? []);

                  if (posts.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40.0),
                        child: Text(
                          _searchKeyword.isNotEmpty
                              ? "Không tìm thấy bài viết nào cho \"$_searchKeyword\"."
                              : "Chưa có thảo luận nào.",
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: posts.length,
                    itemBuilder: (context, index) => Column(
                      children: [
                        _PostCard(post: posts[index]),
                        const SizedBox(height: 18),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

// ===========================================================================
// SHEET 2-IN-1: TẠO BÀI MỚI / CHỈNH SỬA BÀI CŨ
// ===========================================================================
class _CreatePostSheet extends StatefulWidget {
  final PostModel? existingPost; // Nếu có truyền vào là chế độ SỬA

  const _CreatePostSheet({this.existingPost});
  
  @override
  State<_CreatePostSheet> createState() => _CreatePostSheetState();
}

class _CreatePostSheetState extends State<_CreatePostSheet> {
  final TextEditingController controller = TextEditingController();
  List<String> selectedTopics = []; 
  String selectedBlock = ""; 
  
  File? _selectedImage; // Ảnh chọn từ máy
  String? _oldImageUrl; // Link ảnh cũ trên mạng

  bool _isLoading = false;
  bool _isPostedSuccess = false;

  final List<String> examBlocks = ["A00", "A01", "B00", "C00", "D01"];

  @override
  void initState() {
    super.initState();
    
    // NẾU LÀ SỬA BÀI: Load dữ liệu cũ lên
    if (widget.existingPost != null) {
      controller.text = widget.existingPost!.content;
      selectedTopics = List.from(widget.existingPost!.tags);
      _oldImageUrl = widget.existingPost!.imageUrl;

      // Cố gắng tách khối thi ra từ biến Bio (VD: 2k6 • Khối A00)
      String bio = widget.existingPost!.authorBio;
      if (bio.contains("Khối ")) {
        selectedBlock = bio.split("Khối ").last;
        if (!examBlocks.contains(selectedBlock)) selectedBlock = "A00";
      } else {
        selectedBlock = "A00";
      }
    } 
    // NẾU LÀ TẠO BÀI MỚI: Load bản nháp
    else {
      controller.text = PostDraft.content;
      selectedTopics = List.from(PostDraft.selectedTopics);
      selectedBlock = PostDraft.selectedBlock;
      _selectedImage = PostDraft.image;
    }
  }

  @override
  void dispose() {
    // CHỈ LƯU NHÁP NẾU LÀ TẠO BÀI MỚI
    if (!_isPostedSuccess && widget.existingPost == null) {
      PostDraft.content = controller.text;
      PostDraft.selectedTopics = List.from(selectedTopics);
      PostDraft.selectedBlock = selectedBlock;
      PostDraft.image = _selectedImage;
    }
    controller.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final pickedFile = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
        _oldImageUrl = null; // Khi chọn ảnh mới thì bỏ ảnh cũ đi
      });
    }
  }

  void _toggleTopic(String topic) {
    setState(() {
      if (selectedTopics.contains(topic)) {
        if (selectedTopics.length > 1) selectedTopics.remove(topic);
      } else {
        selectedTopics.add(topic);
      }
    });
  }

  Future<void> _handlePostSubmit() async {
    final content = controller.text.trim();
    if (content.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final service = PostService();
      final user = FirebaseAuth.instance.currentUser;
      
      if (user == null) {
        _showCenterAlert(context, "Bạn cần đăng nhập!", isError: true);
        return;
      }

      // 1. Xử lý up ảnh (Gọi qua Service)
      String? finalImageUrl = _oldImageUrl; 
      if (_selectedImage != null) {
        finalImageUrl = await service.uploadPostImage(_selectedImage!);
      }

      // 2. LẤY THÔNG TIN USER TỪ FIRESTORE
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      String name = userDoc.data()?['name'] ?? "Thành viên EduTalk";
      String? dob = userDoc.data()?['dob']; // Dữ liệu ngày sinh dạng DD/MM/YYYY
      
      // 👉 LOGIC MỚI: LẤY THẲNG NĂM SINH
      String yearPrefix = "";
      if (dob != null && dob.trim().length >= 4) {
        // Cắt lấy đúng 4 số cuối cùng của chuỗi (chính là Năm)
        String yearStr = dob.trim().substring(dob.trim().length - 4); 
        yearPrefix = "$yearStr • "; // VD: "2004 • "
      }
      
      // Ghép chuỗi hoàn chỉnh. Nếu user chưa nhập ngày sinh thì chỉ hiện "Khối A00"
      String finalBio = "${yearPrefix}Khối $selectedBlock";

      if (widget.existingPost == null) {
        // =======================
        // LUỒNG TẠO BÀI MỚI
        // =======================
        final newPost = PostModel(
          authorId: user.uid,
          content: content,
          imageUrl: finalImageUrl,
          tags: selectedTopics.isEmpty ? ["Hỏi đáp"] : selectedTopics,
          authorName: name,
          authorBio: finalBio, // 👉 Ráp cái Bio mới vào đây
          createdAt: DateTime.now(),
        );

        await service.createPost(newPost);
        
        _isPostedSuccess = true; 
        PostDraft.content = "";
        PostDraft.selectedTopics = ["Tư vấn ngành"];
        PostDraft.selectedBlock = "A00";
        PostDraft.image = null;

        if (mounted) {
          Navigator.pop(context);
          _showCenterAlert(context, "Đăng bài thành công!");
        }
      } else {
        // =======================
        // LUỒNG CẬP NHẬT BÀI 
        // =======================
        await FirebaseFirestore.instance.collection('posts').doc(widget.existingPost!.id!).update({
          'content': content,
          'imageUrl': finalImageUrl,
          'tags': selectedTopics.isEmpty ? ["Hỏi đáp"] : selectedTopics,
          'authorBio': finalBio, // 👉 Ráp cái Bio mới vào đây
        });

        if (mounted) {
          Navigator.pop(context);
          _showCenterAlert(context, "Đã cập nhật bài viết!");
        }
      }
    } catch (e) {
      if (mounted) _showCenterAlert(context, "Lỗi hệ thống: $e", isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Color(0xFFF7F7F8), 
        borderRadius: BorderRadius.vertical(top: Radius.circular(34))
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.existingPost == null ? "Tạo bài viết mới" : "Chỉnh sửa bài viết", 
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)
            ),
            const SizedBox(height: 15),
            
            // XỬ LÝ KHUNG ẢNH (Ảnh mới hoặc Ảnh cũ)
            if (_selectedImage != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20), 
                    child: Image.file(_selectedImage!, height: 180, width: double.infinity, fit: BoxFit.cover)
                  ),
                  Positioned(
                    right: 8, top: 8, 
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedImage = null), 
                      child: const CircleAvatar(backgroundColor: Colors.black54, radius: 15, child: Icon(Icons.close, size: 18, color: Colors.white))
                    )
                  )
                ]
              )
            else if (_oldImageUrl != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20), 
                    child: Image.network(_oldImageUrl!, height: 180, width: double.infinity, fit: BoxFit.cover)
                  ),
                  Positioned(
                    right: 8, top: 8, 
                    child: GestureDetector(
                      onTap: () => setState(() => _oldImageUrl = null), 
                      child: const CircleAvatar(backgroundColor: Colors.black54, radius: 15, child: Icon(Icons.close, size: 18, color: Colors.white))
                    )
                  )
                ]
              ),

            const SizedBox(height: 20),
            const Text("Khối & Chủ đề", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF475569))),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, 
              children: examBlocks.map((b) => ChoiceChip(
                label: Text(b), 
                selected: selectedBlock == b, 
                onSelected: (_) => setState(() => selectedBlock = b)
              )).toList()
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8, runSpacing: 8, 
              children: ["Tư vấn ngành", "Review ngành học", "Kinh nghiệm ôn thi", "Hỏi đáp"].map((t) => _SelectableTopicChip(
                title: t, 
                selected: selectedTopics.contains(t), 
                onTap: () => _toggleTopic(t)
              )).toList()
            ),
            const SizedBox(height: 20),
            TextField(
              controller: controller, 
              maxLines: 4, 
              decoration: const InputDecoration(hintText: "Chia sẻ thắc mắc...", border: InputBorder.none)
            ),
            Row(
              children: [
                IconButton(onPressed: _pickImage, icon: const Icon(Icons.image_search_rounded, size: 28, color: Color(0xFF2563EB))),
                const Spacer(),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handlePostSubmit, 
                  child: Text(widget.existingPost == null ? "Đăng bài" : "Cập nhật")
                )
              ]
            )
          ],
        ),
      ),
    );
  }
}

// ===========================================================================
// CARD BÀI VIẾT CHÍNH
// ===========================================================================
class _PostCard extends StatelessWidget {
  final PostModel post;
  
  const _PostCard({required this.post});

 void _confirmReport(BuildContext context, String currentUserId) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.outlined_flag_rounded,
                  color: Colors.redAccent,
                  size: 32,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                "Gắn cờ bài viết?",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                "Bạn có chắc chắn muốn báo cáo nội dung này cho Admin kiểm duyệt không?",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF64748B),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 28),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        "Hủy bỏ",
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        Navigator.pop(context);
                        if (post.id != null) {
                          String status = await PostService().reportPost(post.id!, currentUserId);
                          if (!context.mounted) return;
                          if (status == "already_reported") {
                            _showCenterAlert(context, "Bạn đã báo cáo bài này rồi!", isError: true);
                          } else {
                            _showCenterAlert(context, "Đã gửi báo cáo thành công!");
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        "Gắn cờ",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    final currentUserId = currentUser?.uid ?? '';
    final bool isUpvoted = post.upvotedBy.contains(currentUserId);
    final bool isReported = post.reportedBy.contains(currentUserId);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F7F8), 
          borderRadius: BorderRadius.circular(30), 
          border: Border.all(color: const Color(0xFFD5DAE3))
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                UserAvatar(
                  userId: post.authorId,
                  radius: 20,
                  defaultLetter: post.authorName,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, 
                    children: [
                      Text(post.authorName, style: const TextStyle(fontWeight: FontWeight.w800)),
                      Row(
                        children: [
                          Text(getTimeAgo(post.createdAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          const Text(" • ", style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(post.authorBio, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ]
                  )
                ),
                
                if (post.authorId == currentUserId)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_horiz, color: Colors.grey),
                    onSelected: (value) {
                      if (value == 'delete') {
                        showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text("Xóa bài viết?"),
                            content: const Text("Bạn có chắc chắn muốn xóa bài viết này không?"),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context), child: const Text("Hủy")),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                                onPressed: () {
                                  if (post.id != null) PostService().deletePost(post.id!);
                                  Navigator.pop(context);
                                  _showCenterAlert(context, "Đã xóa bài viết!");
                                }, 
                                child: const Text("Xóa bài", style: TextStyle(color: Colors.white))
                              )
                            ],
                          ),
                        );
                      } else if (value == 'edit') {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => _CreatePostSheet(existingPost: post),
                        );
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Chỉnh sửa bài')),
                      const PopupMenuItem(value: 'delete', child: Text('Xóa bài viết', style: TextStyle(color: Colors.red))),
                    ],
                  )
                else
                  IconButton(
                    onPressed: isReported 
                        ? () => _showCenterAlert(context, "Bạn đã báo cáo bài này rồi!", isError: true)
                        : () => _confirmReport(context, currentUserId), 
                    icon: Icon(
                      isReported ? Icons.flag : Icons.outlined_flag, 
                      color: isReported ? Colors.red : Colors.grey, 
                      size: 20
                    )
                  )
              ]
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 4, 
              children: post.tags.map((t) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), 
                decoration: BoxDecoration(color: const Color(0xFFEAF1FF), borderRadius: BorderRadius.circular(999)), 
                child: Text(t, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF2563EB)))
              )).toList()
            ),
            const SizedBox(height: 12),
            Text(post.content, style: const TextStyle(height: 1.6)),
            if (post.imageUrl != null) ...[
              const SizedBox(height: 14),
              ClipRRect(borderRadius: BorderRadius.circular(20), child: Image.network(post.imageUrl!, width: double.infinity, fit: BoxFit.cover)), 
            ],
            const SizedBox(height: 18),
            const Divider(),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround, 
              children: [
                InkWell(
                  onTap: () {
                    if (post.id != null && currentUserId.isNotEmpty) {
                      PostService().upvotePost(post.id!, currentUserId);
                    }
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      children: [
                        Icon(
                          isUpvoted ? Icons.favorite : Icons.favorite_border, 
                          size: 22, 
                          color: isUpvoted ? Colors.redAccent : const Color(0xFF68748C)
                        ),
                        const SizedBox(width: 6),
                        // Đã tách số TIM độc lập, không bị ảnh hưởng bởi Comment
                        Text(
                          '${post.upvotedBy.length}', 
                          style: TextStyle(
                            color: isUpvoted ? Colors.redAccent : const Color(0xFF68748C), 
                            fontWeight: FontWeight.bold
                          )
                        ),
                      ],
                    ),
                  ),
                ),
                
                InkWell(
                  onTap: () {
                    if (post.id != null) {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => _CommentSheet(postId: post.id!),
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      children: [
                        const Icon(Icons.mode_comment_outlined, size: 20, color: Color(0xFF68748C)),
                        const SizedBox(width: 6),
                        Text(
                          post.commentCount > 0 ? '${post.commentCount}' : 'Bình luận', 
                          style: const TextStyle(color: Color(0xFF68748C), fontWeight: FontWeight.bold)
                        ),
                      ],
                    ),
                  ),
                ),

                IconButton(
                  icon: const Icon(Icons.share_rounded, size: 20, color: Color(0xFF68748C)),
                  onPressed: () async {
                    await Share.share(
                     "\n${post.authorName} vừa chia sẻ: \"${post.content}\""
                    );
                  },
                ),
              ]
            )
          ],
        ),
      ),
    );
  }
}

// ===========================================================================
// SHEET BÌNH LUẬN (CÓ THỤT LÙI DÒNG)
// ===========================================================================
// ===========================================================================
// TIÊU ĐỀ BÀI VIẾT HIỂN THỊ Ở SHEET BÌNH LUẬN
// ===========================================================================
class _CommentSheetPostHeader extends StatelessWidget {
  final String postId;
  const _CommentSheetPostHeader({required this.postId});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DocumentSnapshot>(
      future: FirebaseFirestore.instance.collection('posts').doc(postId).get(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        if (!snapshot.hasData || !snapshot.data!.exists) {
          return const SizedBox.shrink();
        }
        final post = PostModel.fromMap(snapshot.data!.data() as Map<String, dynamic>, snapshot.data!.id);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(20),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  UserAvatar(userId: post.authorId, radius: 16, defaultLetter: post.authorName),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          post.authorName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                        ),
                        Text(
                          getTimeAgo(post.createdAt),
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                post.content,
                style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.black87),
              ),
              if (post.imageUrl != null && post.imageUrl!.isNotEmpty) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    post.imageUrl!,
                    width: double.infinity,
                    height: 120,
                    fit: BoxFit.cover,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _CommentSheet extends StatefulWidget {
  final String postId;
  const _CommentSheet({required this.postId});

  @override
  State<_CommentSheet> createState() => _CommentSheetState();
}

class _CommentSheetState extends State<_CommentSheet> {
  final TextEditingController _commentController = TextEditingController();
  final FocusNode _focusNode = FocusNode(); 
  
  bool _isSending = false;
  File? _commentImage; 
  String? _replyingToName; 
  String? _replyingToId; 

  Future<void> _pickCommentImage() async {
    final pickedFile = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile != null) setState(() => _commentImage = File(pickedFile.path));
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty && _commentImage == null) return;

    setState(() => _isSending = true);
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        _showCenterAlert(context, "Bạn cần đăng nhập để bình luận", isError: true);
        return;
      }

      String? imageUrl;
      if (_commentImage != null) {
        imageUrl = await PostService().uploadPostImage(_commentImage!);
      }

      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      String name = userDoc.data()?['name'] ?? "Thành viên EduTalk";

      final newComment = CommentModel(
        authorId: user.uid,
        authorName: name,
        content: text,
        imageUrl: imageUrl, 
        replyToName: _replyingToName, 
        parentId: _replyingToId,
        createdAt: DateTime.now(),
      );

      await PostService().addComment(widget.postId, newComment);

      _commentController.clear();
      setState(() {
        _commentImage = null;
        _replyingToName = null; 
        _replyingToId = null;
      });
      _focusNode.unfocus(); 
    } catch (e) {
      if (mounted) _showCenterAlert(context, "Lỗi: $e", isError: true);
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Widget _buildCommentItem(CommentModel cmt, bool isReply, String currentUserId) {
    final isUpvoted = cmt.upvotedBy.contains(currentUserId);
    
    return Padding(
      padding: EdgeInsets.only(bottom: isReply ? 12 : 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UserAvatar(
            userId: cmt.authorId,
            radius: isReply ? 14.0 : 18.0,
            defaultLetter: cmt.authorName,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: EdgeInsets.all(isReply ? 10 : 12),
                  decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(16)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cmt.authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      if (cmt.replyToName != null && cmt.replyToName != cmt.authorName)
                        Padding(
                          padding: const EdgeInsets.only(top: 2, bottom: 4),
                          child: Text("Đang trả lời ${cmt.replyToName}", style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                        ),
                      if (cmt.content.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(cmt.content, style: const TextStyle(fontSize: 14, height: 1.4)),
                      ]
                    ],
                  ),
                ),
                if (cmt.imageUrl != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(cmt.imageUrl!, width: 200, fit: BoxFit.cover),
                    ),
                  ),
                  
                Padding(
                  padding: const EdgeInsets.only(top: 6, left: 8),
                  child: Row(
                    children: [
                      Text(getTimeAgo(cmt.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: () {
                          if (cmt.id != null) PostService().upvoteComment(widget.postId, cmt.id!, currentUserId);
                        },
                        child: Text(
                          isUpvoted ? "Đã thích" : "Thích",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isUpvoted ? Colors.redAccent : Colors.grey.shade600),
                        ),
                      ),
                      if (cmt.interactionCount > 0) ...[
                        const SizedBox(width: 4),
                        Icon(Icons.favorite, size: 12, color: Colors.redAccent.withOpacity(0.8)),
                        const SizedBox(width: 2),
                        Text('${cmt.interactionCount}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _replyingToName = cmt.authorName;
                            _replyingToId = isReply ? cmt.parentId : cmt.id; 
                          });
                          _focusNode.requestFocus();
                        },
                        child: Text("Phản hồi", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
                      ),
                    ],
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  @override
  void dispose() {
    _commentController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final currentUserId = FirebaseAuth.instance.currentUser?.uid ?? '';

    return Container(
      height: MediaQuery.of(context).size.height * 0.85, 
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40, height: 5,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
          ),
          const Text("Bình luận", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Divider(),
          
          Expanded(
            child: StreamBuilder<List<CommentModel>>(
              stream: PostService().getCommentsStream(widget.postId),
              builder: (context, snapshot) {
                final isLoading = snapshot.connectionState == ConnectionState.waiting;
                final allComments = snapshot.data ?? [];
                final topLevelComments = allComments.where((c) => c.parentId == null).toList();

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: 1 + (isLoading ? 1 : (topLevelComments.isEmpty ? 1 : topLevelComments.length)),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _CommentSheetPostHeader(postId: widget.postId),
                          const Divider(),
                        ],
                      );
                    }
                    
                    if (isLoading) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }

                    if (topLevelComments.isEmpty) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: Text(
                            "Chưa có bình luận nào.",
                            style: TextStyle(color: Colors.grey, fontSize: 14),
                          ),
                        ),
                      );
                    }

                    final parentCmt = topLevelComments[index - 1];
                    final childComments = allComments.where((c) => c.parentId == parentCmt.id).toList();

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildCommentItem(parentCmt, false, currentUserId),
                          
                          if (childComments.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(left: 46, top: 4),
                              child: Column(
                                children: childComments.map((childCmt) => _buildCommentItem(childCmt, true, currentUserId)).toList(),
                              ),
                            )
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey.shade200))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_replyingToName != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Row(
                      children: [
                        Text("Đang trả lời ", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                        Text(_replyingToName!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const Spacer(),
                        GestureDetector(
                          onTap: () => setState(() { _replyingToName = null; _replyingToId = null; }), 
                          child: const Icon(Icons.close, size: 16, color: Colors.grey),
                        )
                      ],
                    ),
                  ),
                  
                if (_commentImage != null)
                  Stack(
                    children: [
                      Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        height: 80, width: 80,
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), image: DecorationImage(image: FileImage(_commentImage!), fit: BoxFit.cover)),
                      ),
                      Positioned(
                        top: -5, right: -5,
                        child: IconButton(icon: const Icon(Icons.cancel, color: Colors.black54), onPressed: () => setState(() => _commentImage = null))
                      )
                    ],
                  ),
                Row(
                  children: [
                    IconButton(icon: const Icon(Icons.camera_alt_outlined, color: Color(0xFF68748C)), onPressed: _pickCommentImage),
                    Expanded(
                      child: TextField(
                        controller: _commentController,
                        focusNode: _focusNode, 
                        decoration: InputDecoration(
                          hintText: "Viết bình luận...",
                          filled: true,
                          fillColor: const Color(0xFFF3F4F6),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _isSending
                      ? const Padding(padding: EdgeInsets.all(12.0), child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                      : IconButton(icon: const Icon(Icons.send_rounded, color: Color(0xFF2563EB)), onPressed: _submitComment)
                  ],
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

// ===========================================================================
// CÁC WIDGET PHỤ GIAO DIỆN
// ===========================================================================
class _TopSection extends StatefulWidget {
  final String activeTab;
  final ValueChanged<String> onTabChanged;
  final ValueChanged<String> onSearch;

  const _TopSection({
    required this.activeTab,
    required this.onTabChanged,
    required this.onSearch,
  });

  @override
  State<_TopSection> createState() => _TopSectionState();
}

class _TopSectionState extends State<_TopSection> {
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _isSearching
                      ? TextField(
                          controller: _searchController,
                          autofocus: true,
                          decoration: InputDecoration(
                            hintText: "Nhập từ khóa tìm kiếm...",
                            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: Colors.grey.shade300),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: const BorderSide(color: Color(0xFF2563EB)),
                            ),
                          ),
                          onChanged: (value) => widget.onSearch(value),
                          onSubmitted: (value) => widget.onSearch(value),
                        )
                      : const Column(
                          key: ValueKey('title'),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("COMMUNITY", style: TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w700, letterSpacing: 2.2)),
                            SizedBox(height: 8),
                            Text("Cộng đồng thảo luận", style: TextStyle(fontSize: 24, color: Color(0xFF182033), fontWeight: FontWeight.w800)),
                          ],
                        ),
                ),
              ),
              const SizedBox(width: 10),
              
              _CircleButton(
                icon: _isSearching ? Icons.close_rounded : Icons.search_rounded,
                onTap: () {
                  setState(() {
                    if (_isSearching) {
                      _searchController.clear();
                      widget.onSearch("");
                    }
                    _isSearching = !_isSearching;
                  });
                },
              ),
              
              if (!_isSearching) const SizedBox(width: 10),
              if (!_isSearching)
                _NotificationBellButton(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => NotificationScreen(
                          onOpenPost: (postId) {
                            Navigator.pop(context);
                            showModalBottomSheet(
                              context: context,
                              isScrollControlled: true,
                              backgroundColor: Colors.transparent,
                              builder: (_) => _CommentSheet(postId: postId),
                            );
                          },
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
          const SizedBox(height: 18),
          const _IntroCard(),
          const SizedBox(height: 20),
          _ForumTabBar(activeTab: widget.activeTab, onTabChanged: widget.onTabChanged),
        ],
      ),
    );
  }
}

class _IntroCard extends StatelessWidget {
  const _IntroCard();
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      width: double.infinity, 
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F8),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFFD5DAE3)),
      ),
      child: Column( 
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFE9EEF9),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text("Hỏi đáp đúng mối quan tâm", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
          ),
          const SizedBox(height: 16),
          const Text(
            "Hỏi đúng chỗ • Chọn đúng nghề • Về đúng hệ.", 
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, height: 1.4),
            
          ),
        ],
      ),
    );
  }
}

class _ForumTabBar extends StatelessWidget {
  final String activeTab;
  final ValueChanged<String> onTabChanged;
  
  const _ForumTabBar({required this.activeTab, required this.onTabChanged});
  
  @override
  Widget build(BuildContext context) {
    final tabs = ["Mới nhất", "Nổi bật", "Của Tôi"];
    return Row(
      children: tabs.map((tab) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: GestureDetector(
          onTap: () => onTabChanged(tab),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: activeTab == tab ? const Color(0xFF0F172A) : const Color(0xFFE7EAEE),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              tab,
              style: TextStyle(fontWeight: FontWeight.bold, color: activeTab == tab ? Colors.white : Colors.black54),
            ),
          ),
        ),
      )).toList(),
    );
  }
}

class _ComposerSection extends StatelessWidget {
  final VoidCallback onTap;
  
  const _ComposerSection({required this.onTap});
  
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFF7F7F8),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFD5DAE3)),
          ),
          child: Row(
            children: [
              const CircleAvatar(backgroundColor: Color(0xFF0D1636), child: Icon(Icons.add, color: Colors.white)),
              const SizedBox(width: 15),
              const Text("Bạn đang thắc mắc điều gì?", style: TextStyle(fontSize: 16, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectableTopicChip extends StatelessWidget {
  final String title;
  final bool selected;
  final VoidCallback onTap;
  
  const _SelectableTopicChip({required this.title, required this.selected, required this.onTap});
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? Colors.transparent : Colors.grey.shade300),
        ),
        child: Text(
          title,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: selected ? Colors.white : Colors.black54),
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _CircleButton({required this.icon, this.onTap});
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 45, 
        height: 45,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Icon(icon, size: 20, color: Colors.black54),
      ),
    );
  }
}

/// Icon Chuông có Badge đỏ số thông báo chưa đọc từ Firestore (real-time)
class _NotificationBellButton extends StatelessWidget {
  final VoidCallback onTap;
  const _NotificationBellButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser?.uid;

    return StreamBuilder<QuerySnapshot>(
      stream: uid == null
          ? const Stream.empty()
          : FirebaseFirestore.instance
              .collection('notifications')
              .where('receiverId', isEqualTo: uid)
              .where('isRead', isEqualTo: false)
              .snapshots(),
      builder: (context, snapshot) {
        final int unreadCount = snapshot.data?.docs.length ?? 0;

        return GestureDetector(
          onTap: onTap,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 45,
                height: 45,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Icon(
                  unreadCount > 0
                      ? Icons.notifications_rounded
                      : Icons.notifications_none_rounded,
                  size: 22,
                  color: unreadCount > 0
                      ? const Color(0xFF2563EB)
                      : Colors.black54,
                ),
              ),
              // Badge đỏ số thông báo chưa đọc
              if (unreadCount > 0)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.redAccent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    child: Text(
                      unreadCount > 99 ? '99+' : '$unreadCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
} 

void _showCenterAlert(BuildContext context, String message, {bool isError = false}) {
  showDialog(
    context: context,
    barrierDismissible: true,
    builder: (context) {
      Future.delayed(const Duration(seconds: 2), () {
        if (Navigator.canPop(context)) Navigator.pop(context);
      });
      return Dialog(
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.95),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, spreadRadius: 5)
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isError ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
                size: 50,
                color: isError ? Colors.redAccent : const Color(0xFF2563EB),
              ),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
              ),
            ],
          ),
        ),
      );
    },
  );
}