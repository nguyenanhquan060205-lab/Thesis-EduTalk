'use client';

import { motion, type MotionStyle, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 70,
  delay = 0,
  duration = 7,
  colorFrom = "#0054A6",
  colorTo = "#00B4D8",
  style,
  borderWidth = 1.5,
}: BorderBeamProps) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ "--border-beam-width": `${borderWidth}px` } as React.CSSProperties}
    >
      <div
        className={cn(
          "absolute aspect-square animate-border-beam bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent will-change-[offset-distance]",
          className
        )}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          animationDuration: `${duration}s`,
          animationDelay: `-${delay}s`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          ...style,
        } as React.CSSProperties}
      />
    </div>
  );
};
