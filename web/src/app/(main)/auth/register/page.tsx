"use client";

import Link from "next/link";
import { Mail, Lock, UserPlus, User, Phone, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import OtpDialog, { type OtpFailure } from "@/components/ui/OtpDialog";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Lưu vào hồ sơ để mô hình gợi ý ngành dùng lại, không hỏi lại ở mỗi lần khảo sát
  const [gender, setGender] = useState("Nam");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      setLoading(false);
      return;
    }

    try {
      const res = await AuthService.register(name, email, password, phone, gender);
      if (res.status !== "success") {
        setError(res.detail || "Đăng ký không thành công.");
        return;
      }

      // Chỉ gửi mã, KHÔNG đăng nhập trước. Đăng nhập ở đây từng làm hỏng luồng:
      // token và hồ sơ trong store lệch nhau, dẫn tới 403 khi lưu hồ sơ.
      // Đăng nhập diễn ra sau khi xác minh xong, hoặc do người dùng tự làm sau.
      await AuthService.sendOtp(email);
      setOtpOpen(true);
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
        ?.detail;
      setError(
        typeof d === "string" ? d : "Email đã tồn tại hoặc máy chủ bận."
      );
    } finally {
      setLoading(false);
    }
  };

  /** Sai mã quá 3 lần — backend đã xoá tài khoản, dọn sạch phía client. */
  const datLaiDangKy = (f: OtpFailure) => {
    setOtpOpen(false);
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setGender("Nam");
    setError(
      f.message ||
        "Xác thực thất bại, tài khoản đã bị hủy. Vui lòng đăng ký lại từ đầu."
    );
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-8 animate-fade-in-up">
      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tạo Hồ Sơ Tuyển Sinh Mới
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Đăng ký để lưu kết quả định hướng và nhận thông báo học bổng HUIT 2026
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Họ và tên thí sinh
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Số điện thoại liên hệ
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>
            </div>

            {/* Giới tính */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Giới tính
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: "Nam", label: "Nam" },
                  { value: "Nu", label: "Nữ" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setGender(o.value)}
                    className={`py-3 rounded-xl text-xs sm:text-sm font-black transition border ${
                      gender === o.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                Dùng cho hệ thống gợi ý ngành học. Bạn sẽ không phải nhập lại ở bài khảo sát.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Email cá nhân
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="thisinh@gmail.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Mật khẩu (Tối thiểu 6 ký tự)
              </label>
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

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                <UserPlus className="w-4 h-4" /> 
                <span>{loading ? "Đang xử lý..." : "Tạo Tài Khoản"}</span>
              </button>
            </div>
          </form>

        </div>

        <p className="text-center text-xs font-semibold text-slate-500 mt-6">
          Đã có tài khoản tuyển sinh?{" "}
          <Link href="/auth/login" className="text-blue-600 font-extrabold hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>

      <OtpDialog
        open={otpOpen}
        target={email}
        title="Xác minh email đăng ký"
        onVerify={(otp) => AuthService.verifyRegistration(email, otp)}
        onResend={() => AuthService.sendOtp(email)}
        onSuccess={async () => {
          setOtpOpen(false);
          // Xác minh xong mới đăng nhập — lúc này token chắc chắn khớp tài khoản
          try {
            // Dọn phiên Firebase Web SDK cũ trước, nếu không interceptor sẽ
            // ưu tiên `auth.currentUser` của người dùng trước đó
            await signOut(auth).catch(() => {});
            const dn = await AuthService.login(email, password);
            if (dn?.idToken) {
              localStorage.setItem("authToken", dn.idToken);
              const hs = await AuthService.getProfile(dn.uid);
              setUser(hs);
              router.push("/");
              return;
            }
          } catch {
            /* rơi xuống trang đăng nhập bên dưới */
          }
          router.push("/auth/login?registered=true");
        }}
        onReset={datLaiDangKy}
        // Đóng giữa chừng vẫn vào được ứng dụng, chỉ chưa đăng bài / bình luận được
        onClose={() => {
          setOtpOpen(false);
          router.push("/auth/login?registered=true");
        }}
      />
    </div>
  );
}
