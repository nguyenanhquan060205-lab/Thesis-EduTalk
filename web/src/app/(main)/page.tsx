import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  Target, 
  ShieldCheck, 
  MessageSquare, 
  ArrowRight, 
  Sparkles,
  Award,
  CheckCircle2,
  Calculator,
  Info
} from "lucide-react";
import { Marquee } from "@/components/motion/Marquee";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { ShimmerButton } from "@/components/motion/ShimmerButton";
import { HeroBanner } from "@/components/features/home/HeroBanner";
import { StatsCounter } from "@/components/features/home/StatsCounter";
import { AiPipelineSection } from "@/components/features/home/AiPipelineSection";
import { FacultyGrid } from "@/components/features/home/FacultyGrid";
import { FaqAccordion } from "@/components/features/home/FaqAccordion";
import { ADMISSION_BLOCKS, ADMISSION_SOURCE } from "@/lib/admission";

export const metadata: Metadata = {
  title: "HUIT EduTalk — Cổng Tư Vấn Tuyển Sinh & Định Hướng Ngành Học AI",
  description: "Cổng tư vấn tuyển sinh và định hướng chuyên ngành thông minh Đại học Công Thương TP.HCM (HUIT), ứng dụng pipeline học máy XGBoost (research3) và giải thích minh bạch XAI SHAP.",
};

const MARQUEE_ITEMS = [
  "🏛️ 44 Năm Truyền Thống Phát Triển & Khởi Nghiệp Đổi Mới",
  "🎓 39 Chuyên Ngành Đào Tạo Chuẩn Kiểm Định Quốc Tế (AUN-QA, MOET)",
  "📊 15 Tổ Hợp Môn Xét Tuyển Đa Dạng & Linh Hoạt",
  "🤖 Pipeline Trí Tuệ Nhân Tạo XGBoost Phân Tích Khả Năng Trúng Tuyển 9 Nhóm Ngành",
  "💡 Giải Thích Minh Bạch XAI SHAP Hỗ Trợ Ra Quyết Định Đúng Đắn",
  "💬 Trợ Lý Tư Vấn Tuyển Sinh AI EduTalk Trực Tuyến 24/7",
];

