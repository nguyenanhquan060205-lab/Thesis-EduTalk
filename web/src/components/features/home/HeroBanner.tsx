"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { KineticHeading } from "@/components/motion/KineticHeading";
import { ShimmerButton } from "@/components/motion/ShimmerButton";

const HERO_SLIDES = [
  {
    id: 0,
    tag: "TUYỂN SINH ĐẠI HỌC CÔNG THƯƠNG TP.HCM 2026",
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
    tag: "39 CHUYÊN NGÀNH ĐÀO TẠO CHÍNH QUY",
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
    tag: "44 NĂM PHÁT TRIỂN & ĐỔI MỚI SÁNG TẠO",
    titleLine1: "Môi Trường Năng Động &",
    titleLine2: "Học Bổng Toàn Phần HUIT",
    desc: "Không gian học tập hiện đại, khuôn viên hồ cá Koi và hệ sinh thái đào tạo ứng dụng hàng đầu tại Trường Đại học Công Thương TP.HCM.",
    primaryBtn: { text: "Trò Chuyện Với AI", href: "/chat" },
    secondaryBtn: { text: "Tin Tức Tuyển Sinh", href: "/news" },
    gradient: "from-indigo-300 via-blue-200 to-white",
    image: "/images/huit_banner_2_koi.png"
  }
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const shouldReduceMotion = useReducedMotion();

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
    <section className="relative w-full min-h-[560px] sm:min-h-[640px] bg-[#001833] overflow-hidden flex items-center">
      {/* Background Image with Multi-layered Overlay */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        </AnimatePresence>
        
        {/* Multi-layered cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#001833]/95 via-[#002855]/85 to-[#001833]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001833] via-transparent to-transparent opacity-95" />
        {/* Subtle Ambient Radial Light */}
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Arrows Left / Right (ẩn trên mobile để không che chữ) */}
      <button
        onClick={prevSlide}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white hidden sm:flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white hidden sm:flex items-center justify-center transition-all z-20 cursor-pointer backdrop-blur-md hover:scale-110 active:scale-95 shadow-lg"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Inner Content Centered to max-w-7xl Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 z-10 py-12 sm:py-20 text-left">
        <div className="max-w-3xl space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
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

              {/* 2 Action Buttons */}
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
  );
}
