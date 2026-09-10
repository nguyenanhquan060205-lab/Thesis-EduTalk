"use client";

import {
  Mail,
  Phone,
  School,
  Pencil,
  GraduationCap,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  BarChart3,
  Layers,
  Check,
  X,
  Target,
  User,
  ChevronRight,
  Clock,
  Sparkle
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ProfileService,
  apiError,
  type UserProfile,
  type ProfileEditable,
} from "@/services/profile";
import OtpDialog, { bocLoiOtp } from "@/components/ui/OtpDialog";
import {
  HistoryService,
  favouriteMajor,
  favouriteBlock,
  type HistoryEntry,
} from "@/services/history";

const RONG: ProfileEditable = { name: "", phone: "", school: "", dob: "", gender: "" };

/**
 * Ô thông tin: mặc định KHÓA, chỉ mở khi người dùng bấm "Chỉnh sửa".
 * Trường chưa có dữ liệu thì ghi rõ "Chưa cập nhật", không độn giá trị mẫu.
 */
function Field({
  icon: Icon,
  label,
  value,
  editing,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs transition-all">
      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#0054A6]">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">
          {label}
        </span>
        {editing ? (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 mt-0.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/15 transition"
          />
        ) : value ? (
          <strong className="text-xs font-bold text-slate-900 break-words">{value}</strong>
        ) : (
          <span className="text-xs font-bold text-slate-400 italic">Chưa cập nhật</span>
        )}
      </div>
    </div>
  );
}

