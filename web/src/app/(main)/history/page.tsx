"use client";

import {
  History,
  Sparkles,
  Calendar,
  ArrowRight,
  GraduationCap,
  Loader2,
  AlertCircle,
  Compass,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  HistoryService,
  totalScoreOf,
  formatDateTime,
  type HistoryEntry,
} from "@/services/history";

/**
 * Lịch sử tư vấn thật, đọc `GET /api/v1/survey/history/{uid}`.
 *
 * Bản trước dựng cứng 3 phiên mẫu (CNTT 24.50đ · 89.4% phù hợp · "Cần cải thiện
 * điểm môn Toán" · "Khoa CNTT"). Không trường nào trong số đó có trong dữ liệu
 * được lưu: `prediction_history` không lưu điểm phần trăm phù hợp, không lưu lời
 * khuyên, và tên khoa cũng không nằm trong 7 nhóm ngành thật.
 */
export default function HistoryPage() {
  const { user } = useAuthStore();
  const [list, setList] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    HistoryService.list(user.id)
      .then(setList)
      .catch(() => setError("Không tải được lịch sử tư vấn."))
      .finally(() => setLoaded(true));
  }, [user?.id]);

  const loading = !!user?.id && !loaded;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải lịch sử…</p>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
        <History className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Bạn chưa đăng nhập</h2>
        <p className="text-sm text-slate-600 font-medium">
          Lịch sử tư vấn được lưu theo tài khoản. Hãy đăng nhập rồi làm khảo sát để
          xem lại kết quả các lần trước.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition"
        >
          Đăng nhập <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-2 pb-24 animate-fade-in-up space-y-6">
      <div className="border-b border-slate-200/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black uppercase mb-2">
            <History className="w-3.5 h-3.5" /> Lịch sử tư vấn
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Các Lần Bạn Đã Làm Khảo Sát
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-medium mt-1">
            {list.length > 0
              ? `${list.length} lần đã lưu, mới nhất xếp trên cùng.`
              : "Kết quả sẽ được lưu lại mỗi lần bạn hoàn thành bài khảo sát."}
          </p>
        </div>

        <Link
          href="/predict"
          className="px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition flex items-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4" /> Làm khảo sát mới
        </Link>
      </div>

      {error && (
        <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-slate-700">{error}</p>
        </div>
      )}

      {!error && list.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-3">
          <History className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">Chưa có lần tư vấn nào.</p>
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#0054A6] hover:underline"
          >
            Làm bài khảo sát đầu tiên <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {list.map((e) => {
          const diem = totalScoreOf(e);
          const top = e.majors?.[0];
          return (
            <div
              key={e.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:border-[#0054A6]/50 transition space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateTime(e.createdAt)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border ${
                    e.mode === "guided"
                      ? "bg-violet-50 text-violet-700 border-violet-200"
                      : "bg-cyan-50 text-cyan-700 border-cyan-200"
                  }`}
                >
                  {e.mode === "guided" ? (
                    <>
                      <Target className="w-3 h-3" /> Tư vấn theo nhóm ngành
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3" /> Khám phá toàn diện
                    </>
                  )}
                </span>
              </div>

              {top && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Ngành được gợi ý đầu tiên
                    </div>
                    <div className="text-base font-black text-[#0F172A] leading-snug">
                      {top.name}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      Mã {top.code} · Nhóm {top.field}
                    </div>
                  </div>
                </div>
              )}

              {/* Chỉ hiện những gì thật sự được lưu trong prediction_history */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#F5F8FA] border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Tổ hợp
                  </span>
                  <strong className="text-slate-800 font-black">
                    {e.input?.subjectGroup ?? "—"}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#F5F8FA] border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Tổng điểm
                  </span>
                  <strong className="text-slate-800 font-black">
                    {diem != null ? `${diem} đ` : "Chưa nhập"}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#F5F8FA] border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Mục tiêu
                  </span>
                  <strong className="text-slate-800 font-black">
                    {e.input?.goal ?? "—"}
                  </strong>
                </div>
              </div>

              {e.majors?.length > 1 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Các ngành khác được gợi ý
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {e.majors.slice(1).map((m) => (
                      <span
                        key={m.code}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        #{m.rank} {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
