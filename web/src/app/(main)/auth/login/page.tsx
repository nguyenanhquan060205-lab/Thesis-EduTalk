"use client";

import Link from "next/link";
import { Mail, Lock, LogIn, CheckCircle2, Eye, EyeOff, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { AuthService } from "@/services/auth";
import { apiError } from "@/services/profile";
import { useAuthStore } from "@/store/useAuthStore";

function LoginFormContent() {
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
        // Dọn phiên Firebase Web SDK còn sót của lần đăng nhập Google trước.
        // Không dọn thì interceptor sẽ ưu tiên `auth.currentUser` và gắn token
        // của người dùng cũ vào mọi request của người vừa đăng nhập.
        await signOut(auth).catch(() => {});
        localStorage.setItem("authToken", res.idToken);
        
        try {
          const profile = await AuthService.getProfile(res.uid);
          setUser(profile);
          if (profile.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        } catch {
          setUser({ id: res.uid, name: email.split("@")[0], email, role: res.role });
          if (res.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        }
      } else {
        setError(res.status === "success" ? "Thiếu Token xác thực." : res.status);
      }
    } catch (err: unknown) {
      setError(apiError(err, "Email hoặc mật khẩu không chính xác."));
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
      if (res.status === "success") {
        localStorage.setItem("authToken", idToken);
        try {
          const profile = await AuthService.getProfile(res.uid);
          setUser(profile);
          // Tài khoản Google chưa có giới tính → hỏi ngay, đừng để mô hình đoán
          // mặc định "Nu" (mất 3,9 điểm Top-3 trên 102 sinh viên thật).
          if (res.needsProfile) {
            router.push("/profile?setup=1");
          } else if (profile.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        } catch {
          setUser({ id: res.uid, name: result.user.displayName || "User", email: result.user.email || "", role: res.role });
          if (res.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/");
          }
        }
      } else {
        setError("Đăng nhập bằng Google thất bại.");
      }
    } catch {
      setError("Không thể kết nối đến tài khoản Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h3 className="font-extrabold text-emerald-900">Đăng ký thành công!</h3>
              <p className="text-emerald-700 font-medium mt-0.5">
                Vui lòng đăng nhập bằng tài khoản vừa tạo để tiếp tục trải nghiệm.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Đăng Nhập Cổng Tuyển Sinh
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Hệ thống Tư vấn & Định hướng Nghề nghiệp HUIT 2026
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailLogin}>
          {/* Email */}
          <div className="space-y-1">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Email đăng ký
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="thisinh@huit.edu.vn"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Mật khẩu
              </label>
              <Link href="#" className="text-xs font-bold text-blue-600 hover:underline">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> 
              <span>{loading ? "Đang xác thực..." : "Đăng Nhập"}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-3 text-slate-400 text-[10px] font-black uppercase">Hoặc</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Google Auth */}
          <button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-3 transition shadow-xs disabled:opacity-50"
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

      <p className="text-center text-xs font-semibold text-slate-500 mt-6">
        Chưa có tài khoản tuyển sinh?{" "}
        <Link href="/auth/register" className="text-blue-600 font-extrabold hover:underline">
          Đăng ký tài khoản mới
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-8">
      <Suspense fallback={
        <div className="text-center py-12 text-slate-400 text-xs font-bold">
          Đang tải form đăng nhập...
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
