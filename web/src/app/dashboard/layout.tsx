"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  BarChart2,
  MessageSquare,
  BrainCircuit,
  BookOpen,
  RotateCcw,
  Clock,
  Users,
  Headphones,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";


interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [

  {
    label: "Tổng quan",
    items: [
      { href: "/dashboard", label: "Thống kê", icon: BarChart2, exact: true },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { href: "/dashboard/news", label: "Tin tức", icon: Newspaper, badge: "Mới" },
      { href: "/dashboard/posts", label: "Bài viết cộng đồng", icon: MessageSquare },
    ],
  },
  {
    label: "AI & Dữ liệu",
    items: [
      { href: "/dashboard/model", label: "Hiệu suất mô hình", icon: BrainCircuit },
      { href: "/dashboard/rag", label: "Kho tri thức RAG", icon: BookOpen },
      { href: "/dashboard/retrain", label: "Huấn luyện lại", icon: RotateCcw },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/dashboard/consultations", label: "Lịch sử tư vấn", icon: Clock },
      { href: "/dashboard/users", label: "Người dùng", icon: Users },
      { href: "/dashboard/support", label: "Hỗ trợ", icon: Headphones },
    ],
  },
];

// SSR-safe zustand hydration
const subscribe = (cb: () => void) => useAuthStore.persist.onFinishHydration(cb);
const getSnapshot = () => useAuthStore.persist.hasHydrated();
const getServerSnapshot = () => false;

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logout();
    router.replace("/auth/login");
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--dash-sidebar)" }}>
      {/* Logo & Theme Switcher */}
      <div
        className="px-4 py-4 border-b flex items-center justify-between gap-2 shrink-0"
        style={{ borderColor: "var(--dash-sidebar-border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group" onClick={onClose}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0"
            style={{ background: "linear-gradient(135deg, #0054A6 0%, #003B73 100%)" }}
          >
            H
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-tight leading-none truncate" style={{ color: "var(--dash-text)" }}>
              HUIT <span style={{ color: "var(--dash-accent)" }}>Admin</span>
            </div>
            <div className="text-[10px] font-semibold mt-0.5 uppercase tracking-widest" style={{ color: "var(--dash-text-faint)" }}>
              EduTalk 2026
            </div>
          </div>
        </Link>
        <ThemeToggle className="shrink-0" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto hide-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div
              className="text-[10px] font-black uppercase tracking-[0.12em] px-2 mb-1.5"
              style={{ color: "var(--dash-text-faint)" }}
            >
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href) && item.href !== "#";

                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                    style={
                      isActive
                        ? {
                            background: "var(--dash-active-bg)",
                            color: "var(--dash-accent)",
                            borderLeft: `2px solid var(--dash-accent)`,
                            paddingLeft: "calc(0.625rem - 2px)",
                          }
                        : {
                            color: "var(--dash-text-muted)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--dash-text)";
                        e.currentTarget.style.background = "var(--dash-active-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "var(--dash-text-muted)";
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--dash-accent-glow)",
                          color: "var(--dash-accent)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="p-3 border-t space-y-1"
        style={{ borderColor: "var(--dash-sidebar-border)" }}
      >
        {/* User info */}
        {user && (
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-2"
            style={{ background: "var(--dash-surface-2)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
              style={{ background: "var(--dash-accent)" }}
            >
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate" style={{ color: "var(--dash-text)" }}>
                {user.name}
              </div>
              <div className="text-[10px] truncate" style={{ color: "var(--dash-text-faint)" }}>
                {user.email}
              </div>
            </div>
          </div>
        )}

        <Link
          href="/"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors"
          style={{ color: "var(--dash-text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--dash-text)";
            e.currentTarget.style.background = "var(--dash-surface-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--dash-text-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={14} />
          <span>Về trang chủ</span>
        </Link>

        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{ color: "#ef4444" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={14} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("edutalk-auth-storage");
        if (!raw) { router.replace("/auth/login"); return; }
        const u = JSON.parse(raw)?.state?.user;
        if (!u) { router.replace("/auth/login"); return; }
        if (u.role !== "admin") { router.replace("/"); return; }
      } catch {
        router.replace("/auth/login"); return;
      }
    }
    if (!hydrated) return;
    if (!user) { router.replace("/auth/login"); }
    else if (user.role !== "admin") { router.replace("/"); }
  }, [hydrated, user, router]);

  if (!hydrated || !isAdmin) {
    return <div className="min-h-screen" style={{ background: "var(--dash-bg)" }} />;
  }

  return (
    <div
      className="flex flex-col lg:flex-row h-screen overflow-hidden font-sans"
      style={{ background: "var(--dash-bg)" }}
      data-lenis-prevent
    >
      {/* Mobile top header */}
      <div
        className="lg:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 z-30"
        style={{
          background: "var(--dash-sidebar)",
          borderColor: "var(--dash-sidebar-border)",
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: "linear-gradient(135deg, #0054A6 0%, #003B73 100%)" }}
          >
            H
          </div>
          <span className="text-sm font-black" style={{ color: "var(--dash-text)" }}>
            HUIT <span style={{ color: "var(--dash-accent)" }}>Admin</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--dash-text-muted)" }}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: "rgba(7,14,30,0.6)", backdropFilter: "blur(4px)" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-64 z-50 shadow-2xl border-r"
              style={{ borderColor: "var(--dash-sidebar-border)" }}
            >
              <SidebarContent
                pathname={pathname}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-56 flex-col shrink-0 border-r"
        style={{
          background: "var(--dash-sidebar)",
          borderColor: "var(--dash-sidebar-border)",
        }}
      >
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto min-w-0"
        style={{ background: "var(--dash-bg)" }}
        data-lenis-prevent
      >
        {children}
      </main>
    </div>
  );
}
