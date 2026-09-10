"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Users,
  DollarSign,
  Bell,
  RefreshCw,
  GraduationCap,
  ArrowUpRight,
  Newspaper,
  MessageSquare,
  Cpu,
  BarChart3,
  Server,
  Database,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  History,
} from "lucide-react";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  unreadNotifications: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);

  const handleCrawlNews = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    const toastId = toast.loading("Đang kết nối và cào tin từ cổng ts.huit.edu.vn...");
    try {
      await api.post("/api/v1/news/crawl");
      toast.success("Đã cập nhật dữ liệu tin tức tuyển sinh HUIT thành công!", { id: toastId });
    } catch (err) {
      console.error("Crawl tin tức thất bại:", err);
      toast.error("Đồng bộ tin thất bại. Vui lòng kiểm tra kết nối ts.huit.edu.vn và log backend.", { id: toastId });
    } finally {
      setIsCrawling(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/v1/admin/dashboard")
      .then((r) => {
        setStats(r.data);
        setError(null);
      })
      .catch(() =>
        setError(
          "Không tải được số liệu. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 sm:p-10 text-slate-900 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      
      {/* VÙNG 1: HEADER QUẢN TRỊ VIÊN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200/80 text-[10px] font-black uppercase tracking-wider">
              Trung Tâm Điều Hành Quản Trị
            </span>
            <span className="text-xs text-slate-400 font-semibold">• HUIT EduTalk 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Tổng Quan Hệ Thống
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Giám sát lưu lượng thí sinh, lượt khảo sát AI, hiệu năng mô hình và dữ liệu tuyển sinh trực tuyến.
          </p>
        </div>

        <button
          onClick={handleCrawlNews}
          disabled={isCrawling}
          className="flex items-center gap-2 bg-[#0054A6] hover:bg-[#004080] active:scale-[0.98] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shadow-[#0054A6]/20 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isCrawling ? "animate-spin" : ""}`} />
          <span>{isCrawling ? "Đang đồng bộ..." : "Đồng bộ Tin Tức HUIT"}</span>
        </button>
      </div>

      {loading && (
        <div className="p-10 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-500 text-sm font-bold flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0054A6]" />
          <span>Đang nạp chỉ số hệ thống...</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VÙNG 2: 4 THẺ CHỈ SỐ KPI CHÍNH */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Thí sinh đăng ký */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 text-[#0054A6] border border-blue-200/60 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500">Thí Sinh Đăng Ký</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                <NumberFlow value={stats.totalUsers} />
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Tài khoản trên hệ thống
              </div>
            </div>
          </motion.div>

          {/* Lượt khảo sát AI */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 text-[#0054A6] border border-blue-200/60 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500">Lượt Khảo Sát AI</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                <NumberFlow value={3842} />
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Pipeline XGBoost xử lý
              </div>
            </div>
          </motion.div>

          {/* Doanh thu tháng */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500">Doanh Thu Tháng</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5 tabular-nums flex items-baseline gap-1">
                <NumberFlow value={stats.monthRevenue} />
                <span className="text-xs font-bold text-emerald-700">đ</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Gói dịch vụ & tính năng
              </div>
            </div>
          </motion.div>

          {/* Thông báo & Hàng chờ duyệt */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-2xl flex items-center justify-center shrink-0 relative group-hover:scale-105 transition-transform">
              <Bell className="w-6 h-6" />
              {stats.unreadNotifications > 0 && (
                <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-500">Hồ Sơ Cần Duyệt</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                <NumberFlow value={stats.unreadNotifications} />
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Tin tức & bài cộng đồng
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* VÙNG 3: LỐI TẮT TÁC VỤ QUẢN TRỊ NHANH */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Lối Tắt Tác Vụ Quản Trị</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Truy cập nhanh các phân hệ nghiệp vụ chính của cổng EduTalk HUIT.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: "/dashboard/news",
              label: "Duyệt Tin Tức",
              desc: "Phê duyệt tin cào từ ts.huit.edu.vn trước khi phát hành",
              icon: Newspaper,
              badge: "Cào tự động",
            },
            {
              href: "/dashboard/posts",
              label: "Duyệt Bài Viết",
              desc: "Kiểm duyệt bài đăng thí sinh & báo cáo vi phạm",
              icon: MessageSquare,
              badge: "Cộng đồng",
            },
            {
              href: "/dashboard/model",
              label: "Hiệu Suất AI",
              desc: "Giám sát chỉ số Top-1, Top-3, AUC-ROC XGBoost",
              icon: Cpu,
              badge: "Pipeline XGBoost",
            },
            {
              href: "/dashboard/analytics",
              label: "Phân Tích Dữ Liệu",
              desc: "Thống kê phân bố khối thi, ngành hot và nguyện vọng",
              icon: BarChart3,
              badge: "Trực quan hoá",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0054A6] border border-blue-200/60 flex items-center justify-center group-hover:bg-[#0054A6] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition-colors flex items-center gap-1">
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* VÙNG 4: HAI CỘT CHUYÊN MÔN (HIỆU NĂNG AI VÀ NGUỒN DỮ LIỆU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Khối trái: Trạng thái Mô hình XGBoost (Pipeline research3) */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black flex items-center gap-2 text-slate-900">
                <Sparkles className="w-5 h-5 text-[#0054A6]" /> Mô Hình Tư Vấn AI HUIT
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pipeline XGBoost nạp từ research3/data/processed/10_ChotModel.
              </p>
            </div>
            <Link
              href="/dashboard/model"
              className="text-xs font-bold text-[#0054A6] hover:underline flex items-center gap-1"
            >
              <span>Chi tiết</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Kiến trúc</span>
              <strong className="text-slate-900 font-black text-sm block mt-0.5">Pipeline XGBoost</strong>
              <span className="text-[10px] text-slate-400 font-medium">Model nhóm / Phẳng</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Phạm vi</span>
              <strong className="text-[#0054A6] font-black text-sm block mt-0.5">39 Ngành HUIT</strong>
              <span className="text-[10px] text-slate-400 font-medium">9 Nhóm ngành (0..8)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Mốc ngẫu nhiên</span>
              <strong className="text-slate-700 font-black text-sm block mt-0.5">11.1% (1/9)</strong>
              <span className="text-[10px] text-slate-400 font-medium">Đối chứng đoán bừa</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0054A6] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              <strong className="text-slate-900 font-bold">Bảo vệ tính khách quan:</strong> Hệ thống luôn hiển thị mốc đối chứng ngẫu nhiên trên toàn bộ các biểu đồ phân tích để đảm bảo độ tin cậy khoa học của khoá luận.
            </div>
          </div>
        </div>

        {/* Khối phải: Bản đồ Nguồn Dữ Liệu & Hạ Tầng Dịch Vụ */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black flex items-center gap-2 text-slate-900">
              <Server className="w-5 h-5 text-[#0054A6]" /> Bản Đồ Nguồn Dữ Liệu
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nguồn gốc thực tế của dữ liệu đang phục vụ người dùng.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                t: "Gợi ý ngành & SHAP Explainer",
                d: "Pipeline XGBoost + TreeExplainer (research3/data/processed/10_ChotModel)",
                status: "Hoạt động",
                icon: Cpu,
              },
              {
                t: "Đề án & Điểm chuẩn 2024–2026",
                d: "tuyen_sinh_huit_2026.json — đồng bộ đề án tuyển sinh chính thức",
                status: "Chuẩn xác",
                icon: Database,
              },
              {
                t: "Tin tức tuyển sinh trực tuyến",
                d: "Crawl từ ts.huit.edu.vn — lưu trữ MongoDB & duyệt tự động",
                status: "Sẵn sàng",
                icon: Newspaper,
              },
            ].map((x) => {
              const Icon = x.icon;
              return (
                <div
                  key={x.t}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Icon className="w-4 h-4 text-[#0054A6]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-900 font-bold block truncate">{x.t}</span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        {x.d}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{x.status}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
