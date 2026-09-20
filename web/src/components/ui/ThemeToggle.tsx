"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 animate-pulse shrink-0 ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
          isDark
            ? "bg-[#0D1729] text-sky-300 border-[#1E3454] hover:bg-[#132238]"
            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
        } ${className}`}
        aria-label="Đổi giao diện sáng tối"
      >
        <span className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-sky-400" />
          <span className="text-slate-800 dark:text-slate-200">Giao diện hệ thống</span>
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#070E1E] border border-slate-200 dark:border-slate-800 text-[11px] font-black shadow-xs">
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
              <span className="text-sky-400">Chế độ tối</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span className="text-amber-600">Chế độ sáng</span>
            </>
          )}
        </div>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className={`group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center
        transition-colors duration-300 cursor-pointer overflow-hidden shrink-0 select-none
        ${
          isDark
            ? "bg-[#0D1729]/90 hover:bg-[#132238] text-sky-300 border border-[#1E3454] hover:border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.12)]"
            : "bg-slate-100/90 hover:bg-amber-50/70 text-amber-500 border border-slate-200/90 hover:border-amber-300/70 shadow-xs hover:shadow-amber-500/10"
        }
        ${className}
      `}
    >
      {/* Dynamic Ambient Backlight Glow */}
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-glow"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 to-indigo-500/10 rounded-xl blur-xs pointer-events-none"
          />
        ) : (
          <motion.div
            key="light-glow"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 to-orange-400/15 rounded-xl blur-xs pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Morphing Sun / Moon Icons */}
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.35, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="relative flex items-center justify-center"
          >
            <Moon className="w-[18px] h-[18px] text-sky-400 fill-sky-400/25 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            {/* Ambient twinkling cosmic stars */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.9] }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-sky-200 shadow-[0_0_6px_#38bdf8] pointer-events-none"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1, 0.8], opacity: [0, 0.9, 0.7] }}
              transition={{ delay: 0.18, duration: 0.3 }}
              className="absolute bottom-0 -left-1 w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_4px_#38bdf8] pointer-events-none"
            />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.35, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="relative flex items-center justify-center"
          >
            <Sun className="w-[18px] h-[18px] text-amber-500 fill-amber-400/25 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            {/* Ambient sun rays flare ring */}
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.15, 1], opacity: [0.3, 0.7, 0.4] }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 rounded-full border border-amber-300/40 pointer-events-none"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
