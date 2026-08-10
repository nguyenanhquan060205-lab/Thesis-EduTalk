"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, LayoutDashboard, Target, MessageSquare, BookOpen, Users, User, Settings, History, LogOut, ChevronDown, Newspaper, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function Navbar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();

  const navItems = [
    { name: "Tổng quan", href: "/", icon: LayoutDashboard },
    { name: "Tin tức", href: "/news", icon: Newspaper },
    { name: "Tư vấn AI", href: "/predict", icon: Target },
    { name: "Ngành học", href: "/majors", icon: BookOpen },
    { name: "Cộng đồng", href: "/community", icon: Users },
    { name: "Trợ lý RAG", href: "/chat", icon: MessageSquare },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 text-xl font-black text-[#2563EB]">
          <div className="flex items-center gap-2">
            <Brain className="w-7 h-7 text-[#2563EB]" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none mb-0.5">Đại học Công Thương TP.HCM</span>
              <span className="leading-none tracking-tight">HUIT <span className="text-blue-700">EduTalk</span></span>
            </div>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? "text-[#2563EB]" : "text-slate-600 hover:text-[#2563EB] hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 bg-[#2563EB]/5 rounded-xl border border-[#2563EB]/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <item.icon className="w-4 h-4" /> {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Auth / Profile */}
        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          {user ? (
            <>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition border border-slate-200 shadow-sm outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-[#2563EB] overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span className="text-sm font-bold text-slate-700 hidden sm:block truncate max-w-[120px]">
                  {user.name || "Người dùng"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-14 right-0 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 mb-2 bg-[#2563EB]/5">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name || "Người dùng"}</p>
                      <p className="text-xs text-blue-700 font-medium truncate">{user.role || "Sinh viên"}</p>
                    </div>
                    
                    <Link href="/profile" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#2563EB]/5 hover:text-[#2563EB] transition">
                      <User className="w-4 h-4" /> Hồ sơ cá nhân
                    </Link>
                    <Link href="/history" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#2563EB]/5 hover:text-[#2563EB] transition">
                      <History className="w-4 h-4" /> Lịch sử dự đoán
                    </Link>
                    <Link href="/settings" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-[#2563EB]/5 hover:text-[#2563EB] transition">
                      <Settings className="w-4 h-4" /> Cài đặt
                    </Link>
                    
                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button onClick={() => { setIsDropdownOpen(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                        <LogOut className="w-4 h-4" /> Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link 
              href="/auth/login"
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition shadow-sm font-bold text-sm"
            >
              <LogIn className="w-4 h-4" /> Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
