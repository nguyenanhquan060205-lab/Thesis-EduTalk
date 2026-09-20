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
    } catch {
      toast.error("Không tải được danh sách tin tức chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendingNews(); }, []);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await api.post(`/api/v1/admin/news/${id}/approve`);
      setNews((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã phê duyệt và xuất bản tin tức!");
    } catch {
      toast.error("Duyệt tin thất bại! Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn từ chối và xoá bản tin này?")) return;
    try {
      setProcessingId(id);
      await api.delete(`/api/v1/admin/news/${id}/reject`);
      setNews((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xoá tin tức khỏi danh sách.");
    } catch {
      toast.error("Xóa tin thất bại! Vui lòng thử lại.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dash-empty min-h-screen" style={{ background: "var(--dash-bg)" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-semibold" style={{ color: "var(--dash-text-faint)" }}>Đang tải danh sách tin bài...</p>
      </div>
    );
  }

  return (
    <div className="dash-page space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4 pb-5 border-b" style={{ borderColor: "var(--dash-border)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--dash-active-bg)", color: "var(--dash-accent)" }}>
          <Newspaper size={20} />
        </div>
        <div>
          <div className="dash-section-label mb-1">Kiểm duyệt nội dung · ts.huit.edu.vn</div>
          <h1 className="dash-page-title">Duyệt Tin Tức Tuyển Sinh</h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--dash-text-muted)" }}>
            Tin bài crawler tự động cào về từ cổng tuyển sinh chính thức, chờ duyệt trước khi hiển thị cho thí sinh.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {news.length === 0 ? (
        <div className="dash-card text-center py-14">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-base font-black mb-1" style={{ color: "var(--dash-text)" }}>Hàng chờ sạch sẽ!</h2>
          <p className="text-xs font-medium max-w-sm mx-auto" style={{ color: "var(--dash-text-muted)" }}>
            Không có tin tức nào đang chờ phê duyệt. Toàn bộ bản tin mới nhất đã được phát hành.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-xs font-semibold" style={{ color: "var(--dash-text-faint)" }}>
            Đang chờ duyệt: <strong style={{ color: "var(--dash-text)" }}>{news.length}</strong> bài viết
          </div>

          {news.map((item) => (
            <div key={item.id}
              className="dash-card flex flex-col md:flex-row overflow-hidden p-0 hover:shadow-md transition-all"
              style={{ gap: 0 }}>
              {/* Image */}
              <div className="w-full md:w-56 h-44 md:h-auto shrink-0 relative"
                style={{ background: "var(--dash-surface-2)" }}>
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper size={36} style={{ color: "var(--dash-text-faint)" }} />
                  </div>
                )}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5"
                  style={{ background: "rgba(7,14,30,0.75)", backdropFilter: "blur(4px)" }}>
                  <Clock size={11} />
                  <span>{item.date || "Mới cào"}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      {item.category && (
                        <span className="dash-badge dash-badge-blue">{item.category}</span>
                      )}
                      <h3 className="text-sm font-black leading-snug line-clamp-2" style={{ color: "var(--dash-text)" }}>
                        {item.title}
                      </h3>
                    </div>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "var(--dash-surface-2)", color: "var(--dash-text-muted)" }}
                      title="Mở link bài gốc">
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* AI Summary */}
                  <div className="rounded-lg p-3 space-y-1.5"
                    style={{ background: "var(--dash-surface-2)", border: "1px solid var(--dash-border-subtle)" }}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                      style={{ color: "var(--dash-accent)" }}>
                      <Sparkles size={11} />
                      <span>Trích Lược Tự Động</span>
                    </div>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--dash-text-muted)" }}>
                      {item.ai_summary || item.excerpt || "Chưa có nội dung tóm tắt từ AI."}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-3 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-white"
                    style={{ background: "var(--dash-accent)" }}
                  >
                    {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Phê Duyệt
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer border"
                    style={{
                      background: "var(--dash-surface-2)",
                      borderColor: "var(--dash-border)",
                      color: "var(--dash-text-muted)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.borderColor = "#EF4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--dash-text-muted)"; e.currentTarget.style.borderColor = "var(--dash-border)"; }}
                  >
                    {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Từ Chối
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
