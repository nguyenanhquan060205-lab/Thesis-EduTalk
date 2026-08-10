"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Check, X, Newspaper, Clock, ExternalLink, Loader2 } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  sourceUrl: string;
  ai_summary: string;
  status: string;
  createdAt: string;
}

export default function AdminNewsApprovalPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingNews = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/admin/news/pending");
      setNews(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch pending news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => fetchPendingNews(), 0);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/v1/admin/news/${id}/approve`);
      setNews(news.filter(item => item.id !== id));
    } catch (error) {
      console.error("Approve failed:", error);
      alert("Duyệt tin thất bại!");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa/từ chối bài viết này?")) return;
    try {
      setProcessingId(id);
      await api.delete(`/api/v1/admin/news/${id}/reject`);
      setNews(news.filter(item => item.id !== id));
    } catch (error) {
      console.error("Reject failed:", error);
      alert("Xóa tin thất bại!");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center text-cyan-400">
          <Newspaper size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Duyệt Tin Tức</h1>
          <p className="text-gray-400 mt-1">
            Hệ thống tự động cào tin bài và chờ Admin phê duyệt trước khi lên App.
          </p>
        </div>
      </div>

      {news.length === 0 ? (
        <div className="p-12 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center bg-white/5">
          <Check size={48} className="text-green-400 mb-4 opacity-80" />
          <h2 className="text-xl font-bold mb-2">Tất cả đều gọn gàng!</h2>
          <p className="text-gray-400">Hiện tại không có tin tức nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {news.map((item) => (
            <div key={item.id} className="bg-[#181920] border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-lg">
              {/* Image */}
              <div className="w-full md:w-64 h-48 md:h-auto shrink-0 relative">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5 border border-white/10">
                  <Clock size={12} />
                  {item.date}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <a 
                    href={item.sourceUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
                    title="Mở link gốc"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* AI Summary Box */}
                <div className="bg-cyan-400/5 border border-cyan-400/20 rounded-xl p-4 mb-4 mt-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                      AI Tóm Tắt
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.ai_summary || "Chưa có nội dung tóm tắt từ AI."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-2.5 rounded-xl font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    Duyệt Bài Này
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400 py-2.5 rounded-xl font-semibold transition-all border border-white/5 hover:border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                    Từ chối & Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
