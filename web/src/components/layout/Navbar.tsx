"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Target, 
  MessageSquare, 
  BookOpen, 
  Users, 
  User, 
  Settings, 
  History, 
  LogOut, 
  ChevronDown, 
  Newspaper, 
  LogIn,
  Menu,
  X,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href === "/predict" && !user) {
      e.preventDefault();
      router.push("/auth/login?redirect=/predict");
    }
  };

  const navItems = [
    { name: "Tổng quan", href: "/" },
    { name: "Tư vấn chọn ngành", href: "/predict", isHot: true },
    { name: "39 Ngành học", href: "/majors" },
    { name: "Trợ lý AI", href: "/chat" },
    { name: "Tin tức tuyển sinh", href: "/news" },
    { name: "Cộng đồng", href: "/community" },
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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/85 dark:bg-[#070E1E]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 transition-colors duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO THƯƠNG HIỆU HUIT */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0054A6] to-[#003B73] flex items-center justify-center text-white shadow-md shadow-[#0054A6]/25 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-[#0054A6]/35 transition-all">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                  HUIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0054A6] dark:from-sky-400 to-[#0084FF] dark:to-cyan-300">EduTalk</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-50 dark:bg-red-950/40 text-[#D71920] dark:text-red-400 border border-red-200 dark:border-red-800/60 leading-none shadow-xs">
                  2026
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-none mt-1 hidden xs:block">
                Đại học Công Thương TP.HCM
              </span>
            </div>
          </Link>

          {/* MENU ĐIỀU HƯỚNG CHÍNH (DESKTOP) */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`relative px-3.5 py-2 text-[13px] font-bold rounded-full transition-all flex items-center gap-1.5 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 active:scale-95 ${
                    isActive 
                      ? "text-[#0054A6] dark:text-sky-400 font-black bg-blue-50/80 dark:bg-sky-500/10 shadow-xs" 
                      : "text-slate-600 dark:text-slate-300 hover:text-[#0054A6] dark:hover:text-sky-300"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.isHot && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-red-500 text-white shadow-xs shadow-red-500/30 animate-pulse">
                      HOT
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavbarIndicatorClean"
                      className="absolute inset-0 rounded-full border border-blue-200 dark:border-sky-500/30 pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* KHU VỰC TÀI KHOẢN & TIỆN ÍCH (RIGHT ACTIONS) */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* NÚT CHUYỂN DARK / LIGHT THEME ANIMATION MƯỢT */}
            <ThemeToggle />

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 py-1.5 px-3 rounded-full bg-[#F5F8FA] dark:bg-[#0D1729] hover:bg-slate-100 dark:hover:bg-[#162540] transition border border-slate-200 dark:border-[#1E3454] shadow-xs cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0054A6] text-white flex items-center justify-center text-xs font-black shadow-xs overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 hidden sm:block max-w-[180px] lg:max-w-[240px] truncate">
                    {user.name || "Tài khoản"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-11 right-0 w-60 bg-white dark:bg-[#0D1729] border border-slate-200 dark:border-[#1E3454] rounded-2xl shadow-2xl overflow-hidden py-2 z-50 text-slate-700 dark:text-slate-200"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1E3454] bg-[#F8FAFC] dark:bg-[#111D2E]">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user.name || "Thí sinh HUIT"}</p>
                        <p className="text-[11px] text-[#0054A6] dark:text-sky-400 font-semibold truncate mt-0.5">{user.email}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-blue-50 dark:bg-sky-500/10 text-[#0054A6] dark:text-sky-400 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-sky-500/30">
                          {user.role === "admin" ? "Quản trị viên" : "Thí sinh xét tuyển"}
                        </span>
                      </div>
                      
                      <div className="py-1">
                        <Link 
                          href="/profile" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162540] hover:text-[#0054A6] dark:hover:text-sky-400 transition"
                        >
                          <User className="w-4 h-4 text-slate-400" /> Hồ sơ cá nhân
                        </Link>
                        <Link 
                          href="/history" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162540] hover:text-[#0054A6] dark:hover:text-sky-400 transition"
                        >
                          <History className="w-4 h-4 text-slate-400" /> Lịch sử tư vấn
                        </Link>
                        <Link 
                          href="/settings" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#162540] hover:text-[#0054A6] dark:hover:text-sky-400 transition"
                        >
                          <Settings className="w-4 h-4 text-slate-400" /> Cài đặt tài khoản
                        </Link>
                      </div>
                      
                      <div className="border-t border-slate-100 dark:border-[#1E3454] pt-1 mt-1">
                        <button 
                          onClick={() => { setIsDropdownOpen(false); logout(); }} 
                          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Đăng xuất
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#0054A6] hover:bg-[#0072CE] text-white transition shadow-sm shadow-[#0054A6]/20 cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070E1E] px-4 pt-3 pb-6 space-y-2"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    handleNavClick(e, item.href);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition ${
                    isActive 
                      ? "bg-[#0054A6]/10 dark:bg-sky-500/10 text-[#0054A6] dark:text-sky-400 font-black" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.isHot && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-50 dark:bg-red-950/40 text-[#D71920] dark:text-red-400 border border-red-200 dark:border-red-800/60">
                      HOT
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Mobile Theme Toggle Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <ThemeToggle showLabel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
