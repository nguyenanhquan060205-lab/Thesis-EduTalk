"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Brain, MessageSquare, History, User } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Trang chủ", href: "/", icon: Home },
    { name: "Thảo luận", href: "/chat", icon: MessageSquare },
    { name: "Tư vấn AI", href: "/predict", icon: Brain, isCenter: true },
    { name: "Lịch sử", href: "/history", icon: History },
    { name: "Cá nhân", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-[#1a1b26] border-t border-slate-200 dark:border-white/5 pb-safe z-50">
      <div className="flex items-center justify-around px-2 h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <div key={tab.href} className="relative -top-5">
                <Link href={tab.href}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 shadow-lg shadow-blue-500/30 flex items-center justify-center border-4 border-white dark:border-[#0f172a] transform transition-transform hover:scale-105 active:scale-95">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center w-16 gap-1 ${
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'animate-bounce-short' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
                  />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
      <style jsx global>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.3s ease-in-out;
        }
      `}</style>
    </nav>
  );
}
