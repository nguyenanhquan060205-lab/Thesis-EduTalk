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
      <div className="dash-empty min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải danh sách người dùng…
        </p>
      </div>
    );
  }

  return (
    <div className="dash-page space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start gap-4 pb-5 border-b" style={{ borderColor: "var(--dash-border)" }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--dash-active-bg)", color: "var(--dash-accent)" }}
        >
          <Users size={20} />
        </div>
        <div>
          <div className="dash-section-label mb-1">Quản trị tài khoản · User Directory</div>
          <h1 className="dash-page-title">Quản Lý Người Dùng & Thí Sinh</h1>
          <p className="text-xs font-medium mt-1 flex items-center gap-1.5" style={{ color: "var(--dash-text-muted)" }}>
            <span>Hệ thống ghi nhận</span>
            <strong style={{ color: "var(--dash-text)" }}>
              <NumberFlow value={ds.length} />
            </strong>
            <span>tài khoản. Email và số điện thoại đã được mã hoá bảo mật ở tầng API.</span>
          </p>
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-xl text-xs font-bold flex items-center gap-2 border"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.25)",
            color: "#EF4444",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tìm kiếm & Lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--dash-text-faint)" }} />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm theo tên hoặc email…"
            className="dash-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NHAN_LOC) as Loc[]).map((k) => (
            <button
              key={k}
              onClick={() => setLoc(k)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer"
              style={
                loc === k
                  ? {
                      background: "var(--dash-accent)",
                      color: "#fff",
                      borderColor: "var(--dash-accent)",
                    }
                  : {
                      background: "var(--dash-surface)",
                      color: "var(--dash-text-muted)",
                      borderColor: "var(--dash-border)",
                    }
              }
            >
              {NHAN_LOC[k]}
            </button>
          ))}
        </div>
      </div>

      {hienThi.length === 0 && !error && (
        <div className="dash-card text-center py-12">
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--dash-text-faint)" }} />
          <p className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
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
              className="dash-card flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0"
                style={{ background: "var(--dash-accent)" }}
              >
                {(u.name ?? "?").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black truncate" style={{ color: "var(--dash-text)" }}>
                    {u.name}
                  </span>
                  {laToi && (
                    <span className="dash-badge dash-badge-blue">
                      Bạn (Hiện tại)
                    </span>
                  )}
                  {u.role === "admin" && (
                    <span className="dash-badge dash-badge-blue">
                      Quản trị viên
                    </span>
                  )}
                  {u.isPremium && (
                    <span className="dash-badge dash-badge-amber">
                      Premium
                    </span>
                  )}
                  {u.disabled && (
                    <span className="dash-badge dash-badge-red">
                      <Lock className="w-3 h-3 mr-1" /> Bị khoá
                    </span>
                  )}
                  {u.emailVerified === false ? (
                    <span className="dash-badge dash-badge-amber">
                      <ShieldAlert className="w-3 h-3 mr-1" /> Chưa xác minh
                    </span>
                  ) : (
                    <span className="dash-badge dash-badge-green">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Đã xác minh
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: "var(--dash-text-faint)" }}>
                  <span style={{ color: "var(--dash-text-muted)" }}>{u.email || "—"}</span>
                  <span>{u.phone || "—"}</span>
                  {u.createdAt && <span>Tham gia {ngayGio(u.createdAt)}</span>}
                  <span>{u.usageCount ?? 0} lượt tư vấn</span>
                </div>
                {u.disabled && u.disabledReason && (
                  <div className="text-[11px] font-medium" style={{ color: "#EF4444" }}>
                    Lý do khoá: {u.disabledReason}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => doiPremium(u)}
                  disabled={busy === u.id}
                  className="dash-btn"
                  style={u.isPremium ? { borderColor: "#F59E0B", color: "#F59E0B" } : {}}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{u.isPremium ? "Gỡ Premium" : "Cấp Premium"}</span>
                </button>

                {!laToi && u.role !== "admin" && (
                  <button
                    onClick={() => doiKhoa(u)}
                    disabled={busy === u.id}
                    className="dash-btn"
                    style={u.disabled ? { borderColor: "#10B981", color: "#10B981" } : {}}
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
                    className="dash-btn"
                    style={{ color: "#EF4444" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dash-card-2 flex items-start gap-2.5 text-[11px] font-medium" style={{ color: "var(--dash-text-muted)" }}>
        <EyeOff className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--dash-text-faint)" }} />
        <p>
          Email, số điện thoại và ngày sinh được che bảo vệ ngay ở backend trước khi trả về —
          ngay cả trong công cụ kiểm tra mạng Network cũng chỉ hiển thị bản đã che.
        </p>
      </div>

      {/* Modal Xác nhận xoá */}
      <Modal open={!!xoa} onClose={() => setXoa(null)}>
        {xoa && (
          <div
            className="rounded-3xl max-w-md w-full p-6 border shadow-2xl space-y-4"
            style={{
              background: "var(--dash-surface)",
              borderColor: "var(--dash-border)",
              color: "var(--dash-text)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
                >
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-black" style={{ color: "var(--dash-text)" }}>Xác Nhận Xoá Tài Khoản</h2>
              </div>
              <button
                onClick={() => setXoa(null)}
                className="p-1.5 rounded-xl transition cursor-pointer"
                style={{ color: "var(--dash-text-faint)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--dash-text-muted)" }}>
              Thao tác này xoá vĩnh viễn tài khoản khỏi <strong>Firebase</strong>,{" "}
              <strong>MongoDB</strong> và toàn bộ <strong>lịch sử tư vấn</strong> của
              người này. Hành động này không thể hoàn tác.
            </p>

            <div className="space-y-1.5">
              <label className="dash-section-label">
                Gõ lại <span style={{ color: "#EF4444" }}>{xoa.name}</span> để xác nhận
              </label>
              <input
                value={xacNhan}
                onChange={(e) => setXacNhan(e.target.value)}
                className="dash-input w-full text-xs font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setXoa(null)}
                className="dash-btn"
              >
                Huỷ bỏ
              </button>
              <button
                onClick={xoaThat}
                disabled={xacNhan.trim() !== (xoa.name ?? "") || busy === xoa.id}
                className="dash-btn"
                style={{ background: "#EF4444", color: "#fff", borderColor: "#EF4444" }}
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
