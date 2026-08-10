import axios from "axios";
import { auth } from "./firebase";

// URL của Backend Python FastAPI
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Tự động đính kèm Token của Firebase hoặc LocalStorage vào mỗi request
api.interceptors.request.use(
  async (config) => {
    let token = "";
    // Ưu tiên token từ Firebase Web SDK (nếu đăng nhập bằng Google)
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    // Nếu không có, dùng token từ LocalStorage (đăng nhập bằng Email qua Backend)
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem("authToken") || "";
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
