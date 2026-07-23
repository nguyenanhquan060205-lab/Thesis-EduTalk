"use client";

import { motion } from "framer-motion";
import { Settings, Lock, Bell, Moon, LogOut, Shield } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto mt-8 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#2563EB]" /> Cài đặt Tài khoản
        </h1>
        <p className="text-slate-600 mt-2 font-medium">Quản lý bảo mật và tùy chỉnh trải nghiệm của bạn.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="md:col-span-4 space-y-2">
          <button className="w-full text-left px-5 py-3 rounded-xl bg-blue-50 text-[#2563EB] font-bold border border-blue-100 flex items-center gap-3 shadow-sm">
            <Lock className="w-5 h-5" /> Bảo mật & Mật khẩu
          </button>
          <button className="w-full text-left px-5 py-3 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold transition flex items-center gap-3">
            <Bell className="w-5 h-5" /> Thông báo
          </button>
          <button className="w-full text-left px-5 py-3 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold transition flex items-center gap-3">
            <Moon className="w-5 h-5" /> Giao diện
          </button>
          <div className="pt-4 mt-4 border-t border-slate-200">
            <button className="w-full text-left px-5 py-3 rounded-xl hover:bg-red-50 text-red-600 font-bold transition flex items-center gap-3">
              <LogOut className="w-5 h-5" /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <Shield className="w-6 h-6 text-[#2563EB]" />
              <h2 className="text-xl font-black text-slate-900">Đổi mật khẩu</h2>
            </div>
            
            <form className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu mới</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nhập lại mật khẩu mới</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>

              <div className="pt-4">
                <button type="button" className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold transition shadow-md shadow-blue-500/20">
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
