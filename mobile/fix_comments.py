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
