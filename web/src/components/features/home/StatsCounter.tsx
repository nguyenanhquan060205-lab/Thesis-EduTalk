"use client";

import React, { useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "framer-motion";
import { Award, GraduationCap, Layers } from "lucide-react";

const STATS = [
  {
    id: "history",
    label: "Truyền Thống Đào Tạo",
    target: 44,
    suffix: " Năm",
    icon: Award,
  },
  {
    id: "majors",
    label: "Chuyên Ngành Chính Quy",
    target: 39,
    suffix: " Ngành",
    icon: GraduationCap,
  },
  {
    id: "blocks",
    label: "Môn Thi Xét Tuyển",
    target: 15,
    suffix: " Tổ hợp",
    icon: Layers,
  },
];

export function StatsCounter() {
  const shouldReduceMotion = useReducedMotion();
  const [inView, setInView] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      <motion.div
        onViewportEnter={() => setInView(true)}
        viewport={{ once: true, margin: "-50px" }}
        className="bg-white dark:bg-[#0D1729] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-none -mt-12 relative z-20 transition-colors duration-300"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`flex flex-col items-center text-center p-3 transition-transform hover:scale-[1.03] ${
                  idx > 0 ? "pt-5 sm:pt-3" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-[#0054A6] dark:text-sky-400 flex items-center justify-center mb-3 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center tabular-nums">
                  <NumberFlow value={inView || shouldReduceMotion ? stat.target : 0} />
                  <span className="text-[#0054A6] dark:text-sky-400 ml-1">{stat.suffix}</span>
                </div>

                <span className="text-xs font-black text-slate-700 dark:text-slate-300 mt-1">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
