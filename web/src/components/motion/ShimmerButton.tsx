'use client';

import React from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerDuration?: string;
  borderRadius?: string;
  background?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#38bdf8",
      shimmerDuration = "3s",
      borderRadius = "9999px",
      background = "linear-gradient(135deg, #0054A6 0%, #003B73 100%)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        style={{
          "--shimmer-color": shimmerColor,
          "--speed": shimmerDuration,
          "--radius": borderRadius,
          "--bg": background,
        } as React.CSSProperties}
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/20 px-8 py-4 text-xs sm:text-sm font-black text-white [background:var(--bg)] shadow-lg shadow-[#0054A6]/25",
          "transform-gpu transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.97] hover:shadow-xl hover:shadow-[#0054A6]/40",
          className
        )}
        {...props}
      >
        {/* Rotating spark */}
        <div className="absolute inset-0 -z-30 overflow-hidden blur-[3px]">
          <div
            className="absolute -inset-[100%] animate-[spin_4s_linear_infinite]"
            style={{
              background: `conic-gradient(from 0deg, transparent 0 340deg, var(--shimmer-color) 360deg)`,
            }}
          />
        </div>
        {/* Specular inset highlight */}
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);
ShimmerButton.displayName = "ShimmerButton";
