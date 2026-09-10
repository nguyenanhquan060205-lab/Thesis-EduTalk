"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Check, X, Newspaper, Clock, ExternalLink, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
      toast.error("Không tải được danh sách tin tức chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingNews();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/v1/admin/news/${id}/approve`);
      setNews((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã phê duyệt và xuất bản tin tức lên hệ sinh thái EduTalk!");
    } catch (error) {
      console.error("Approve failed:", error);
      toast.error("Duyệt tin thất bại! Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối và xoá bản tin này khỏi hàng chờ?")) return;
    try {
      setProcessingId(id);
      await api.delete(`/api/v1/admin/news/${id}/reject`);
      setNews((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xoá tin tức khỏi danh sách.");
    } catch (error) {
      console.error("Reject failed:", error);
      toast.error("Xóa tin thất bại! Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải danh sách tin bài...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8 text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-slate-200/80">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0054A6] border border-blue-200/60 flex items-center justify-center shadow-xs">
          <Newspaper size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200/80 text-[10px] font-black uppercase tracking-wider">
              Kiểm Duyệt Nội Dung
            </span>
            <span className="text-xs text-slate-400 font-semibold">• ts.huit.edu.vn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Duyệt Tin Tức Tuyển Sinh
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
            Các tin bài được crawler tự động cào về từ cổng tuyển sinh chính thức và chờ duyệt trước khi hiển thị cho thí sinh.
          </p>
        </div>
      </div>

      {/* Danh sách bài hoặc Empty state */}
      {news.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center bg-white shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">Hàng chờ sạch sẽ!</h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-sm">
            Hiện tại không có tin tức nào đang chờ phê duyệt. Toàn bộ bản tin mới nhất đã được phát hành.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Đang chờ duyệt: <strong className="text-slate-900">{news.length}</strong> bài viết</span>
          </div>

          {news.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-xs hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="w-full md:w-64 h-48 md:h-auto shrink-0 relative bg-slate-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <Newspaper className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/20">
                  <Clock size={11} />
                  <span>{item.date || "Mới cào"}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="space-y-1">
                      {item.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0054A6] border border-blue-200">
                          {item.category}
                        </span>
                      )}
                      <h3 className="text-base sm:text-lg font-black leading-snug line-clamp-2 text-slate-900 mt-1">
                        {item.title}
                      </h3>
                    </div>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#0054A6] flex items-center justify-center text-slate-600 transition-colors"
                      title="Mở link bài gốc trên ts.huit.edu.vn"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  {/* AI Summary Box */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 my-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#0054A6]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trích Lược Tự Động</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.ai_summary || item.excerpt || "Chưa có nội dung tóm tắt từ AI."}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#0054A6] hover:bg-[#004080] active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm shadow-[#0054A6]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {processingId === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    <span>Phê Duyệt Phát Hành</span>
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border border-slate-200 hover:border-rose-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {processingId === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    <span>Từ Chối & Xoá</span>
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
