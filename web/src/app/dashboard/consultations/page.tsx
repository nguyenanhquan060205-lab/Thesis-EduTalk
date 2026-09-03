"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Compass,
  Target,
  Loader2,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { ModelService, type Consultation } from "@/services/modelMetrics";
import { ADMISSION_BLOCKS } from "@/lib/admission";

const CHE_DO = [
  { v: "", nhan: "Mọi chế độ" },
  { v: "explore", nhan: "Khám phá" },
  { v: "guided", nhan: "Tư vấn" },
];

export default function ConsultationsPage() {
  const [ds, setDs] = useState<Consultation[]>([]);
  const [tong, setTong] = useState(0);
  const [soTrang, setSoTrang] = useState(1);
  const [trang, setTrang] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState("");
  const [toHop, setToHop] = useState("");
  const [q, setQ] = useState("");
  const [qGui, setQGui] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await ModelService.consultations({
        page: trang,
        size: 20,
        mode: mode || undefined,
        subjectGroup: toHop || undefined,
        q: qGui || undefined,
      });
      setDs(r.data);
      setTong(r.tong);
      setSoTrang(r.soTrang);
      setError(null);
    } catch {
      setError(
        "Không tải được lịch sử. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
      );
    }
  }, [trang, mode, toHop, qGui]);

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

  // Đổi bộ lọc thì quay về trang 1, tránh rơi vào trang không tồn tại
  const doiLoc = (fn: () => void) => {
    fn();
    setTrang(1);
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">Đang tải lịch sử tư vấn…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-white animate-fade-in-up">
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-cyan-400/20 text-cyan-300 text-[10px] font-black uppercase mb-2">
          <History className="w-3.5 h-3.5" /> Lịch sử
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Lịch Sử Tư Vấn
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
          {tong} phiên tư vấn đã thực hiện. Hiển thị tên người dùng, không hiện email
          hay số điện thoại.
        </p>
      </div>

      {error && (
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doiLoc(() => setQGui(q));
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên ngành được gợi ý… (Enter để tìm)"
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder-gray-500 outline-none focus:border-cyan-400"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {CHE_DO.map((c) => (
            <button
              key={c.v}
              onClick={() => doiLoc(() => setMode(c.v))}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition ${
                mode === c.v
                  ? "bg-cyan-400 text-slate-900 border-cyan-400"
                  : "bg-white/[0.04] text-gray-300 border-white/10 hover:border-white/25"
              }`}
            >
              {c.nhan}
            </button>
          ))}

          <select
            value={toHop}
            onChange={(e) => doiLoc(() => setToHop(e.target.value))}
            className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
          >
            <option value="">Mọi tổ hợp</option>
            {Object.keys(ADMISSION_BLOCKS).map((b) => (
              <option key={b} value={b} className="bg-slate-900">
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ds.length === 0 && !error && (
        <div className="p-12 bg-white/[0.04] rounded-3xl border border-white/10 text-center space-y-2">
          <Inbox className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-sm font-bold text-gray-400">
            {tong === 0
              ? "Chưa có phiên tư vấn nào được lưu."
              : "Không có phiên nào khớp bộ lọc."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ds.map((c) => (
          <div
            key={c.id}
            className="p-4 sm:p-5 bg-white/[0.04] rounded-3xl border border-white/10 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-black truncate">{c.nguoiDung}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                    c.cheDo === "guided"
                      ? "bg-violet-400/20 text-violet-300"
                      : "bg-cyan-400/20 text-cyan-300"
                  }`}
                >
                  {c.cheDo === "guided" ? (
                    <>
                      <Target className="w-3 h-3" /> Tư vấn
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3" /> Khám phá
                    </>
                  )}
                </span>
                {c.thieuGioiTinh && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-black">
                    <ShieldAlert className="w-3 h-3" /> Thiếu giới tính
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500 font-medium shrink-0">
                {c.thoiGian
                  ? new Date(c.thoiGian).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 font-medium">
              <span>
                Tổ hợp <strong className="text-gray-200">{c.toHop ?? "—"}</strong>
              </span>
              <span>
                Tổng điểm{" "}
                <strong className="text-gray-200">
                  {c.tongDiem ?? "chưa nhập"}
                </strong>
              </span>
              <span>
                Mục tiêu <strong className="text-gray-200">{c.mucTieu ?? "—"}</strong>
              </span>
            </div>

            {c.goiY.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                {c.goiY.map((g) => (
                  <span
                    key={g.rank}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px]"
                  >
                    <span className="font-black text-cyan-300">#{g.rank}</span>
                    <span className="font-bold text-gray-100">{g.ten}</span>
                    <span className="text-gray-500">· {g.nhom}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {soTrang > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setTrang((n) => Math.max(1, n - 1))}
            disabled={trang <= 1}
            className="p-2 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-gray-300">
            Trang {trang} / {soTrang}
          </span>
          <button
            onClick={() => setTrang((n) => Math.min(soTrang, n + 1))}
            disabled={trang >= soTrang}
            className="p-2 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
