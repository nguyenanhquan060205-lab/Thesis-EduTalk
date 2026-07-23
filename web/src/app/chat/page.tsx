"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, GraduationCap } from "lucide-react";

type Message = { id: number; text: string; sender: "bot" | "user" };

const SUGGESTIONS = [
  "Điểm chuẩn ngành Công nghệ thông tin HUIT năm ngoái?",
  "Trường có những ngành nào xét tuyển khối A00?",
  "Chỉ tiêu tuyển sinh ngành Ngôn ngữ Anh năm 2026?",
  "Học phí các ngành tại HUIT như thế nào?"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Xin chào! Mình là Trợ lý AI HUIT. Bạn đang quan tâm đến ngành học, điểm chuẩn hay thông tin tuyển sinh nào của trường?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const sendMessageText = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), text: text.trim(), sender: "user" }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = "Dựa trên thông tin tuyển sinh chính thức của Trường Đại học Công Thương TP.HCM (HUIT), ngành Công nghệ Thông tin xét tuyển các tổ hợp A00, A01, D01, D07, X26. Điểm chuẩn tham khảo năm ngoái là 24.5 điểm.";
      if (text.includes("A00")) {
        botResponse = "Các ngành xét tuyển khối A00 (Toán, Lý, Hóa) tại HUIT bao gồm: Công nghệ Thông tin, An toàn Thông tin, Khoa học Dữ liệu, Trí tuệ Nhân tạo, Công nghệ Thực phẩm, Công nghệ Kỹ thuật Cơ điện tử, Kế toán, Marketing...";
      } else if (text.includes("Học phí")) {
        botResponse = "Học phí bình quân tại HUIT khoảng 28 - 32 triệu đồng/năm tùy theo chương trình đào tạo và khối ngành kỹ thuật hay kinh tế.";
      }
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: botResponse, 
        sender: "bot"
      }]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSend = () => {
    sendMessageText(input);
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 pb-12 animate-fade-in-up">
      {/* Main Chat Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-160px)] overflow-hidden">
        
        {/* Chat Header */}
        <div className="bg-slate-50/90 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base leading-tight">
                Trợ lý Hỏi đáp Tuyển sinh HUIT
              </h1>
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sẵn sàng giải đáp 24/7
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-[#2563EB] border border-blue-100 px-3 py-1.5 rounded-full text-xs font-bold">
            <GraduationCap className="w-4 h-4" /> Tuyển sinh 2026
          </div>
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 text-[15px] font-medium leading-relaxed shadow-xs ${
                msg.sender === 'user' 
                  ? 'bg-[#2563EB] text-white rounded-br-sm' 
                  : 'bg-slate-50 border border-slate-200/90 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}

          {/* Quick Suggestion Chips on empty/initial chat */}
          {messages.length <= 1 && (
            <div className="pt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Gợi ý câu hỏi phổ biến:</p>
              <div className="flex flex-wrap gap-2.5">
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessageText(sug)}
                    className="text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 border border-slate-200 rounded-full px-4 py-2.5 transition text-left shadow-2xs"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex items-start">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm p-4 flex gap-2 shadow-xs">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập câu hỏi bất kỳ về tuyển sinh HUIT..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-6 py-4 text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition shadow-xs"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-14 h-14 rounded-full bg-[#2563EB] hover:bg-blue-700 flex items-center justify-center text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 shrink-0"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
