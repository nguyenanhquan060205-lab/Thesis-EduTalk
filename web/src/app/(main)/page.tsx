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
  BookOpen, 
  FileText, 
  Users, 
  History, 
  MessageSquare, 
  BadgeCheck, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  FlaskConical, 
  Utensils, 
  Scale, 
  Globe2, 
  Award,
  Phone,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { PredictService } from "@/services/predict";

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
    image: "/images/huit_official_2.jpg"
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
    image: "/images/huit_official_3.jpg"
  },
  {
    id: 2,
    tag: "🏛️ 44 NĂM PHÁT TRIỂN & ĐỔI MỚI SÁNG TẠO",
    titleLine1: "Hỗ Trợ Tuyển Sinh 24/7 &",
    titleLine2: "Học Bổng Toàn Phần HUIT",
    desc: "Tin tuyển sinh lấy trực tiếp từ cổng ts.huit.edu.vn, kèm trợ lý AI giải đáp thắc mắc cho học sinh và phụ huynh.",
    primaryBtn: { text: "Trò Chuyện Với AI", href: "/chat" },
    secondaryBtn: { text: "Tin Tức Tuyển Sinh", href: "/news" },
    gradient: "from-indigo-300 via-purple-200 to-white",
    image: "/images/huit_official_1.jpg"
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

// ============================================================================
// 3. 7 KHỐI NGÀNH ĐÀO TẠO HUIT
// ============================================================================
// Chỉ giữ icon cho từng nhóm ngành. Số ngành, khoảng điểm chuẩn và danh sách ngành
// tiêu biểu đều lấy từ /api/v1/predict/catalog — cùng nguồn với mô hình dự đoán.
// Bản gõ tay trước đây sai khoảng điểm chuẩn của CẢ 7 nhóm (CNTT ghi 22.5-24.5đ
// trong khi điểm chuẩn 2026 thật chỉ 19.0-20.5đ) và kể tên 3 ngành trường không đào tạo.
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


// 4 Phương thức tuyển sinh HUIT
const ADMISSION_METHODS = [
  { code: "PT 1", name: "Xét điểm thi tốt nghiệp THPT 2026", desc: "Sử dụng kết quả kỳ thi tốt nghiệp THPT 2026 theo các tổ hợp môn quy định của từng ngành." },
  { code: "PT 2", name: "Xét học bạ THPT", desc: "Xét tổng điểm trung bình cả năm lớp 10, 11 và HK1 lớp 12 theo tổ hợp 3 môn từ 20.0 điểm trở lên." },
  { code: "PT 3", name: "Xét điểm thi ĐGNL ĐHQG TP.HCM", desc: "Dành cho thí sinh tham gia kỳ thi Đánh giá năng lực do ĐHQG TP.HCM tổ chức năm 2026." },
  { code: "PT 4", name: "Xét tuyển thẳng & Ưu tiên xét tuyển", desc: "Thực hiện theo quy chế tuyển sinh của Bộ GD&ĐT và đề án tuyển sinh riêng của nhà trường." },
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

  // Số ngành + khoảng điểm chuẩn 2026 tính thẳng từ dữ liệu tuyển sinh thật
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

  // Auto slide mỗi 6 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
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
    <div className="flex flex-col w-full space-y-16 pb-20">
      
      {/* ==================================================================== */}
      {/* 1. SECTION 1: FULL-WIDTH FULL-BLEED HERO SLIDER BANNER (TRÀN VIỀN 100%) */}
      {/* ==================================================================== */}
      <section className="relative w-full min-h-[520px] sm:min-h-[620px] bg-[#0A192F] overflow-hidden flex items-center">
        
        {/* Real Background Image with Cinematic Overlay */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          </AnimatePresence>
          
          {/* Multi-layered cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#002244] via-[#002244]/80 to-[#002244]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#002244]/90 via-transparent to-[#002244]/40" />
        </div>

        {/* Navigation Arrows Left / Right */}
        <button
          onClick={prevSlide}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-105"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-105"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Inner Content Centered to max-w-7xl Container */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 z-10 py-16 text-left">
          <div className="max-w-3xl space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Tag Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-black tracking-widest text-cyan-300 uppercase shadow-lg">
                  <span>{slide.tag}</span>
                </div>

                {/* Big Bold Headline */}
                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] drop-shadow-md">
                    {slide.titleLine1} <br />
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradient}`}>
                      {slide.titleLine2}
                    </span>
                  </h1>
                  <p className="text-slate-200 text-sm sm:text-base font-medium max-w-2xl leading-relaxed pt-2 drop-shadow-sm">
                    {slide.desc}
                  </p>
                </div>

                {/* 2 Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href={slide.primaryBtn.href}
                    className="px-8 py-4 rounded-full bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs sm:text-sm font-black transition-all shadow-xl shadow-[#0054A6]/50 flex items-center gap-2 cursor-pointer group"
                  >
                    <span>{slide.primaryBtn.text}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href={slide.secondaryBtn.href}
                    className="px-8 py-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition border border-white/30 backdrop-blur-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>{slide.secondaryBtn.text}</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slide Indicators / Pagination Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === idx 
                  ? "w-9 bg-cyan-400 shadow-[0_0_12px_#22d3ee]" 
                  : "w-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </section>

      {/* ==================================================================== */}
      {/* 2. SECTION 2: 3 THẺ TÍNH NĂNG NỔI BẬT (HIGHLIGHT STRIP) */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HIGHLIGHT_STRIPS.map((strip) => {
            const Icon = strip.icon;
            return (
              <Link
                key={strip.id}
                href={strip.href}
                className="p-6 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-[#0054A6] transition-all duration-300 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${strip.color} transition-transform group-hover:scale-105 shadow-xs`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {strip.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#0054A6] transition-colors leading-snug">
                      {strip.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5">
                      {strip.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-[#0054A6]">
                  <span>Khám phá ngay</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. SECTION 3: 7 NHÓM NGÀNH TRỌNG ĐIỂM TẠI HUIT */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
              Danh Mục Đào Tạo Chính Quy
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              7 Nhóm Ngành Trọng Điểm Tại HUIT
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
              Chương trình đào tạo gắn liền thực tiễn với nhu cầu tuyển dụng của doanh nghiệp:
            </p>
          </div>

          <Link
            href="/majors"
            className="inline-flex items-center gap-1 text-xs font-black text-[#0054A6] hover:underline shrink-0"
          >
            <span>Xem đầy đủ 39 ngành</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {faculties.map((fac) => {
            const Icon = fac.icon;
            return (
              <Link
                key={fac.id}
                href={`/majors?faculty=${encodeURIComponent(fac.name)}`}
                className="p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#0054A6] transition-all flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F8FA] group-hover:bg-[#0054A6] text-[#0054A6] group-hover:text-white flex items-center justify-center font-black transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200">
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

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold">Điểm chuẩn 2026:</span>
                  <span className="font-black text-[#0054A6]">
                    {fac.scoreAvg ?? "Chưa có"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. SECTION 4: 4 PHƯƠNG THỨC XÉT TUYỂN CHÍNH THỨC 2026 */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 text-left">
        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
            Đề Án Tuyển Sinh 2026
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            4 Phương Thức Xét Tuyển Chính Thức
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
            Thí sinh có thể đăng ký đồng thời nhiều phương thức để tăng cơ hội trúng tuyển vào HUIT:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ADMISSION_METHODS.map((m) => (
            <div
              key={m.code}
              className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2.5 flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#0054A6] text-white text-[10px] font-black">
                  {m.code}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                  {m.name}
                </h3>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  {m.desc}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. SECTION 5: CÂU HỎI THƯỜNG GẶP FAQ */}
      {/* ==================================================================== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 text-left">
        <div className="text-center space-y-1">
          <span className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
            Hỗ Trợ Tuyển Sinh
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Câu Hỏi Thường Gặp Về Tuyển Sinh HUIT
          </h2>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-slate-900 hover:text-[#0054A6] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-[#0054A6]" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. SECTION 6: BANNER KÊU GỌI HÀNH ĐỘNG (CTA BANNER) */}
      {/* ==================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-gradient-to-r from-[#003B73] via-[#0054A6] to-[#0072CE] text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-[#0054A6]/30">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Sẵn Sàng Trở Thành Tân Sinh Viên HUIT 2026?
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Bắt đầu bài khảo sát năng lực 3 phút ngay bây giờ để nhận bản phân tích định hướng chuyên ngành và cơ hội trúng tuyển thực tế tại HUIT.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/predict"
              className="px-8 py-4 rounded-full bg-white hover:bg-slate-100 text-[#0054A6] text-xs font-black transition shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Làm Khảo Sát Chọn Ngành</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
