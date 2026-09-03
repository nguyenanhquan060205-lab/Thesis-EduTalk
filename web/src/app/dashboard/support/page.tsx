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
      await load();
    } catch {
      alert("Không cập nhật được yêu cầu.");
    } finally {
      setBusy(null);
    }
  };

  const daDoc = async (id: string) => {
    setBusy(id);
    try {
      await AdminService.resolveNotification(id);
      await load();
    } catch {
      alert("Không đánh dấu được thông báo.");
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6 text-white animate-fade-in-up">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[10px] font-black uppercase mb-2">
          <LifeBuoy className="w-3.5 h-3.5" /> Hỗ trợ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Hỗ Trợ &amp; Thông Báo
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
          Yêu cầu từ người dùng và các sự kiện cần quản trị viên xử lý.
        </p>
      </div>

      {error && (
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

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
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition flex items-center gap-2 ${
              tab === k
                ? "bg-white text-slate-900 border-white"
                : "bg-white/[0.04] text-gray-300 border-white/10 hover:border-white/25"
            }`}
          >
            {nhan} · {tong}
            {chua > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[10px]">
                {chua}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "support" && (
        <div className="space-y-3">
          {ho.length === 0 && (
            <div className="p-12 bg-white/[0.04] rounded-3xl border border-white/10 text-center space-y-2">
              <Inbox className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-gray-400">
                Chưa có yêu cầu hỗ trợ nào.
              </p>
            </div>
          )}

          {ho.map((r) => {
            const daXong = r.status === "resolved";
            return (
              <div
                key={r.id}
                className="p-5 bg-white/[0.04] rounded-3xl border border-white/10 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black">
                      {r.subject || "Không có tiêu đề"}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium flex flex-wrap gap-x-3 mt-0.5">
                      {r.name && <span>{r.name}</span>}
                      {r.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {r.email}
                        </span>
                      )}
                      <span>{ngayGio(r.createdAt)}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-black shrink-0 ${
                      daXong
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-amber-400/20 text-amber-300"
                    }`}
                  >
                    {daXong ? "Đã xử lý" : "Chờ xử lý"}
                  </span>
                </div>

                {r.message && (
                  <p className="text-xs text-gray-300 font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {r.message}
                  </p>
                )}

                {!daXong && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => xong(r.id)}
                      disabled={busy === r.id}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-black transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {busy === r.id ? "Đang lưu…" : "Đánh dấu đã xử lý"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "notif" && (
        <div className="space-y-3">
          {tb.length === 0 && (
            <div className="p-12 bg-white/[0.04] rounded-3xl border border-white/10 text-center space-y-2">
              <Bell className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-sm font-bold text-gray-400">Không có thông báo nào.</p>
            </div>
          )}

          {tb.map((n) => {
            const chua = n.status === "unread";
            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 ${
                  chua
                    ? "bg-amber-400/10 border-amber-400/30"
                    : "bg-white/[0.02] border-white/10"
                }`}
              >
                <Bell
                  className={`w-5 h-5 shrink-0 ${chua ? "text-amber-300" : "text-gray-500"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                      {NHAN_LOAI[n.type ?? ""] ?? n.type ?? "Khác"}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {ngayGio(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 font-medium mt-1 break-words">
                    {n.message}
                  </p>
                </div>
                {chua && (
                  <button
                    onClick={() => daDoc(n.id)}
                    disabled={busy === n.id}
                    className="px-3 py-2 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 text-[11px] font-black transition disabled:opacity-60 shrink-0"
                  >
                    Đánh dấu đã xử lý
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
