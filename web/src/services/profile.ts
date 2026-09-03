import api from "@/lib/api";

/** Hồ sơ người dùng — chỉ những trường MongoDB `users` thật sự lưu. */
export interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  gender?: "Nam" | "Nu" | null;
  school?: string;
  dob?: string;
  role?: string;
  createdAt?: string;
  isPremium?: boolean;
  emailVerified?: boolean;
  usageCount?: number;
}

/** Các trường sửa được qua `PUT /api/v1/users/{uid}`. Email KHÔNG nằm ở đây. */
export interface ProfileEditable {
  name: string;
  phone: string;
  school: string;
  dob: string;
  gender: string;
}

export const ProfileService = {
  get: async (uid: string): Promise<UserProfile> => {
    const { data } = await api.get(`/api/v1/users/${uid}`);
    return data ?? {};
  },

  /** Backend bỏ qua các khoá `null`, nên chỉ gửi trường có giá trị. */
  update: async (uid: string, form: ProfileEditable) => {
    const payload: Record<string, string> = { name: form.name.trim() };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.school.trim()) payload.school = form.school.trim();
    if (form.dob.trim()) payload.dob = form.dob.trim();
    if (form.gender) payload.gender = form.gender;
    const { data } = await api.put(`/api/v1/users/${uid}`, payload);
    return data;
  },

  /**
   * Đổi email phải qua 2 bước — không thể sửa thẳng như các trường khác:
   * email chính là tài khoản đăng nhập, gõ nhầm là mất đường vào.
   *
   * 1. `sendOtp(emailMới)` → mã 6 số gửi tới hộp thư MỚI
   * 2. `changeEmail(emailMới, otp)` → backend xác minh rồi đổi cả Firebase Auth
   *    lẫn bản ghi MongoDB
   */
  sendOtp: async (email: string) => {
    const { data } = await api.post("/api/v1/auth/otp/send", { email });
    return data;
  },

  changeEmail: async (newEmail: string, otp: string) => {
    const { data } = await api.post("/api/v1/auth/change-email", { newEmail, otp });
    return data;
  },
};

/** Lấy câu lỗi backend trả về, tránh nuốt lỗi thành thông báo chung chung. */
export function apiError(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
  return detail || fallback;
}
