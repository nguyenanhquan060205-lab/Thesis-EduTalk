"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Newspaper,
  Calendar,
  ArrowRight,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { NewsService, type NewsArticle } from "@/services/news";

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    NewsService.list(30)
      .then(setArticles)
      .catch(() =>
        setError("Không tải được tin tuyển sinh. Kiểm tra backend có đang chạy không.")
      )
      .finally(() => setLoading(false));
  }, []);

  // Chuyên mục lấy từ chính dữ liệu trả về, không gõ tay danh sách
  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.category).filter(Boolean))].sort(),
    [articles]
  );

  const activeCategory = categories.includes(category) ? category : "";

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return articles.filter(
      (a) =>
        (!q ||
          a.title.toLowerCase().includes(q) ||
          (a.excerpt ?? "").toLowerCase().includes(q)) &&
        (!activeCategory || a.category === activeCategory)
    );
  }, [articles, searchTerm, activeCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải tin tuyển sinh…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Không tải được tin tức</h2>
        <p className="text-sm text-slate-600 font-medium">{error}</p>
      </div>
    );
  }

  const [featured, ...rest] = filtered;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 pb-24 space-y-6 animate-fade-in-up">
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold">
              <Newspaper className="w-4 h-4" />
              <span>Tin tuyển sinh chính thức</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Tin Tức Tuyển Sinh HUIT
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Toàn bộ tin lấy trực tiếp từ cổng tuyển sinh{" "}
              <a
                href="https://ts.huit.edu.vn/tin-tuyen-sinh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0054A6] font-bold hover:underline"
              >
                ts.huit.edu.vn
              </a>{" "}
              của trường. Mỗi bài đều kèm liên kết về bản gốc để bạn đối chiếu.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-center shrink-0">
            <div className="text-3xl font-black text-blue-700">{articles.length}</div>
            <div className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wide">
              Bài viết
            </div>
          </div>
        </div>
      </div>

      {/* TÌM KIẾM + CHUYÊN MỤC */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm trong tiêu đề hoặc tóm tắt…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#0054A6] focus:ring-4 focus:ring-blue-500/10 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setCategory("")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition shadow-xs ${
                !activeCategory
                  ? "bg-[#0054A6] text-white border-[#0054A6] shadow-blue-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              Tất cả
            </motion.button>
            {categories.map((c) => (
              <motion.button
                key={c}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition shadow-xs ${
                  activeCategory === c
                    ? "bg-slate-900 text-white border-slate-900 shadow-slate-900/20"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {c}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-2">
          <Newspaper className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            {articles.length === 0
              ? "Chưa có tin nào được tải về."
              : "Không có bài nào khớp bộ lọc."}
          </p>
        </div>
      )}

      {/* BÀI NỔI BẬT */}
      {featured && (
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            href={`/news/${featured.id}`}
            className="block bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:border-[#0054A6]/60 hover:shadow-xl hover:shadow-blue-500/5 transition overflow-hidden group"
          >
            <div className="flex flex-col lg:flex-row">
              {featured.image && (
                <div className="w-full lg:w-2/5 h-56 lg:h-auto overflow-hidden bg-slate-100 relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-rose-600/30">
                    <Flame className="w-3 h-3" /> Mới nhất
                  </div>
                </div>
              )}
              <div className="p-6 sm:p-8 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
                    <span className="px-2.5 py-1 rounded-md bg-[#0054A6]/10 text-[#0054A6]">
                      {featured.category}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" /> {featured.date}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] group-hover:text-[#0054A6] transition leading-snug">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-3">
                    {featured.excerpt}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-black text-[#0054A6] group-hover:gap-2.5 transition-all">
                  <span>Đọc bài viết chi tiết</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* DANH SÁCH CÒN LẠI */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((a) => (
            <motion.div
              key={a.id}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={`/news/${a.id}`}
                className="h-full bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:border-[#0054A6]/60 hover:shadow-xl hover:shadow-blue-500/5 transition overflow-hidden flex flex-col group"
              >
                {a.image && (
                  <div className="w-full h-44 overflow-hidden bg-slate-100 relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>
                )}
                <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold">
                      <span className="px-2 py-0.5 rounded-md bg-[#0054A6]/10 text-[#0054A6]">
                        {a.category}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" /> {a.date}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-[#0F172A] group-hover:text-[#0054A6] transition leading-snug line-clamp-2">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                      {a.excerpt}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-black text-[#0054A6] pt-3 border-t border-slate-100/80 group-hover:gap-2 transition-all">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <p>
          Nội dung thuộc bản quyền Trường Đại học Công Thương TP.HCM, được tổng hợp lại
          để tra cứu. Mọi thông tin chính thức xin đối chiếu tại bài gốc trên{" "}
          <strong className="text-slate-700">ts.huit.edu.vn</strong>.
        </p>
      </div>
    </div>
  );
}
