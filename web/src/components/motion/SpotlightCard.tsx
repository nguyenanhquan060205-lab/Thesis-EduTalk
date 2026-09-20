'use client';

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export const SpotlightCard = ({
  children,
  className,
  contentClassName,
  spotlightColor = "rgba(0, 84, 166, 0.12)",
}: {
  children: React.ReactNode;
  className?: string;
  /** Lớp cho khối bọc `children` bên trong.
   *
   * Cần vì `children` KHÔNG nằm trực tiếp trong thẻ ngoài — nó bị bọc thêm một
   * `div` để nằm trên lớp sáng. Hệ quả: đặt `flex justify-between` ở `className`
   * thì thẻ ngoài chỉ có đúng một con nên không đẩy được chân thẻ xuống đáy.
   * Thẻ nào muốn chân thẳng hàng thì truyền `flex h-full flex-col justify-between`
   * vào đây. */
  contentClassName?: string;
  spotlightColor?: string;
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    divRef.current.style.setProperty("--mouse-x", `${x}px`);
    divRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D1729] p-6 shadow-sm dark:shadow-none transition-all duration-300 hover:border-[#0054A6]/50 dark:hover:border-sky-500/50 hover:shadow-xl hover:shadow-[#0054A6]/5 dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.1)] hover:-translate-y-0.5",
        className
      )}
    >
      {/* Specular Radial Spotlight Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(550px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${spotlightColor}, transparent 45%)`,
        }}
      />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
};
