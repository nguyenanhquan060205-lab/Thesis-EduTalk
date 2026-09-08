"use client";

import Link from "next/link";
import { 
  Target, 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  BarChart3, 
  Cpu, 
  MessageSquare, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  FlaskConical, 
  Utensils, 
  Scale, 
  Globe2, 
  ShieldCheck,
  Building2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { PredictService } from "@/services/predict";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { Marquee } from "@/components/motion/Marquee";
import { ShimmerButton } from "@/components/motion/ShimmerButton";
import { KineticHeading } from "@/components/motion/KineticHeading";
import { AiPipelineSection } from "@/components/features/home/AiPipelineSection";

// ============================================================================
// 1. DỮ LIỆU CÁC SLIDE HERO BANNER VỚI ẢNH THẬT TRƯỜNG HUIT (FULL BLEED)
// ============================================================================
const HERO_SLIDES = [
  {
    id: 0,
    tag: "✨ TUYỂN SINH ĐẠI HỌC CÔNG THƯƠNG TP.HCM 2026",
    titleLine1: "Định Hướng Ngành Học &",
    titleLine2: "Trúng Tuyển HUIT",
    desc: "Cổng tư vấn tuyển sinh thông minh phân tích điểm số 15 tổ hợp thi và 10 thiên hướng cá nhân, giúp bạn tự tin chọn đúng chuyên ngành sáng giá nhất tại HUIT.",
    primaryBtn: { text: "Làm Khảo Sát Ngay", href: "/predict" },
    secondaryBtn: { text: "Khám Phá 39 Ngành", href: "/majors" },
    gradient: "from-cyan-300 via-blue-200 to-white",
    image: "/images/huit_banner_1_gate.jpg"
  },
  {
    id: 1,
    tag: "🎓 39 CHUYÊN NGÀNH ĐÀO TẠO CHÍNH QUY",
    titleLine1: "Chào Đón Tân Sinh Viên &",
    titleLine2: "Làm Chủ Kỷ Nguyên Mới",
    desc: "Tra cứu 39 ngành đào tạo chính quy tại HUIT kèm tổ hợp xét tuyển và điểm chuẩn ba năm gần nhất.",
    primaryBtn: { text: "Xem Danh Mục Ngành", href: "/majors" },
    secondaryBtn: { text: "Tra Cứu Điểm Chuẩn", href: "/majors" },
    gradient: "from-teal-300 via-emerald-200 to-white",
    image: "/images/huit_banner_3_building.png"
  },
  {
    id: 2,
    tag: "🏛️ 44 NĂM PHÁT TRIỂN & ĐỔI MỚI SÁNG TẠO",
    titleLine1: "Môi Trường Năng Động &",
    titleLine2: "Học Bổng Toàn Phần HUIT",
    desc: "Không gian học tập hiện đại, khuôn viên hồ cá Koi và hệ sinh thái đào tạo ứng dụng hàng đầu tại Trường Đại học Công Thương TP.HCM.",
    primaryBtn: { text: "Trò Chuyện Với AI", href: "/chat" },
    secondaryBtn: { text: "Tin Tức Tuyển Sinh", href: "/news" },
    gradient: "from-indigo-300 via-purple-200 to-white",
    image: "/images/huit_banner_2_koi.png"
  }
];

// ============================================================================
// 2. 3 THẺ TÍNH NĂNG NỔI BẬT (HIGHLIGHT STRIP)
// ============================================================================
const HIGHLIGHT_STRIPS = [
  {
    id: "predict",
    title: "Tư Vấn Chọn Ngành AI",
    desc: "Đối soát 15 tổ hợp môn & 10 thiên hướng cá nhân để gợi ý Top 3 ngành phù hợp.",
    tag: "Khảo sát AI",
    icon: Target,
    href: "/predict",
    color: "bg-blue-50 text-[#0054A6] border-blue-200"
  },
  {
    id: "majors",
    title: "Dữ Liệu Chuẩn HUIT 2026",
    desc: "Tra cứu điểm chuẩn các năm & chỉ tiêu 39 chuyên ngành đào tạo chính quy.",
    tag: "Chính thống",
    icon: ShieldCheck,
    href: "/majors",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: "chat",
    title: "Trợ Lý Tuyển Sinh 24/7",
    desc: "Hỏi đáp tức thì về học phí, học bổng, phương thức xét tuyển & đời sống SV.",
    tag: "Trợ lý 24/7",
    icon: MessageSquare,
    href: "/chat",
    color: "bg-purple-50 text-purple-700 border-purple-200"
  }
];

const FACULTY_ICONS: Record<number, LucideIcon> = {
  0: Cpu, 1: BarChart3, 2: Utensils, 3: Layers, 4: FlaskConical, 5: Scale, 6: Globe2,
};

interface FacultyCard {
  id: number;
  name: string;
  icon: LucideIcon;
  count: number;
  highlight: string;
  scoreAvg: string | null;
}

const ADMISSION_METHODS = [
  { code: "PT 1", name: "Xét điểm thi tốt nghiệp THPT 2026", desc: "Sử dụng kết quả kỳ thi tốt nghiệp THPT 2026 theo các tổ hợp môn quy định của từng ngành." },
  { code: "PT 2", name: "Xét học bạ THPT", desc: "Xét tổng điểm trung bình cả năm lớp 10, 11 và HK1 lớp 12 theo tổ hợp 3 môn từ 20.0 điểm trở lên." },
  { code: "PT 3", name: "Xét điểm thi ĐGNL ĐHQG TP.HCM", desc: "Dành cho thí sinh tham gia kỳ thi Đánh giá năng lực do ĐHQG TP.HCM tổ chức năm 2026." },
  { code: "PT 4", name: "Xét tuyển thẳng & Ưu tiên xét tuyển", desc: "Thực hiện theo quy chế tuyển sinh của Bộ GD&ĐT và đề án tuyển sinh riêng của nhà trường." },
];

const MARQUEE_ITEMS = [
  "🏛️ 44 Năm Truyền Thống Phát Triển & Khởi Nghiệp Đổi Mới",
  "🎓 39 Chuyên Ngành Đào Tạo Chuẩn Kiểm Định Quốc Tế (AUN-QA, MOET)",
  "📊 15 Tổ Hợp Môn Xét Tuyển Đa Dạng & Linh Hoạt",
  "💼 Hơn 500+ Doanh Nghiệp Ký Kết Hợp Tác Tuyển Dụng",
  "🤖 Mô Hình Trí Tuệ Nhân Tạo XGBoost 2 Tầng Phân Tích Khả Năng Trúng Tuyển",
  "💡 Giải Thích Minh Bạch XAI SHAP Hỗ Trợ Ra Quyết Định Đúng Đắn",
  "💬 Trợ Lý Tư Vấn Tuyển Sinh AI EduTalk Trực Tuyến 24/7",
];

const FAQS = [
  {
    q: "Hệ thống EduTalk hỗ trợ thí sinh chọn ngành như thế nào?",
    a: "EduTalk phân tích tổng hợp điểm số 3 môn xét tuyển của bạn, kết hợp với mục tiêu phát triển dài hạn và 10 chỉ số đánh giá sở thích cá nhân để đưa ra bảng đề xuất Top 3 ngành học sáng giá nhất kèm đánh giá khả năng trúng tuyển thực tế tại HUIT."
  },
  {
    q: "Điểm chuẩn và tổ hợp xét tuyển trên EduTalk lấy từ đâu?",
    a: "Toàn bộ lấy từ đề án tuyển sinh chính thức của HUIT các năm 2024, 2025 và 2026, áp dụng cho phương thức xét điểm thi tốt nghiệp THPT. Trường còn xét bằng học bạ và đánh giá năng lực — các phương thức đó có điểm chuẩn riêng, bạn xem tại tuyensinh.huit.edu.vn."
  },
  {
    q: "Làm thế nào để nộp hồ sơ xét tuyển học bạ vào HUIT?",
    a: "Thí sinh có thể đăng ký trực tuyến tại cổng thông tin tuyển sinh chính thức https://tuyensinh.huit.edu.vn hoặc nộp hồ sơ trực tiếp tại Trung tâm Tuyển sinh & Truyền thông - 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP.HCM."
  }
];

export default function Home() {
  const [faculties, setFaculties] = useState<FacultyCard[]>([]);

  useEffect(() => {
    PredictService.catalog()
      .then((d) =>
        setFaculties(
          d.fields.map((f) => {
            const diem = f.majors
              .map((m) => m.cutoffs?.["2026"])
              .filter((v): v is number => typeof v === "number");
            return {
              id: f.id,
              name: f.name,
              icon: FACULTY_ICONS[f.id] ?? Layers,
              count: f.majors.length,
              highlight: f.majors.map((m) => m.name).slice(0, 4).join(", "),
              scoreAvg: diem.length
                ? `${Math.min(...diem).toFixed(1)} - ${Math.max(...diem).toFixed(1)}đ`
                : null,
            };
          })
        )
      )
      .catch(() => setFaculties([]));
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="flex flex-col w-full space-y-20 pb-20">
      
      {/* ==================================================================== */}
      {/* 1. HERO SLIDER BANNER WITH CINEMATIC LIGHTING & KINETIC TEXT */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[560px] sm:min-h-[640px] bg-[#0A192F] overflow-hidden flex items-center">
        
        {/* Background Image with Cinematic Overlay */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          </AnimatePresence>
          
          {/* Multi-layered cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#001D3D]/92 via-[#002855]/75 to-[#001D3D]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001D3D] via-transparent to-transparent opacity-90" />
          {/* Subtle Ambient Radial Light */}
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Navigation Arrows Left / Right */}
        <button
          onClick={prevSlide}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Inner Content Centered to max-w-7xl Container */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 z-10 py-20 text-left">
          <div className="max-w-3xl space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {/* Tag Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/30 text-xs font-black tracking-widest text-cyan-300 uppercase shadow-lg shadow-cyan-500/10">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{slide.tag}</span>
                </div>

                {/* Big Bold Headline with Kinetic Text */}
                <div className="space-y-3">
                  <KineticHeading
                    text={`${slide.titleLine1} ${slide.titleLine2}`}
                    highlightWords={[slide.titleLine2]}
                    highlightGradient={slide.gradient}
                  />
                  <p className="text-slate-200 text-sm sm:text-base font-medium max-w-2xl leading-relaxed pt-2 drop-shadow-sm">
                    {slide.desc}
                  </p>
                </div>

                {/* 2 Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-4">
                  <Link href={slide.primaryBtn.href}>
                    <ShimmerButton
                      shimmerColor="#38bdf8"
                      className="text-xs sm:text-sm"
                    >
                      <span>{slide.primaryBtn.text}</span>
                      <ArrowRight className="w-4 h-4" />
                    </ShimmerButton>
                  </Link>

                  <Link
                    href={slide.secondaryBtn.href}
                    className="px-8 py-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-all border border-white/30 backdrop-blur-md flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
                  >
                    <span>{slide.secondaryBtn.text}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                currentSlide === idx 
                  ? "w-10 bg-cyan-400 shadow-[0_0_12px_#22d3ee]" 
                  : "w-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </section>

      {/* ==================================================================== */}
      {/* 2. INFINITE MARQUEE STRIP (CAMPUS & TECH HIGHLIGHTS) */}
      {/* ==================================================================== */}
      <div className="w-full bg-slate-100/70 border-y border-slate-200/80 py-3 overflow-hidden">
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
      {/* 3. 3 THẺ TÍNH NĂNG NỔI BẬT VỚI SPOTLIGHT MOUSE TRACKING */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HIGHLIGHT_STRIPS.map((strip) => {
            const Icon = strip.icon;
            return (
              <Link key={strip.id} href={strip.href} className="group block">
                <SpotlightCard className="h-full flex flex-col justify-between p-7 hover:border-[#0054A6]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${strip.color} shadow-sm group-hover:scale-110 transition-transform`}>
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
      {/* 4. [NEW] INTERACTIVE AI PIPELINE & XAI ARCHITECTURE (ANIMATED BEAMS) */}
      {/* ==================================================================== */}
      <AiPipelineSection />

      {/* ==================================================================== */}
      {/* 5. 7 NHÓM NGÀNH TRỌNG ĐIỂM TẠI HUIT VỚI SPOTLIGHT CARDS */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
              Danh Mục Đào Tạo Chính Quy
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              7 Nhóm Ngành Trọng Điểm Tại HUIT
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Chương trình đào tạo thực tiễn, cam kết đầu ra theo nhu cầu thị trường doanh nghiệp:
            </p>
          </div>

          <Link
            href="/majors"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#0054A6] hover:underline shrink-0 group"
          >
            <span>Xem chi tiết 39 ngành học</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {faculties.map((fac) => {
            const Icon = fac.icon;
            return (
              <Link
                key={fac.id}
                href={`/majors?faculty=${encodeURIComponent(fac.name)}`}
                className="group block"
              >
                <SpotlightCard className="h-full flex flex-col justify-between p-6 hover:border-[#0054A6]/60">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 group-hover:bg-[#0054A6] text-[#0054A6] group-hover:text-white flex items-center justify-center font-black transition-all shadow-xs group-hover:scale-105">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200">
                        {fac.count} ngành
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition-colors leading-snug">
                      {fac.name}
                    </h3>

                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-2">
                      {fac.highlight}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-bold">Điểm chuẩn 2026:</span>
                    <span className="font-black text-[#0054A6] bg-blue-50/70 px-2 py-0.5 rounded">
                      {fac.scoreAvg ?? "Đang cập nhật"}
                    </span>
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. 4 PHƯƠNG THỨC XÉT TUYỂN CHÍNH THỨC 2026 */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 text-left">
        <div className="border-b border-slate-200 pb-5">
          <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
            Đề Án Tuyển Sinh 2026
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            4 Phương Thức Xét Tuyển Chính Thức
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Đăng ký song song nhiều phương thức để nhân đôi cơ hội trúng tuyển vào HUIT:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ADMISSION_METHODS.map((m) => (
            <SpotlightCard
              key={m.code}
              spotlightColor="rgba(0, 180, 216, 0.1)"
              className="p-6 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <span className="px-3 py-1 rounded-md bg-gradient-to-r from-[#0054A6] to-[#0072CE] text-white text-[10px] font-black shadow-xs">
                  {m.code}
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {m.desc}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7. CÂU HỎI THƯỜNG GẶP FAQ WITH ANIMATED PRESENCE */}
      {/* ==================================================================== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 text-left">
        <div className="text-center space-y-2">
          <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
            Hỗ Trợ Tuyển Sinh
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Câu Hỏi Thường Gặp Về Tuyển Sinh HUIT
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-slate-900 hover:text-[#0054A6] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#0054A6]" : ""}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 8. LUXURY CTA BANNER WITH SHIMMER BUTTON */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#002855] via-[#0054A6] to-[#0072CE] p-8 sm:p-12 text-white shadow-2xl shadow-[#0054A6]/30 flex flex-col md:flex-row items-center justify-between gap-8">
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
