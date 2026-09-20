"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LifeBuoy,
  CheckCircle2,
  Bell,
  Loader2,
  AlertCircle,
  Inbox,
  Mail,
} from "lucide-react";
import {
  AdminService,
  ngayGio,
  type SupportRequest,
  type AdminNotification,
} from "@/services/admin";
import { toast } from "sonner";

const NHAN_LOAI: Record<string, string> = {
  post_pending: "Bài chờ duyệt",
  post_report: "Bài bị báo cáo",
  post_remind: "Tác giả nhắc duyệt",
  post_edited: "Bài đã duyệt bị sửa",
  comment_report: "Bình luận bị báo cáo",
};

export default function SupportPage() {
  const [tab, setTab] = useState<"support" | "notif">("support");
  const [ho, setHo] = useState<SupportRequest[]>([]);
  const [tb, setTb] = useState<AdminNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.allSettled([
      AdminService.support(),
      AdminService.notifications(),
    ]);
    if (a.status === "fulfilled") setHo(a.value);
    if (b.status === "fulfilled") setTb(b.value);
    if (a.status === "rejected" && b.status === "rejected") {
      setError(
        "Không tải được dữ liệu. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
      );
    } else {
      setError(null);
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

  const chuaXuLy = useMemo(
    () => ho.filter((x) => x.status !== "resolved").length,
    [ho]
  );
  const chuaDoc = useMemo(() => tb.filter((x) => x.status === "unread").length, [tb]);

  const xong = async (id: string) => {
    setBusy(id);
    try {
      await AdminService.resolveSupport(id);
      toast.success("Đã đánh dấu xử lý xong yêu cầu hỗ trợ!");
      await load();
    } catch {
      toast.error("Không cập nhật được yêu cầu. Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const daDoc = async (id: string) => {
    setBusy(id);
    try {
      await AdminService.resolveNotification(id);
      toast.success("Đã đánh dấu thông báo đã xử lý.");
      await load();
    } catch {
      toast.error("Không đánh dấu được thông báo.");
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return (
      <div className="dash-empty min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải trung tâm hỗ trợ...
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
          <LifeBuoy size={20} />
        </div>
        <div>
          <div className="dash-section-label mb-1">Dịch vụ hỗ trợ &amp; Hệ thống</div>
          <h1 className="dash-page-title">Hỗ Trợ &amp; Thông Báo Hệ Thống</h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--dash-text-muted)" }}>
            Tiếp nhận khiếu nại, câu hỏi từ thí sinh và các sự kiện kiểm duyệt cần can thiệp.
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

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {(
          [
            ["support", "Yêu cầu hỗ trợ", ho.length, chuaXuLy],
            ["notif", "Thông báo hệ thống", tb.length, chuaDoc],
          ] as const
        ).map(([k, nhan, tong, chua]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer"
            style={
              tab === k
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
            <span>
              {nhan} · {tong}
            </span>
            {chua > 0 && (
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                style={
                  tab === k
                    ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                    : { background: "rgba(245,158,11,0.15)", color: "#F59E0B" }
                }
              >
                {chua}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Hỗ trợ */}
      {tab === "support" && (
        <div className="space-y-3">
          {ho.length === 0 && (
            <div className="dash-card text-center py-12">
              <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--dash-text-faint)" }} />
              <p className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
                Chưa có yêu cầu hỗ trợ nào từ thí sinh.
              </p>
            </div>
          )}

          {ho.map((r) => {
            const daXong = r.status === "resolved";
            return (
              <div
                key={r.id}
                className="dash-card space-y-3 hover:shadow-md transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black" style={{ color: "var(--dash-text)" }}>
                      {r.subject || "Không có tiêu đề"}
                    </div>
                    <div
                      className="text-[11px] font-medium flex flex-wrap gap-x-3 mt-1"
                      style={{ color: "var(--dash-text-faint)" }}
                    >
                      {r.name && (
                        <span style={{ color: "var(--dash-text-muted)" }}>{r.name}</span>
                      )}
                      {r.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {r.email}
                        </span>
                      )}
                      <span>{ngayGio(r.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`dash-badge ${daXong ? "dash-badge-green" : "dash-badge-amber"}`}>
                    {daXong ? "Đã xử lý" : "Chờ xử lý"}
                  </span>
                </div>

                {r.message && (
                  <p
                    className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: "var(--dash-text)" }}
                  >
                    {r.message}
                  </p>
                )}

                {!daXong && (
                  <div className="pt-2 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
                    <button
                      onClick={() => xong(r.id)}
                      disabled={busy === r.id}
                      className="dash-btn dash-btn-primary"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{busy === r.id ? "Đang lưu…" : "Đánh dấu đã xử lý"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Thông báo */}
      {tab === "notif" && (
        <div className="space-y-3">
          {tb.length === 0 && (
            <div className="dash-card text-center py-12">
              <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--dash-text-faint)" }} />
              <p className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
                Không có thông báo nào từ hệ thống.
              </p>
            </div>
          )}

          {tb.map((n) => {
            const chua = n.status === "unread";
            return (
              <div
                key={n.id}
                className="dash-card flex flex-col sm:flex-row sm:items-center gap-3 transition"
                style={
                  chua
                    ? {
                        background: "var(--dash-surface-2)",
                        borderColor: "rgba(245,158,11,0.4)",
                      }
                    : {}
                }
              >
                <Bell
                  className="w-5 h-5 shrink-0"
                  style={{ color: chua ? "#F59E0B" : "var(--dash-text-faint)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="dash-badge dash-badge-gray">
                      {NHAN_LOAI[n.type ?? ""] ?? n.type ?? "Khác"}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
                      {ngayGio(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1 break-words" style={{ color: "var(--dash-text)" }}>
                    {n.message}
                  </p>
                </div>
                {chua && (
                  <button
                    onClick={() => daDoc(n.id)}
                    disabled={busy === n.id}
                    className="dash-btn shrink-0"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
