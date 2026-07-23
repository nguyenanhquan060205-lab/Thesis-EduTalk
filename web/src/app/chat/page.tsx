"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, Search, Database, FileText, CheckCircle2 } from "lucide-react";

type Message = { id: number; text: string; sender: "bot" | "user"; isRAG?: boolean };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Chào bạn, mình là Trợ lý AI của HUIT. Bạn muốn hỏi thông tin gì về tuyển sinh hay ngành học nào?", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ragSteps, setRagSteps] = useState(0); 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, ragSteps]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMsg, sender: "user" }]);
    setInput("");
    setIsTyping(true);
    setRagSteps(1);

    setTimeout(() => setRagSteps(2), 1000); 
    setTimeout(() => setRagSteps(3), 2000); 
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: "Dựa theo Đề án Tuyển sinh mới nhất của HUIT, ngành Công nghệ Thông tin xét tuyển các tổ hợp A00, A01, D01, D07. Chỉ tiêu dự kiến là 800 sinh viên. Bạn có muốn xem thêm chi tiết điểm chuẩn năm ngoái không?", 
        sender: "bot",
        isRAG: true
      }]);
      setIsTyping(false);
      setRagSteps(0);
    }, 3500);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in-up mt-4">
      {/* RAG Process Visualization (Left Sidebar) */}
      <div className="hidden lg:flex flex-col w-96 space-y-6">
        <div className="bg-white p-6 rounded-3xl h-full flex flex-col border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-slate-900">
            <Database className="w-6 h-6 text-purple-600" /> Tiến trình phân tích RAG
          </h2>
          
          <div className="space-y-8 flex-1">
            <div className={`transition-opacity duration-500 ${ragSteps >= 1 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${ragSteps >= 1 ? 'bg-blue-50 border-blue-200 text-[#2563EB] shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                  <Search className="w-6 h-6" />
                </div>
                <div className="font-black text-slate-900 text-lg">1. Retrieval</div>
              </div>
              <p className="text-sm font-medium text-slate-500 pl-16">Tìm kiếm Vector trong Cơ sở Dữ liệu Đề án Tuyển sinh HUIT.</p>
            </div>

            <div className={`transition-opacity duration-500 ${ragSteps >= 2 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${ragSteps >= 2 ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="font-black text-slate-900 text-lg">2. Context Retrieved</div>
              </div>
              {ragSteps >= 2 && (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pl-16 pr-2 mt-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm font-semibold text-amber-800 shadow-sm">
                    "...Ngành CNTT mã 7480201 xét tổ hợp A00, A01, D01. Chỉ tiêu dự kiến 800..."
                  </div>
                </motion.div>
              )}
            </div>

            <div className={`transition-opacity duration-500 ${ragSteps >= 3 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${ragSteps >= 3 ? 'bg-teal-50 border-teal-200 text-teal-600 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                  <Bot className="w-6 h-6" />
                </div>
                <div className="font-black text-slate-900 text-lg">3. LLM Generation</div>
              </div>
              <p className="text-sm font-medium text-slate-500 pl-16">Tổng hợp dữ liệu và sinh câu trả lời tự nhiên cho người dùng.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-200 shadow-sm relative">
        <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Bot className="w-6 h-6 text-[#2563EB]" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg">EduTalk Assistant</h2>
            <p className="text-sm text-teal-600 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span> Sẵn sàng giải đáp
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-[15px] font-medium leading-relaxed shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-[#2563EB] text-white rounded-br-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              
              {msg.isRAG && (
                <div className="flex items-center gap-1 mt-2 text-xs text-teal-700 font-bold px-3 py-1.5 bg-teal-50 rounded-full border border-teal-200 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Xác thực bằng RAG Pipeline
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex items-start">
               <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm p-5 flex gap-2 shadow-sm">
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)]">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập câu hỏi của bạn tại đây..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-6 py-4 text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition shadow-sm"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-14 h-14 rounded-full bg-[#2563EB] hover:bg-blue-700 flex items-center justify-center text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
            >
              <Send className="w-6 h-6 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
