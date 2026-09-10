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
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";

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
      toast.success(u.isPremium ? "Đã gỡ gói Premium." : "Đã cấp gói Premium thành công!");
      await load();
    } catch {
      toast.error("Không đổi được trạng thái Premium.");
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
      if (nhap === null) return;
      ly_do = nhap.trim();
    } else if (!confirm(`Mở khoá tài khoản "${u.name}"?`)) {
      return;
    }

    setBusy(u.id);
    try {
      await AdminService.setLocked(u.id, !u.disabled, ly_do);
      toast.success(u.disabled ? "Đã mở khoá tài khoản thành công!" : "Đã khoá tài khoản.");
      await load();
    } catch (e) {
      toast.error(
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
      toast.success(`Đã xoá vĩnh viễn tài khoản "${xoa.name}".`);
      setXoa(null);
      setXacNhan("");
      await load();
    } catch {
      toast.error("Không xoá được tài khoản. Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải danh sách người dùng…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
          <Users className="w-3.5 h-3.5" /> Quản trị tài khoản
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Quản Lý Người Dùng & Thí Sinh
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 flex items-center gap-1.5">
          <span>Hệ thống ghi nhận</span>
          <strong className="text-slate-900 font-black">
            <NumberFlow value={ds.length} />
          </strong>
          <span>tài khoản. Email và số điện thoại đã được mã hoá bảo mật ở tầng API.</span>
        </p>
      </div>

      {error && (
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tìm kiếm & Lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0054A6] shadow-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NHAN_LOC) as Loc[]).map((k) => (
            <button
              key={k}
              onClick={() => setLoc(k)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-[0.98] ${
                loc === k
                  ? "bg-[#0054A6] text-white border-[#0054A6] shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {NHAN_LOC[k]}
            </button>
          ))}
        </div>
      </div>

      {hienThi.length === 0 && !error && (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            Không có tài khoản nào khớp với bộ lọc tìm kiếm.
          </p>
        </div>
      )}

      {/* Danh sách người dùng */}
      <div className="space-y-3">
        {hienThi.map((u) => {
          const laToi = u.id === toi?.id;
          return (
            <div
              key={u.id}
              className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0054A6] to-[#003B73] flex items-center justify-center font-black text-white shrink-0 shadow-xs">
                {(u.name ?? "?").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900 truncate">{u.name}</span>
                  {laToi && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-[#0054A6] border border-blue-200">
                      Bạn (Hiện tại)
                    </span>
                  )}
                  {u.role === "admin" && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Quản trị viên
                    </span>
                  )}
                  {u.isPremium && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Premium
                    </span>
                  )}
                  {u.disabled && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      <Lock className="w-3 h-3" /> Bị khoá
                    </span>
                  )}
                  {u.emailVerified === false ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      <ShieldAlert className="w-3 h-3" /> Chưa xác minh
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Đã xác minh
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{u.email || "—"}</span>
                  <span>{u.phone || "—"}</span>
                  {u.createdAt && <span>Tham gia {ngayGio(u.createdAt)}</span>}
                  <span>{u.usageCount ?? 0} lượt tư vấn</span>
                </div>
                {u.disabled && u.disabledReason && (
                  <div className="text-[11px] text-rose-600 font-medium">
                    Lý do khoá: {u.disabledReason}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => doiPremium(u)}
                  disabled={busy === u.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                    u.isPremium
                      ? "border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-100"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{u.isPremium ? "Gỡ Premium" : "Cấp Premium"}</span>
                </button>

                {!laToi && u.role !== "admin" && (
                  <button
                    onClick={() => doiKhoa(u)}
                    disabled={busy === u.id}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                      u.disabled
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
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

                {!laToi && (
                  <button
                    onClick={() => {
                      setXoa(u);
                      setXacNhan("");
                    }}
                    disabled={busy === u.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 text-[11px] text-slate-500 font-medium bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <EyeOff className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <p>
          Email, số điện thoại và ngày sinh được che bảo vệ ngay ở backend trước khi trả về —
          ngay cả trong công cụ kiểm tra mạng Network cũng chỉ hiển thị bản đã che.
        </p>
      </div>

      {/* Modal Xác nhận xoá */}
      <Modal open={!!xoa} onClose={() => setXoa(null)}>
        {xoa && (
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black text-slate-900">Xác Nhận Xoá Tài Khoản</h2>
              </div>
              <button
                onClick={() => setXoa(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Thao tác này xoá vĩnh viễn tài khoản khỏi <strong>Firebase</strong>,{" "}
              <strong>MongoDB</strong> và toàn bộ <strong>lịch sử tư vấn</strong> của
              người này. Hành động này không thể hoàn tác.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Gõ lại <span className="text-rose-600">{xoa.name}</span> để xác nhận
              </label>
              <input
                value={xacNhan}
                onChange={(e) => setXacNhan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setXoa(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer active:scale-[0.98]"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={xoaThat}
                disabled={xacNhan.trim() !== (xoa.name ?? "") || busy === xoa.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer active:scale-[0.98]"
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
