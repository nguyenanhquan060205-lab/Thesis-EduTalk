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
import NumberFlow from "@number-flow/react";

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

  const doiLoc = (fn: () => void) => {
    fn();
    setTrang(1);
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải lịch sử tư vấn…</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
          <History className="w-3.5 h-3.5" /> Nhật ký hệ thống
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Lịch Sử Tư Vấn AI
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 flex items-center gap-1.5">
          <span>Tổng cộng</span>
          <strong className="text-slate-900 font-black">
            <NumberFlow value={tong} />
          </strong>
          <span>phiên tư vấn đã được thực hiện và lưu trữ an toàn.</span>
        </p>
      </div>

      {error && (
        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
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
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên ngành được gợi ý… (Nhấn Enter để tìm)"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-[#0054A6] shadow-xs"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {CHE_DO.map((c) => (
            <button
              key={c.v}
              onClick={() => doiLoc(() => setMode(c.v))}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-[0.98] ${
                mode === c.v
                  ? "bg-[#0054A6] text-white border-[#0054A6] shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.nhan}
            </button>
          ))}

          <select
            value={toHop}
            onChange={(e) => doiLoc(() => setToHop(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0054A6] shadow-xs cursor-pointer"
          >
            <option value="">Mọi tổ hợp xét tuyển</option>
            {Object.keys(ADMISSION_BLOCKS).map((b) => (
              <option key={b} value={b} className="bg-white text-slate-900">
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ds.length === 0 && !error && (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            {tong === 0
              ? "Chưa có phiên tư vấn nào được lưu."
              : "Không tìm thấy phiên tư vấn nào khớp với bộ lọc."}
          </p>
        </div>
      )}

      {/* Danh sách phiên tư vấn */}
      <div className="space-y-3">
        {ds.map((c) => (
          <div
            key={c.id}
            className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition group"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-black text-slate-900 truncate">{c.nguoiDung}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                    c.cheDo === "guided"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                      : "bg-blue-50 text-[#0054A6] border border-blue-200/60"
                  }`}
                >
                  {c.cheDo === "guided" ? (
                    <>
                      <Target className="w-3 h-3" /> Tư vấn định hướng
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3" /> Khám phá tiềm năng
                    </>
                  )}
                </span>
                {c.thieuGioiTinh && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                    <ShieldAlert className="w-3 h-3" /> Thiếu giới tính
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium shrink-0">
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

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
              <span>
                Tổ hợp <strong className="text-slate-800 font-bold">{c.toHop ?? "—"}</strong>
              </span>
              <span>
                Tổng điểm{" "}
                <strong className="text-slate-800 font-bold">
                  {c.tongDiem ?? "chưa nhập"}
                </strong>
              </span>
              <span>
                Mục tiêu <strong className="text-slate-800 font-bold">{c.mucTieu ?? "—"}</strong>
              </span>
            </div>

            {c.goiY.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {c.goiY.map((g) => (
                  <span
                    key={g.rank}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                  >
                    <span className="font-black text-[#0054A6]">#{g.rank}</span>
                    <span className="font-bold text-slate-900">{g.ten}</span>
                    <span className="text-slate-400 font-medium">· {g.nhom}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {soTrang > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setTrang((n) => Math.max(1, n - 1))}
            disabled={trang <= 1}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-slate-700">
            Trang {trang} / {soTrang}
          </span>
          <button
            onClick={() => setTrang((n) => Math.min(soTrang, n + 1))}
            disabled={trang >= soTrang}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
