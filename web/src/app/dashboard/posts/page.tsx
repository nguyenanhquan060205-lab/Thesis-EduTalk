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
      <div className="dash-empty min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải hàng chờ duyệt...
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
          <Clock size={20} />
        </div>
        <div>
          <div className="dash-section-label mb-1">Kiểm duyệt cộng đồng · Feed Moderation</div>
          <h1 className="dash-page-title">Kiểm Duyệt Bài Viết Thí Sinh</h1>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--dash-text-muted)" }}>
            Bài mới đăng phải được xem xét trước khi công khai. Bài bị báo cáo từ 5 lần trở lên sẽ tự động ẩn để quản trị viên đối soát.
          </p>
        </div>
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
              <span>{nhan}</span>
              {n > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                  style={
                    tab === k
                      ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                      : { background: "rgba(245,158,11,0.15)", color: "#F59E0B" }
                  }
                >
                  {n}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative sm:ml-auto w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--dash-text-faint)" }} />
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm nội dung hoặc tác giả…"
            className="dash-input w-full pl-9 pr-3 py-2 text-xs"
          />
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

      {!error && dangHien.length === 0 && (
        <div className="dash-card text-center py-12">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
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
            className="dash-card space-y-3.5 hover:shadow-md transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0"
                  style={{ background: "var(--dash-accent)" }}
                >
                  {(p.authorName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black truncate" style={{ color: "var(--dash-text)" }}>
                    {p.authorName}
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
                    {timeAgo(p.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tab === "tatca" && (
                  <span
                    className={`dash-badge ${
                      p.isPending
                        ? "dash-badge-red"
                        : p.status === "approved"
                          ? "dash-badge-green"
                          : p.status === "rejected"
                            ? "dash-badge-gray"
                            : "dash-badge-amber"
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
                  <span className="dash-badge dash-badge-red">
                    <Flag className="w-3 h-3 mr-1" /> {p.reportCount ?? 0} báo cáo
                  </span>
                )}
                {p.remindedAt && (
                  <span className="dash-badge dash-badge-amber">
                    <Bell className="w-3 h-3 mr-1" /> Tác giả nhắc duyệt
                  </span>
                )}
                {p.tags?.[0] && (
                  <span className="dash-badge dash-badge-gray">
                    {p.tags[0]}
                  </span>
                )}
              </div>
            </div>

            <p
              className="text-xs font-medium leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: "var(--dash-text)" }}
            >
              {p.content}
            </p>

            {rejecting === p.id ? (
              <div
                className="space-y-2 pt-3 border-t"
                style={{ borderColor: "var(--dash-border-subtle)" }}
              >
                <label className="dash-section-label">
                  Lý do từ chối (tác giả sẽ nhìn thấy thông báo này)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vd: Nội dung vi phạm quy tắc thảo luận tuyển sinh..."
                  className="dash-input w-full text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => tuChoi(p)}
                    disabled={busyId === p.id}
                    className="dash-btn"
                    style={{ background: "#EF4444", color: "#fff", borderColor: "#EF4444" }}
                  >
                    Xác nhận từ chối
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(null);
                      setReason("");
                    }}
                    className="dash-btn"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            ) : tab === "tatca" ? (
              <div
                className="pt-3 border-t flex flex-wrap items-center gap-2"
                style={{ borderColor: "var(--dash-border-subtle)" }}
              >
                {p.status === "pending" && (
                  <button
                    onClick={() => duyet(p)}
                    disabled={busyId === p.id}
                    className="dash-btn dash-btn-primary"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt bài
                  </button>
                )}
                {p.isPending && (
                  <button
                    onClick={() => boBaoCao(p)}
                    disabled={busyId === p.id}
                    className="dash-btn"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10B981" }} /> Bỏ báo cáo
                  </button>
                )}
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="dash-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
                  {(p.upvotedBy ?? []).length} thích · {p.commentCount ?? 0} bình luận
                </span>
              </div>
            ) : tab === "baocao" ? (
              <div
                className="pt-3 border-t flex flex-wrap items-center gap-2"
                style={{ borderColor: "var(--dash-border-subtle)" }}
              >
                <button
                  onClick={() => boBaoCao(p)}
                  disabled={busyId === p.id}
                  className="dash-btn dash-btn-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busyId === p.id ? "Đang xử lý…" : "Bài an toàn, bỏ báo cáo"}</span>
                </button>
                <button
                  onClick={() => xoaBai(p)}
                  disabled={busyId === p.id}
                  className="dash-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá bài
                </button>
                <span className="ml-auto text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
                  Bỏ báo cáo sẽ đưa bài hiện lại cho cộng đồng
                </span>
              </div>
            ) : (
              <div
                className="pt-3 border-t flex flex-wrap items-center gap-2"
                style={{ borderColor: "var(--dash-border-subtle)" }}
              >
                <button
                  onClick={() => duyet(p)}
                  disabled={busyId === p.id}
                  className="dash-btn dash-btn-primary"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{busyId === p.id ? "Đang xử lý…" : "Duyệt bài này"}</span>
                </button>
                <button
                  onClick={() => setRejecting(p.id)}
                  disabled={busyId === p.id}
                  className="dash-btn"
                >
                  <XCircle className="w-3.5 h-3.5" /> Từ chối
                </button>
                <span className="ml-auto text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--dash-text-faint)" }}>
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
