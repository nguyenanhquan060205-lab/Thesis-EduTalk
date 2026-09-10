'use client';

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const KineticHeading = ({
  text,
  className,
  highlightWords = [],
  highlightGradient = "from-cyan-300 via-blue-200 to-white",
  delay = 0,
}: {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightGradient?: string;
  delay?: number;
}) => {
  const words = text.split(" ");

  return (
    <h1 className={cn("flex flex-wrap items-center gap-x-3 overflow-hidden text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08]", className)}>
      {words.map((word, index) => {
        const isHighlighted = highlightWords.includes(word);
        return (
          <span key={index} className="inline-block overflow-hidden pb-1">
            <motion.span
              initial={{ y: "110%", opacity: 0, rotateZ: 2 }}
              animate={{ y: "0%", opacity: 1, rotateZ: 0 }}
              transition={{
                duration: 0.6,
                delay: delay + index * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cn(
                "inline-block origin-bottom-left",
                isHighlighted && `text-transparent bg-clip-text bg-gradient-to-r ${highlightGradient}`
              )}
            >
              {word}
            </motion.span>
          </span>
        );
      })}
    </h1>
  );
};
