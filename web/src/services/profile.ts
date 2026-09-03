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
  /** `email` trả về đã bị che (`co**********@gmail.com`) — đừng hiện như địa chỉ thật */
  emailDaChe?: boolean;
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

  sendOtp: async (email: string) => {
    const { data } = await api.post("/api/v1/auth/otp/send", { email });
    return data;
  },

  /**
   * ĐỔI EMAIL — bốn bước, mỗi bước là một lời gọi riêng.
   *
   *   1. emailChangeStart(emailHiệnTại)  gõ đúng địa chỉ đang dùng (tối đa 3 lần)
   *                                      → mã 6 số về hộp thư CŨ
   *   2. emailChangeVerifyOld(otp)       nhập mã của hộp thư CŨ (90s, 3 lần)
   *   3. emailChangeSetNew(emailMới)     → mã 6 số về hộp thư MỚI
   *   4. changeEmail(emailMới, otp)      nhập mã của hộp thư MỚI → ghi thay đổi
   *
   * Bắt gõ lại địa chỉ hiện tại ở bước 1 vì giao diện chỉ hiện bản đã che.
   * Sai quá số lần ở bất kỳ bước nào → backend huỷ phiên, trả `reset: true`,
   * email giữ nguyên và phải làm lại từ bước 1.
   *
   * Thứ tự này được ép ở backend chứ không chỉ ở đây, nên không gọi tắt được.
   */
  emailChangeStart: async (currentEmail: string) => {
    const { data } = await api.post("/api/v1/auth/email-change/start", {
      currentEmail,
    });
    return data;
  },

  emailChangeVerifyOld: async (otp: string) => {
    const { data } = await api.post("/api/v1/auth/email-change/verify-old", { otp });
    return data;
  },

  emailChangeSetNew: async (newEmail: string) => {
    const { data } = await api.post("/api/v1/auth/email-change/set-new", { newEmail });
    return data;
  },

  changeEmail: async (newEmail: string, otp: string) => {
    const { data } = await api.post("/api/v1/auth/change-email", { newEmail, otp });
    return data;
  },

  /** Người dùng đóng hộp thoại giữa chừng — dọn phiên để lần sau bắt đầu sạch. */
  emailChangeCancel: async () => {
    const { data } = await api.post("/api/v1/auth/email-change/cancel");
    return data;
  },

  /**
   * Xác minh email cho người đã đăng nhập nhưng bỏ dở lúc đăng ký.
   *
   * Không truyền địa chỉ lên: `GET /users/{uid}` chỉ trả bản đã che, gửi bản đó
   * đi thì thành địa chỉ rác. Server tự tra email thật từ token.
   */
  verifyMyEmailSend: async () => {
    const { data } = await api.post("/api/v1/auth/verify-my-email/send");
    return data;
  },

  verifyMyEmailConfirm: async (otp: string) => {
    const { data } = await api.post("/api/v1/auth/verify-my-email/confirm", { otp });
    return data;
  },
};

/** Lấy câu lỗi backend trả về, tránh nuốt lỗi thành thông báo chung chung. */
export function apiError(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
    ?.detail;
  return detail || fallback;
}
