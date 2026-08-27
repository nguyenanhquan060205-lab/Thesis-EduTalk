import api from "@/lib/api";

export const AuthService = {
  // Đăng nhập bằng Email/Password qua Backend (Backend gọi Firebase Admin)
  login: async (email: string, password: string) => {
    const response = await api.post("/api/v1/auth/login", { email, password });
    return response.data;
  },

  // Đăng ký tài khoản
  register: async (name: string, email: string, password: string, phone?: string) => {
    const response = await api.post("/api/v1/auth/register", { name, email, password, phone });
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
};