const HIGHLIGHT_STRIPS = [
  {
    id: "predict",
    title: "Tư Vấn Chọn Ngành AI",
    desc: "Đối soát 15 tổ hợp môn & 10 thiên hướng cá nhân để gợi ý Top 3 ngành phù hợp nhất tại HUIT.",
    tag: "Khảo sát AI",
    icon: Target,
    href: "/predict",
  },
  {
    id: "majors",
    title: "Dữ Liệu Chuẩn HUIT 2026",
    desc: "Tra cứu điểm chuẩn các năm & chỉ tiêu xét tuyển 39 chuyên ngành đào tạo chính quy.",
    tag: "Chính thống",
    icon: ShieldCheck,
    href: "/majors",
  },
  {
    id: "chat",
    title: "Trợ Lý Tuyển Sinh 24/7",
    desc: "Hỏi đáp tức thì về học phí, học bổng, phương thức xét tuyển & môi trường học tập HUIT.",
    tag: "Trợ lý 24/7",
    icon: MessageSquare,
    href: "/chat",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col w-full space-y-20 pb-20">
      
      {/* ==================================================================== */}
      {/* VÙNG 1: HERO SLIDER BANNER (FULL-BLEED, CINEMATIC)                   */}
      {/* ==================================================================== */}
      <HeroBanner />

      {/* ==================================================================== */}
      {/* VÙNG 2: DẢI SỐ LIỆU SỐNG ĐẾM TĂNG DẦN (@number-flow/react)           */}
      {/* ==================================================================== */}
      <StatsCounter />

      {/* ==================================================================== */}
      {/* VÙNG 3: INFINITE MARQUEE STRIP (TRÀN VIỀN, NỀN SLATE-100)            */}
      {/* ==================================================================== */}
      <div className="w-full bg-slate-100/80 border-y border-slate-200/80 py-3.5 overflow-hidden">
        <Marquee repeat={5} duration="40s">
          {MARQUEE_ITEMS.map((item, idx) => (
            <span 
              key={idx} 
              className="inline-flex items-center text-xs font-black text-slate-700 px-6 tracking-wide"
            >
              {item}
            </span>
          ))}
        </Marquee>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 4: 3 TRỤ CỘT TRẢI NGHIỆM VỚI SPOTLIGHT MOUSE TRACKING           */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HIGHLIGHT_STRIPS.map((strip) => {
            const Icon = strip.icon;
            return (
              <Link key={strip.id} href={strip.href} className="group block">
                <SpotlightCard className="h-full flex flex-col justify-between p-7 hover:border-[#0054A6]/60">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200 bg-blue-50 text-[#0054A6] shadow-2xs group-hover:scale-110 group-hover:bg-[#0054A6] group-hover:text-white transition-all">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {strip.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#0054A6] transition-colors leading-snug">
                        {strip.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                        {strip.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#0054A6]">
                    <span>Khám phá ngay</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 5: KIẾN TRÚC AI PIPELINE VỚI ANIMATED BEAMS & BORDER BEAM       */}
      {/* ==================================================================== */}
      <AiPipelineSection />

      {/* ==================================================================== */}
      {/* VÙNG 6: 9 NHÓM NGÀNH TRỌNG ĐIỂM TẠI HUIT VỚI SPOTLIGHT CARDS         */}
      {/* ==================================================================== */}
      <FacultyGrid />

      {/* ==================================================================== */}
      {/* VÙNG 7: PHƯƠNG THỨC XÉT TUYỂN (CHỈ PHƯƠNG THỨC ĐIỂM THI THPT 2026)   */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 text-left">
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
            Cơ Sở Tuyển Sinh Áp Dụng
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Xét Điểm Thi Tốt Nghiệp THPT 2026
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Hệ thống phân tích và ước lượng khả năng trúng tuyển dựa trên kết quả thi tốt nghiệp THPT 2026 theo đề án tuyển sinh chính thức của HUIT.
          </p>
        </div>

        {/* Khối trình bày chủ đích 1 phương thức: chia cột thoáng, có quy tắc tính và 15 tổ hợp thực tế */}
        <SpotlightCard
          spotlightColor="rgba(0, 84, 166, 0.08)"
          className="p-6 sm:p-10 border border-slate-200/90 rounded-3xl bg-white shadow-xs space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Thông tin phương thức & Quy tắc tính điểm (5 cột) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-[#0054A6] text-white text-xs font-black shadow-2xs">
                    Phương Thức 1
                  </span>
                  <span className="text-xs font-bold text-slate-400">Mã phương thức: 100</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Xét Theo Điểm Thi Tốt Nghiệp THPT
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  Sử dụng tổng điểm 3 môn thi tốt nghiệp THPT năm 2026 theo tổ hợp môn tương ứng của từng ngành để xét tuyển vào 39 chuyên ngành đào tạo chính quy tại HUIT.
                </p>
              </div>

              {/* Chi tiết cách tính điểm */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Quy Tắc Tính Điểm & Đối Soát
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0054A6] border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <strong className="text-slate-900 block font-bold">Công thức xét tuyển:</strong>
                      <span className="text-slate-600 font-medium leading-relaxed">
                        Điểm xét = Điểm môn 1 + Điểm môn 2 + Điểm môn 3 + Điểm ưu tiên (nếu có). Thang điểm chuẩn 30.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0054A6] border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <strong className="text-slate-900 block font-bold">Căn cứ dữ liệu:</strong>
                      <span className="text-slate-600 font-medium leading-relaxed">
                        {ADMISSION_SOURCE}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: 15 Tổ hợp môn áp dụng từ dữ liệu thật (7 cột) */}
            <div className="lg:col-span-7 space-y-4 lg:pl-6 lg:border-l lg:border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    15 Tổ Hợp Môn Xét Tuyển Được Hỗ Trợ
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Thí sinh có thể đối soát và nhận gợi ý ngành phù hợp theo các tổ hợp sau:
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black shrink-0">
                  {Object.keys(ADMISSION_BLOCKS).length} Tổ hợp
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(ADMISSION_BLOCKS).map(([code, info]) => (
                  <div
                    key={code}
                    className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-[#0054A6]/50 hover:bg-blue-50/30 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-[#0054A6]">{code}</span>
                      <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[80px]">
                        {info.category}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 leading-snug truncate" title={info.name}>
                      {info.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate" title={info.desc}>
                      {info.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dòng ghi chú phạm vi trung thực */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              <strong className="text-slate-800 font-bold">Lưu ý về phạm vi hệ thống:</strong> EduTalk hiện chỉ phân tích và tư vấn theo phương thức <strong>Xét điểm thi tốt nghiệp THPT 2026</strong> dựa trên dữ liệu điểm chuẩn đã công bố. Các phương thức xét tuyển khác của Nhà trường (như Xét học bạ THPT, Điểm thi ĐGNL ĐHQG-HCM, Tuyển thẳng) vẫn có hiệu lực trong đề án tuyển sinh chính thức nhưng nằm ngoài phạm vi mô hình dự báo của công cụ này.
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 8: CÂU HỎI THƯỜNG GẶP TUYỂN SINH FAQ (ACCORDION LÒ XO)          */}
      {/* ==================================================================== */}
      <FaqAccordion />

      {/* ==================================================================== */}
      {/* VÙNG 9: LUXURY CTA BANNER VỚI SHIMMER BUTTON                         */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#002855] via-[#0054A6] to-[#0072CE] p-8 sm:p-12 text-white shadow-2xl shadow-[#0054A6]/20 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 text-center md:text-left max-w-xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-white/20 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Tuyển Sinh Khóa 2026 - 2030</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Sẵn Sàng Trở Thành Tân Sinh Viên HUIT?
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Thực hiện bài khảo sát định hướng 3 phút để nhận bảng phân tích cơ hội trúng tuyển 39 chuyên ngành chính quy tại Trường Đại học Công Thương TP.HCM.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <Link href="/predict">
              <ShimmerButton
                shimmerColor="#38bdf8"
                background="rgba(255, 255, 255, 0.95)"
                className="text-[#0054A6] hover:text-[#003B73] font-black text-xs sm:text-sm px-8 py-4 shadow-xl"
              >
                <span>Làm Khảo Sát Chọn Ngành</span>
                <ArrowRight className="w-4 h-4 text-[#0054A6]" />
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
