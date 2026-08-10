"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, MoreHorizontal, PenSquare } from "lucide-react";
import axios from "axios";

interface Post {
  id: string;
  authorName: string;
  authorId: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  imageUrl?: string;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/v1/posts");
        setPosts(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-[#2563EB]" /> Cộng đồng EduTalk
          </h1>
          <p className="text-slate-600 mt-2 font-medium">Nơi trao đổi, giải đáp thắc mắc giữa sinh viên và các ứng viên HUIT.</p>
        </div>
        <button className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 w-full md:w-auto">
          <PenSquare className="w-5 h-5" /> Đăng bài
        </button>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-slate-500 font-medium">Chưa có bài viết nào.</div>
        ) : posts.map((post, idx) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{post.authorName}</div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    <span className="text-[#2563EB] font-bold bg-blue-50 px-2 py-0.5 rounded-md">Thành viên</span>
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-50 rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {post.content}
              </p>
              {post.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden max-h-80 w-full">
                  <img src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-6 mt-5 pt-5 border-t border-slate-100">
              <button className="flex items-center gap-2 text-slate-500 hover:text-rose-500 transition font-bold text-sm group">
                <Heart className="w-5 h-5 group-hover:fill-rose-500 transition" />
                {post.likesCount}
              </button>
              <button className="flex items-center gap-2 text-slate-500 hover:text-[#2563EB] transition font-bold text-sm">
                <MessageSquare className="w-5 h-5" />
                {post.commentsCount}
              </button>
              <button className="flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition text-sm font-bold ml-auto">
                <Share2 className="w-5 h-5" /> Chia sẻ
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
