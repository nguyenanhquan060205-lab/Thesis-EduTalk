import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { auth } from "./firebase";

// URL của Backend Python FastAPI
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Lấy token hiện có. `lamMoi` buộc Firebase cấp token mới thay vì dùng bản đệm. */
async function layToken(lamMoi = false): Promise<string> {
  // Ưu tiên Firebase Web SDK: chỉ đường này mới tự gia hạn được.
  if (auth.currentUser) {
    const t = await auth.currentUser.getIdToken(lamMoi);
    if (t && typeof window !== "undefined") localStorage.setItem("authToken", t);
    return t;
  }
  // Đăng nhập bằng email qua backend thì chỉ có bản lưu trong localStorage.
  if (typeof window !== "undefined") return localStorage.getItem("authToken") || "";
  return "";
}

// Đính kèm token vào mọi request
api.interceptors.request.use(
  async (config) => {
    const token = await layToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Gặp 401 vì token hết hạn thì xin token mới rồi gửi lại đúng một lần.
 *
 * ID token của Firebase chỉ sống **1 giờ**. Bản trước đọc thẳng
 * `localStorage.getItem("authToken")` — giá trị đóng băng từ lúc đăng nhập — nên
 * cứ đúng một tiếng sau là mọi trang quản trị gãy hàng loạt 401 mà không báo gì.
 *
 * `_daThuLai` chặn lặp vô hạn: token mới mà vẫn 401 thì đó là hết phiên thật
 * (đăng nhập ở máy khác, tài khoản bị khoá…), lúc đó mới dọn phiên và báo.
 */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const cauHinh = error.config as
      | (InternalAxiosRequestConfig & { _daThuLai?: boolean })
      | undefined;

    if (error.response?.status !== 401 || !cauHinh || cauHinh._daThuLai) {
      return Promise.reject(error);
    }

    // Không có phiên Firebase thì không thể tự gia hạn — để nguyên cho trang gọi xử lý.
    if (!auth.currentUser) return Promise.reject(error);

    cauHinh._daThuLai = true;
    try {
      const token = await layToken(true);
      if (!token) return Promise.reject(error);
      cauHinh.headers.Authorization = `Bearer ${token}`;
      return api(cauHinh);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default api;
