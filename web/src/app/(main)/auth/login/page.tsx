"use client";

import Link from "next/link";
import { Mail, Lock, LogIn, CheckCircle2, Eye, EyeOff, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { AuthService } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setTimeout(() => setShowSuccessPopup(true), 0);
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await AuthService.login(email, password);
      if (res.status === "success" && res.idToken) {
        // Lưu token vào localStorage để api.ts interceptor sử dụng
        localStorage.setItem("authToken", res.idToken);
        
        try {
          // Lấy profile thực tế từ backend
          const profile = await AuthService.getProfile(res.uid);
          setUser(profile);
          if (profile.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Fallback nếu lỗi
          setUser({ id: res.uid, name: email.split("@")[0], email, role: res.role });
          if (res.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        }
      } else {
        setError(res.status === "success" ? "Thiếu Token." : res.status);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(err.response?.data?.detail || "Lỗi máy chủ, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const res = await AuthService.googleLogin(idToken);
      if (res.status === "success" && res.idToken) {
        localStorage.setItem("authToken", res.idToken);
        try {
          const profile = await AuthService.getProfile(res.uid);
          setUser(profile);
          if (profile.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
          setUser({ id: res.uid, name: result.user.displayName || "User", email: result.user.email || "", role: res.role });
          if (res.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        }
      } else {
        setError(res.status !== "success" ? res.status : "Đăng nhập Google thất bại");
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(err);
      setError("Lỗi kết nối Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-6 relative">
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="absolute top-0 z-50 w-full max-w-sm bg-green-50 border border-green-200 rounded-2xl p-4 shadow-lg flex items-start gap-4"
          >
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-green-800 text-sm mb-1">Đăng ký thành công!</h3>
              <p className="text-green-700 text-xs font-medium mb-3">
                Một email xác nhận đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra email và nhấp vào liên kết để kích hoạt tài khoản.
              </p>
              <button 
                onClick={() => setShowSuccessPopup(false)}
                className="text-xs font-bold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px] mt-8"
      >
        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Brain className="w-12 h-12 text-[#2563EB]" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              Đăng nhập EduTalk
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Chào mừng trở lại! Tiếp tục hành trình khám phá tương lai cùng EduTalk.
            </p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleEmailLogin}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@huit.edu.vn"
                  required
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" /> 
                <span>{loading ? "Đang xử lý..." : "Đăng nhập"}</span>
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
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-50"
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

