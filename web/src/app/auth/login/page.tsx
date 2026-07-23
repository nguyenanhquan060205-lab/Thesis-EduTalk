"use client";

import Link from "next/link";
import { Mail, Lock, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
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
            Đăng nhập EduTalk
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Nhập email và mật khẩu của bạn để truy cập hệ thống
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <form className="space-y-4">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mật khẩu
                </label>
                <Link href="#" className="text-xs font-semibold text-[#2563EB] hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="button" 
                className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
              >
                <LogIn className="w-4 h-4" /> 
                <span>Đăng nhập</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-3 text-slate-400 text-xs font-semibold uppercase">Hoặc</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Google Login */}
            <button 
              type="button" 
              className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Tiếp tục với Google
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm font-medium text-slate-500 mt-6">
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="text-[#2563EB] font-bold hover:underline">
            Tạo tài khoản ngay
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
