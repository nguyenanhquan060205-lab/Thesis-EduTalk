"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Loader2,
  AlertCircle,
  MessageSquare,
  Flag,
  Trash2,
  Search,
} from "lucide-react";
import {
  PostModerationService,
  timeAgo,
  type Post,
} from "@/services/posts";
import { toast } from "sonner";

/**
 * Hàng chờ kiểm duyệt bài viết cộng đồng.
 * Bài mới đăng có `status = "pending"` và không hiện ở `/community` cho tới khi
 * được duyệt tại đây.
 */
export default function PostModerationPage() {
  const [tab, setTab] = useState<"choduyet" | "baocao" | "tatca">("choduyet");
  const [tim, setTim] = useState("");
  const [list, setList] = useState<Post[]>([]);
  const [baoCao, setBaoCao] = useState<Post[]>([]);
  const [tatCa, setTatCa] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [cho, tatCa] = await Promise.all([
        PostModerationService.pending(),
        PostModerationService.all(),
      ]);
      setList(cho);
      setTatCa(tatCa);
      setBaoCao(tatCa.filter((p) => p.isPending));
      setError(null);
    } catch {
      setError(
        "Không tải được dữ liệu. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
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

  const duyet = async (p: Post) => {
    setBusyId(p.id);
    try {
      await PostModerationService.approve(p.id);
      toast.success("Đã duyệt và xuất bản bài viết lên cộng đồng!");
      await load();
    } catch {
      toast.error("Không duyệt được bài viết. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const tuChoi = async (p: Post) => {
    setBusyId(p.id);
    try {
      await PostModerationService.reject(p.id, reason.trim());
      toast.success("Đã từ chối bài viết.");
      setRejecting(null);
      setReason("");
      await load();
    } catch {
      toast.error("Không từ chối được bài viết. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  const nguon = tab === "choduyet" ? list : tab === "baocao" ? baoCao : tatCa;
  const q = tim.trim().toLowerCase();
  const dangHien = q
    ? nguon.filter(
        (p) =>
          (p.content ?? "").toLowerCase().includes(q) ||
          (p.authorName ?? "").toLowerCase().includes(q)
      )
    : nguon;

  const boBaoCao = async (p: Post) => {
    setBusyId(p.id);
    try {
      await PostModerationService.dismissReport(p.id);
      toast.success("Đã gỡ cờ báo cáo. Bài viết hiển thị lại bình thường.");
      await load();
    } catch {
      toast.error("Không bỏ được cờ báo cáo.");
    } finally {
      setBusyId(null);
    }
  };

  const xoaBai = async (p: Post) => {
    if (!confirm("Xoá vĩnh viễn bài viết này và toàn bộ bình luận liên quan?")) return;
    setBusyId(p.id);
    try {
      await PostModerationService.remove(p.id);
      toast.success("Đã xoá vĩnh viễn bài viết.");
      await load();
    } catch {
      toast.error("Không xoá được bài viết.");
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải hàng chờ duyệt...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase mb-2">
          <Clock className="w-3.5 h-3.5" /> Kiểm duyệt cộng đồng
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Kiểm Duyệt Bài Viết Thí Sinh
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
          Bài mới đăng phải được xem xét trước khi công khai. Bài bị báo cáo từ 5 lần trở lên sẽ tự động ẩn để quản trị viên đối soát.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              ["choduyet", "Chờ duyệt", list.length],
              ["baocao", "Bị báo cáo", baoCao.length],
              ["tatca", "Tất cả bài viết", tatCa.length],
            ] as const
          ).map(([k, nhan, n]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer active:scale-[0.98] ${
                tab === k
                  ? "bg-[#0054A6] text-white border-[#0054A6] shadow-sm shadow-[#0054A6]/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{nhan}</span>
              {n > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    tab === k ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {n}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm nội dung hoặc tác giả…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0054A6] shadow-xs"
          />
        </div>
      </div>

      {error && (
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && dangHien.length === 0 && (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">
            {tim
              ? "Không có bài nào khớp với từ khoá tìm kiếm."
              : tab === "choduyet"
                ? "Không còn bài nào trong hàng chờ duyệt."
                : tab === "baocao"
                  ? "Không có bài nào đang bị người dùng báo cáo."
                  : "Chưa có bài viết nào trong hệ thống."}
          </p>
        </div>
      )}

      {/* Danh sách bài viết */}
      <div className="space-y-4">
        {dangHien.map((p) => (
          <div
            key={p.id}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 hover:shadow-md transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0054A6] to-[#003B73] flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
                  {(p.authorName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 truncate">{p.authorName}</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {timeAgo(p.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tab === "tatca" && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      p.isPending
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : p.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : p.status === "rejected"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {p.isPending
                      ? `Bị ẩn · ${p.reportCount ?? 0} báo cáo`
                      : p.status === "approved"
                        ? "Đang hiển thị"
                        : p.status === "rejected"
                          ? "Đã từ chối"
                          : "Chờ duyệt"}
                  </span>
                )}
                {tab === "baocao" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                    <Flag className="w-3 h-3" /> {p.reportCount ?? 0} báo cáo
                  </span>
                )}
                {p.remindedAt && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                    <Bell className="w-3 h-3" /> Tác giả nhắc duyệt
                  </span>
                )}
                {p.tags?.[0] && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 text-[10px] font-black">
                    {p.tags[0]}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {p.content}
            </p>

            {rejecting === p.id ? (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Lý do từ chối (tác giả sẽ nhìn thấy thông báo này)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vd: Nội dung vi phạm quy tắc thảo luận tuyển sinh..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0054A6]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => tuChoi(p)}
                    disabled={busyId === p.id}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Xác nhận từ chối
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(null);
                      setReason("");
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer active:scale-[0.98]"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            ) : tab === "tatca" ? (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                {p.status === "pending" && (
                  <button
                    onClick={() => duyet(p)}
                    disabled={busyId === p.id}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#004080] disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt bài
                  </button>
                )}
                {p.isPending && (
                  <button
                    onClick={() => boBaoCao(p)}
                    disabled={busyId === p.id}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bỏ báo cáo
                  </button>
                )}
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium">
                  {(p.upvotedBy ?? []).length} thích · {p.commentCount ?? 0} bình luận
                </span>
              </div>
            ) : tab === "baocao" ? (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => boBaoCao(p)}
                  disabled={busyId === p.id}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#004080] disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busyId === p.id ? "Đang xử lý…" : "Bài an toàn, bỏ báo cáo"}</span>
                </button>
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium">
                  Bỏ báo cáo sẽ đưa bài hiện lại cho cộng đồng
                </span>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => duyet(p)}
                  disabled={busyId === p.id}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0054A6] hover:bg-[#004080] disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busyId === p.id ? "Đang xử lý…" : "Duyệt bài này"}</span>
                </button>
                <button
                  onClick={() => setRejecting(p.id)}
                  disabled={busyId === p.id}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <XCircle className="w-3.5 h-3.5" /> Từ chối
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{p.content.length} ký tự</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
