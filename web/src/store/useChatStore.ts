import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { UserProfile } from "./useAuthStore";

export interface ChatMessage {
  id: number;
  text: string;
  sender: "bot" | "user";
  requiresAuth?: boolean;
}

const DEFAULT_AUTH_GREETING = (name?: string): ChatMessage => ({
  id: 1,
  text: `Xin chào **${name || "bạn"}**! Mình là **Trợ lý EduTalk AI**. Bạn đang quan tâm đến ngành học, điểm chuẩn hay thông tin tuyển sinh nào của HUIT?`,
  sender: "bot",
});

const DEFAULT_UNAUTH_GREETING: ChatMessage = {
  id: 1,
  text: `Xin chào bạn! Mình là **Trợ lý EduTalk AI**.\n\nĐể mình có thể giải đáp chi tiết về các ngành học, điểm chuẩn và đồng hành cùng bạn, bạn hãy đăng nhập tài khoản nhé! Mình đã sẵn sàng hỗ trợ bạn rồi nè.`,
  sender: "bot",
  requiresAuth: true,
};

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  syncGreeting: (user: UserProfile | null) => void;
  sendMessage: (text: string, user: UserProfile | null) => Promise<void>;
  clearChat: (user: UserProfile | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [DEFAULT_UNAUTH_GREETING],
      isTyping: false,

      syncGreeting: (user: UserProfile | null) => {
        const { messages } = get();
        // Dọn dẹp triệt để bất kỳ emoji ✨ nào còn lưu trong cache localStorage
        const sanitized = (messages || []).map((m) => ({
          ...m,
          text: m.text.replace(/✨/g, "").replace(/\s{2,}/g, " ").trim(),
        }));

        // Nếu danh sách rỗng, khởi tạo câu chào mặc định
        if (sanitized.length === 0) {
          set({ messages: [user ? DEFAULT_AUTH_GREETING(user.name) : DEFAULT_UNAUTH_GREETING] });
          return;
        }

        // Nếu chỉ có 1 tin nhắn chào ban đầu (id === 1), đồng bộ theo trạng thái đăng nhập
        if (sanitized.length === 1 && sanitized[0].id === 1) {
          if (user && sanitized[0].requiresAuth) {
            set({ messages: [DEFAULT_AUTH_GREETING(user.name)] });
          } else if (!user && !sanitized[0].requiresAuth) {
            set({ messages: [DEFAULT_UNAUTH_GREETING] });
          } else {
            set({ messages: sanitized });
          }
        } else {
          set({ messages: sanitized });
        }
      },

      sendMessage: async (text: string, user: UserProfile | null) => {
        const cleanText = text.trim();
        if (!cleanText || get().isTyping) return;

        // Nếu chưa đăng nhập: thêm tin nhắn người dùng và câu bot yêu cầu đăng nhập thân thiện
        if (!user) {
          const userMsg: ChatMessage = {
            id: Date.now(),
            text: cleanText,
            sender: "user",
          };
          const authNoticeMsg: ChatMessage = {
            id: Date.now() + 1,
            text: `Bạn hãy đăng nhập tài khoản để mình giải đáp thắc mắc này cho bạn nhé! Bấm vào nút bên dưới để đăng nhập nhanh nha.`,
            sender: "bot",
            requiresAuth: true,
          };
          set((state) => ({
            messages: [...state.messages, userMsg, authNoticeMsg],
          }));
          return;
        }

        // Đã đăng nhập: gửi tin nhắn tới API trợ lý AI
        const userMsg: ChatMessage = {
          id: Date.now(),
          text: cleanText,
          sender: "user",
        };

        const currentMessages = get().messages;
        set({
          messages: [...currentMessages, userMsg],
          isTyping: true,
        });

        try {
          // Chuẩn bị history cho API (bỏ câu chào ban đầu id === 1 và các câu yêu cầu auth)
          const history = currentMessages
            .filter((m) => m.id !== 1 && !m.requiresAuth)
            .map((m) => ({
              role: m.sender === "bot" ? "model" : "user",
              text: m.text,
            }));

          const res = await api.post("/api/v1/chat/message", {
            message: cleanText,
            history,
          });

          const botResponse =
            res.data?.response || "Xin lỗi, mình không thể trả lời lúc này.";

          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: Date.now() + 1,
                text: botResponse,
                sender: "bot",
              },
            ],
          }));
        } catch (error) {
          console.error("Lỗi khi gọi AI:", error);
          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: Date.now() + 1,
                text: "Hệ thống AI đang bận hoặc mất kết nối. Vui lòng thử lại sau nhé!",
                sender: "bot",
              },
            ],
          }));
        } finally {
          set({ isTyping: false });
        }
      },

      clearChat: (user: UserProfile | null) => {
        set({
          messages: [user ? DEFAULT_AUTH_GREETING(user.name) : DEFAULT_UNAUTH_GREETING],
          isTyping: false,
        });
      },
    }),
    {
      name: "edutalk-chat-storage",
    }
  )
);
