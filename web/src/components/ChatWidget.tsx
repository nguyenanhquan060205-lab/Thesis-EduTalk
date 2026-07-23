"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, Maximize2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{id: number, text: string, sender: "bot"|"user"}[]>([
    { id: 1, text: "Chào bạn! Mình là trợ lý AI HUIT. Mình có thể giúp gì cho bạn?", sender: "bot" }
  ]);
  
  const pathname = usePathname();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { 
    if (isOpen) scrollToBottom(); 
  }, [messages, isTyping, isOpen]);

  // Early return MUST be after all hooks!
  if (pathname === "/chat") return null;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: "user" }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Hệ thống đang được nâng cấp để hỗ trợ truy vấn chi tiết. Để phân tích RAG chuyên sâu, bạn có thể bấm nút phóng to để vào trang Chat chính thức nhé!", 
        sender: "bot"
      }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-80 sm:w-[400px] h-[550px] z-50 flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2563EB] to-teal-500 p-4 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">HUIT Copilot</h3>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-50">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Sẵn sàng giải đáp
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => router.push("/chat")}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
                  title="Mở toàn màn hình"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3.5 text-[14px] leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#2563EB] text-white rounded-br-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm p-4 flex gap-1.5 shadow-sm">
                    <div className="w-2 h-2 bg-[#2563EB]/40 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-[#2563EB]/70 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 z-10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi AI bất kỳ điều gì..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-5 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-11 h-11 rounded-full bg-[#2563EB] hover:bg-blue-700 flex items-center justify-center text-white transition disabled:opacity-50 shrink-0 shadow-md shadow-blue-500/20"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563EB] to-teal-400 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center border-4 border-white"
        >
          <MessageSquare className="w-7 h-7" />
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
        </motion.button>
      )}
    </>
  );
}
