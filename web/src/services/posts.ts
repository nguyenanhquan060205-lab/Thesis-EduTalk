import api from "@/lib/api";

/**
 * Diễn đàn cộng đồng — MongoDB `posts` + `comments`.
 *
 * Bài viết đi qua kiểm duyệt: đăng xong ở trạng thái `pending`, admin duyệt
 * mới hiện ra cho mọi người. Hai trường trạng thái tách bạch:
 *  - `status`     : luồng duyệt bài (pending → approved | rejected)
 *  - `isPending`  : bị ẩn do bị báo cáo từ 5 lần trở lên (chuyện khác)
 */
export type PostStatus = "pending" | "approved" | "rejected";

export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  imageUrl?: string | null;
  tags?: string[];
  status?: PostStatus;
  rejectReason?: string;
  /** true = đã bị ẩn khỏi cộng đồng do bị báo cáo từ 5 lần trở lên */
  isPending?: boolean;
  reportCount?: number;
  createdAt: string;
  editedAt?: string;
  remindedAt?: string;
  upvotedBy?: string[];
  reportedBy?: string[];
  commentCount?: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  text: string;
  /** null = bình luận gốc; có giá trị = trả lời bình luận đó */
  parentId?: string | null;
  createdAt: string;
  editedAt?: string;
  upvotedBy?: string[];
  reportedBy?: string[];
}

function unwrap<T>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return ((raw as { data: T }).data ?? fallback) as T;
  }
  return (raw as T) ?? fallback;
}

export const PostsService = {
  /** Chỉ bài đã duyệt — đây là thứ cộng đồng nhìn thấy. */
  list: async (limit = 50): Promise<Post[]> => {
    const { data } = await api.get(`/api/v1/posts/?limit=${limit}`);
    return unwrap<Post[]>(data, []);
  },

  /** Bài của chính mình, gồm cả đang chờ duyệt và bị từ chối. */
  mine: async (): Promise<Post[]> => {
    const { data } = await api.get("/api/v1/posts/mine");
    return unwrap<Post[]>(data, []);
  },

  create: async (
    content: string,
    authorId: string,
    authorName: string,
    tags: string[]
  ) => {
    const { data } = await api.post("/api/v1/posts/", {
      content,
      authorId,
      authorName,
      tags,
    });
    return data;
  },

  /** Chỉ sửa được bài ĐÃ duyệt — backend chặn nếu còn chờ duyệt. */
  edit: async (postId: string, content: string) => {
    const { data } = await api.put(`/api/v1/posts/${postId}`, { content });
    return data;
  },

  remove: async (postId: string) => {
    const { data } = await api.delete(`/api/v1/posts/${postId}`);
    return data;
  },

  /** Nhắc admin duyệt — backend giới hạn 1 lần mỗi 12 giờ. */
  remind: async (postId: string) => {
    const { data } = await api.post(`/api/v1/posts/${postId}/remind`, {});
    return data;
  },

  upvote: async (postId: string) => {
    const { data } = await api.post(`/api/v1/posts/${postId}/upvote`, {});
    return data;
  },

  comments: async (postId: string): Promise<Comment[]> => {
    const { data } = await api.get(`/api/v1/posts/${postId}/comments`);
    return unwrap<Comment[]>(data, []);
  },

  addComment: async (postId: string, text: string, parentId: string | null = null) => {
    const { data } = await api.post(`/api/v1/posts/${postId}/comments`, {
      text,
      parentId,
    });
    return data;
  },

  editComment: async (postId: string, commentId: string, text: string) => {
    const { data } = await api.put(
      `/api/v1/posts/${postId}/comments/${commentId}`,
      { text }
    );
    return data;
  },

  /** Xóa kèm mọi trả lời của bình luận đó. Tác giả hoặc admin. */
  deleteComment: async (postId: string, commentId: string) => {
    const { data } = await api.delete(
      `/api/v1/posts/${postId}/comments/${commentId}`
    );
    return data;
  },

  upvoteComment: async (postId: string, commentId: string) => {
    const { data } = await api.post(
      `/api/v1/posts/${postId}/comments/${commentId}/upvote`,
      {}
    );
    return data;
  },

  /** Báo cáo — backend chặn tự báo cáo nội dung của chính mình. */
  reportPost: async (postId: string, reason = "") => {
    const { data } = await api.post(`/api/v1/posts/${postId}/report`, { reason });
    return data;
  },

  reportComment: async (postId: string, commentId: string, reason = "") => {
    const { data } = await api.post(
      `/api/v1/posts/${postId}/comments/${commentId}/report`,
      { reason }
    );
    return data;
  },
};

/** Dành cho admin: hàng chờ duyệt và thao tác duyệt / từ chối. */
export const PostModerationService = {
  pending: async (): Promise<Post[]> => {
    const { data } = await api.get("/api/v1/admin/posts/pending");
    return unwrap<Post[]>(data, []);
  },
  approve: async (postId: string) => {
    const { data } = await api.put(`/api/v1/admin/posts/${postId}/approve`, {});
    return data;
  },
  reject: async (postId: string, reason: string) => {
    const { data } = await api.put(`/api/v1/admin/posts/${postId}/reject`, { reason });
    return data;
  },

  /** Mọi bài viết, kể cả bài đã bị ẩn do báo cáo — dành riêng cho admin. */
  all: async (): Promise<Post[]> => {
    const { data } = await api.get("/api/v1/admin/posts");
    return unwrap<Post[]>(data, []);
  },

  /** Xác nhận bài an toàn: xoá cờ ẩn, đặt lại số lượt báo cáo về 0. */
  dismissReport: async (postId: string) => {
    const { data } = await api.put(
      `/api/v1/admin/posts/${postId}/dismiss-report`,
      {}
    );
    return data;
  },

  /** Admin xoá bài của bất kỳ ai. */
  remove: async (postId: string) => {
    const { data } = await api.delete(`/api/v1/admin/posts/${postId}`);
    return data;
  },
};

/** "3 giờ trước", "2 ngày trước"… từ mốc thời gian thật trong DB. */
export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "Vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 2592000) return `${Math.floor(s / 86400)} ngày trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}
