"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Lottie from "lottie-react";
import ReactMarkdown from "react-markdown";
import animationData from "../../../../public/animations/Live chatbot.json";
import api from "@/lib/api";

type Message = { id: number; text: string; sender: "bot" | "user" };

const SUGGESTIONS = [
  "Điểm chuẩn ngành Công nghệ thông tin HUIT năm ngoái?",
  "Trường có những ngành nào xét tuyển khối A00?",
  "Chỉ tiêu tuyển sinh ngành Ngôn ngữ Anh năm 2026?",
  "Học phí các ngành tại HUIT như thế nào?"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Xin chào! Mình là **Trợ lý EduTalk**. Bạn đang quan tâm đến ngành học, điểm chuẩn hay thông tin tuyển sinh nào của trường?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const sendMessageText = async (text: string) => {
    if (!text.trim()) return;
    
    // Thêm tin nhắn của user
    const newUserMsg: Message = { id: Date.now() /* eslint-disable-line react-hooks/purity */, text: text.trim(), sender: "user" };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Chuẩn bị history cho API (Bỏ qua câu chào đầu tiên cho gọn)
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
        id: Date.now() /* eslint-disable-line react-hooks/purity */ + 1, 
        text: botResponse, 
        sender: "bot"
      }]);
    } catch (error) {
      console.error("Lỗi khi gọi AI:", error);
      setMessages(prev => [...prev, { 
        id: Date.now() /* eslint-disable-line react-hooks/purity */ + 1, 
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
    <div className="max-w-5xl mx-auto mt-4 pb-12 animate-fade-in-up">
      {/* Main Chat Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-160px)] overflow-hidden relative">
        
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
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
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
                  <span className="text-[10px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-wider">AI Trợ lý</span>
                )}
                <div className={`max-w-full rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
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
              </div>
            </motion.div>
          ))}

          {/* Quick Suggestion Chips on empty/initial chat */}
          {messages.length <= 1 && (
            <div className="pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="h-px bg-slate-200 flex-1"></span>
                Gợi ý câu hỏi phổ biến
                <span className="h-px bg-slate-200 flex-1"></span>
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessageText(sug)}
                    className="text-[13px] font-semibold text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-2xl px-4 py-2.5 transition-all shadow-xs hover:shadow-sm"
                  >
                    💡 {sug}
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
              <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center w-fit shadow-sm shadow-slate-200/50">
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
        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 z-10">
          <div className="flex gap-3 max-w-4xl mx-auto items-end">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Nhập câu hỏi của bạn vào đây..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition shadow-inner resize-none min-h-[52px] max-h-[120px]"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-[52px] h-[52px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 shrink-0"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
            Thông tin từ Trợ lý EduTalk mang tính chất tham khảo. Quyết định lựa chọn là ở bạn nhé!
          </p>
        </div>
      </div>
    </div>
  );
}
