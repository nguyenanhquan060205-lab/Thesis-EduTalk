"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Heart, Share2, MoreHorizontal, PenSquare } from "lucide-react";

const POSTS = [
  {
    id: 1,
    user: { name: "Nguyễn Minh Đức", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Duc", role: "Sinh viên K12" },
    time: "2 giờ trước",
    title: "Review ngành Công nghệ Thông tin HUIT sau 1 năm học",
    content: "Chào các em 2k6, anh là sinh viên K12 ngành CNTT. Chia sẻ chút kinh nghiệm cho các em đang phân vân: Cơ sở vật chất ổn, thầy cô nhiệt tình nhưng áp lực code cũng khá căng. Học phí so với mặt bằng chung là rất hợp lý...",
    likes: 124,
    comments: 45
  },
  {
    id: 2,
    user: { name: "Lê Trần Thu Thảo", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Thao", role: "Ứng viên 2k6" },
    time: "5 giờ trước",
    title: "Điểm khối A00 22.5 có cơ hội đậu An toàn thông tin không ạ?",
    content: "Em chào mọi người, em thi thử và dự kiến khoảng 22.5 đến 23 điểm khối A00. Với điểm này thì có an toàn để đăng ký NV1 vào An toàn thông tin không ạ? Hay nên rớt xuống NV2 Kỹ thuật phần mềm?",
    likes: 32,
    comments: 18
  }
];

export default function CommunityPage() {
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
        {POSTS.map((post, idx) => (
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
                  <img src={post.user.avatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{post.user.name}</div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    <span className="text-[#2563EB] font-bold bg-blue-50 px-2 py-0.5 rounded-md">{post.user.role}</span>
                    <span>•</span>
                    <span>{post.time}</span>
                  </div>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-50 rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">{post.title}</h3>
            <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium">
              {post.content}
            </p>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
              <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition text-sm font-bold">
                <Heart className="w-5 h-5" /> {post.likes}
              </button>
              <button className="flex items-center gap-2 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition text-sm font-bold">
                <MessageSquare className="w-5 h-5" /> {post.comments} bình luận
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
