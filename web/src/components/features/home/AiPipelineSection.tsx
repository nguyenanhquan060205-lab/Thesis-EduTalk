'use client';

import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/motion/AnimatedBeam";
import { BorderBeam } from "@/components/motion/BorderBeam";
import {
  UserCheck,
  Cpu,
  BrainCircuit,
  Database,
  Sparkles,
  GraduationCap,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export function AiPipelineSection() {
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeUserRef = useRef<HTMLDivElement>(null);
  const nodeXgboostRef = useRef<HTMLDivElement>(null);
  const nodeShapRef = useRef<HTMLDivElement>(null);
  const nodeRagRef = useRef<HTMLDivElement>(null);
  const nodeResultRef = useRef<HTMLDivElement>(null);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-sky-950/50 border border-blue-200 dark:border-sky-800 text-[#0054A6] dark:text-sky-300 text-xs font-black uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#0054A6] dark:text-sky-400" />
          <span>Cơ Sở Khoa Học & Quy Trình Dự Báo Ngành Học</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Quy Trình Định Hướng & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0054A6] dark:from-sky-400 to-[#0084FF] dark:to-cyan-300">Xử Lý Dữ Liệu HUIT</span>
        </h2>
      </div>

      {/* Interactive Pipeline Diagram with Beams */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-950 to-[#001833] p-8 sm:p-12 shadow-2xl text-white"
      >
        <BorderBeam size={120} duration={8} colorFrom="#00B4D8" colorTo="#0054A6" />

        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">

          {/* Node 1: Thí sinh Input */}
          <div
            ref={nodeUserRef}
            className="h-full flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-cyan-400/40 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10 shrink-0">
              <UserCheck className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">1. Khảo Sát Năng Lực</span>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed flex-1 flex items-center justify-center">
              15 tổ hợp môn xét tuyển & 10 chỉ số thiên hướng nghề nghiệp
            </p>
          </div>

          {/* Node 2: Mô hình phân tích */}
          <div
            ref={nodeXgboostRef}
            className="h-full flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-blue-400/40 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10 shrink-0">
              <Cpu className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">2. Mô Hình Phân Tích</span>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed flex-1 flex items-center justify-center">
              Đánh giá tỷ lệ trúng tuyển trên toàn bộ 39 chuyên ngành HUIT
            </p>
          </div>

          {/* Node 3: Giải thích minh bạch */}
          <div
            ref={nodeShapRef}
            className="h-full flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-400/40 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10 shrink-0">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">3. Minh Bạch Kết Quả</span>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed flex-1 flex items-center justify-center">
              Phân tích mức độ đóng góp điểm số của từng môn học (SHAP)
            </p>
          </div>

          {/* Node 4: Kho tri thức tuyển sinh */}
          <div
            ref={nodeRagRef}
            className="h-full flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-amber-400/40 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10 shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">4. Kho Tri Thức HUIT</span>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed flex-1 flex items-center justify-center">
              Truy xuất điểm chuẩn 3 năm & đề án tuyển sinh mới nhất
            </p>
          </div>

          {/* Node 5: Trúng tuyển HUIT */}
          <div
            ref={nodeResultRef}
            className="h-full flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-[#0054A6]/40 to-[#0054A6]/20 border border-[#00B4D8]/50 backdrop-blur-md hover:border-cyan-300 transition-all group shadow-xl shadow-[#0054A6]/20"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0054A6] to-[#00B4D8] text-white flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/25 shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">5. Đề Xuất Ngành Học</span>
            <p className="text-[11px] text-cyan-200 mt-2 leading-relaxed font-semibold flex-1 flex items-center justify-center">
              Gợi ý 2-5 ngành phù hợp kèm tổ hợp & điểm chuẩn tương ứng
            </p>
          </div>

        </div>

        {/* Animated Beams between sequential nodes */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={nodeUserRef}
          toRef={nodeXgboostRef}
          gradientStartColor="#22D3EE"
          gradientStopColor="#3B82F6"
          duration={3.5}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={nodeXgboostRef}
          toRef={nodeShapRef}
          gradientStartColor="#3B82F6"
          gradientStopColor="#A855F7"
          duration={3.5}
          delay={0.8}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={nodeShapRef}
          toRef={nodeRagRef}
          gradientStartColor="#A855F7"
          gradientStopColor="#F59E0B"
          duration={3.5}
          delay={1.6}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={nodeRagRef}
          toRef={nodeResultRef}
          gradientStartColor="#F59E0B"
          gradientStopColor="#00B4D8"
          duration={3.5}
          delay={2.4}
        />



      </div>
    </section>
  );
}
