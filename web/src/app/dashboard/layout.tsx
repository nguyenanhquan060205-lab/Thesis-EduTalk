"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, History, Users, LifeBuoy, BarChart3, MessageSquare, LayoutDashboard, Newspaper, Settings, LogOut } from "lucide-react";

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
