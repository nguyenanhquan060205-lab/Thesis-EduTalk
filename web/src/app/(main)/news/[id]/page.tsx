"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

interface NewsDetail {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  sourceUrl: string;
  ai_summary: string;
  content_html: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/v1/news/${id}`);
        setNews(response.data.data);
      } catch (error) {
        console.error("Failed to fetch news detail:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchNewsDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto mt-8 pb-20 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-6xl mx-auto mt-8 pb-20 text-center text-slate-500 font-medium">
        Không tìm thấy bài viết hoặc bài viết đã bị xóa.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8 pb-20 px-4 animate-fade-in-up">
      <Link href="/news" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#2563EB] font-bold mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5" /> Trở về danh sách
      </Link>

      <div className="space-y-6 mb-8">
        <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
          <span className="text-[#2563EB] uppercase tracking-wider">{news.category}</span>
          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {news.date}</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
          {news.title}
        </h1>
        
        <p className="text-xl text-slate-600 font-medium leading-relaxed">
          {news.excerpt}
        </p>
      </div>

      {/* AI Summary Box */}
      {news.ai_summary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-2xl p-6 mb-10 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="flex items-center gap-2 mb-3 text-[#2563EB] font-bold uppercase tracking-wider text-sm">
            <Sparkles className="w-5 h-5" /> AI Tóm tắt nhanh
          </div>
          <p className="text-slate-700 text-lg leading-relaxed relative z-10 font-medium">
            {news.ai_summary}
          </p>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {news.image && (
          <div className="w-full h-[300px] md:h-[400px]">
            <img src={news.image} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="p-8 md:p-12">
          {news.content_html ? (
            <div 
              className="prose prose-lg prose-slate max-w-none prose-img:rounded-xl prose-img:shadow-sm prose-a:text-[#2563EB] prose-headings:font-bold"
              dangerouslySetInnerHTML={{ __html: news.content_html }}
            />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Chưa tải được nội dung chi tiết.
            </div>
          )}
          
          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-400">Nguồn: HUIT News</span>
            <a 
              href={news.sourceUrl} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition-colors"
            >
              Xem trang gốc <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
