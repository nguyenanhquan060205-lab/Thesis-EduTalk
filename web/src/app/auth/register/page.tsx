"use client";

import Link from "next/link";
import { Mail, Lock, UserPlus, User } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-6">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Tạo tài khoản mới
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Điền thông tin bên dưới để bắt đầu sử dụng EduTalk
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <form className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="student@huit.edu.vn"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15 focus:bg-white transition-all font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tối thiểu 8 ký tự, bao gồm chữ hoa & số.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="button" 
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
              >
                <UserPlus className="w-4 h-4" /> 
                <span>Đăng ký</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-slate-500 mt-6">
          Đã có tài khoản?{" "}
          <Link href="/auth/login" className="text-purple-600 font-bold hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
