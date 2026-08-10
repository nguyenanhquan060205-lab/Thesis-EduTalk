"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Users, Star, DollarSign, Bell, TrendingUp, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

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
  const [isCrawling, setIsCrawling] = useState(false);

  const handleCrawlNews = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    try {
      await api.post("/api/v1/news/crawl");
      alert("Đã cập nhật tin tức thành công từ HUIT!");
    } catch (error) {
      console.error("Lỗi khi cào tin tức:", error);
      alert("Có lỗi xảy ra khi cập nhật tin tức.");
    } finally {
      setIsCrawling(false);
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await api.get("/api/v1/admin/dashboard");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-400">
        Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in-up text-white">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tổng quan</h1>
          <p className="text-gray-400">Chào mừng bạn đến với trang quản trị EduTalk.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-400">Tổng Người Dùng</div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </div>
        </motion.div>

        {/* Premium Users */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-400">Tài Khoản Premium</div>
            <div className="text-2xl font-bold">{stats.premiumUsers}</div>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-400">Doanh Thu Tháng</div>
            <div className="text-2xl font-bold">{stats.monthRevenue.toLocaleString('vi-VN')} đ</div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center relative">
            <Bell className="w-6 h-6" />
            {stats.unreadNotifications > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-400">Thông Báo Mới</div>
            <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Hoạt động gần đây
          </h2>
          <button
            onClick={handleCrawlNews}
            disabled={isCrawling}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isCrawling ? "animate-spin" : ""}`} />
            {isCrawling ? "Đang cào dữ liệu..." : "Cập nhật tin tức HUIT"}
          </button>
        </div>
        <p className="text-gray-400 text-sm">Doanh thu hôm nay: <strong className="text-white">{stats.todayRevenue.toLocaleString('vi-VN')} đ</strong></p>
        <p className="text-gray-400 text-sm mt-2">Tổng doanh thu từ trước đến nay: <strong className="text-white">{stats.totalRevenue.toLocaleString('vi-VN')} đ</strong></p>
      </div>
    </div>
  );
}
