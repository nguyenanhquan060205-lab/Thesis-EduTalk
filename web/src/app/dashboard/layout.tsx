"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Cpu,
  History,
  Users,
  LifeBuoy,
  BarChart3,
  MessageSquare,
  LayoutDashboard,
  Newspaper,
  Settings,
  LogOut,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/news", label: "Duyệt Tin Tức", icon: Newspaper, badge: "Mới" },
  { href: "/dashboard/analytics", label: "Thống Kê", icon: BarChart3 },
  { href: "/dashboard/posts", label: "Duyệt Bài Cộng Đồng", icon: MessageSquare },
  { href: "/dashboard/model", label: "Hiệu Suất Mô Hình", icon: Cpu },
  { href: "/dashboard/consultations", label: "Lịch Sử Tư Vấn", icon: History },
  { href: "/dashboard/users", label: "Người Dùng", icon: Users },
  { href: "/dashboard/support", label: "Hỗ Trợ & Thông Báo", icon: LifeBuoy },
  { href: "#", label: "Cài đặt", icon: Settings },
];

// Khai báo ngoài component để tham chiếu giữ nguyên qua mỗi lần render
const dangKyNapPhien = (goiLai: () => void) =>
  useAuthStore.persist.onFinishHydration(goiLai);
const docTrangThaiNap = () => useAuthStore.persist.hasHydrated();
const docTrangThaiNapTrenServer = () => false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Đóng menu mobile khi chuyển route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const daNapPhien = useSyncExternalStore(
    dangKyNapPhien,
    docTrangThaiNap,
    docTrangThaiNapTrenServer
  );

  const laAdmin = user?.role === "admin";

  // Kiểm tra tức thì từ localStorage ngay lần chạy đầu ở client để đá hướng nhanh nhất có thể:
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("edutalk-auth-storage");
        if (!raw) {
          router.replace("/auth/login");
          return;
        }
        const u = JSON.parse(raw)?.state?.user;
        if (!u) {
          router.replace("/auth/login");
          return;
        }
        if (u.role !== "admin") {
          router.replace("/");
          return;
        }
      } catch {
        router.replace("/auth/login");
        return;
      }
    }

    if (!daNapPhien) return;

    if (!user) {
      router.replace("/auth/login");
    } else if (user.role !== "admin") {
      router.replace("/");
    }
  }, [daNapPhien, user, router]);

  // Trong khi chờ nạp phiên hoặc đang điều hướng:
  // Trả về container trắng/xám đồng nhất 100% với màu nền trang chủ (#F8FAFC).
  // Tuyệt đối không màn hình đen, không spinner làm user phát hiện ra.
  if (!daNapPhien || !laAdmin) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden" data-lenis-prevent>
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between z-30 shrink-0 shadow-xs">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0054A6] to-[#003B73] flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-slate-900 tracking-tight leading-none">
              HUIT <span className="text-[#0054A6]">Admin</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-blue-50 text-[#0054A6] border border-blue-200 leading-none">
              2026
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-72 max-w-[80vw] bg-white z-50 flex flex-col shadow-2xl border-r border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0054A6] to-[#003B73] flex items-center justify-center text-white shadow-xs">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-black text-sm text-slate-900">
                    HUIT <span className="text-[#0054A6]">Admin</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href) && item.href !== "#";

                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? "text-[#0054A6] bg-blue-50/80 border border-blue-200/70 shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-[#0054A6]" : "text-slate-400"} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto bg-red-50 text-[#D71920] border border-red-200 text-[9px] font-black px-2 py-0.2 rounded-full shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-slate-100 bg-[#F8FAFC]">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0054A6] hover:bg-white transition-all border border-transparent hover:border-slate-200/80"
                >
                  <LogOut size={18} className="text-slate-400" />
                  <span>Về trang chủ EduTalk</span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Sáng & Chuyên Nghiệp */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shadow-xs shrink-0">
        <div className="p-5 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0054A6] to-[#003B73] flex items-center justify-center text-white shadow-md shadow-[#0054A6]/20 group-hover:scale-105 transition-all">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-slate-900 tracking-tight leading-none">
                  HUIT <span className="text-[#0054A6]">Admin</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-blue-50 text-[#0054A6] border border-blue-200 leading-none">
                  2026
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-1.5">
                Hệ thống quản trị
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // "exact" match cho /dashboard, prefix match cho sub-routes
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "#";

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "text-[#0054A6] bg-blue-50/80 border border-blue-200/70 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon size={18} className={isActive ? "text-[#0054A6]" : "text-slate-400"} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-50 text-[#D71920] border border-red-200 text-[9px] font-black px-2 py-0.2 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 bg-[#F8FAFC]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-[#0054A6] hover:bg-white transition-all border border-transparent hover:border-slate-200/80 hover:shadow-xs"
          >
            <LogOut size={18} className="text-slate-400" />
            <span>Về trang chủ EduTalk</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain bg-[#F8FAFC] min-w-0" data-lenis-prevent>
        {children}
      </main>
    </div>
  );
}
