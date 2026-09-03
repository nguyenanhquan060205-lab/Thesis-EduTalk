"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MessageSquare,
  Heart,
  Send,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Pencil,
  Trash2,
  Flag,
  MoreHorizontal,
  Share2,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import Modal from "@/components/ui/Modal";
import {
  PostsService,
  timeAgo,
  type Post,
  type Comment,
  type PostStatus,
} from "@/services/posts";

const TOPICS = [
  "Hỏi đáp điểm chuẩn",
  "Review ngành học",
  "Kinh nghiệm ôn thi",
  "Đời sống sinh viên",
];

const NHAN_TRANG_THAI: Record<PostStatus, { text: string; cls: string; Icon: React.ElementType }> = {
  pending: {
    text: "Đang chờ duyệt",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  approved: {
    text: "Đã duyệt",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  rejected: {
    text: "Bị từ chối",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: XCircle,
  },
};

interface MenuItem {
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Menu "..." ở góc bài viết — gom các thao tác ít dùng như Facebook. */
function PostMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const boc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={boc} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tùy chọn bài viết"
        className={`p-1.5 rounded-full transition ${
          open ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100"
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-20 overflow-hidden">
          {items.map((it) => (
            <button
              key={it.label}
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 transition disabled:opacity-50 ${
                it.danger
                  ? "text-rose-600 hover:bg-rose-50"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <it.Icon className="w-4 h-4 shrink-0" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lấy câu lỗi backend trả về thay vì nuốt thành thông báo chung chung. */
function loi(err: unknown, macDinh: string): string {
  return (
    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
    macDinh
  );
}

/**
 * Một bình luận. Bố cục kiểu Facebook: bong bóng nội dung, bên dưới là hàng
 * thao tác chữ nhỏ, phần trả lời thụt vào một cấp.
 */
function CommentItem({
  c,
  replies,
  postId,
  meId,
  isAdmin,
  onChanged,
}: {
  c: Comment;
  replies: Comment[];
  postId: string;
  meId?: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.text);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const cuaToi = !!meId && c.authorId === meId;
  const daThich = !!meId && (c.upvotedBy ?? []).includes(meId);
  const daBaoCao = !!meId && (c.reportedBy ?? []).includes(meId);
  const soThich = (c.upvotedBy ?? []).length;

  const chay = async (fn: () => Promise<unknown>, macDinh: string) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      alert(loi(e, macDinh));
    } finally {
      setBusy(false);
    }
  };

  const luuSua = async () => {
    const t = draft.trim();
    if (!t || t === c.text) {
      setEditing(false);
      return;
    }
    await chay(
      () => PostsService.editComment(postId, c.id, t),
      "Không sửa được bình luận."
    );
    setEditing(false);
  };

  const guiTraLoi = async () => {
    const t = replyText.trim();
    if (!t) return;
    await chay(
      () => PostsService.addComment(postId, t, c.id),
      "Không gửi được trả lời."
    );
    setReplyText("");
    setReplying(false);
  };

  const xoa = () => {
    const them = replies.length ? ` và ${replies.length} trả lời của nó` : "";
    if (!confirm(`Xóa bình luận này${them}?`)) return;
    void chay(
      () => PostsService.deleteComment(postId, c.id),
      "Không xóa được bình luận."
    );
  };

  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0">
        {(c.authorName ?? "?").charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="bg-slate-50 rounded-2xl px-3 py-2 border border-slate-100">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[11px] font-black text-slate-800">
              {c.authorName ?? "Người dùng"}
            </span>
            {cuaToi && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                Bạn
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 resize-none"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={luuSua}
                  disabled={busy}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black disabled:opacity-60"
                >
                  Lưu
                </button>
                <button
                  onClick={() => {
                    setDraft(c.text);
                    setEditing(false);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-bold"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {c.text}
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-bold text-slate-400">
            <span>{timeAgo(c.createdAt)}</span>
            {c.editedAt && <span>đã sửa</span>}

            {meId && (
              <button
                onClick={() =>
                  chay(
                    () => PostsService.upvoteComment(postId, c.id),
                    "Không thích được bình luận."
                  )
                }
                disabled={busy}
                className={`flex items-center gap-1 transition ${
                  daThich ? "text-rose-600" : "hover:text-rose-600"
                }`}
              >
                <Heart className={`w-3 h-3 ${daThich ? "fill-rose-600" : ""}`} />
                Thích{soThich > 0 && ` · ${soThich}`}
              </button>
            )}
            {!meId && soThich > 0 && (
              <span className="flex items-center gap-1 text-rose-500">
                <Heart className="w-3 h-3 fill-rose-500" /> {soThich}
              </span>
            )}

            {/* Chỉ trả lời bình luận gốc — giữ đúng một cấp, tránh lồng vô tận */}
            {meId && !c.parentId && (
              <button
                onClick={() => setReplying((v) => !v)}
                className="hover:text-blue-600 transition"
              >
                Trả lời
              </button>
            )}

            {cuaToi && (
              <button
                onClick={() => setEditing(true)}
                className="hover:text-blue-600 transition"
              >
                Sửa
              </button>
            )}

            {(cuaToi || isAdmin) && (
              <button onClick={xoa} className="hover:text-rose-600 transition">
                Xóa
              </button>
            )}

            {/* Không hiện nút báo cáo trên nội dung của chính mình */}
            {meId && !cuaToi && (
              <button
                onClick={() =>
                  chay(
                    () => PostsService.reportComment(postId, c.id),
                    "Không gửi được báo cáo."
                  )
                }
                disabled={busy || daBaoCao}
                className="hover:text-amber-600 transition disabled:opacity-60"
              >
                {daBaoCao ? "Đã báo cáo" : "Báo cáo"}
              </button>
            )}
          </div>
        )}

        {replying && (
          <div className="flex gap-1.5 pt-1">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void guiTraLoi();
                }
              }}
              placeholder={`Trả lời ${c.authorName ?? ""}…`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
            />
            <button
              onClick={guiTraLoi}
              disabled={!replyText.trim() || busy}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        )}

        {replies.length > 0 && (
          <div className="pl-3 border-l-2 border-slate-100 space-y-2.5 pt-1">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                c={r}
                replies={[]}
                postId={postId}
                meId={meId}
                isAdmin={isAdmin}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Khung bình luận — ai đăng nhập cũng bình luận được, ở bất kỳ bài nào. */
function CommentBox({
  post,
  meId,
  isAdmin,
  open,
  onCountChanged,
}: {
  post: Post;
  meId?: string;
  isAdmin: boolean;
  /** Do trang cha điều khiển — nút bật/tắt nằm ở hàng Thích·Bình luận·Chia sẻ */
  open: boolean;
  onCountChanged: () => void;
}) {
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await PostsService.comments(post.id));
    } catch {
      setList([]);
    }
  }, [post.id]);

  // Nạp bình luận ngay khi khung được mở. Viết thẳng vòng async ở đây (thay vì
  // gọi `load()`) để mọi setState đều nằm sau `await`, không chạy đồng bộ trong
  // thân effect.
  useEffect(() => {
    if (!open) return;
    let huy = false;
    (async () => {
      try {
        const d = await PostsService.comments(post.id);
        if (!huy) setList(d);
      } catch {
        if (!huy) setList([]);
      }
    })();
    return () => {
      huy = true;
    };
  }, [open, post.id]);

  // Tách bình luận gốc và nhóm trả lời theo bình luận cha
  const { goc, traLoi } = useMemo(() => {
    const ds = list ?? [];
    const g = ds.filter((c) => !c.parentId);
    const t = new Map<string, Comment[]>();
    for (const c of ds) {
      if (!c.parentId) continue;
      t.set(c.parentId, [...(t.get(c.parentId) ?? []), c]);
    }
    return { goc: g, traLoi: t };
  }, [list]);

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await PostsService.addComment(post.id, t);
      setText("");
      void load();
      onCountChanged();
    } catch (err) {
      alert(loi(err, "Không gửi được bình luận."));
    } finally {
      setSending(false);
    }
  };

  const sauKhiDoi = () => {
    void load();
    onCountChanged();
  };

  if (!open) return null;

  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="space-y-3">
          {list === null && (
            <p className="text-[11px] font-bold text-slate-400">Đang tải bình luận…</p>
          )}

          {list !== null && goc.length === 0 && (
            <p className="text-[11px] font-medium text-slate-400 italic">
              Chưa có bình luận nào.
            </p>
          )}

          {goc.map((c) => (
            <CommentItem
              key={c.id}
              c={c}
              replies={traLoi.get(c.id) ?? []}
              postId={post.id}
              meId={meId}
              isAdmin={isAdmin}
              onChanged={sauKhiDoi}
            />
          ))}

          {meId ? (
            <form onSubmit={gui} className="flex gap-2 pt-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Viết bình luận…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <p className="text-[11px] font-bold text-slate-400 pt-1">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Đăng nhập
              </Link>{" "}
              để bình luận.
            </p>
          )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { user } = useAuthStore();
  const laAdmin = (user as { role?: string } | null)?.role === "admin";
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState("");
  // Bài nào đang mở khung bình luận — nút bật/tắt giờ nằm ở hàng hành động
  const [moBinhLuan, setMoBinhLuan] = useState<Record<string, boolean>>({});

  // Popup soạn bài / sửa bài
  const [modal, setModal] = useState<null | { editing?: Post }>(null);
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [busy, setBusy] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const cong = await PostsService.list(50);
      setPosts(cong);
      setError(null);
    } catch {
      setError("Không tải được bài viết. Kiểm tra backend có đang chạy không.");
    }
    if (user?.id) {
      try {
        setMyPosts(await PostsService.mine());
      } catch {
        setMyPosts([]);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    let huy = false;
    (async () => {
      await load();
      if (!huy) setLoaded(true); // bỏ qua nếu component đã unmount
    })();
    return () => {
      huy = true;
    };
  }, [load]);

  const baoThanhCong = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const moSoanBai = (editing?: Post) => {
    setModal({ editing });
    setContent(editing?.content ?? "");
    setTopic(editing?.tags?.[0] ?? TOPICS[0]);
    setModalErr(null);
  };

  const guiBai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (content.trim().length < 10) {
      setModalErr("Nội dung cần ít nhất 10 ký tự.");
      return;
    }
    setBusy(true);
    setModalErr(null);
    try {
      if (modal?.editing) {
        await PostsService.edit(modal.editing.id, content.trim());
        baoThanhCong("Đã cập nhật bài viết.");
      } else {
        await PostsService.create(
          content.trim(),
          user.id,
          user.name || "Người dùng",
          [topic]
        );
        baoThanhCong(
          "Đã gửi bài. Bài sẽ hiển thị với mọi người sau khi quản trị viên duyệt."
        );
        setTab("mine");
      }
      setModal(null);
      await load();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail;
      setModalErr(detail || "Không gửi được bài. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const xoaBai = async (p: Post) => {
    if (!confirm("Xóa bài viết này? Thao tác này không hoàn tác được.")) return;
    try {
      await PostsService.remove(p.id);
      baoThanhCong("Đã xóa bài viết.");
      await load();
    } catch {
      alert("Không xóa được bài viết.");
    }
  };

  const nhacDuyet = async (p: Post) => {
    try {
      await PostsService.remind(p.id);
      baoThanhCong("Đã gửi lời nhắc tới quản trị viên.");
      await load();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail;
      alert(detail || "Không gửi được lời nhắc.");
    }
  };

  const baoCaoBai = async (p: Post) => {
    if (!confirm("Báo cáo bài viết này tới quản trị viên?")) return;
    try {
      await PostsService.reportPost(p.id);
      baoThanhCong("Đã gửi báo cáo tới quản trị viên.");
      await load();
    } catch (err) {
      alert(loi(err, "Không gửi được báo cáo."));
    }
  };

  const chiaSe = async (p: Post) => {
    // Thẻ bài có id="post-<id>" nên trình duyệt tự cuộn tới đúng bài khi mở link
    const url = `${window.location.origin}/community#post-${p.id}`;
    try {
      await navigator.clipboard.writeText(url);
      baoThanhCong("Đã sao chép liên kết bài viết.");
    } catch {
      alert(url);
    }
  };

  const thich = async (p: Post) => {
    if (!user?.id) return;
    try {
      await PostsService.upvote(p.id);
      await load();
    } catch {
      /* lần tải sau sẽ đồng bộ lại */
    }
  };

  const activeTopics = useMemo(
    () => TOPICS.filter((t) => posts.some((p) => p.tags?.includes(t))),
    [posts]
  );
  const activeTopic = activeTopics.includes(selectedTopic) ? selectedTopic : "";

  const dangHien = useMemo(() => {
    if (tab === "mine") return myPosts;
    return activeTopic ? posts.filter((p) => p.tags?.includes(activeTopic)) : posts;
  }, [tab, myPosts, posts, activeTopic]);

  const soChoDuyet = myPosts.filter((p) => p.status === "pending").length;

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải diễn đàn…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-2 pb-24 animate-fade-in-up space-y-5">
      {/* HEADER */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase mb-2">
            <Users className="w-3.5 h-3.5" /> Diễn đàn HUIT
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Giao Lưu &amp; Hỏi Đáp Tuyển Sinh
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-medium mt-1">
            Bài viết được quản trị viên duyệt trước khi hiển thị công khai.
          </p>
        </div>

        {user?.id ? (
          <button
            onClick={() => moSoanBai()}
            className="px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition flex items-center gap-2 shrink-0 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Đăng bài
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shrink-0"
          >
            Đăng nhập để đăng bài
          </Link>
        )}
      </div>

      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* TAB */}
      {user?.id && (
        <div className="flex items-center gap-2">
          {(
            [
              ["all", `Cộng đồng · ${posts.length}`],
              ["mine", `Bài của tôi · ${myPosts.length}`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
                tab === k
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {l}
              {k === "mine" && soChoDuyet > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 text-[10px]">
                  {soChoDuyet} chờ
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* LỌC CHỦ ĐỀ — chỉ ở tab cộng đồng */}
      {tab === "all" && activeTopics.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTopic("")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              !activeTopic
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90"
            }`}
          >
            Tất cả
          </button>
          {activeTopics.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTopic(t)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
                activeTopic === t
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-700">{error}</p>
        </div>
      )}

      {!error && dangHien.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            {tab === "mine"
              ? "Bạn chưa đăng bài nào."
              : "Chưa có thảo luận nào — hãy là người đầu tiên đặt câu hỏi."}
          </p>
        </div>
      )}

      {/* DANH SÁCH BÀI */}
      <div className="space-y-4">
        {dangHien.map((p) => {
          const laCuaToi = p.authorId === user?.id;
          const tt = p.status ?? "approved";
          const nhan = NHAN_TRANG_THAI[tt];
          const daThich = !!user?.id && (p.upvotedBy ?? []).includes(user.id);
          const daBaoCao = !!user?.id && (p.reportedBy ?? []).includes(user.id);

          return (
            <div
              key={p.id}
              id={`post-${p.id}`}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5 scroll-mt-24 target:ring-2 target:ring-[#0054A6]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {(p.authorName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm text-slate-900 block truncate">
                      {p.authorName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {timeAgo(p.createdAt)}
                      {p.editedAt && " · đã chỉnh sửa"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 justify-end shrink-0">
                  {/* Trạng thái duyệt chỉ tác giả cần thấy */}
                  {tab === "mine" && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-black ${nhan.cls}`}
                    >
                      <nhan.Icon className="w-3 h-3" />
                      {nhan.text}
                    </span>
                  )}
                  {p.tags?.[0] && (
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {p.tags[0]}
                    </span>
                  )}

                  {/* Thao tác ít dùng gom vào menu "..." */}
                  <PostMenu
                    items={[
                      ...(laCuaToi && tt === "pending"
                        ? [
                            {
                              label: "Nhắc quản trị viên duyệt",
                              Icon: Bell,
                              onClick: () => nhacDuyet(p),
                            },
                          ]
                        : []),
                      ...(laCuaToi && tt === "approved"
                        ? [
                            {
                              label: "Chỉnh sửa bài viết",
                              Icon: Pencil,
                              onClick: () => moSoanBai(p),
                            },
                          ]
                        : []),
                      // Không cho tự báo cáo bài của chính mình
                      ...(!laCuaToi && user?.id && tt === "approved"
                        ? [
                            {
                              label: daBaoCao ? "Đã báo cáo" : "Báo cáo bài viết",
                              Icon: Flag,
                              onClick: () => baoCaoBai(p),
                              disabled: daBaoCao,
                            },
                          ]
                        : []),
                      ...(laCuaToi
                        ? [
                            {
                              label: "Xóa bài viết",
                              Icon: Trash2,
                              onClick: () => xoaBai(p),
                              danger: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>

              <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap break-words">
                {p.content}
              </p>

              {tt === "rejected" && p.rejectReason && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-800">
                  <strong>Lý do từ chối:</strong> {p.rejectReason}
                </div>
              )}

              {tt === "pending" && laCuaToi && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-900">
                  Bài đang chờ quản trị viên duyệt nên chưa ai khác nhìn thấy. Bạn có thể
                  xóa và đăng lại, hoặc nhắc quản trị viên (tối đa 1 lần mỗi 12 giờ).
                </div>
              )}

              {/* Hàng hành động chính — cùng một hàng như Facebook */}
              {tt === "approved" && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1">
                  <button
                    onClick={() => thich(p)}
                    disabled={!user?.id}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
                      daThich
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${daThich ? "fill-rose-600" : ""}`} />
                    Thích
                    {(p.upvotedBy ?? []).length > 0 && ` · ${(p.upvotedBy ?? []).length}`}
                  </button>

                  <button
                    onClick={() =>
                      setMoBinhLuan((m) => ({ ...m, [p.id]: !m[p.id] }))
                    }
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      moBinhLuan[p.id]
                        ? "text-blue-600 bg-blue-50"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Bình luận
                    {(p.commentCount ?? 0) > 0 && ` · ${p.commentCount}`}
                  </button>

                  <button
                    onClick={() => chiaSe(p)}
                    className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-slate-500 hover:bg-slate-50 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    Chia sẻ
                  </button>
                </div>
              )}

              {/* Bình luận: mở cho mọi bài đã duyệt, ai đăng nhập cũng viết được */}
              {tt === "approved" && (
                <CommentBox
                  post={p}
                  meId={user?.id}
                  isAdmin={laAdmin}
                  open={!!moBinhLuan[p.id]}
                  onCountChanged={load}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* POPUP SOẠN BÀI */}
      <Modal open={!!modal} onClose={() => !busy && setModal(null)}>
        {modal && (
          <form
            onSubmit={guiBai}
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {modal.editing ? "Chỉnh sửa bài viết" : "Đăng bài thảo luận"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {modal.editing
                    ? "Bài đã duyệt nên chỉnh sửa xong sẽ hiển thị ngay."
                    : "Bài sẽ hiển thị công khai sau khi quản trị viên duyệt."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={busy}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalErr && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalErr}</span>
              </div>
            )}

            {!modal.editing && (
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Chủ đề
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Nội dung
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ thắc mắc hoặc kinh nghiệm của bạn…"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition resize-none min-h-[140px] font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-3 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] disabled:opacity-60 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                {busy ? (
                  "Đang gửi…"
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {modal.editing ? "Lưu thay đổi" : "Gửi bài chờ duyệt"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
