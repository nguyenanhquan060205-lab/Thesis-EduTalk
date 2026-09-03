import api from "@/lib/api";

/**
 * Các API quản trị đã có sẵn ở backend nhưng trước đây không nút nào gọi tới.
 *
 * Lưu ý: email và số điện thoại trả về **đã được che ở tầng API**
 * (`backend/app/core/privacy.py`) — cờ `daCheThongTin` xác nhận điều đó.
 */
export interface AdminUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  gender?: string;
  dob?: string;
  createdAt?: string;
  isPremium?: boolean;
  emailVerified?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  usageCount?: number;
  daCheThongTin?: boolean;
}

export interface SupportRequest {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  status?: string;
  createdAt?: string;
}

export interface AdminNotification {
  id: string;
  type?: string;
  message?: string;
  status?: string;
  postId?: string;
  commentId?: string;
  createdAt?: string;
}

function unwrap<T>(raw: unknown, fallback: T): T {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return ((raw as { data: T }).data ?? fallback) as T;
  }
  return (raw as T) ?? fallback;
}

export const AdminService = {
  users: async (): Promise<AdminUser[]> => {
    const { data } = await api.get("/api/v1/admin/users");
    return unwrap<AdminUser[]>(data, []);
  },

  /** Cấp hoặc gỡ Premium. `plan` chỉ dùng khi bật. */
  setPremium: async (uid: string, isPremium: boolean, plan = "monthly") => {
    const { data } = await api.put(`/api/v1/admin/users/${uid}/premium`, {
      isPremium,
      plan,
    });
    return data;
  },

  /** Khoá / mở khoá: cập nhật Firebase, thu hồi refresh token, và đặt cờ trong DB. */
  setLocked: async (uid: string, disabled: boolean, reason = "") => {
    const { data } = await api.put(`/api/v1/admin/users/${uid}/lock`, {
      disabled,
      reason,
    });
    return data;
  },

  /** Xoá vĩnh viễn: Firebase + MongoDB + lịch sử tư vấn. Không hoàn tác được. */
  deleteUser: async (uid: string) => {
    const { data } = await api.delete(`/api/v1/admin/users/${uid}`);
    return data;
  },

  support: async (): Promise<SupportRequest[]> => {
    const { data } = await api.get("/api/v1/admin/support");
    return unwrap<SupportRequest[]>(data, []);
  },

  resolveSupport: async (id: string, status = "resolved") => {
    const { data } = await api.put(`/api/v1/admin/support/${id}`, { status });
    return data;
  },

  notifications: async (): Promise<AdminNotification[]> => {
    const { data } = await api.get("/api/v1/admin/notifications");
    return unwrap<AdminNotification[]>(data, []);
  },

  resolveNotification: async (id: string) => {
    const { data } = await api.put(`/api/v1/admin/notifications/${id}/resolve`);
    return data;
  },
};

export function ngayGio(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
