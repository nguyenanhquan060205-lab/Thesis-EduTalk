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
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ProfileService,
  apiError,
  type UserProfile,
  type ProfileEditable,
} from "@/services/profile";
import { AuthService } from "@/services/auth";
import OtpDialog from "@/components/ui/OtpDialog";
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
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#0054A6]" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
          {label}
        </span>
        {editing ? (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 mt-0.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/15 transition"
          />
        ) : value ? (
          <strong className="text-xs font-bold text-slate-800 break-words">{value}</strong>
        ) : (
          <span className="text-xs font-bold text-slate-400 italic">Chưa cập nhật</span>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  // ?setup=1 — vừa đăng nhập Google lần đầu, hồ sơ còn thiếu giới tính
  const setup = useSearchParams()?.get("setup") === "1";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileEditable>(RONG);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Đổi email đi đường riêng vì phải xác minh OTP
  const [emailStep, setEmailStep] = useState<"none" | "nhap" | "otp">("none");
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Popup nhập mã: một cái để đổi email, một cái để xác minh email hiện tại
  const [xacMinhOpen, setXacMinhOpen] = useState(false);

  const nap = (uid: string, moSanKhiThieuGioiTinh = false) =>
    Promise.allSettled([ProfileService.get(uid), HistoryService.list(uid)]).then(
      ([p, h]) => {
        if (h.status === "fulfilled") setHistory(h.value);
        if (p.status !== "fulfilled") return;
        const hs = p.value;
        setProfile(hs);
        // Google không trả giới tính nên tài khoản mới luôn thiếu trường này.
        // Mở sẵn chế độ sửa thay vì bắt người dùng tự mò nút "Chỉnh sửa".
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
      setMsg({ ok: true, text: "Đã lưu thông tin hồ sơ." });
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, "Không lưu được. Vui lòng thử lại.") });
    } finally {
      setSaving(false);
    }
  };

  const guiMa = async () => {
    const e = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailMsg({ ok: false, text: "Email không hợp lệ." });
      return;
    }
    if (e === (profile?.email ?? "").toLowerCase()) {
      setEmailMsg({ ok: false, text: "Email mới trùng với email hiện tại." });
      return;
    }
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      await ProfileService.sendOtp(e);
      setEmailStep("otp");
      setEmailMsg(null);
    } catch (err) {
      setEmailMsg({ ok: false, text: apiError(err, "Không gửi được mã xác minh.") });
    } finally {
      setEmailBusy(false);
    }
  };

  const datLaiDoiEmail = (f: { message?: string }) => {
    setEmailStep("none");
    setNewEmail("");
    setEmailMsg({
      ok: false,
      text: f.message || "Phiên xác thực bị huỷ. Hãy thử đổi email lại từ đầu.",
    });
  };

  /** Gửi lại mã xác minh cho email HIỆN TẠI (khi hồ sơ chưa xác minh). */
  const guiLaiXacMinh = async () => {
    const em = profile?.email ?? user?.email;
    if (!em) return;
    setEmailBusy(true);
    try {
      await ProfileService.sendOtp(em);
      setXacMinhOpen(true);
    } catch (e) {
      alert(apiError(e, "Không gửi được mã xác minh."));
    } finally {
      setEmailBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải hồ sơ…</p>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
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
    <div className="max-w-4xl mx-auto mt-2 pb-24 animate-fade-in-up space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-40 bg-gradient-to-r from-[#003B73] via-[#0054A6] to-[#0072CE] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
        </div>

        <div className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-16 mb-7">
            <div className="w-28 h-28 rounded-3xl border-4 border-white shrink-0 shadow-lg relative z-10 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl">
              {name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  {p.role === "admin" ? "Quản trị viên" : "Thí sinh"}
                </span>
                {p.isPremium && (
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Premium
                  </span>
                )}
                {joined && (
                  <span className="text-xs text-slate-400 font-semibold">
                    Tham gia từ {joined}
                  </span>
                )}
              </div>
            </div>

            {/* Xem → khoá. Bấm "Chỉnh sửa" mới mở ô nhập, xong bấm "Lưu" mới ghi. */}
            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <button
                    onClick={huy}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                  <button
                    onClick={luu}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" /> {saving ? "Đang lưu…" : "Lưu"}
                  </button>
                </>
              ) : (
                <button
                  onClick={batDauSua}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Chỉnh sửa
                </button>
              )}
            </div>
          </div>

          {setup && !p.gender && (
            <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#0054A6] shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-900 font-medium leading-relaxed">
                <strong>Hoàn tất hồ sơ trước khi bắt đầu.</strong> Đăng nhập bằng Google
                không kèm giới tính, mà mô hình gợi ý ngành có dùng trường này — thiếu nó
                thì độ chính xác Top-3 giảm khoảng 4 điểm phần trăm. Chọn giúp một lựa
                chọn bên dưới rồi bấm <strong>Lưu</strong>.
              </p>
            </div>
          )}

          {msg && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
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
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-900 font-medium leading-relaxed flex-1">
                <strong>Email chưa được xác minh.</strong> Bạn vẫn tra cứu ngành và làm
                khảo sát bình thường, nhưng chưa đăng bài hay bình luận ở Cộng đồng được.
              </p>
              <button
                onClick={guiLaiXacMinh}
                disabled={emailBusy}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-[11px] font-black transition shrink-0"
              >
                {emailBusy ? "Đang gửi…" : "Gửi mã xác minh"}
              </button>
            </div>
          )}

          {/* Số liệu từ hoạt động thật của chính người dùng */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">
            <div className="p-4 rounded-2xl bg-[#F5F8FA] border border-slate-100 text-center">
              <div className="text-2xl font-black text-[#0054A6]">
                {p.usageCount ?? history.length}
              </div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-0.5">
                Lần tư vấn
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F5F8FA] border border-slate-100 text-center">
              <div className="text-2xl font-black text-[#0054A6]">
                {favouriteBlock(history) ?? "—"}
              </div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-0.5">
                Tổ hợp hay dùng
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F5F8FA] border border-slate-100 text-center col-span-2 sm:col-span-1">
              <div className="text-sm font-black text-[#0054A6] leading-tight min-h-[2rem] flex items-center justify-center">
                {favouriteMajor(history) ?? "—"}
              </div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mt-0.5">
                Ngành được gợi ý nhiều nhất
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Thông tin liên hệ
              </h3>

              {/* Email là tài khoản đăng nhập nên có nút "Đổi" riêng, luôn thấy
                  chứ không phải bấm "Chỉnh sửa" mới hiện. Đổi phải qua OTP. */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-[#0054A6]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                      Email đăng nhập
                    </span>
                    <strong className="text-xs font-bold text-slate-800 break-words">
                      {p.email || user.email}
                    </strong>
                  </div>
                  {emailStep === "none" && (
                    <button
                      onClick={() => {
                        setEmailStep("nhap");
                        setEmailMsg(null);
                        setNewEmail("");
                      }}
                      className="text-[11px] font-black text-[#0054A6] hover:underline shrink-0"
                    >
                      Đổi
                    </button>
                  )}
                </div>

                {emailStep === "nhap" && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Nhập email mới, mã 6 số sẽ được gửi tới địa chỉ đó.
                    </p>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email-moi@gmail.com"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/15"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={guiMa}
                        disabled={emailBusy}
                        className="flex-1 py-2 rounded-lg bg-[#0054A6] hover:bg-[#0072CE] text-white text-[11px] font-black transition disabled:opacity-60"
                      >
                        {emailBusy ? "Đang gửi…" : "Gửi mã xác minh"}
                      </button>
                      <button
                        onClick={() => {
                          setEmailStep("none");
                          setEmailMsg(null);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold"
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

              <Field
                icon={Phone}
                label="Số điện thoại"
                type="tel"
                value={editing ? form.phone : (p.phone ?? "")}
                editing={editing}
                placeholder="0900 000 000"
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Thông tin học tập
              </h3>
              <Field
                icon={School}
                label="Trường THPT"
                value={editing ? form.school : (p.school ?? "")}
                editing={editing}
                placeholder="THPT ..."
                onChange={(v) => setForm({ ...form, school: v })}
              />
              <Field
                icon={Calendar}
                label="Ngày sinh"
                value={editing ? form.dob : (p.dob ?? "")}
                editing={editing}
                placeholder="DD/MM/YYYY"
                onChange={(v) => setForm({ ...form, dob: v })}
              />

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-[#0054A6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                    Giới tính
                  </span>
                  {editing ? (
                    <div className="flex gap-1.5 mt-1">
                      {[
                        { v: "Nam", l: "Nam" },
                        { v: "Nu", l: "Nữ" },
                      ].map((g) => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => setForm({ ...form, gender: g.v })}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                            form.gender === g.v
                              ? "bg-[#0054A6] text-white border-[#0054A6]"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {g.l}
                        </button>
                      ))}
                    </div>
                  ) : p.gender ? (
                    <strong className="text-xs font-bold text-slate-800">
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
            <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                Hồ sơ chưa có giới tính. Mô hình gợi ý ngành có dùng trường này — bấm
                <strong> Chỉnh sửa</strong> để bổ sung, kết quả sẽ chính xác hơn.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/history"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#0054A6]/60 hover:shadow-md transition flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F8FA] text-[#0054A6] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition">
                Lịch sử tư vấn
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {history.length > 0 ? `${history.length} lần đã lưu` : "Chưa có lần nào"}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
        </Link>

        <Link
          href="/predict"
          className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#0054A6]/60 hover:shadow-md transition flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F8FA] text-[#0054A6] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 group-hover:text-[#0054A6] transition">
                Làm khảo sát mới
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Cập nhật điểm thi và sở thích
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
        </Link>
      </div>

      {/* Đổi email: mã gửi tới địa chỉ MỚI */}
      <OtpDialog
        open={emailStep === "otp"}
        target={newEmail}
        title="Xác minh email mới"
        onVerify={(otp) => ProfileService.changeEmail(newEmail.trim().toLowerCase(), otp)}
        onResend={() => ProfileService.sendOtp(newEmail.trim().toLowerCase())}
        onSuccess={async () => {
          setEmailStep("none");
          setNewEmail("");
          if (user?.id) await nap(user.id);
          setEmailMsg({
            ok: true,
            text: "Đã đổi email. Lần đăng nhập tới hãy dùng địa chỉ mới.",
          });
        }}
        onReset={datLaiDoiEmail}
        onClose={() => setEmailStep("nhap")}
      />

      {/* Xác minh email hiện tại — dành cho ai đóng popup lúc đăng ký */}
      <OtpDialog
        open={xacMinhOpen}
        target={p.email || user.email || ""}
        title="Xác minh email"
        onVerify={(otp) =>
          AuthService.verifyRegistration(p.email || user.email || "", otp)
        }
        onResend={() => ProfileService.sendOtp(p.email || user.email || "")}
        onSuccess={async () => {
          setXacMinhOpen(false);
          if (user?.id) await nap(user.id);
        }}
        onReset={(f) => {
          setXacMinhOpen(false);
          alert(f.message);
          logout();
        }}
        onClose={() => setXacMinhOpen(false)}
      />
    </div>
  );
}
