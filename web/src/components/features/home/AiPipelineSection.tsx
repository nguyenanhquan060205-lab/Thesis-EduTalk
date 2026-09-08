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

export function AiPipelineSection() {
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0054A6] text-xs font-black uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Kiến Trúc AI Độc Quyền</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Hệ Thống Tư Vấn Tuyển Sinh <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0054A6] to-[#0084FF]">2 Tầng & XAI SHAP</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          Sự kết hợp giữa mô hình học máy phân tầng (Hierarchical XGBoost), giải thích minh bạch quyết định (SHAP), và cơ sở dữ liệu tri thức tuyển sinh HUIT 2026.
        </p>
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

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-4 items-center">
          
          {/* Node 1: Thí sinh Input */}
          <div ref={nodeUserRef} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-cyan-400/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
              <UserCheck className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">1. Dữ Liệu Thí Sinh</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              15 tổ hợp môn + 10 câu trắc nghiệm sở thích Likert
            </p>
          </div>

          {/* Node 2: XGBoost 2 Tầng */}
          <div ref={nodeXgboostRef} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-blue-400/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
              <Cpu className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">2. XGBoost 2 Tầng</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Tầng 1: 7 Nhóm ngành<br />Tầng 2: 39 Chuyên ngành
            </p>
          </div>

          {/* Node 3: XAI SHAP */}
          <div ref={nodeShapRef} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-400/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">3. Minh Bạch XAI SHAP</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              Trọng số hợp nhất φ₂ + β·φ₁ giải thích vì sao chọn ngành
            </p>
          </div>

          {/* Node 4: ChromaDB + RAG */}
          <div ref={nodeRagRef} className="flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-amber-400/40 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
              <Database className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">4. Tri Thức Tuyển Sinh</span>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              ChromaDB RAG truy xuất điểm chuẩn & đề án HUIT 2026
            </p>
          </div>

          {/* Node 5: Trúng tuyển HUIT */}
          <div ref={nodeResultRef} className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-[#0054A6]/40 to-[#0054A6]/20 border border-[#00B4D8]/50 backdrop-blur-md hover:scale-105 transition-all group shadow-xl shadow-[#0054A6]/20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0054A6] to-[#00B4D8] text-white flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/25">
              <GraduationCap className="w-7 h-7" />
            </div>
            <span className="text-xs font-black text-white">5. Đề Xuất Top 3</span>
            <p className="text-[11px] text-cyan-200 mt-1 leading-snug font-semibold">
              Tối ưu khả năng trúng tuyển & cơ hội nghề nghiệp
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

        {/* Action Button below diagram */}
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Mô hình kiểm định chéo K-Fold đạt độ chính xác cao trên tập dữ liệu tuyển sinh HUIT</span>
          </div>
          <Link
            href="/predict"
            className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-[#0054A6] hover:from-cyan-400 hover:to-[#0072CE] text-white text-xs font-black transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 shrink-0 group active:scale-95"
          >
            <span>Trải Nghiệm Khảo Sát Ngay</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
}
