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
  Check,
  FileText,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { NewsService, type NewsArticle } from "@/services/news";
import { useAuthStore } from "@/store/useAuthStore";

/** Ước lượng thời gian đọc từ chính nội dung bài (~200 từ/phút). */
function readingMinutes(html?: string) {
  if (!html) return null;
  const words = html
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Tách link PDF gốc từ nội dung bài cào được từ ts.huit.edu.vn */
function extractPdfInfo(html?: string) {
  if (!html) return { pdfUrl: null, cleanHtml: "", fileName: "" };

  // Tìm URL file PDF từ vpdf/?url=... hoặc iframe nhúng trực tiếp hoặc divA4
  const vpdfMatch = html.match(/(?:vpdf\/\?url=)(https?:\/\/[^"'\s&>]+\.pdf)/i);
  const directIframeMatch = html.match(/<iframe[^>]*src=["'](https?:\/\/[^"'\s>]+\.pdf)["']/i);
  const divA4PdfMatch = html.match(/<div[^>]*class=["'][^"']*divA4[^"']*["'][\s\S]*?(https?:\/\/[^"'\s&>]+\.pdf)/i);

  const rawUrl = vpdfMatch?.[1] || directIframeMatch?.[1] || divA4PdfMatch?.[1] || null;
  const pdfUrl = rawUrl ? decodeURIComponent(rawUrl) : null;

  let fileName = "Tài liệu tuyển sinh (PDF)";
  if (pdfUrl) {
    try {
      const parts = pdfUrl.split("/");
      const rawName = decodeURIComponent(parts[parts.length - 1]);
      fileName = rawName.replace(/[-_]/g, " ").replace(/\.pdf$/i, "");
    } catch {
      fileName = "Tài liệu tuyển sinh HUIT";
    }
  }

  // Làm sạch HTML: gỡ bỏ thẻ divA4 và các nút share Facebook/G+ cũ từ 2014
  const cleanHtml = html
    .replace(/<div[^>]*class=["'][^"']*divA4[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*post-summary-header[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<iframe[^>]*\.pdf[^>]*>[\s\S]*?<\/iframe>/gi, "");

  return { pdfUrl, cleanHtml, fileName };
}

type PdfViewMode = "huit" | "direct" | "google";

function PdfViewerEmbed({ pdfUrl, fileName }: { pdfUrl: string; fileName: string }) {
  // Mặc định dùng Cổng HUIT (PDF.js của HUIT với đầy đủ thanh công cụ và xem trang)
  const [mode, setMode] = useState<PdfViewMode>("huit");
  const [isExpanded, setIsExpanded] = useState(false);

  const iframeSrc = useMemo(() => {
    if (mode === "huit") {
      return `https://doc.huit.edu.vn/vpdf/?url=${encodeURIComponent(pdfUrl)}`;
    }
    if (mode === "direct") {
      return `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`;
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
  }, [mode, pdfUrl]);

  return (
    <div className="w-full my-6 rounded-3xl border border-slate-200 dark:border-[#1E3454] bg-[#0A1220] text-slate-100 overflow-hidden shadow-2xl">
      {/* Thanh công cụ điều khiển PDF */}
      <div className="p-4 sm:p-5 bg-[#0D1729] border-b border-[#1E3454] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Thông tin file */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CHUẨN 1 TRANG A4
              </span>
              <p className="text-xs sm:text-sm font-black text-white truncate max-w-xs sm:max-w-md" title={fileName}>
                {fileName}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Văn bản đính kèm chính thức từ Trường Đại học Công Thương TP.HCM
            </p>
          </div>
        </div>

        {/* Chuyển đổi chế độ xem & kích thước */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Nút phóng to / chuẩn 1 trang */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#111D2E] hover:bg-[#1E3454] border border-[#1E3454] transition flex items-center gap-1.5 cursor-pointer"
            title={isExpanded ? "Thu về chuẩn 1 trang A4" : "Mở rộng chiều cao"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Chuẩn 1 trang</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Mở rộng</span>
              </>
            )}
          </button>

          {/* Chọn trình xem */}
          <div className="flex items-center gap-1 p-1 bg-[#111D2E] rounded-xl border border-[#1E3454]">
            <button
              type="button"
              onClick={() => setMode("huit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "huit"
                  ? "bg-[#0054A6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Cổng HUIT
            </button>
            <button
              type="button"
              onClick={() => setMode("direct")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "direct"
                  ? "bg-[#0054A6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Trình duyệt
            </button>
            <button
              type="button"
              onClick={() => setMode("google")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "google"
                  ? "bg-[#0054A6] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Google Docs
            </button>
          </div>
        </div>

        {/* Nút tác vụ tải về / mở tab mới */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Mở tab mới</span>
          </a>
          <a
            href={pdfUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file PDF</span>
          </a>
        </div>
      </div>

      {/* Khung nhúng tài liệu - Chuẩn tương đương 1 trang A4 (1180px - 1200px) */}
      <div
        className={`relative w-full ${
          isExpanded ? "h-[1650px]" : "h-[1180px] sm:h-[1200px]"
        } min-h-[750px] bg-slate-900 transition-all duration-300`}
      >
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={fileName}
          className="w-full h-full border-none"
        />
      </div>

      {/* Hướng dẫn trợ giúp */}
      <div className="p-3.5 bg-[#0D1729] border-t border-[#1E3454] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
        <span>Khung hiển thị tương đương 1 trang A4 hoàn chỉnh. Dùng thanh điều khiển trên đầu trang PDF để lật trang, thu phóng hoặc in văn bản.</span>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline font-bold inline-flex items-center gap-1 shrink-0"
        >
          Xem file gốc tại doc.huit.edu.vn <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function NewsDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user } = useAuthStore();

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const { pdfUrl, cleanHtml, fileName } = useMemo(
    () => extractPdfInfo(article?.content_html),
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

  const handleShare = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-24 animate-fade-in-up space-y-6 w-full">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-[#0054A6] dark:hover:text-sky-400 transition group"
      >
        <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" /> 
        Quay lại bản tin tuyển sinh
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-200/90 shadow-sm space-y-8 w-full"
      >
        <div className="space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold">
              {article.category}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {article.date}
            </span>
            {minutes && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {minutes} phút đọc
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Nguồn thật */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-400 border border-blue-100 dark:border-sky-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
                Cổng tuyển sinh Trường Đại học Công Thương TP.HCM
              </p>
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#0054A6] dark:text-sky-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Xem bài gốc trên ts.huit.edu.vn
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {article.image && (
          <div className="w-full rounded-2xl overflow-hidden shadow-sm bg-slate-100 dark:bg-slate-900/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.image}
              alt=""
              className="w-full object-cover max-h-[560px]"
            />
          </div>
        )}

        {article.ai_summary && (
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white dark:from-sky-950/40 dark:via-[#111D2E] dark:to-[#0D1729] rounded-3xl p-6 sm:p-7 border border-blue-200/80 dark:border-sky-800/40 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 dark:text-sky-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 animate-pulse" />
              <span>Tóm tắt nhanh bằng AI</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
              {article.ai_summary}
            </p>
            <p className="text-[10px] text-slate-400 font-medium pt-1">
              Tóm tắt do AI sinh tự động — hãy đối chiếu bài gốc trên cổng tuyển sinh trước khi dùng làm căn cứ.
            </p>
          </div>
        )}

        {pdfUrl ? (
          <div className="space-y-6">
            <PdfViewerEmbed pdfUrl={pdfUrl} fileName={fileName} />
            {cleanHtml && cleanHtml.replace(/<[^>]+>/g, "").trim().length > 0 && (
              <div
                className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium overflow-x-auto w-full pt-6 border-t border-slate-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{
                  __html: cleanHtml,
                }}
              />
            )}
          </div>
        ) : (
          <div
            className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium overflow-x-auto w-full"
            dangerouslySetInnerHTML={{
              __html: article.content_html || article.excerpt || "",
            }}
          />
        )}

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Chia sẻ bài viết:</span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
              title="Sao chép liên kết"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Sao chép link</span>
                </>
              )}
            </motion.button>
          </div>

          <Link
            href={user ? "/predict" : "/auth/login?redirect=/predict"}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            <span>Làm khảo sát gợi ý ngành</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.article>
    </div>
  );
}
