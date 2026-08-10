"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, School, Edit3, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/api/v1/users/${user.id}`);
        setProfile(res.data);
      } catch (err) {
        console.error("Lỗi khi tải profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 pb-12 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const displayData = profile || user;

  if (!displayData) {
    return (
      <div className="max-w-4xl mx-auto mt-8 pb-12 text-center text-slate-500 font-medium">
        Vui lòng đăng nhập để xem hồ sơ cá nhân.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 pb-12 animate-fade-in-up">
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
              <img 
                src={displayData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayData.id || displayData.email}`} 
                alt="avatar" 
                className="w-full h-full object-cover bg-white" 
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-slate-900 mb-1">{displayData.name || "Người Dùng"}</h1>
              <p className="text-[#2563EB] font-bold">
                {displayData.role === 'admin' ? "Quản trị viên" : "Học sinh THPT"}
                {displayData.isPremium && <span className="ml-2 text-amber-500 text-sm">(Premium)</span>}
              </p>
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
                      <div className="font-semibold text-slate-900">{displayData.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Số điện thoại</div>
                      <div className="font-semibold text-slate-900">{displayData.phone || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Khu vực</div>
                      <div className="font-semibold text-slate-900">{displayData.location || "TP. Hồ Chí Minh"}</div>
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
                      <div className="font-semibold text-slate-900">{displayData.school || "Chưa cập nhật"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500">Khối thi dự kiến</div>
                      <div className="font-semibold text-slate-900">{displayData.blocks ? displayData.blocks.join(", ") : "A00, A01"}</div>
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