function ProfileContent() {
  const { user } = useAuthStore();
  const setup = useSearchParams()?.get("setup") === "1";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileEditable>(RONG);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [emailStep, setEmailStep] = useState<
    "none" | "nhap_cu" | "otp_cu" | "nhap_moi" | "otp_moi"
  >("none");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [xacMinhOpen, setXacMinhOpen] = useState(false);

  const nap = (uid: string, moSanKhiThieuGioiTinh = false) =>
    Promise.allSettled([ProfileService.get(uid), HistoryService.list(uid)]).then(
      ([p, h]) => {
        if (h.status === "fulfilled") setHistory(h.value);
        if (p.status !== "fulfilled") return;
        const hs = p.value;
        setProfile(hs);
        if (moSanKhiThieuGioiTinh && !hs.gender) {
          setForm({
            name: hs.name ?? "",
            phone: hs.phone ?? "",
            school: hs.school ?? "",
            dob: hs.dob ?? "",
            gender: "",
          });
          setEditing(true);
        }
      }
    );

  useEffect(() => {
    if (!user?.id) return;
    nap(user.id, setup).finally(() => setLoaded(true));
  }, [user?.id, setup]);

  const loading = !!user?.id && !loaded;

  const batDauSua = () => {
    const p = profile ?? {};
    setForm({
      name: p.name ?? "",
      phone: p.phone ?? "",
      school: p.school ?? "",
      dob: p.dob ?? "",
      gender: p.gender ?? "",
    });
    setMsg(null);
    setEditing(true);
  };

  const huy = () => {
    setEditing(false);
    setForm(RONG);
    setMsg(null);
    setEmailStep("none");
    setNewEmail("");
    setEmailMsg(null);
  };

  const luu = async () => {
    if (!user?.id) return;
    if (!form.name.trim()) {
      setMsg({ ok: false, text: "Họ tên không được để trống." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await ProfileService.update(user.id, form);
      await nap(user.id);
      setEditing(false);
      setMsg({ ok: true, text: "Đã lưu thông tin hồ sơ thành công." });
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, "Không lưu được. Vui lòng thử lại.") });
    } finally {
      setSaving(false);
    }
  };

  const HOP_LE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const xacNhanEmailCu = async () => {
    const e = currentEmail.trim().toLowerCase();
    if (!HOP_LE.test(e)) {
      setEmailMsg({ ok: false, text: "Email không hợp lệ." });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      await ProfileService.emailChangeStart(e);
      setEmailStep("otp_cu");
    } catch (err) {
      const f = bocLoiOtp(err, "Không gửi được mã xác minh.");
      if (f.reset) datLaiDoiEmail(f);
      else setEmailMsg({ ok: false, text: f.message });
    } finally {
      setEmailBusy(false);
    }
  };

  const guiMaEmailMoi = async () => {
    const e = newEmail.trim().toLowerCase();
    if (!HOP_LE.test(e)) {
      setEmailMsg({ ok: false, text: "Email không hợp lệ." });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      await ProfileService.emailChangeSetNew(e);
      setEmailStep("otp_moi");
    } catch (err) {
      const f = bocLoiOtp(err, "Không gửi được mã xác minh.");
      if (f.reset) datLaiDoiEmail(f);
      else setEmailMsg({ ok: false, text: f.message });
    } finally {
      setEmailBusy(false);
    }
  };

  const datLaiDoiEmail = (f: { message?: string }) => {
    setEmailStep("none");
    setCurrentEmail("");
    setNewEmail("");
    setEmailMsg({
      ok: false,
      text:
        f.message ||
        "Phiên xác thực bị huỷ, email giữ nguyên. Hãy thử đổi lại từ đầu.",
    });
  };

  const huyDoiEmail = () => {
    void ProfileService.emailChangeCancel().catch(() => {});
    setEmailStep("none");
    setCurrentEmail("");
    setNewEmail("");
    setEmailMsg(null);
  };

  const guiLaiXacMinh = async () => {
    setEmailBusy(true);
    try {
      await ProfileService.verifyMyEmailSend();
      setXacMinhOpen(true);
    } catch (e) {
      alert(apiError(e, "Không gửi được mã xác minh."));
    } finally {
      setEmailBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold text-slate-600">Đang tải hồ sơ thí sinh…</p>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Bạn chưa đăng nhập</h2>
        <p className="text-sm text-slate-600 font-medium">
          Đăng nhập để xem hồ sơ và lịch sử tư vấn ngành của mình.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition"
        >
          Đăng nhập <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const p = profile ?? {};
  const name = p.name || user.name || "Người dùng";
  const joined = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-4xl mx-auto mt-2 pb-24 space-y-6 px-4 sm:px-0">
      
      {/* ==================================================================== */}
      {/* 1. THẺ DANH TÍNH HỒ SƠ CHÍNH (PREMIUM IDENTITY CARD)                 */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Cover Header Banner */}
        <div className="h-44 sm:h-48 bg-gradient-to-r from-[#002855] via-[#0054A6] to-[#0072CE] relative overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10" />
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          {/* Top Bar on Banner */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-[11px] font-black tracking-wider uppercase">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-300" />
              <span>Cổng Hồ Sơ Thí Sinh · HUIT EduTalk 2026</span>
            </div>

            {p.role === "admin" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản trị viên</span>
              </span>
            )}
          </div>

          {/* Join Date Watermark */}
          {joined && (
            <div className="relative z-10 text-right text-[11px] font-semibold text-white/80">
              Gia nhập từ {joined}
            </div>
          )}
        </div>

        {/* Profile Details Container */}
        <div className="px-6 sm:px-10 pb-8 relative">
          
          {/* Header Row: Avatar + Info + Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between mb-8 pt-4">
            {/* Left: Avatar with negative margin + Name cleanly positioned below banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
              {/* Only the avatar pulls up into the banner */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 z-10">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white shadow-xl bg-gradient-to-tr from-[#0054A6] via-blue-600 to-indigo-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xs" title="Tài khoản đang hoạt động">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* User Identity - 100% on the white background, NOT pulled up */}
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {name}
                  </h1>
                  {p.isPremium && (
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⭐ Premium
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>Thí sinh xét tuyển HUIT</span>
                  {p.school && (
                    <>
                      <span>·</span>
                      <span className="text-slate-700 font-bold">{p.school}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {editing ? (
                <>
                  <button
                    onClick={huy}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                  <button
                    onClick={luu}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#00478F] text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    <Check className="w-4 h-4" /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                </>
              ) : (
                <button
                  onClick={batDauSua}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa hồ sơ
                </button>
              )}
            </div>
          </div>

          {/* Setup / Notice Alert */}
          {setup && !p.gender && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#0054A6] shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 font-medium leading-relaxed">
                <strong>Hoàn tất hồ sơ trước khi bắt đầu.</strong> Đăng nhập bằng Google không kèm giới tính, mà mô hình gợi ý ngành có dùng trường này để cá nhân hóa phân tích. Vui lòng chọn Giới tính bên dưới rồi bấm <strong>Lưu thay đổi</strong>.
              </p>
            </div>
          )}

          {msg && (
            <div
              className={`mb-6 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                msg.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {msg.ok ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {p.emailVerified === false && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-900 font-medium leading-relaxed flex-1">
                <strong>Email chưa được xác minh.</strong> Bạn vẫn tra cứu ngành và làm khảo sát bình thường, nhưng cần xác minh để tham gia thảo luận trên Diễn đàn cộng đồng.
              </p>
              <button
                onClick={guiLaiXacMinh}
                disabled={emailBusy}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-black transition shrink-0 cursor-pointer"
              >
                {emailBusy ? "Đang gửi…" : "Gửi mã xác minh"}
              </button>
            </div>
          )}

          {/* ================================================================ */}
          {/* 2. BẢNG 3 CHỈ SỐ HOẠT ĐỘNG KHẢO SÁT (ACTIVITY METRICS)           */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
            {/* Metric 1 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 hover:border-blue-200 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#0054A6] flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {p.usageCount ?? history.length}
                </div>
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-tight mt-0.5">
                  Lần tư vấn định hướng
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 hover:border-emerald-200 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Target className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-2xl font-black text-slate-900 leading-tight">
                  {favouriteBlock(history) ?? "—"}
                </div>
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-tight mt-0.5">
                  Tổ hợp thi hay dùng
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 hover:border-indigo-200 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-base font-black text-slate-900 truncate leading-tight">
                  {favouriteMajor(history) ?? "—"}
                </div>
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">
                  Ngành gợi ý nhiều nhất
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. THÔNG TIN CHI TIẾT THEO 2 KHỐI RÕ RÀNG                        */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CỘT TRÁI: THÔNG TIN TÀI KHOẢN & LIÊN HỆ */}
            <div className="bg-slate-50/70 p-5 sm:p-6 rounded-3xl border border-slate-200/90 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0054A6]" />
                <span>Thông tin tài khoản & liên hệ</span>
              </h3>

              {/* Email đăng nhập */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#0054A6]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">
                      Email đăng nhập
                    </span>
                    <strong className="text-xs font-bold text-slate-900 break-words">
                      {p.email || user.email}
                    </strong>
                    {p.emailDaChe && (
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Đã ẩn bớt để bảo mật
                      </span>
                    )}
                  </div>
                  {emailStep === "none" && (
                    <button
                      onClick={() => {
                        setEmailStep("nhap_cu");
                        setEmailMsg(null);
                        setCurrentEmail("");
                        setNewEmail("");
                      }}
                      className="text-[11px] font-black text-[#0054A6] hover:underline shrink-0 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 cursor-pointer"
                    >
                      Đổi email
                    </button>
                  )}
                </div>

                {emailStep !== "none" && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    {[
                      { m: "nhap_cu", n: "Xác nhận" },
                      { m: "otp_cu", n: "Mã hộp thư cũ" },
                      { m: "nhap_moi", n: "Email mới" },
                      { m: "otp_moi", n: "Mã hộp thư mới" },
                    ].map((b, i, ds) => {
                      const dang = ds.findIndex((x) => x.m === emailStep);
                      const xong = i < dang;
                      return (
                        <div key={b.m} className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap ${
                              i === dang
                                ? "bg-[#0054A6] text-white"
                                : xong
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {i + 1}. {b.n}
                          </span>
                          {i < ds.length - 1 && (
                            <span className="text-slate-300 text-[9px]">›</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {emailStep === "nhap_cu" && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhập <strong className="text-slate-700">đầy đủ</strong> email hiện tại để xác nhận. Mã 6 số sẽ gửi tới chính hộp thư đó.
                    </p>
                    <input
                      type="email"
                      value={currentEmail}
                      onChange={(e) => setCurrentEmail(e.target.value)}
                      placeholder={p.email || "email-hien-tai@gmail.com"}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/15"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={xacNhanEmailCu}
                        disabled={emailBusy}
                        className="flex-1 py-2 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-[11px] font-black transition disabled:opacity-60 cursor-pointer"
                      >
                        {emailBusy ? "Đang gửi…" : "Gửi mã tới email này"}
                      </button>
                      <button
                        onClick={huyDoiEmail}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer hover:bg-slate-50"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {emailStep === "nhap_moi" && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Đã xác minh hộp thư hiện tại.
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhập email mới, mã xác minh 6 số sẽ gửi tới địa chỉ đó.
                    </p>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email-moi@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/15"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={guiMaEmailMoi}
                        disabled={emailBusy}
                        className="flex-1 py-2 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-[11px] font-black transition disabled:opacity-60 cursor-pointer"
                      >
                        {emailBusy ? "Đang gửi…" : "Gửi mã xác minh"}
                      </button>
                      <button
                        onClick={huyDoiEmail}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer hover:bg-slate-50"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {emailMsg && (
                  <p
                    className={`text-[11px] font-bold ${
                      emailMsg.ok ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {emailMsg.text}
                  </p>
                )}
              </div>

              {/* Số điện thoại */}
              <Field
                icon={Phone}
                label="Số điện thoại liên hệ"
                type="tel"
                value={editing ? form.phone : (p.phone ?? "")}
                editing={editing}
                placeholder="0900 000 000"
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>

            {/* CỘT PHẢI: THÔNG TIN HỌC TẬP & NHÂN KHẨU */}
            <div className="bg-slate-50/70 p-5 sm:p-6 rounded-3xl border border-slate-200/90 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <School className="w-4 h-4 text-[#0054A6]" />
                <span>Thông tin học tập & nhân khẩu</span>
              </h3>

              {/* Trường THPT */}
              <Field
                icon={School}
                label="Trường THPT đang theo học / tốt nghiệp"
                value={editing ? form.school : (p.school ?? "")}
                editing={editing}
                placeholder="VD: THPT Lê Trọng Tấn..."
                onChange={(v) => setForm({ ...form, school: v })}
              />

              {/* Ngày sinh */}
              <Field
                icon={Calendar}
                label="Ngày tháng năm sinh"
                value={editing ? form.dob : (p.dob ?? "")}
                editing={editing}
                placeholder="DD/MM/YYYY"
                onChange={(v) => setForm({ ...form, dob: v })}
              />

              {/* Giới tính */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#0054A6]">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">
                    Giới tính thí sinh
                  </span>
                  {editing ? (
                    <div className="flex gap-2 mt-1.5">
                      {[
                        { v: "Nam", l: "Nam" },
                        { v: "Nu", l: "Nữ" },
                      ].map((g) => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => setForm({ ...form, gender: g.v })}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            form.gender === g.v
                              ? "bg-[#0054A6] text-white border-[#0054A6] shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {g.l}
                        </button>
                      ))}
                    </div>
                  ) : p.gender ? (
                    <strong className="text-xs font-bold text-slate-900">
                      {p.gender === "Nam" ? "Nam" : "Nữ"}
                    </strong>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 italic">
                      Chưa cập nhật
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {!p.gender && !editing && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Hồ sơ chưa có thông tin giới tính. Mô hình Machine Learning có dùng trường này để xếp hạng — vui lòng bấm
                <strong> Chỉnh sửa hồ sơ</strong> để bổ sung giúp kết quả tư vấn chuẩn xác hơn.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. PHÍM TẮT ĐIỀU HƯỚNG NHANH (QUICK SHORTCUTS)                       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/history"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#0054A6]/60 hover:shadow-md transition flex items-center justify-between gap-4 group cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#0054A6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition">
                Xem Lịch Sử Khảo Sát Chi Tiết
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {history.length > 0 ? `Đã lưu ${history.length} lần tư vấn định hướng` : "Chưa có lượt khảo sát nào"}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0054A6] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>

        <Link
          href="/predict"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#0054A6]/60 hover:shadow-md transition flex items-center justify-between gap-4 group cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition">
                Thực Hiện Khảo Sát Tư Vấn Mới
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Cập nhật điểm thi 15 tổ hợp & 10 câu sở thích
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#0054A6] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      </div>

      {/* OTP DIALOGS */}
      <OtpDialog
        open={emailStep === "otp_cu"}
        target={currentEmail.trim().toLowerCase()}
        title="Xác minh hộp thư hiện tại"
        onVerify={(otp) => ProfileService.emailChangeVerifyOld(otp)}
        onResend={() => ProfileService.emailChangeStart(currentEmail.trim().toLowerCase())}
        onSuccess={() => {
          setEmailStep("nhap_moi");
          setEmailMsg(null);
        }}
        onReset={datLaiDoiEmail}
        onClose={huyDoiEmail}
      />

      <OtpDialog
        open={emailStep === "otp_moi"}
        target={newEmail.trim().toLowerCase()}
        title="Xác minh email mới"
        onVerify={(otp) => ProfileService.changeEmail(newEmail.trim().toLowerCase(), otp)}
        onResend={() => ProfileService.emailChangeSetNew(newEmail.trim().toLowerCase())}
        onSuccess={async () => {
          setEmailStep("none");
          setCurrentEmail("");
          setNewEmail("");
          if (user?.id) await nap(user.id);
          setEmailMsg({
            ok: true,
            text: "Đã đổi email thành công. Lần đăng nhập tới hãy dùng địa chỉ mới.",
          });
        }}
        onReset={datLaiDoiEmail}
        onClose={huyDoiEmail}
      />

      <OtpDialog
        open={xacMinhOpen}
        target={p.email || user.email || ""}
        title="Xác minh email"
        onVerify={(otp) => ProfileService.verifyMyEmailConfirm(otp)}
        onResend={() => ProfileService.verifyMyEmailSend()}
        onSuccess={async () => {
          setXacMinhOpen(false);
          if (user?.id) await nap(user.id);
        }}
        onReset={(f) => {
          setXacMinhOpen(false);
          alert(f.message);
        }}
        onClose={() => setXacMinhOpen(false)}
      />

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-12 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
