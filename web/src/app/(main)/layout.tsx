import React from "react";
import Navbar from "@/components/layout/Navbar";
import ChatWidget from "@/components/features/chat/ChatWidget";
import Link from "next/link";
import { GraduationCap, MapPin, Phone, Mail, Globe, Sparkles, ShieldCheck, Heart } from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col relative overflow-x-hidden">
      <Navbar />

      {/* Full-width container for full-bleed banners, inner components manage their own max-w-7xl */}
      <main className="flex-1 w-full pb-16 relative z-10">
        {children}
      </main>

      {/* Luxury Campus Footer */}
      <footer className="relative z-10 bg-[#F8FAFC] border-t border-slate-200 mt-auto pt-16 pb-12 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-200">
            
            {/* Col 1: University Brand & Intro */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0054A6] flex items-center justify-center text-white shadow-md shadow-[#0054A6]/20">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 tracking-tight">Trường Đại học Công Thương TP.HCM</h3>
                  <p className="text-xs font-bold text-[#0054A6]">Ho Chi Minh City University of Industry and Trade (HUIT)</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium max-w-md">
                <strong className="text-slate-900">HUIT EduTalk</strong> là cổng thông tin tư vấn tuyển sinh và hướng nghiệp thông minh, hỗ trợ thí sinh đánh giá năng lực và chọn lựa đúng chuyên ngành đào tạo phù hợp nhất tại HUIT.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Tuyển Sinh 2026
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#0054A6] border border-blue-200">
                  <Sparkles className="w-3.5 h-3.5" /> 39 Ngành Đào Tạo
                </span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Hệ Sinh Thái EduTalk</h4>
              <ul className="space-y-2 text-xs font-bold text-slate-600">
                <li><Link href="/predict" className="hover:text-[#0054A6] transition">Khảo Sát Chọn Ngành Học</Link></li>
                <li><Link href="/majors" className="hover:text-[#0054A6] transition">Danh Mục 39 Ngành & Điểm Chuẩn</Link></li>
                <li><Link href="/chat" className="hover:text-[#0054A6] transition">Hỏi Đáp Tuyển Sinh 24/7</Link></li>
                <li><Link href="/news" className="hover:text-[#0054A6] transition">Thông Báo & Đề Án Tuyển Sinh</Link></li>
                <li><Link href="/community" className="hover:text-[#0054A6] transition">Diễn Đàn Thảo Luận Thí Sinh</Link></li>
              </ul>
            </div>

            {/* Col 3: Contact & Campus */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Thông Tin Liên Hệ & Cơ Sở</h4>
              <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0054A6] shrink-0 mt-0.5" />
                  <span><strong className="text-slate-900">Cơ sở chính:</strong> 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP.HCM</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0054A6] shrink-0" />
                  <span>Hotline Tuyển sinh: <strong className="text-slate-900">(028) 3816 1673 - 096 205 1080</strong></span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0054A6] shrink-0" />
                  <span>Email: <strong className="text-slate-900">ttts@huit.edu.vn</strong></span>
                </p>
                <p className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#0054A6] shrink-0" />
                  <span>Cổng thông tin: <strong className="text-slate-900">https://tuyensinh.huit.edu.vn</strong></span>
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
            <p>© 2026 Trường Đại học Công Thương TP.HCM (HUIT). All rights reserved.</p>
            <p className="flex items-center gap-1">
              Phát triển với <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> bởi Nhóm Nghiên cứu Khóa luận K14 Khoa CNTT
            </p>
          </div>
        </div>
      </footer>

      {/* Global AI Chatbot Widget */}
      <div className="relative z-50">
        <ChatWidget />
      </div>
    </div>
  );
}
