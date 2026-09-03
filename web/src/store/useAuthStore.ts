import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender?: "Nam" | "Nữ" | string;
  role?: string;
  avatar?: string;
  isPremium?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      // Phải dọn CẢ HAI kho phiên. Bản trước chỉ xoá localStorage, còn phiên
      // Firebase Web SDK vẫn sống trong IndexedDB — người kế tiếp đăng nhập
      // bằng email/mật khẩu sẽ bị interceptor gắn nhầm token của người trước,
      // vì nó ưu tiên `auth.currentUser`.
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("authToken");
        }
        void signOut(auth).catch(() => {
          /* không có phiên SDK nào thì bỏ qua */
        });
        set({ user: null });
      },
    }),
    {
      name: "edutalk-auth-storage",
    }
  )
);
