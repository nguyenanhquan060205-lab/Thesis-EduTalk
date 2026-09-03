"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cpu, History, Users, LifeBuoy, BarChart3, MessageSquare, LayoutDashboard, Newspaper, Settings, LogOut, Loader2, ShieldAlert } from "lucide-react";
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Phiên đăng nhập nằm trong localStorage nên lần render đầu chưa có. Nếu chặn
  // ngay lúc đó thì chính admin cũng bị đá ra, nên phải đợi persist nạp xong.
  const [daNapPhien, setDaNapPhien] = useState(
    () => typeof window !== "undefined" && useAuthStore.persist.hasHydrated()
  );
  useEffect(
    () => useAuthStore.persist.onFinishHydration(() => setDaNapPhien(true)),
    []
  );

  const laAdmin = user?.role === "admin";

  useEffect(() => {
    if (daNapPhien && !laAdmin) router.replace("/");
  }, [daNapPhien, laAdmin, router]);

  if (!daNapPhien) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F1014] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Chặn ở đây chỉ để đỡ rối mắt: người không phải admin trước đây vẫn thấy đủ
  // menu quản trị rồi bấm vào trang nào cũng báo lỗi đỏ. Dữ liệu thì backend đã
  // chặn sẵn bằng require_admin(), nên sửa localStorage cũng không lấy được gì.
  if (!laAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#0F1014] px-6 text-center">
        <ShieldAlert className="w-9 h-9 text-rose-400" />
        <p className="text-base font-black text-white">Khu vực dành riêng cho quản trị viên</p>
        <p className="text-sm font-medium text-gray-400">
          {user
            ? `Tài khoản ${user.email} không có quyền quản trị.`
            : "Bạn cần đăng nhập bằng tài khoản quản trị."}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-extrabold text-slate-900 transition hover:bg-cyan-300"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0F1014] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#181920] border-r border-white/5 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <span className="font-bold text-sm text-black">E</span>
            </div>
            <span className="font-bold text-xl tracking-tight">EduAdmin</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // "exact" match for /dashboard, prefix match for sub-routes
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "#";

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "text-cyan-400 bg-cyan-400/10 font-semibold"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-cyan-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Về trang chủ</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
