"use client";

import { motion } from "framer-motion";
import { Newspaper, Calendar, ChevronRight, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import axios from "axios";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  isHot: boolean;
  sourceUrl?: string;
  ai_summary?: string;
}

export default function NewsPage() {
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/v1/news");
        setNewsData(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto mt-8 pb-20 flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (!newsData || newsData.length === 0) {
    return (
      <div className="max-w-7xl mx-auto mt-8 pb-20 text-center text-slate-500 font-medium">
        Hiện tại chưa có tin tức nào.
      </div>
    );
  }

  const hotNews = newsData.find(n => n.isHot) || newsData[0];
  const regularNews = newsData.filter(n => !n.isHot);

  return (
    <div className="max-w-7xl mx-auto mt-8 pb-20 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
            <Newspaper className="w-8 h-8 text-[#2563EB]" /> Tin tức Tuyển sinh
          </h1>
          <p className="text-slate-600 max-w-2xl font-medium text-lg">
            Cập nhật những thông báo mới nhất, phương thức xét tuyển và hướng dẫn nhập học tại HUIT.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-bold shadow-sm">
            <TrendingUp className="w-4 h-4 text-rose-500" /> Tin nóng tuần này
          </div>
        </div>
      </div>

      {/* Featured News (Magazine Layout) */}
      <div className="grid lg:grid-cols-12 gap-8 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 group"
        >
          <Link href={`/news/${hotNews.id}`} className="block">
            <div className="relative h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden shadow-sm mb-6">
            <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
            <img src={hotNews.image} alt="Featured" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            
            <div className="absolute top-6 left-6 z-20">
              <span className="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg">
                Mới nhất
              </span>
            </div>
          </div>
          
          <div className="space-y-4 pr-4">
            <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
              <span className="text-[#2563EB]">{hotNews.category}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {hotNews.date}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight group-hover:text-[#2563EB] transition-colors">
              {hotNews.title}
            </h2>
            <p className="text-slate-600 font-medium text-lg leading-relaxed max-w-3xl">
              {hotNews.excerpt}
            </p>
            <div className="inline-flex items-center gap-2 text-[#2563EB] font-bold mt-2 hover:gap-3 transition-all">
              Đọc tiếp <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          </Link>
        </motion.div>

        {/* Sidebar News */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h3 className="text-xl font-black text-slate-900 border-b border-slate-200 pb-4">Đáng chú ý</h3>
          
          <div className="space-y-6 flex-1">
            {regularNews.map((news, idx) => (
              <motion.div 
                key={news.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link href={`/news/${news.id}`} className="group flex gap-5 items-start">
                <div className="w-32 h-24 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                  <img src={news.image} alt="Thumbnail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#2563EB]">{news.category}</div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#2563EB] transition-colors line-clamp-2">
                    {news.title}
                  </h4>
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {news.date}
                  </div>
                </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <button className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
            Xem tất cả tin tức <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
