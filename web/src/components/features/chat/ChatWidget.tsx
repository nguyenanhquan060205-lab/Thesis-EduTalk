"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Maximize2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Lottie from "lottie-react";
import ReactMarkdown from "react-markdown";
import animationData from "../../public/animations/Live chatbot.json";
import api from "@/lib/api";

type Message = { id: number; text: string; sender: "bot" | "user" };

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Chào bạn! Mình là Trợ lý EduTalk. Mình có thể giúp gì cho bạn?", sender: "bot" }
  ]);
  
  const pathname = usePathname();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => { 
    if (isOpen) scrollToBottom(); 
  }, [messages, isTyping, isOpen]);

  // Không hiển thị widget nếu đang ở trang /chat full screen
  if (pathname === "/chat") return null;

  const sendMessageText = async (text: string) => {
    if (!text.trim()) return;
    
    // Thêm tin nhắn của user
    const newUserMsg: Message = { id: Date.now(), text: text.trim(), sender: "user" };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Chuẩn bị history cho API
      const history = messages
        .filter(m => m.id !== 1)
        .map(m => ({
          role: m.sender === "bot" ? "model" : "user",
          text: m.text
        }));

      // Gọi API Gemini
      const res = await api.post("/api/v1/chat/message", {
        message: text.trim(),
        history: history
      });

      const botResponse = res.data.response || "Xin lỗi, mình không thể trả lời lúc này.";
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: botResponse, 
        sender: "bot"
      }]);
    } catch (error) {
      console.error("Lỗi khi gọi AI:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "Hệ thống AI đang bận hoặc mất kết nối. Vui lòng thử lại sau!", 
        sender: "bot"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    sendMessageText(input);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 right-0 w-full h-[100dvh] sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] sm:max-h-[85vh] z-50 flex flex-col bg-white sm:border border-slate-200/60 sm:rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-3 sm:px-5 sm:py-4 flex items-center shadow-sm z-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none mix-blend-overlay"></div>
              
              <div className="flex items-center gap-2 sm:gap-3 relative z-10 flex-1">
                <div>
                  <h3 className="font-extrabold text-white text-[15px]">Trợ lý EduTalk</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-50 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span> Sẵn sàng giải đáp
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 relative z-10 shrink-0">
                <button 
                  onClick={() => router.push("/chat")}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
                  title="Mở toàn màn hình"
                >
                  <Maximize2 className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50 space-y-4">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-1 -ml-1 mr-0.5">
                      <Lottie animationData={animationData} loop={true} className="w-14 h-14 scale-125" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-[14px] leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm border border-blue-500' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm prose prose-sm prose-slate max-w-none'
                  }`}>
                    {msg.sender === 'user' ? (
                      msg.text
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 mt-1 -ml-1 mr-0.5">
                    <Lottie animationData={animationData} loop={true} className="w-14 h-14 scale-125" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-2 shadow-sm items-center">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 z-10 shadow-[0_-4px_15px_-10px_rgba(0,0,0,0.05)]">

              <div className="flex gap-2 items-end">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Hỏi AI bất kỳ điều gì..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[14px] text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition shadow-inner resize-none min-h-[46px] max-h-[100px]"
                  rows={1}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-[46px] h-[46px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 shrink-0"
                >
                  <Send className="w-4.5 h-4.5 ml-0.5" />
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-400 mt-2">
                Thông tin từ Trợ lý EduTalk mang tính chất tham khảo. Quyết định lựa chọn là ở bạn nhé!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button with Tooltip */}
      {!isOpen && (
        <>
          <div ref={constraintsRef} className="fixed inset-4 pointer-events-none z-0" />
          <motion.div 
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 150)}
            className="fixed bottom-6 right-6 z-50 flex items-end gap-4 pointer-events-auto"
          >
          {/* Tooltip Bubble */}
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
            className="hidden sm:flex items-center bg-white rounded-xl py-2 px-3.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-slate-100 cursor-pointer mb-6"
            onClick={() => !isDragging && setIsOpen(true)}
          >
            <div>
              <p className="text-[13px] font-extrabold text-slate-800 leading-tight">Trợ lý EduTalk</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Bạn cần tư vấn gì không?</p>
            </div>
            {/* Triangle pointing right */}
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-white drop-shadow-sm"></div>
          </motion.div>

          {/* Icon Button (No frame, natural Lottie) */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => !isDragging && setIsOpen(true)}
            className="w-24 h-24 flex items-center justify-center group relative shrink-0 cursor-pointer drop-shadow-[0_15px_15px_rgba(37,99,235,0.25)]"
          >
            <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lottie animationData={animationData} loop={true} className="w-[120%] h-[120%] scale-125" />
            </div>
          </motion.div>
        </motion.div>
        </>
      )}
    </>
  );
}
