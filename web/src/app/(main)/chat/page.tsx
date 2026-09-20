"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Send, LogIn } from "lucide-react";
import Link from "next/link";
import Lottie from "lottie-react";
import ReactMarkdown from "react-markdown";
import animationData from "@/assets/animations/Live chatbot.json";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";

const SUGGESTIONS = [
  "Điểm chuẩn ngành Công nghệ thông tin HUIT năm ngoái?",
  "Trường có những ngành nào xét tuyển khối A00?",
  "Chỉ tiêu tuyển sinh ngành Ngôn ngữ Anh năm 2026?",
  "Học phí các ngành tại HUIT như thế nào?"
];

export default function ChatPage() {
  const { user } = useAuthStore();
  const { messages, isTyping, syncGreeting, sendMessage } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ lời chào dựa trên trạng thái đăng nhập
  useEffect(() => {
    syncGreeting(user);
  }, [user, syncGreeting]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input;
    setInput("");
    void sendMessage(text, user);
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 pb-12 animate-fade-in-up">
      {/* Main Chat Box */}
      <div
        data-lenis-prevent
        className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-160px)] overflow-hidden relative"
      >
        
        {/* Background Decor (Tùy chọn cho sinh động) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>

        {/* Chat Header */}
        <div className="bg-white/80 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center shadow-xs z-10 relative">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <div>
              <h1 className="font-extrabold text-slate-900 text-[17px] leading-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                Trợ lý EduTalk
              </h1>
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> 
                Đang trực tuyến
              </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollContainerRef}
          data-lenis-prevent
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 bg-slate-50/50"
        >
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'bot' && (
                <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1 -ml-2 mr-1">
                  <Lottie animationData={animationData} loop={true} className="w-16 h-16 scale-125" />
                </div>
              )}
              <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.sender === 'bot' && msg.id !== 1 && (
                  <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">Trợ lý EduTalk</span>
                )}
                <div className={`max-w-full rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm border border-blue-500' 
                    : 'bg-white dark:bg-[#0D1729] border border-slate-200 dark:border-[#1E3454] text-slate-800 dark:text-slate-100 rounded-bl-sm prose prose-sm dark:prose-invert max-w-none'
                }`}>
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                      {msg.requiresAuth && (
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center">
                          <Link
                            href="/auth/login?redirect=/chat"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0054A6] to-[#0072CE] hover:from-[#00488F] hover:to-[#005FA3] text-white text-xs font-black shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Đăng nhập ngay để trò chuyện</span>
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Quick Suggestion Chips on empty/initial chat */}
          {messages.length <= 1 && (
            <div className="pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></span>
                Gợi ý câu hỏi phổ biến
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></span>
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => void sendMessage(sug, user)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0D1729] hover:bg-blue-50/80 dark:hover:bg-slate-800 hover:text-[#0054A6] dark:hover:text-sky-300 hover:border-[#0054A6]/40 border border-slate-200/90 dark:border-[#1E3454] rounded-2xl px-4 py-2.5 transition-all shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-hidden />
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1 -ml-2 mr-1">
                <Lottie animationData={animationData} loop={true} className="w-16 h-16 scale-125" />
              </div>
              <div className="bg-white dark:bg-[#0D1729] border border-slate-100 dark:border-slate-800 px-5 py-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center w-fit shadow-sm shadow-slate-200/50">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Bar */}
        {!user ? (
          <div className="p-4 bg-white/95 dark:bg-[#0D1729]/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 z-10">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#070E1E]/80 border border-slate-200 dark:border-[#1E3454]">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Đăng nhập tài khoản để đặt câu hỏi cho AI
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tra cứu điểm chuẩn, học phí và nhận tư vấn chi tiết về 39 ngành học HUIT 2026.
                </p>
              </div>
              <Link
                href="/auth/login?redirect=/chat"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0054A6] to-[#0072CE] hover:from-[#00488F] hover:to-[#005FA3] text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập ngay</span>
              </Link>
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-2.5 font-medium">
              Thông tin từ Trợ lý EduTalk mang tính chất tham khảo. Quyết định lựa chọn là ở bạn nhé!
            </p>
          </div>
        ) : (
          <div className="p-4 bg-white/90 dark:bg-[#0D1729]/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 z-10">
            <div className="flex gap-3 max-w-4xl mx-auto items-end">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập câu hỏi của bạn về ngành học, điểm chuẩn HUIT..."
                className="flex-1 bg-slate-50/80 dark:bg-[#070E1E]/80 border border-slate-200 dark:border-[#1E3454] rounded-2xl px-5 py-3.5 text-sm text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 outline-none focus:border-[#0054A6] focus:ring-4 focus:ring-[#0054A6]/10 transition shadow-inner resize-none min-h-[52px] max-h-[120px]"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-[#0054A6] to-[#0072CE] hover:from-[#00478F] hover:to-[#005FA3] flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#0054A6]/25 hover:shadow-lg hover:shadow-[#0054A6]/35 active:scale-95 shrink-0 cursor-pointer"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
              Thông tin từ Trợ lý EduTalk mang tính chất tham khảo. Quyết định lựa chọn là ở bạn nhé!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
