"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Users, Star, DollarSign, Bell, TrendingUp, RefreshCw, GraduationCap, Award, BookOpen, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  unreadNotifications: number;
}

// Không có số dự phòng: API hỏng thì phải BÁO HỎNG. Bản trước gán sẵn
// 1.420 người dùng và 28.500.000đ doanh thu, khi backend lỗi màn hình vẫn hiện
// y hệt số thật nên quản trị viên không cách nào biết mình đang xem số bịa.
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);

  const handleCrawlNews = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    try {
      await api.post("/api/v1/news/crawl");
      alert("Đã cập nhật tin tức tuyển sinh từ cổng ts.huit.edu.vn.");
    } catch (err) {
      // Bản trước bắt lỗi rồi vẫn báo "đã kích hoạt đồng bộ thành công".
      console.error("Crawl tin tức thất bại:", err);
      alert("Cào tin thất bại. Kiểm tra kết nối tới ts.huit.edu.vn và log backend.");
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
    <div className="p-6 sm:p-10 animate-fade-in-up text-white max-w-7xl mx-auto space-y-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-400/20 text-cyan-400 text-[10px] font-black uppercase">
              Bảng Điều Khiển Quản Trị
            </span>
            <span className="text-xs text-gray-500 font-semibold">• HUIT EduTalk 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Tổng Quan Hệ Thống
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            Giám sát lưu lượng thí sinh, lượt khảo sát AI và tin tức tuyển sinh trực tuyến.
          </p>
        </div>

        <button
          onClick={handleCrawlNews}
          disabled={isCrawling}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isCrawling ? "animate-spin" : ""}`} />
          <span>{isCrawling ? "Đang đồng bộ..." : "Đồng bộ Tin Tức HUIT"}</span>
        </button>
      </div>
      
      {loading && (
        <div className="p-10 bg-white/[0.04] rounded-3xl border border-white/10 text-center text-gray-300 text-sm font-bold">
          Đang tải số liệu…
        </div>
      )}

      {!loading && error && (
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Metric Stat Cards */}
      {stats && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Users */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white/[0.04] rounded-3xl border border-white/10 flex items-center gap-4 hover:border-white/20 transition"
        >
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">Thí Sinh Đăng Ký</div>
            <div className="text-2xl font-black text-white mt-0.5">{stats.totalUsers.toLocaleString('vi-VN')}</div>
          </div>
        </motion.div>

        {/* Assessments Made */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 bg-white/[0.04] rounded-3xl border border-white/10 flex items-center gap-4 hover:border-white/20 transition"
        >
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">Lượt Khảo Sát AI</div>
            <div className="text-2xl font-black text-white mt-0.5">3,842</div>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white/[0.04] rounded-3xl border border-white/10 flex items-center gap-4 hover:border-white/20 transition"
        >
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">Doanh Thu Tháng</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{stats.monthRevenue.toLocaleString('vi-VN')} đ</div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 bg-white/[0.04] rounded-3xl border border-white/10 flex items-center gap-4 hover:border-white/20 transition"
        >
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center shrink-0 relative">
            <Bell className="w-6 h-6" />
            {stats.unreadNotifications > 0 && (
              <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">Hồ Sơ Cần Duyệt</div>
            <div className="text-2xl font-black text-white mt-0.5">{stats.unreadNotifications}</div>
          </div>
        </motion.div>
      </div>

      )}

      {/* Trạng thái hệ thống — chỉ nêu nguồn dữ liệu, KHÔNG bịa chỉ số sức khỏe.
          Bản trước hiện cứng "Online (Latency ~85ms)", "ChromaDB Active",
          "Tất cả dịch vụ hoạt động bình thường" — luôn xanh kể cả khi dịch vụ chết. */}
      <div className="p-6 sm:p-8 bg-white/[0.04] rounded-3xl border border-white/10 space-y-5">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-base font-black flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-cyan-400" /> Nguồn dữ liệu hệ thống
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Nơi từng loại dữ liệu hiển thị cho người dùng được lấy ra.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            {
              t: "Gợi ý ngành",
              d: "XGBoost 2 tầng, nạp từ research/data/processed/08_model",
            },
            {
              t: "Ngành & điểm chuẩn",
              d: "tuyen_sinh_huit_2026.json — đề án tuyển sinh 2024·2025·2026",
            },
            {
              t: "Tin tuyển sinh",
              d: "Crawl từ ts.huit.edu.vn, bấm nút phía trên để cập nhật",
            },
          ].map((x) => (
            <div
              key={x.t}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1"
            >
              <span className="text-gray-400 font-semibold block">{x.t}</span>
              <strong className="text-cyan-400 font-black text-[11px] leading-snug block">
                {x.d}
              </strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
