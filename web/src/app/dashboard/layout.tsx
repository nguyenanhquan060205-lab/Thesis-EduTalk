import React from "react";
import Link from "next/link";
import { LayoutDashboard, Newspaper, Settings, LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Tổng quan</span>
          </Link>
          <Link
            href="/dashboard/news"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-cyan-400 bg-cyan-400/10 transition-all"
          >
            <Newspaper size={20} />
            <span className="font-medium">Duyệt Tin Tức</span>
            <span className="ml-auto bg-cyan-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              Mới
            </span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Settings size={20} />
            <span className="font-medium">Cài đặt</span>
          </Link>
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
