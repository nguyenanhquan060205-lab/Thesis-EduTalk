import api from "@/lib/api";

export const AuthService = {
  // Đăng nhập bằng Email/Password qua Backend (Backend gọi Firebase Admin)
  login: async (email: string, password: string) => {
    const response = await api.post("/api/v1/auth/login", { email, password });
    return response.data;
  },

  // Đăng ký tài khoản.
  // `gender` ("Nam" | "Nu") được lưu vào hồ sơ để mô hình gợi ý ngành dùng lại,
  // nhờ vậy người dùng không phải khai lại giới tính ở mỗi lần khảo sát.
  register: async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    gender?: string
  ) => {
    const response = await api.post("/api/v1/auth/register", {
      name,
      email,
      password,
      phone,
      gender,
    });
    return response.data;
  },

  // Cập nhật hồ sơ (dùng để bổ sung giới tính cho tài khoản đã đăng ký trước đó)
  updateProfile: async (uid: string, data: Record<string, unknown>) => {
    const response = await api.put(`/api/v1/users/${uid}`, data);
    return response.data;
  },

  // Đăng nhập bằng Google (Truyền idToken lấy từ Firebase Web SDK)
  googleLogin: async (idToken: string) => {
    const response = await api.post("/api/v1/auth/google", { idToken });
    return response.data;
  },

  // Lấy Profile người dùng
  getProfile: async (uid: string) => {
    const response = await api.get(`/api/v1/users/${uid}`);
    return response.data;
  },

  // Gửi mã 6 số tới email (đăng ký hoặc đổi email). Mã sống 90 giây.
  sendOtp: async (email: string) => {
    const response = await api.post("/api/v1/auth/otp/send", { email });
    return response.data;
  },

  // Xác minh email sau khi đăng ký. Không cần token — mã OTP đã là bằng chứng
  // sở hữu hộp thư. Sai 3 lần thì backend xoá tài khoản.
  verifyRegistration: async (email: string, otp: string) => {
    const response = await api.post("/api/v1/auth/registration/verify", {
      email,
      otp,
    });
    return response.data;
  },
};
