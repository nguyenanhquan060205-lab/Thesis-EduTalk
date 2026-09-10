"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";

gsap.registerPlugin(ScrollTrigger);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    // Tôn trọng người dùng tắt hiệu ứng chuyển động
    if (shouldReduceMotion) return;

    // Không kích hoạt Lenis trên phân hệ /dashboard để tránh chặn sự kiện cuộn chuột
    // của bố cục ứng dụng (sidebar cố định + main overflow-y-auto).
    if (pathname?.startsWith("/dashboard")) {
      return;
    }

    // Cấu hình phản hồi tức thì, loại bỏ hoàn toàn độ trễ trôi lơ lửng:
    const lenis = new Lenis({
      lerp: 0.18, // Bám tay ngay tức khắc theo từng frame
      wheelMultiplier: 1.0,
      syncTouch: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [shouldReduceMotion, pathname]);

  return <>{children}</>;
}
