"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Crown,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  EyeOff,
  X,
  Lock,
  Unlock,
} from "lucide-react";
import { AdminService, ngayGio, type AdminUser } from "@/services/admin";
import { useAuthStore } from "@/store/useAuthStore";
import Modal from "@/components/ui/Modal";

type Loc = "tatca" | "admin" | "chuaxacminh" | "premium" | "bikhoa";

const NHAN_LOC: Record<Loc, string> = {
  tatca: "Tất cả",
  admin: "Quản trị viên",
  chuaxacminh: "Chưa xác minh email",
  premium: "Premium",
  bikhoa: "Bị khoá",
};

export default function UserManagementPage() {
  const { user: toi } = useAuthStore();
  const [ds, setDs] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState<Loc>("tatca");
  const [busy, setBusy] = useState<string | null>(null);
  // Xoá tài khoản không hoàn tác được nên bắt gõ lại tên để xác nhận
  const [xoa, setXoa] = useState<AdminUser | null>(null);
  const [xacNhan, setXacNhan] = useState("");

  const load = useCallback(async () => {
    try {
      setDs(await AdminService.users());
      setError(null);
    } catch {
      setError(
        "Không tải được danh sách. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
      );
    }
  }, []);

  useEffect(() => {
    let huy = false;
    (async () => {
      await load();
      if (!huy) setLoaded(true);
    })();
    return () => {
      huy = true;
    };
  }, [load]);

  const hienThi = useMemo(() => {
    const q = tim.trim().toLowerCase();
    return ds.filter((u) => {
      const khopTim =
        !q ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);
      const khopLoc =
        loc === "tatca" ||
        (loc === "admin" && u.role === "admin") ||
        (loc === "chuaxacminh" && u.emailVerified === false) ||
        (loc === "premium" && u.isPremium) ||
        (loc === "bikhoa" && u.disabled === true);
      return khopTim && khopLoc;
    });
  }, [ds, tim, loc]);

  const doiPremium = async (u: AdminUser) => {
    setBusy(u.id);
    try {
      await AdminService.setPremium(u.id, !u.isPremium);
      await load();
    } catch {
      alert("Không đổi được trạng thái Premium.");
    } finally {
      setBusy(null);
    }
  };

  const doiKhoa = async (u: AdminUser) => {
    let ly_do = "";
    if (!u.disabled) {
      const nhap = prompt(
        `Khoá tài khoản "${u.name}"?\n\nNgười này sẽ không đăng nhập, đăng bài hay bình luận được.\nNhập lý do (người dùng sẽ thấy khi bị chặn):`,
        ""
      );
      if (nhap === null) return; // bấm Huỷ
      ly_do = nhap.trim();
    } else if (!confirm(`Mở khoá tài khoản "${u.name}"?`)) {
      return;
    }

    setBusy(u.id);
    try {
      await AdminService.setLocked(u.id, !u.disabled, ly_do);
      await load();
    } catch (e) {
      alert(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Không đổi được trạng thái khoá."
      );
    } finally {
      setBusy(null);
    }
  };

  const xoaThat = async () => {
    if (!xoa) return;
    setBusy(xoa.id);
    try {
      await AdminService.deleteUser(xoa.id);
      setXoa(null);
      setXacNhan("");
      await load();
    } catch {
      alert("Không xoá được tài khoản.");
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">Đang tải danh sách người dùng…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-white animate-fade-in-up">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-400/20 text-blue-300 text-[10px] font-black uppercase mb-2">
          <Users className="w-3.5 h-3.5" /> Người dùng
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Quản Lý Người Dùng
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
          {ds.length} tài khoản. Email và số điện thoại đã được che ở tầng API.
        </p>
      </div>

      {error && (
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-gray-500 outline-none focus:border-cyan-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NHAN_LOC) as Loc[]).map((k) => (
            <button
              key={k}
              onClick={() => setLoc(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition ${
                loc === k
                  ? "bg-cyan-400 text-slate-900 border-cyan-400"
                  : "bg-white/[0.04] text-gray-300 border-white/10 hover:border-white/25"
              }`}
            >
              {NHAN_LOC[k]}
            </button>
          ))}
        </div>
      </div>

      {hienThi.length === 0 && !error && (
        <div className="p-12 bg-white/[0.04] rounded-3xl border border-white/10 text-center space-y-2">
          <Users className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-sm font-bold text-gray-400">
            Không có tài khoản nào khớp bộ lọc.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {hienThi.map((u) => {
          const laToi = u.id === toi?.id;
          return (
            <div
              key={u.id}
              className="p-4 sm:p-5 bg-white/[0.04] rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-black shrink-0">
                {(u.name ?? "?").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black truncate">{u.name}</span>
                  {laToi && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
                      Bạn
                    </span>
                  )}
                  {u.role === "admin" && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-400/20 text-violet-300">
                      Quản trị viên
                    </span>
                  )}
                  {u.isPremium && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                      Premium
                    </span>
                  )}
                  {u.disabled && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-200">
                      <Lock className="w-3 h-3" /> Bị khoá
                    </span>
                  )}
                  {u.emailVerified === false ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-400/20 text-rose-300">
                      <ShieldAlert className="w-3 h-3" /> Chưa xác minh
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300">
                      <ShieldCheck className="w-3 h-3" /> Đã xác minh
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 font-medium flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{u.email || "—"}</span>
                  <span>{u.phone || "—"}</span>
                  {u.createdAt && <span>Tham gia {ngayGio(u.createdAt)}</span>}
                  <span>{u.usageCount ?? 0} lượt tư vấn</span>
                </div>
                {u.disabled && u.disabledReason && (
                  <div className="text-[11px] text-rose-300 font-medium">
                    Lý do khoá: {u.disabledReason}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => doiPremium(u)}
                  disabled={busy === u.id}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black border transition disabled:opacity-50 flex items-center gap-1.5 ${
                    u.isPremium
                      ? "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                      : "border-white/15 text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  {u.isPremium ? "Gỡ Premium" : "Cấp Premium"}
                </button>

                {/* Không tự khoá mình, và không khoá quản trị viên khác */}
                {!laToi && u.role !== "admin" && (
                  <button
                    onClick={() => doiKhoa(u)}
                    disabled={busy === u.id}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black border transition disabled:opacity-50 flex items-center gap-1.5 ${
                      u.disabled
                        ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10"
                        : "border-amber-400/40 text-amber-300 hover:bg-amber-500/10"
                    }`}
                  >
                    {u.disabled ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" /> Mở khoá
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Khoá
                      </>
                    )}
                  </button>
                )}

                {/* Không cho tự xoá tài khoản của chính mình */}
                {!laToi && (
                  <button
                    onClick={() => {
                      setXoa(u);
                      setXacNhan("");
                    }}
                    disabled={busy === u.id}
                    className="px-3 py-2 rounded-xl text-[11px] font-black border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 text-[11px] text-gray-500 font-medium bg-white/[0.02] border border-white/10 rounded-2xl p-4">
        <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Email, số điện thoại và ngày sinh được che ngay ở backend trước khi trả về —
          xem trong tab Network cũng chỉ thấy bản đã che. Cần dữ liệu đầy đủ để hỗ trợ
          người dùng thì phải tra trực tiếp trong cơ sở dữ liệu.
        </p>
      </div>

      {/* Xác nhận xoá */}
      <Modal open={!!xoa} onClose={() => setXoa(null)}>
        {xoa && (
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black text-slate-900">Xoá tài khoản</h2>
              </div>
              <button
                onClick={() => setXoa(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Thao tác này xoá vĩnh viễn tài khoản khỏi <strong>Firebase</strong>,{" "}
              <strong>MongoDB</strong> và toàn bộ <strong>lịch sử tư vấn</strong> của
              người này. Không hoàn tác được.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Gõ lại <span className="text-rose-600">{xoa.name}</span> để xác nhận
              </label>
              <input
                value={xacNhan}
                onChange={(e) => setXacNhan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setXoa(null)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
              >
                Huỷ
              </button>
              <button
                onClick={xoaThat}
                disabled={xacNhan.trim() !== (xoa.name ?? "") || busy === xoa.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs transition"
              >
                {busy === xoa.id ? "Đang xoá…" : "Xoá vĩnh viễn"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
