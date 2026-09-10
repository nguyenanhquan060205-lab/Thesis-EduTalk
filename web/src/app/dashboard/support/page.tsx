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
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải trung tâm hỗ trợ...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
          <LifeBuoy className="w-3.5 h-3.5" /> Dịch vụ hỗ trợ
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Hỗ Trợ &amp; Thông Báo Hệ Thống
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
          Tiếp nhận khiếu nại, câu hỏi từ thí sinh và các sự kiện kiểm duyệt cần can thiệp.
        </p>
      </div>

      {error && (
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
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
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer active:scale-[0.98] ${
              tab === k
                ? "bg-[#0054A6] text-white border-[#0054A6] shadow-sm shadow-[#0054A6]/20"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{nhan} · {tong}</span>
            {chua > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${tab === k ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
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
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-600">
                Chưa có yêu cầu hỗ trợ nào từ thí sinh.
              </p>
            </div>
          )}

          {ho.map((r) => {
            const daXong = r.status === "resolved";
            return (
              <div
                key={r.id}
                className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition group"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900">
                      {r.subject || "Không có tiêu đề"}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-3 mt-0.5">
                      {r.name && <span>{r.name}</span>}
                      {r.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {r.email}
                        </span>
                      )}
                      <span>{ngayGio(r.createdAt)}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                      daXong
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {daXong ? "Đã xử lý" : "Chờ xử lý"}
                  </span>
                </div>

                {r.message && (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                    {r.message}
                  </p>
                )}

                {!daXong && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => xong(r.id)}
                      disabled={busy === r.id}
                      className="px-4 py-2 rounded-xl bg-[#0054A6] hover:bg-[#004080] disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
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
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
              <Bell className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-600">Không có thông báo nào từ hệ thống.</p>
            </div>
          )}

          {tb.map((n) => {
            const chua = n.status === "unread";
            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 transition ${
                  chua
                    ? "bg-amber-50/60 border-amber-200/80"
                    : "bg-white border-slate-200/80 shadow-xs"
                }`}
              >
                <Bell
                  className={`w-5 h-5 shrink-0 ${chua ? "text-amber-600" : "text-slate-400"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {NHAN_LOAI[n.type ?? ""] ?? n.type ?? "Khác"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {ngayGio(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium mt-1 break-words">
                    {n.message}
                  </p>
                </div>
                {chua && (
                  <button
                    onClick={() => daDoc(n.id)}
                    disabled={busy === n.id}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-60 shrink-0 cursor-pointer shadow-xs active:scale-[0.98]"
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
