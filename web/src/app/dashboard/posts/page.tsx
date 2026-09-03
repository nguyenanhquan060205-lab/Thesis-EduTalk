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
      // `isPending` bật khi bài bị báo cáo từ 5 lần trở lên — khác hẳn `status`
      // là luồng duyệt bài. Bài như vậy đã bị ẩn khỏi cộng đồng.
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
      await load();
    } catch {
      alert("Không duyệt được bài viết.");
    } finally {
      setBusyId(null);
    }
  };

  const tuChoi = async (p: Post) => {
    setBusyId(p.id);
    try {
      await PostModerationService.reject(p.id, reason.trim());
      setRejecting(null);
      setReason("");
      await load();
    } catch {
      alert("Không từ chối được bài viết.");
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
      await load();
    } catch {
      alert("Không bỏ được cờ báo cáo.");
    } finally {
      setBusyId(null);
    }
  };

  const xoaBai = async (p: Post) => {
    if (!confirm("Xoá vĩnh viễn bài viết này và toàn bộ bình luận của nó?")) return;
    setBusyId(p.id);
    try {
      await PostModerationService.remove(p.id);
      await load();
    } catch {
      alert("Không xoá được bài viết.");
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">Đang tải hàng chờ duyệt…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6 text-white animate-fade-in-up">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase mb-2">
          <Clock className="w-3.5 h-3.5" /> Kiểm duyệt
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Kiểm Duyệt Bài Viết
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
          Bài mới phải được duyệt trước khi hiển thị công khai. Bài bị báo cáo từ 5
          lần trở lên sẽ tự ẩn và chờ xem xét. Tab <strong>Tất cả bài viết</strong> xem
          được mọi bài ở mọi trạng thái.
        </p>
      </div>

      <div className="flex items-center gap-2">
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
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition flex items-center gap-2 ${
              tab === k
                ? "bg-white text-slate-900 border-white"
                : "bg-white/[0.04] text-gray-300 border-white/10 hover:border-white/25"
            }`}
          >
            {nhan}
            {n > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  tab === k ? "bg-slate-900 text-white" : "bg-amber-400 text-amber-950"
                }`}
              >
                {n}
              </span>
            )}
          </button>
        ))}

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm nội dung hoặc tác giả…"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-gray-500 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!error && dangHien.length === 0 && (
        <div className="p-12 bg-white/[0.04] rounded-3xl border border-white/10 text-center space-y-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-400/60 mx-auto" />
          <p className="text-sm font-bold text-gray-300">
            {tim
              ? "Không có bài nào khớp từ khoá."
              : tab === "choduyet"
                ? "Không còn bài nào chờ duyệt."
                : tab === "baocao"
                  ? "Không có bài nào đang bị báo cáo."
                  : "Chưa có bài viết nào."}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {dangHien.map((p) => (
          <div
            key={p.id}
            className="p-5 sm:p-6 bg-white/[0.04] rounded-3xl border border-white/10 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-black text-xs shrink-0">
                  {(p.authorName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black truncate">{p.authorName}</div>
                  <div className="text-[11px] text-gray-400 font-medium">
                    {timeAgo(p.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tab === "tatca" && (
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-black border ${
                      p.isPending
                        ? "bg-rose-400/20 text-rose-300 border-rose-400/30"
                        : p.status === "approved"
                          ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                          : p.status === "rejected"
                            ? "bg-gray-400/20 text-gray-300 border-gray-400/30"
                            : "bg-amber-400/20 text-amber-300 border-amber-400/30"
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
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-400/20 text-rose-300 text-[10px] font-black border border-rose-400/30">
                    <Flag className="w-3 h-3" /> {p.reportCount ?? 0} lượt báo cáo
                  </span>
                )}
                {p.remindedAt && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                    <Bell className="w-3 h-3" /> Tác giả đã nhắc
                  </span>
                )}
                {p.tags?.[0] && (
                  <span className="px-2 py-1 rounded-md bg-white/10 text-gray-300 text-[10px] font-black">
                    {p.tags[0]}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-200 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {p.content}
            </p>

            {rejecting === p.id ? (
              <div className="space-y-2 pt-3 border-t border-white/10">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  Lý do từ chối (tác giả sẽ nhìn thấy)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vd: nội dung không liên quan tuyển sinh"
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-gray-500 outline-none focus:border-cyan-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => tuChoi(p)}
                    disabled={busyId === p.id}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-black transition"
                  >
                    Xác nhận từ chối
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(null);
                      setReason("");
                    }}
                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 text-xs font-bold"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : tab === "tatca" ? (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                {/* Bài đang chờ duyệt vẫn duyệt được ngay tại đây */}
                {p.status === "pending" && (
                  <button
                    onClick={() => duyet(p)}
                    disabled={busyId === p.id}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-black transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Duyệt
                  </button>
                )}
                {p.isPending && (
                  <button
                    onClick={() => boBaoCao(p)}
                    disabled={busyId === p.id}
                    className="px-4 py-2 rounded-xl border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Bỏ báo cáo
                  </button>
                )}
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="px-4 py-2 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] text-gray-500 font-medium">
                  {(p.upvotedBy ?? []).length} thích · {p.commentCount ?? 0} bình luận
                </span>
              </div>
            ) : tab === "baocao" ? (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => boBaoCao(p)}
                  disabled={busyId === p.id}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-black transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === p.id ? "Đang xử lý…" : "Bài an toàn, bỏ báo cáo"}
                </button>
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="px-4 py-2 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] text-gray-500 font-medium">
                  Bỏ báo cáo sẽ đưa bài hiện lại cho cộng đồng
                </span>
              </div>
            ) : (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => duyet(p)}
                  disabled={busyId === p.id}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-black transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === p.id ? "Đang xử lý…" : "Duyệt bài"}
                </button>
                <button
                  onClick={() => setRejecting(p.id)}
                  disabled={busyId === p.id}
                  className="px-4 py-2 rounded-xl border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Từ chối
                </button>
                <span className="ml-auto text-[11px] text-gray-500 font-medium flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {p.content.length} ký tự
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
