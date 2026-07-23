"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, School, Edit3, Settings, LogOut } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto mt-8 pb-12">
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-[#2563EB] to-teal-400 relative">
          <div className="absolute inset-0 bg-black/5"></div>
          <button className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg backdrop-blur-sm transition border border-white/20">
            <Edit3 className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar & Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 mb-8">
            <div className="w-32 h-32 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shrink-0 relative z-10 shadow-lg">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover bg-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-slate-900 mb-1">Nguyễn Văn A</h1>
              <p className="text-[#2563EB] font-bold">Học sinh THPT (Lớp 12)</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Link href="/settings" className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition border border-slate-200">
                <Settings className="w-5 h-5" /> Cài đặt
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Thông tin cá nhân</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Email</div>
                      <div className="font-semibold text-slate-900">student@huit.edu.vn</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Số điện thoại</div>
                      <div className="font-semibold text-slate-900">090 123 4567</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Khu vực</div>
                      <div className="font-semibold text-slate-900">TP. Hồ Chí Minh</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Thông tin Học tập</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Trường THPT</div>
                      <div className="font-semibold text-slate-900">THPT Lê Hồng Phong</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Khối thi dự kiến</div>
                      <div className="font-semibold text-slate-900">A00, A01</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
