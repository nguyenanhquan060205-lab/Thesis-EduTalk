"use client";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  Share2,
  Building2,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { NewsService, type NewsArticle } from "@/services/news";

/** Ước lượng thời gian đọc từ chính nội dung bài (~200 từ/phút). */
function readingMinutes(html?: string) {
  if (!html) return null;
  const words = html
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function NewsDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Không xác định được bài viết.");
      setLoading(false);
      return;
    }
    NewsService.detail(id)
      .then(setArticle)
      // Không còn bài dự phòng gán cứng: không tải được thì báo rõ,
      // tuyệt đối không hiện một bài khác rồi để người đọc tưởng là bài mình bấm vào.
      .catch(() => setError("Không tìm thấy bài viết này hoặc máy chủ không phản hồi."))
      .finally(() => setLoading(false));
  }, [id]);

  const minutes = useMemo(
    () => readingMinutes(article?.content_html),
    [article?.content_html]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải bài viết…</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Không mở được bài viết</h2>
        <p className="text-sm text-slate-600 font-medium">{error}</p>
        <Link
          href="/news"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition"
        >
          <ArrowLeft className="w-4 h-4" /> Về danh sách tin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-2 pb-24 animate-fade-in-up space-y-6">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-blue-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại bản tin tuyển sinh
      </Link>

      <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-7">
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold">
              {article.category}
            </span>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {article.date}
            </span>
            {minutes && (
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {minutes} phút đọc
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Nguồn thật, không gán tên tác giả tự nghĩ */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900">
                Cổng tuyển sinh Trường Đại học Công Thương TP.HCM
              </p>
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#0054A6] font-bold hover:underline inline-flex items-center gap-1"
                >
                  Xem bài gốc trên ts.huit.edu.vn
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {article.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt=""
            className="w-full rounded-2xl object-cover bg-slate-100"
          />
        )}

        {article.ai_summary && (
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white rounded-2xl p-5 sm:p-6 border border-blue-100/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Tóm tắt nhanh bằng AI</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
              {article.ai_summary}
            </p>
            <p className="text-[10px] text-slate-400 font-medium pt-1">
              Tóm tắt do AI sinh tự động — hãy đối chiếu bài gốc trước khi dùng làm căn cứ.
            </p>
          </div>
        )}

        <div
          className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{
            __html: article.content_html || article.excerpt || "",
          }}
        />

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Chia sẻ bài viết:</span>
            <button
              onClick={() => {
                if (typeof navigator !== "undefined") {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép liên kết bài viết!");
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Sao chép liên kết"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/predict"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            <span>Làm khảo sát gợi ý ngành</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </article>
    </div>
  );
}
