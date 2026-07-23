"use client";

import Link from "next/link";
import { Brain, Database, MessageSquare, History, ArrowUpRight, Zap, Target, GraduationCap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col gap-24 mt-8 pb-32 relative">
      
      {/* Background Noise Texture Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none mix-blend-overlay opacity-50 z-50"></div>
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center pt-10">
        
        {/* Abstract Blur Orbs */}
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2563EB]/5 blur-[120px] rounded-full pointer-events-none -z-10"
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-teal-100/40 blur-[100px] rounded-full pointer-events-none -z-10"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-sm mb-10 glass-panel"
        >
          <GraduationCap className="w-5 h-5 text-[#2563EB]" /> 
          <span className="text-sm font-bold text-slate-800 tracking-wide">
            Hệ thống Tuyển sinh HUIT 2026
          </span>
          <span className="flex h-2 w-2 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        </motion.div>
        
        {/* Oversized Typography */}
        <motion.div style={{ opacity }} className="max-w-5xl">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[3.5rem] md:text-[5.5rem] lg:text-[6.8rem] font-black leading-[0.95] tracking-tighter-xl text-slate-900 mb-6"
          >
            Trường Đại học <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#1d4ed8] to-teal-600">
              Công Thương
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Hệ thống Trợ lý Tuyển sinh & Tư vấn Ngành học Thông minh dành riêng cho học sinh & sinh viên HUIT.
          </motion.p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-5 justify-center mt-12 relative z-20"
        >
          <Link href="/predict" className="group relative bg-[#2563EB] text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:bg-[#1d4ed8] shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.7)] hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <Brain className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" /> Tư vấn Ngành học AI
          </Link>
          <Link href="/chat" className="group bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 px-8 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-sm hover:border-slate-300 hover:bg-white hover:-translate-y-1">
            <MessageSquare className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-300" /> Trợ lý Hỏi đáp AI
          </Link>
        </motion.div>
      </section>

      {/* Bento Grid Section */}
      <section className="relative z-20 max-w-7xl mx-auto w-full px-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div>
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Hệ sinh thái HUIT EduTalk</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 auto-rows-[250px]">
          
          {/* Card 1: Predict (Large) */}
          <Link href="/predict" className="md:col-span-2 md:row-span-2 group block">
            <motion.div 
              whileHover={{ y: -8, scale: 0.99 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white h-full p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-50 to-teal-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-16 h-16 bg-[#2563EB] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#2563EB]/20">
                  <Target className="w-8 h-8" />
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-300">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>

              <div className="relative z-10 mt-12">
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Tư vấn Chuyên sâu</h3>
                <p className="text-slate-500 font-medium text-lg max-w-md">
                  Phân tính điểm số 3 môn thi cùng sở thích cá nhân để gợi ý ngành học phù hợp nhất với bản thân.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Card 2: Database (Tall) */}
          <Link href="/majors" className="md:col-span-1 md:row-span-2 group block">
            <motion.div 
              whileHover={{ y: -8, scale: 0.99 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-[#2563EB] h-full p-8 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between"
            >
              {/* Decorative grid pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

              <div className="relative z-10 flex justify-between items-start">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white">
                  <Database className="w-7 h-7" />
                </div>
              </div>

              <div className="relative z-10 mt-12">
                <div className="text-5xl font-black text-white mb-2">39+</div>
                <h3 className="text-xl font-bold text-blue-100 mb-3">Ngành học HUIT</h3>
                <p className="text-blue-200/80 font-medium text-sm">
                  Tra cứu điểm chuẩn, chỉ tiêu và các tổ hợp môn xét tuyển mới nhất năm 2026.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Card 3: History (Small) */}
          <Link href="/history" className="md:col-span-1 md:row-span-1 group block">
            <motion.div 
              whileHover={{ y: -4, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white h-full p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100">
                  <History className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Lịch sử</h3>
                <p className="text-slate-500 font-medium text-sm">Quản lý các kết quả đánh giá cá nhân.</p>
              </div>
            </motion.div>
          </Link>

          {/* Card 4: Explanation (Small) */}
          <Link href="/result" className="md:col-span-1 md:row-span-1 group block">
            <motion.div 
              whileHover={{ y: -4, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-teal-50 h-full p-8 rounded-[2rem] border border-teal-100 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-white text-teal-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-teal-300 group-hover:text-teal-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Phân Tích</h3>
                <p className="text-teal-700 font-medium text-sm">Xem yếu tố ảnh hưởng tới kết quả.</p>
              </div>
            </motion.div>
          </Link>

        </div>
      </section>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
