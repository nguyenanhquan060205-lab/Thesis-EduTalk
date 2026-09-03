"use client";

import {  
  Lock, 
  Bell,  
  LogOut, 
  Shield, 
  Check, 
  ShieldAlert,  
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"security" | "notifications">("security");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifOn, setNotifOn] = useState<boolean | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  
  const router = useRouter();
  const { logout, user } = useAuthStore();


  // Đọc trạng thái thông báo thật từ hồ sơ (bản cũ dùng defaultChecked gán cứng).
  // Sửa thông tin cá nhân nằm ở /profile, không nhân đôi form ở đây.
  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/api/v1/users/${user.id}`)
      .then((r) => setNotifOn(r.data?.isNotificationEnabled !== false))
      .catch(() => setNotifOn(true));
  }, [user?.id]);

  // Bản trước KHÔNG gọi API nào: chỉ setSavedSuccess(true) rồi xóa ô nhập, nên
  // người dùng tưởng đã đổi mật khẩu trong khi mật khẩu không hề thay đổi.
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!currentPass) return setErrorMsg("Vui lòng nhập mật khẩu hiện tại.");
    if (!newPass || newPass.length < 6)
      return setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (newPass !== confirmPass) return setErrorMsg("Xác nhận mật khẩu không khớp.");

    setSaving(true);
    try {
      await api.post("/api/v1/auth/change-password", {
        currentPassword: currentPass,
        newPassword: newPass,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorMsg(detail || "Không đổi được mật khẩu. Kiểm tra lại mật khẩu hiện tại.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      logout();
      router.push("/auth/login");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-2 pb-24 animate-fade-in-up space-y-8">
      
      {/* Top Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
            Hồ Sơ & Tùy Chọn
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Cài Đặt Tài Khoản & Bảo Mật
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm font-medium mt-1">
          Quản lý mật khẩu đăng nhập, quyền riêng tư và tùy chỉnh thông báo tuyển sinh HUIT 2026.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar Nav */}
        <div className="md:col-span-4 space-y-2">
          <button 
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Bảo Mật & Mật Khẩu</span>
          </button>

          <button 
            onClick={() => setActiveTab("notifications")}
            className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-extrabold flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'notifications' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Thông báo</span>
          </button>

          <div className="pt-3 border-t border-slate-100">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition flex items-center gap-3 border border-rose-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng Xuất Khỏi Hệ Thống</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          
          {activeTab === "security" && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Thay Đổi Mật Khẩu</h2>
                  <p className="text-xs text-slate-400 font-medium">Bảo vệ tài khoản đăng ký xét tuyển của bạn.</p>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Đã đổi mật khẩu thành công. Lần đăng nhập tới hãy dùng mật khẩu mới.</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Mật khẩu hiện tại
                  </label>
                  <input 
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Mật khẩu mới (Tối thiểu 6 ký tự)
                  </label>
                  <input 
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Nhập lại mật khẩu mới
                  </label>
                  <input 
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition font-medium"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    {saving ? "Đang đổi…" : "Đổi mật khẩu"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-black text-slate-900">Thông Báo Tuyển Sinh</h2>
                <p className="text-xs text-slate-400 font-medium">Nhận thông báo qua email khi có điểm chuẩn hoặc học bổng mới.</p>
              </div>

              {/* Backend chỉ có MỘT trường `isNotificationEnabled`. Bản cũ bày 4 công
                  tắc riêng biệt, không cái nào lưu đi đâu cả. */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer text-xs">
                <span className="font-bold text-slate-700">
                  Nhận thông báo từ EduTalk
                  <span className="block text-[11px] font-medium text-slate-400 mt-0.5">
                    Kết quả tư vấn, tin tuyển sinh mới và nhắc nhở mốc thời gian quan trọng.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={!!notifOn}
                  disabled={notifOn === null || notifSaving}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setNotifOn(val);
                    setNotifSaving(true);
                    try {
                      if (user?.id)
                        await api.put(`/api/v1/users/${user.id}`, {
                          isNotificationEnabled: val,
                        });
                    } catch {
                      setNotifOn(!val); // ghi hỏng thì trả công tắc về trạng thái cũ
                      alert("Không lưu được thiết lập. Vui lòng thử lại.");
                    } finally {
                      setNotifSaving(false);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded shrink-0"
                />
              </label>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
