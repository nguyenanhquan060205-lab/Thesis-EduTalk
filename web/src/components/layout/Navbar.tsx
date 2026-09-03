"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function Navbar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();

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
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO THƯƠNG HIỆU HUIT */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#0054A6] flex items-center justify-center text-white shadow-md shadow-[#0054A6]/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900 leading-none">
                  HUIT <span className="text-[#0054A6]">EduTalk</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-50 text-[#D71920] border border-red-200 leading-none">
                  2026
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-1 hidden xs:block">
                Đại học Công Thương TP.HCM
              </span>
            </div>
          </Link>

          {/* MENU ĐIỀU HƯỚNG CHÍNH (DESKTOP) */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-2 text-[13px] font-bold transition-colors flex items-center gap-1.5 ${
                    isActive 
                      ? "text-[#0054A6] font-black" 
                      : "text-slate-600 hover:text-[#0054A6]"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.isHot && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-50 text-[#D71920] border border-red-200">
                      HOT
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavbarIndicatorClean"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0054A6] rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* KHU VỰC TÀI KHOẢN (RIGHT ACTIONS) */}
          <div className="flex items-center gap-3">
            
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 py-1.5 px-3 rounded-full bg-[#F5F8FA] hover:bg-slate-100 transition border border-slate-200 shadow-xs cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0054A6] text-white flex items-center justify-center text-xs font-black shadow-xs overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.name || "U").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-900 hidden sm:block max-w-[110px] truncate">
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
                      className="absolute top-11 right-0 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-2 z-50 text-slate-700"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 bg-[#F8FAFC]">
                        <p className="text-xs font-black text-slate-900 truncate">{user.name || "Thí sinh HUIT"}</p>
                        <p className="text-[11px] text-[#0054A6] font-semibold truncate mt-0.5">{user.email}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-blue-50 text-[#0054A6] text-[10px] font-black uppercase tracking-wider border border-blue-200">
                          {user.role === "admin" ? "Quản trị viên" : "Thí sinh xét tuyển"}
                        </span>
                      </div>
                      
                      <div className="py-1">
                        <Link 
                          href="/profile" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0054A6] transition"
                        >
                          <User className="w-4 h-4 text-slate-400" /> Hồ sơ cá nhân
                        </Link>
                        <Link 
                          href="/history" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0054A6] transition"
                        >
                          <History className="w-4 h-4 text-slate-400" /> Lịch sử tư vấn
                        </Link>
                        <Link 
                          href="/settings" 
                          onClick={() => setIsDropdownOpen(false)} 
                          className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#0054A6] transition"
                        >
                          <Settings className="w-4 h-4 text-slate-400" /> Cài đặt tài khoản
                        </Link>
                      </div>
                      
                      <div className="border-t border-slate-100 pt-1 mt-1">
                        <button 
                          onClick={() => { setIsDropdownOpen(false); logout(); }} 
                          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" /> Đăng xuất
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
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition"
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
            className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition ${
                    isActive 
                      ? "bg-[#0054A6]/10 text-[#0054A6] font-black" 
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.name}</span>
                  {item.isHot && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-50 text-[#D71920] border border-red-200">
                      HOT
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
