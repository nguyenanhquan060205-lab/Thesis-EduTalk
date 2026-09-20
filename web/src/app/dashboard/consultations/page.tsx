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
      <div className="dash-empty min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải lịch sử tư vấn…
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
          <History size={20} />
        </div>
        <div>
          <div className="dash-section-label mb-1">Nhật ký hệ thống · AI Session Logs</div>
          <h1 className="dash-page-title">Lịch Sử Tư Vấn AI</h1>
          <p className="text-xs font-medium mt-1 flex items-center gap-1.5" style={{ color: "var(--dash-text-muted)" }}>
            <span>Tổng cộng</span>
            <strong style={{ color: "var(--dash-text)" }}>
              <NumberFlow value={tong} />
            </strong>
            <span>phiên tư vấn đã được thực hiện và lưu trữ an toàn.</span>
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

      {/* Bộ lọc */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doiLoc(() => setQGui(q));
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--dash-text-faint)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên ngành được gợi ý… (Nhấn Enter để tìm)"
            className="dash-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {CHE_DO.map((c) => (
            <button
              key={c.v}
              onClick={() => doiLoc(() => setMode(c.v))}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer"
              style={
                mode === c.v
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
              {c.nhan}
            </button>
          ))}

          <select
            value={toHop}
            onChange={(e) => doiLoc(() => setToHop(e.target.value))}
            className="dash-input px-3 py-2 text-xs font-bold cursor-pointer"
          >
            <option value="">Mọi tổ hợp xét tuyển</option>
            {Object.keys(ADMISSION_BLOCKS).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ds.length === 0 && !error && (
        <div className="dash-card text-center py-12">
          <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--dash-text-faint)" }} />
          <p className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
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
            className="dash-card space-y-3 hover:shadow-md transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-black truncate" style={{ color: "var(--dash-text)" }}>
                  {c.nguoiDung}
                </span>
                <span
                  className="dash-badge dash-badge-blue"
                >
                  {c.cheDo === "guided" ? (
                    <>
                      <Target className="w-3 h-3 mr-1" /> Tư vấn định hướng
                    </>
                  ) : (
                    <>
                      <Compass className="w-3 h-3 mr-1" /> Khám phá tiềm năng
                    </>
                  )}
                </span>
                {c.thieuGioiTinh && (
                  <span className="dash-badge dash-badge-amber">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Thiếu giới tính
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium shrink-0" style={{ color: "var(--dash-text-faint)" }}>
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

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium" style={{ color: "var(--dash-text-muted)" }}>
              <span>
                Tổ hợp <strong style={{ color: "var(--dash-text)" }}>{c.toHop ?? "—"}</strong>
              </span>
              <span>
                Tổng điểm{" "}
                <strong style={{ color: "var(--dash-text)" }}>
                  {c.tongDiem ?? "chưa nhập"}
                </strong>
              </span>
              <span>
                Mục tiêu <strong style={{ color: "var(--dash-text)" }}>{c.mucTieu ?? "—"}</strong>
              </span>
            </div>

            {c.goiY.length > 0 && (
              <div className="pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--dash-border-subtle)" }}>
                {c.goiY.map((g) => (
                  <span
                    key={g.rank}
                    className="dash-card-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] border"
                  >
                    <span className="font-black" style={{ color: "var(--dash-accent)" }}>#{g.rank}</span>
                    <span className="font-bold" style={{ color: "var(--dash-text)" }}>{g.ten}</span>
                    <span style={{ color: "var(--dash-text-faint)" }}>· {g.nhom}</span>
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
            className="dash-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black" style={{ color: "var(--dash-text)" }}>
            Trang {trang} / {soTrang}
          </span>
          <button
            onClick={() => setTrang((n) => Math.min(soTrang, n + 1))}
            disabled={trang >= soTrang}
            className="dash-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
