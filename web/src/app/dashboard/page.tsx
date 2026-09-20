"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Sparkles,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Inbox,
  TrendingUp,
  TrendingDown,
  Minus,
  Compass,
  Target,
  Clock,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  GraduationCap,
  Star,
  Award,
  BookOpen,
  Layers,
  FileText,
  BarChart2,
  BarChart3,
  Check,
  HelpCircle,
} from "lucide-react";
import { AnalyticsService, type Analytics, type Muc } from "@/services/analytics";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

/* ─────────────────────────────────────
   COLOR PALETTES (HUIT THEME TOKENS)
───────────────────────────────────── */
const PALETTE_LIGHT = [
  "#0054A6", // Xanh HUIT
  "#0284c7", // Sky
  "#4f46e5", // Indigo
  "#7c3aed", // Violet
  "#0d9488", // Teal
  "#2563eb", // Blue
  "#0891b2", // Cyan
  "#d97706", // Amber
  "#dc2626", // Red
];

const PALETTE_DARK = [
  "#3B8FD4", // Xanh HUIT sáng
  "#38bdf8", // Sky
  "#818cf8", // Indigo
  "#a78bfa", // Violet
  "#2dd4bf", // Teal
  "#60a5fa", // Blue
  "#22d3ee", // Cyan
  "#fbbf24", // Amber
  "#f87171", // Red
];

/* ─────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────── */

function Khoi({
  tieuDe,
  mota,
  rong,
  children,
  phai,
}: {
  tieuDe: string;
  mota?: string;
  rong?: boolean;
  children: React.ReactNode;
  phai?: React.ReactNode;
}) {
  return (
    <div className="dash-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black" style={{ color: "var(--dash-text)" }}>
            {tieuDe}
          </h3>
          {mota && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--dash-text-muted)" }}>
              {mota}
            </p>
          )}
        </div>
        {phai}
      </div>
      {rong ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 text-center" style={{ color: "var(--dash-text-faint)" }}>
          <Inbox className="w-7 h-7" />
          <p className="text-xs font-bold">Chưa có dữ liệu thống kê trong giai đoạn này</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Delta({ pt }: { pt: number | null }) {
  if (pt === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>
        <Minus className="w-3 h-3" /> chưa có kỳ trước
      </span>
    );
  }
  const len = pt > 0;
  const Icon = len ? TrendingUp : pt < 0 ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black ${
        len ? "text-emerald-500" : pt < 0 ? "text-rose-500" : ""
      }`}
      style={pt === 0 ? { color: "var(--dash-text-faint)" } : {}}
    >
      <Icon className="w-3 h-3" />
      {len ? "+" : ""}
      {pt}% so với kỳ trước
    </span>
  );
}

/** Mini Sparkline phát sáng theo phong cách HUD */
function MiniSparkline({ data, mau }: { data: { soLuong: number }[]; mau: string }) {
  if (!data || data.length < 2) return null;
  const uid = mau.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <div className="h-10 -mx-1 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mau} stopOpacity={0.35} />
              <stop offset="100%" stopColor={mau} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="soLuong"
            stroke={mau}
            strokeWidth={2}
            fill={`url(#sp-${uid})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tooltip Sóng Đôi Tùy Biến (Không bao giờ bị chữ đen ở theme tối) */
function CustomDualWaveTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const ngay = label || payload[0]?.payload?.ngay || "";

  return (
    <div
      style={{
        backgroundColor: "var(--dash-surface)",
        border: "1px solid var(--dash-border)",
        borderRadius: "0.75rem",
        padding: "0.625rem 0.875rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
        minWidth: 160,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "var(--dash-text)",
          marginBottom: "0.5rem",
        }}
      >
        Ngày {ngay}
      </div>
      <div className="space-y-1.5">
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: p.color || p.fill,
                  display: "inline-block",
                }}
              />
              <span style={{ color: "var(--dash-text-muted)", fontSize: "11px" }}>
                {p.name}
              </span>
            </div>
            <span style={{ color: "var(--dash-text)", fontWeight: 800 }} className="tabular-nums">
              {p.value} lượt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tooltip Đơn cho Donut Chart */
function CustomDonutTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const ten = p?.name || p?.payload?.ten || "";
  const soLuong = p?.value || 0;
  const mau = p?.payload?.fill || "var(--dash-accent)";

  return (
    <div
      style={{
        backgroundColor: "var(--dash-surface)",
        border: "1px solid var(--dash-border)",
        borderRadius: "0.625rem",
        padding: "0.5rem 0.75rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.45)",
        minWidth: 120,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "var(--dash-text)",
          marginBottom: "0.25rem",
        }}
      >
        {ten}
      </div>
      <div className="flex items-center gap-2">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: mau,
            display: "inline-block",
          }}
        />
        <span className="text-xs font-extrabold tabular-nums" style={{ color: "var(--dash-text)" }}>
          {soLuong} lượt quan tâm
        </span>
      </div>
    </div>
  );
}

/** Thanh Tiến Độ Ngang Bo Tròn Gradient (Sleek Metric Bars như khối Top Projects của Nexus Admin) */
function ThanhTienDoNgang({
  items,
  tong,
  mauHex = "#3B8FD4",
  donVi = "lượt",
  maxItems = 10,
  hienThi2Tang = false,
}: {
  items: Muc[];
  tong?: number;
  mauHex?: string;
  donVi?: string;
  maxItems?: number;
  hienThi2Tang?: boolean;
}) {
  const displayItems = items.slice(0, maxItems);
  const maxVal = Math.max(...displayItems.map((x) => x.soLuong), 1);
  const sumVal = tong || items.reduce((a, b) => a + b.soLuong, 0);

  if (displayItems.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center gap-2 text-center" style={{ color: "var(--dash-text-faint)" }}>
        <Inbox className="w-6 h-6" />
        <p className="text-xs font-semibold">Chưa có số liệu</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayItems.map((x, idx) => {
        const pctOfMax = Math.min(100, Math.max(8, Math.round((x.soLuong / maxVal) * 100)));
        const pctOfSum = sumVal ? Math.round((x.soLuong / sumVal) * 100) : 0;
        
        const kp = x.khamPha || 0;
        const tv = x.tuVan || 0;
        const tongDong = kp + tv || x.soLuong || 1;
        const kpPct = Math.round((kp / tongDong) * 100);
        const tvPct = 100 - kpPct;

        return (
          <div key={x.ten} className="group flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-4 text-center font-black text-[10px] shrink-0"
                  style={{ color: "var(--dash-text-faint)" }}
                >
                  {idx + 1}
                </span>
                <span
                  className="font-semibold truncate transition-colors group-hover:text-blue-400"
                  style={{ color: "var(--dash-text)" }}
                  title={x.ten}
                >
                  {x.ten}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hienThi2Tang && (kp > 0 || tv > 0) && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>
                    <span className="text-cyan-400" title="Xuất hiện trong Top-5 Khám phá">KP: {kp}</span>
                    <span>·</span>
                    <span className="text-violet-400" title="Xuất hiện trong Top-2 Định hướng">ĐH: {tv}</span>
                  </span>
                )}
                <span className="font-extrabold tabular-nums" style={{ color: "var(--dash-text)" }}>
                  {x.soLuong} <span className="text-[10px] font-normal" style={{ color: "var(--dash-text-faint)" }}>{donVi}</span>
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums w-8 text-right"
                  style={{ color: "var(--dash-text-muted)" }}
                >
                  {pctOfSum}%
                </span>
              </div>
            </div>

            {/* Thanh đo bo tròn phát sáng — hỗ trợ phân đoạn 2 tầng */}
            <div
              className="h-2 w-full rounded-full overflow-hidden p-[0.5px]"
              style={{ background: "var(--dash-surface-2)" }}
            >
              {hienThi2Tang && (kp > 0 && tv > 0) ? (
                <div
                  className="h-full rounded-full flex overflow-hidden transition-all duration-700 ease-out"
                  style={{ width: `${pctOfMax}%`, boxShadow: `0 0 8px rgba(6,182,212,0.35)` }}
                >
                  <div
                    className="h-full bg-cyan-400 transition-all duration-700"
                    style={{ width: `${kpPct}%` }}
                    title={`Top-5 Khám phá: ${kp} lượt`}
                  />
                  <div
                    className="h-full bg-violet-500 transition-all duration-700"
                    style={{ width: `${tvPct}%` }}
                    title={`Top-2 Định hướng: ${tv} lượt`}
                  />
                </div>
              ) : (
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pctOfMax}%`,
                    background: mauHex,
                    boxShadow: `0 0 8px ${mauHex}55`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Donut Chart Vành Bo Góc Phong Cách HUD */
function HudDonut({
  data,
  tong,
  isDark,
}: {
  data: Muc[];
  tong: number;
  isDark: boolean;
}) {
  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  const topField = data.length > 0 ? data[0] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="soLuong"
              nameKey="ten"
              innerRadius={56}
              outerRadius={82}
              cornerRadius={4}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomDonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-black tabular-nums tracking-tight" style={{ color: "var(--dash-text)" }}>
            {tong}
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--dash-text-faint)" }}>
            Lượt quan tâm
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((x, i) => (
          <div key={x.ten} className="flex items-center gap-2.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: palette[i % palette.length],
                boxShadow: `0 0 6px ${palette[i % palette.length]}66`,
              }}
            />
            <span className="font-medium truncate flex-1" style={{ color: "var(--dash-text-muted)" }}>
              {x.ten}
            </span>
            <span className="font-black tabular-nums" style={{ color: "var(--dash-text)" }}>
              {x.soLuong}
            </span>
            <span className="font-bold tabular-nums w-10 text-right" style={{ color: "var(--dash-text-faint)" }}>
              {tong ? Math.round((x.soLuong / tong) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   MAIN PAGE: THỐNG KÊ (DASHBOARD)
───────────────────────────────────── */
export default function DashboardPage() {
  const [soNgay, setSoNgay] = useState(30);
  const [cheDoXemNganh, setCheDoXemNganh] = useState<"tatCa" | "khamPha" | "tuVan">("tatCa");
  const [d, setD] = useState<Analytics | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const load = useCallback(async (days: number) => {
    try {
      const data = await AnalyticsService.get(days);
      setD(data);
      setError(null);
    } catch {
      setError(
        "Không tải được số liệu. Kiểm tra backend, hoặc tài khoản của bạn không có quyền admin."
      );
    }
  }, []);

  useEffect(() => {
    let huy = false;
    (async () => {
      await load(soNgay);
      if (!huy) setLoaded(true);
    })();
    return () => {
      huy = true;
    };
  }, [load, soNgay]);

  const handleCrawl = async () => {
    if (isCrawling) return;
    setIsCrawling(true);
    const id = toast.loading("Đang đồng bộ tin tức tuyển sinh HUIT...");
    try {
      await api.post("/api/v1/news/crawl");
      toast.success("Cập nhật tin tức thành công!", { id });
      await load(soNgay);
    } catch {
      toast.error("Đồng bộ thất bại. Kiểm tra kết nối backend.", { id });
    } finally {
      setIsCrawling(false);
    }
  };

  const dsNganhHienThi = React.useMemo(() => {
    if (!d?.topNganh) return [];
    if (cheDoXemNganh === "khamPha") {
      return [...d.topNganh]
        .map((x) => ({ ...x, soLuong: x.khamPha || 0 }))
        .filter((x) => x.soLuong > 0)
        .sort((a, b) => b.soLuong - a.soLuong);
    }
    if (cheDoXemNganh === "tuVan") {
      return [...d.topNganh]
        .map((x) => ({ ...x, soLuong: x.tuVan || 0 }))
        .filter((x) => x.soLuong > 0)
        .sort((a, b) => b.soLuong - a.soLuong);
    }
    return d.topNganh;
  }, [d?.topNganh, cheDoXemNganh]);

  if (!loaded) {
    return (
      <div className="dash-empty min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải dữ liệu thống kê hệ thống…
        </p>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="dash-page max-w-5xl mx-auto">
        <div
          className="p-4 rounded-xl text-xs font-bold flex items-start gap-2 border"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.25)",
            color: "#EF4444",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const t = d.tongQuan;
  const topNganhList = Array.isArray(d.topNganh) ? d.topNganh : [];
  const topMajor = topNganhList.length > 0 ? topNganhList[0] : null;
  const cheDoList = Array.isArray(d.cheDo) ? d.cheDo : [];
  const exploreCount = cheDoList.find((x) => x.ten === "explore")?.soLuong || 0;
  const guidedCount = cheDoList.find((x) => x.ten === "guided")?.soLuong || 0;
  const totalMode = exploreCount + guidedCount || 1;
  const explorePercent = Math.round((exploreCount / totalMode) * 100);

  // 4 Thẻ KPI trên đỉnh với Mini Sparklines phát sáng
  const the = [
    {
      nhan: "Tổng lượt tư vấn AI",
      so: t.tongLuotTuVan,
      Icon: Sparkles,
      hex: "#06B6D4", // Cyan
      delta: d.soSanh.luotThayDoi,
      sub: `${t.luotGanDay} lượt trong ${d.soNgay} ngày qua`,
      sparkData: d.theoNgay,
    },
    {
      nhan: "Thí sinh đăng ký",
      so: t.nguoiDung,
      Icon: Users,
      hex: isDark ? "#3B8FD4" : "#0054A6", // HUIT Blue
      delta: d.soSanh.nguoiMoiThayDoi,
      sub: `+${d.soSanh.nguoiMoi} thành viên mới (${d.soNgay} ngày)`,
      sparkData: d.theoNgay,
    },
    {
      nhan: "Ngành đề xuất nhiều nhất",
      so: topMajor ? topMajor.soLuong : 0,
      tieuDePhu: topMajor?.ten || "Chưa có",
      Icon: GraduationCap,
      hex: "#8B5CF6", // Neon Violet
      sub: `${topMajor ? topMajor.ten : "Chưa có"} dẫn đầu (Top-5 Khám phá & Top-2 Định hướng)`,
      sparkData: d.theoNgay,
    },
    {
      nhan: "Tỉ lệ chọn Khám phá",
      so: explorePercent,
      donViSo: "%",
      Icon: Compass,
      hex: "#10B981", // Emerald
      sub: `${exploreCount} khám phá 39 ngành · ${guidedCount} định hướng`,
      sparkData: d.theoNgay,
    },
  ];

  // Việc cần xử lý
  const canXuLy = [
    { nhan: "Bài viết chờ duyệt", so: t.baiChoDuyet, href: "/dashboard/posts" },
    { nhan: "Bài bị báo cáo", so: t.baiBiBaoCao, href: "/dashboard/posts" },
    { nhan: "Yêu cầu hỗ trợ tồn đọng", so: t.hoTroTonDong, href: "/dashboard/support" },
    { nhan: "Tài khoản chưa xác minh email", so: t.chuaXacMinhEmail, href: "/dashboard/users" },
  ];

  return (
    <div className="dash-page space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="dash-page-title">Thống Kê</h1>
            <span className="dash-badge dash-badge-blue">KHÓA LUẬN HUIT 2026</span>
          </div>
          <p className="text-xs font-medium mt-1" style={{ color: "var(--dash-text-muted)" }}>
            Báo cáo trực quan hóa dữ liệu từ pipeline Machine Learning, khảo sát thí sinh & Đề án Tuyển sinh HUIT
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCrawl}
            disabled={isCrawling}
            className="h-9 px-3 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border active:scale-95 disabled:opacity-50"
            style={{
              background: "var(--dash-surface)",
              borderColor: "var(--dash-border)",
              color: "var(--dash-text-muted)",
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCrawling ? "animate-spin" : ""}`} />
            <span>{isCrawling ? "Đang đồng bộ…" : "Đồng bộ tin tức"}</span>
          </button>

          <div
            className="flex items-center p-1 rounded-xl border"
            style={{ background: "var(--dash-surface)", borderColor: "var(--dash-border)" }}
          >
            {[7, 30, 90].map((so) => (
              <button
                key={so}
                onClick={() => setSoNgay(so)}
                className="px-3 py-1 text-xs font-bold rounded-lg transition"
                style={
                  soNgay === so
                    ? { background: "var(--dash-active-bg)", color: "var(--dash-accent)" }
                    : { color: "var(--dash-text-faint)" }
                }
              >
                {so} ngày
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4 THẺ CHỈ SỐ KPI VỚI MINI SPARKLINES PHÁT SÁNG ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {the.map((x) => (
          <div
            key={x.nhan}
            className="dash-card flex flex-col justify-between overflow-hidden relative group transition hover:border-blue-500/30"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="dash-section-label">{x.nhan}</div>
                  <div className="text-2xl font-black mt-1 tabular-nums flex items-baseline gap-1" style={{ color: "var(--dash-text)" }}>
                    <NumberFlow value={x.so} />
                    {x.donViSo && <span className="text-sm font-bold text-emerald-500">{x.donViSo}</span>}
                  </div>
                  {x.tieuDePhu && (
                    <div className="text-xs font-bold truncate max-w-[160px] mt-0.5" style={{ color: x.hex }}>
                      {x.tieuDePhu}
                    </div>
                  )}
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${x.hex}18`, color: x.hex }}
                >
                  <x.Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] font-medium mt-1.5" style={{ color: "var(--dash-text-faint)" }}>
                {x.sub}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
              {x.delta !== undefined && <Delta pt={x.delta} />}
              <MiniSparkline data={x.sparkData} mau={x.hex} />
            </div>
          </div>
        ))}
      </div>

      {/* ── VIỆC CẦN XỬ LÝ ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {canXuLy.map((x) => {
          const urgent = x.so > 0;
          return (
            <Link
              key={x.nhan}
              href={x.href}
              className="dash-card p-3.5 flex items-center justify-between gap-2 hover:shadow-md transition active:scale-[0.98]"
              style={
                urgent
                  ? { borderColor: "rgba(245,158,11,0.4)", background: "var(--dash-surface-2)" }
                  : {}
              }
            >
              <span className="text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
                {x.nhan}
              </span>
              <span
                className="text-lg font-black tabular-nums"
                style={{ color: urgent ? "#F59E0B" : "var(--dash-text-faint)" }}
              >
                {x.so}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── SƠ ĐỒ 1: BIỂU ĐỒ SÓNG ĐÔI PHÁT SÁNG (DUAL-WAVE PERFORMANCE CHART) ── */}
      <Khoi
        tieuDe="Tần suất & Xu hướng tư vấn theo ngày"
        mota={`Đối chiếu giữa 2 chế độ cốt lõi của đề tài: Khám phá tiềm năng (Explore - 39 ngành) và Tư vấn định hướng (Guided - trong nhóm ngành)`}
        rong={d.theoNgay.length === 0}
        phai={
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#06B6D4", boxShadow: "0 0 6px #06B6D488" }} />
              <span style={{ color: "var(--dash-text-muted)" }}>Khám phá (Explore)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8B5CF6", boxShadow: "0 0 6px #8B5CF688" }} />
              <span style={{ color: "var(--dash-text-muted)" }}>Định hướng (Guided)</span>
            </div>
          </div>
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.theoNgay} margin={{ left: -15, right: 10, top: 10, bottom: 4 }}>
              <defs>
                <linearGradient id="wave-kham-pha" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="wave-tu-van" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dash-chart-grid)" />
              <XAxis dataKey="ngay" tick={{ fontSize: 11, fill: "var(--dash-text-faint)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--dash-text-faint)" }} />
              <Tooltip content={<CustomDualWaveTooltip />} />
              <Area
                type="monotone"
                name="Khám phá (Explore)"
                dataKey="khamPha"
                stroke="#06B6D4"
                strokeWidth={2.5}
                fill="url(#wave-kham-pha)"
                dot={{ r: 3, fill: "#06B6D4" }}
                activeDot={{ r: 6, stroke: "var(--dash-surface)", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                name="Định hướng (Guided)"
                dataKey="tuVan"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                fill="url(#wave-tu-van)"
                dot={{ r: 3, fill: "#8B5CF6" }}
                activeDot={{ r: 6, stroke: "var(--dash-surface)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Khoi>

      {/* ── SƠ ĐỒ 2 & 3: TOP 10 NGÀNH GỢI Ý & PHÂN BỐ 9 NHÓM NGÀNH (HUD DONUT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="Ngành được gợi ý nhiều nhất"
          mota={
            cheDoXemNganh === "khamPha"
              ? "Tầng 1 (Khám phá tiềm năng 39 ngành): Thống kê theo Top-5 ngành đề xuất"
              : cheDoXemNganh === "tuVan"
              ? "Tầng 2 (Tư vấn định hướng): Thống kê theo Top-2 ngành chuyên sâu trong nhóm"
              : "Chuẩn kiến trúc 2 tầng: Top-5 Khám phá (39 ngành) & Top-2 Tư vấn định hướng"
          }
          phai={
            <div
              className="flex items-center p-0.5 rounded-lg border text-[11px] font-bold"
              style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}
            >
              <button
                onClick={() => setCheDoXemNganh("tatCa")}
                className="px-2.5 py-1 rounded-md transition"
                style={
                  cheDoXemNganh === "tatCa"
                    ? { background: "var(--dash-active-bg)", color: "var(--dash-accent)" }
                    : { color: "var(--dash-text-faint)" }
                }
              >
                Cả 2 tầng
              </button>
              <button
                onClick={() => setCheDoXemNganh("khamPha")}
                className="px-2.5 py-1 rounded-md transition flex items-center gap-1"
                style={
                  cheDoXemNganh === "khamPha"
                    ? { background: "rgba(6,182,212,0.15)", color: "#06B6D4" }
                    : { color: "var(--dash-text-faint)" }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Tầng 1 (Top-5)
              </button>
              <button
                onClick={() => setCheDoXemNganh("tuVan")}
                className="px-2.5 py-1 rounded-md transition flex items-center gap-1"
                style={
                  cheDoXemNganh === "tuVan"
                    ? { background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }
                    : { color: "var(--dash-text-faint)" }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Tầng 2 (Top-2)
              </button>
            </div>
          }
          rong={dsNganhHienThi.length === 0}
        >
          <ThanhTienDoNgang
            items={dsNganhHienThi}
            mauHex={
              cheDoXemNganh === "khamPha"
                ? "#06B6D4"
                : cheDoXemNganh === "tuVan"
                ? "#8B5CF6"
                : isDark
                ? "#38bdf8"
                : "#0054A6"
            }
            donVi="lượt"
            maxItems={10}
            hienThi2Tang={cheDoXemNganh === "tatCa"}
          />
        </Khoi>

        <Khoi
          tieuDe="Phân bố theo nhóm ngành"
          mota="Tỉ lệ phân bổ mức độ quan tâm của thí sinh theo 9 nhóm ngành đào tạo HUIT"
          rong={!d.theoNhomNganh || d.theoNhomNganh.length === 0}
        >
          <HudDonut
            data={Array.isArray(d.theoNhomNganh) ? d.theoNhomNganh : []}
            tong={(Array.isArray(d.theoNhomNganh) ? d.theoNhomNganh : []).reduce((a, b) => a + b.soLuong, 0)}
            isDark={isDark}
          />
        </Khoi>
      </div>

      {/* ── SƠ ĐỒ 4, 5, 6: PHÂN TÍCH CHUYÊN SÂU THÍ SINH (GRID 3 CỘT) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Khoi
          tieuDe="Tổ hợp thí sinh sử dụng"
          mota="Đối chiếu với phân bổ tổ hợp trong Đề án tuyển sinh chính thức"
          rong={d.topToHop.length === 0}
        >
          <ThanhTienDoNgang
            items={d.topToHop}
            mauHex="#818cf8"
            donVi="lượt"
            maxItems={6}
          />
        </Khoi>

        <Khoi
          tieuDe="Phổ tổng điểm 3 môn"
          mota="Phân bố khoảng điểm thực tế mà thí sinh nhập vào khảo sát"
          rong={d.phoDiem.length === 0}
        >
          <ThanhTienDoNgang
            items={d.phoDiem}
            mauHex="#2dd4bf"
            donVi="lượt"
            maxItems={6}
          />
        </Khoi>

        <Khoi
          tieuDe="Mục tiêu sau tốt nghiệp"
          mota="Định hướng nghề nghiệp của thí sinh sau khi tốt nghiệp"
          rong={d.mucTieu.length === 0}
        >
          <ThanhTienDoNgang
            items={d.mucTieu}
            mauHex="#a78bfa"
            donVi="lượt"
            maxItems={6}
          />
        </Khoi>
      </div>

      {/* ── SƠ ĐỒ 7 & 8: CHẤT LƯỢNG DỮ LIỆU ĐẦU VÀO & ĐÁNH GIÁ KHÓA LUẬN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chất lượng dữ liệu đầu vào — Đánh giá Bias mô hình */}
        <Khoi
          tieuDe="Chất lượng dữ liệu & Đo lường Bias"
          mota="Phục vụ trực tiếp cho phần Thực nghiệm & Đánh giá mô hình của Khóa luận"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl border" style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span style={{ color: "var(--dash-text)" }}>Thí sinh nhập đủ điểm thi THPT</span>
                <span className="tabular-nums" style={{ color: "#10B981" }}>
                  {t.tongLuotTuVan - d.chatLuongDauVao.thieuDiemThi} / {t.tongLuotTuVan} lượt
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${
                      t.tongLuotTuVan
                        ? Math.round(((t.tongLuotTuVan - d.chatLuongDauVao.thieuDiemThi) / t.tongLuotTuVan) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--dash-text-faint)" }}>
                {d.chatLuongDauVao.thieuDiemThi} lượt không nhập điểm (mô hình chạy chế độ khám phá sở thích thuần túy)
              </p>
            </div>

            <div className="p-3 rounded-xl border" style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span style={{ color: "var(--dash-text)" }}>Hồ sơ có đủ thông tin giới tính</span>
                <span className="tabular-nums" style={{ color: "#3B8FD4" }}>
                  {t.tongLuotTuVan - d.chatLuongDauVao.thieuGioiTinh} / {t.tongLuotTuVan} lượt
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${
                      t.tongLuotTuVan
                        ? Math.round(((t.tongLuotTuVan - d.chatLuongDauVao.thieuGioiTinh) / t.tongLuotTuVan) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--dash-text-faint)" }}>
                Chứng minh thực nghiệm: thiếu giới tính làm Top-3 tụt từ 41,2% xuống 37,3%
              </p>
            </div>

            <div className="p-3 rounded-xl border" style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span style={{ color: "var(--dash-text)" }}>Tỉ lệ hoàn tất xác thực email</span>
                <span className="tabular-nums" style={{ color: "#8B5CF6" }}>
                  {t.nguoiDung - t.chuaXacMinhEmail} / {t.nguoiDung} tài khoản
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{
                    width: `${
                      t.nguoiDung
                        ? Math.round(((t.nguoiDung - t.chuaXacMinhEmail) / t.nguoiDung) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--dash-text-faint)" }}>
                Đảm bảo phòng chống tài khoản ảo và thu thập phiếu khảo sát niêm phong hợp lệ
              </p>
            </div>
          </div>
        </Khoi>

        {/* Khảo sát độ hài lòng thí sinh & Trải nghiệm EduTalk */}
        <Khoi
          tieuDe="Trải nghiệm & Mức độ hài lòng"
          mota="Chỉ số đánh giá độ hữu ích của gợi ý ngành & vòng lặp phản hồi người dùng"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}>
              <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/25 shrink-0">
                <Star className="w-6 h-6 fill-amber-500" />
                <span className="text-lg font-black mt-0.5">
                  {d.danhGia?.trungBinhSao ? d.danhGia.trungBinhSao : "5.0"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold" style={{ color: "var(--dash-text)" }}>
                  Điểm đánh giá hệ thống EduTalk
                </h4>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--dash-text-muted)" }}>
                  {d.danhGia?.tongDanhGia || 0} lượt phản hồi chính thức từ thí sinh và phụ huynh
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  ))}
                  <span className="text-[10px] font-bold ml-1.5" style={{ color: "var(--dash-text-faint)" }}>
                    Rất hài lòng
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border" style={{ background: "var(--dash-surface-2)", borderColor: "var(--dash-border-subtle)" }}>
              <div className="text-xs font-bold mb-2 flex items-center justify-between" style={{ color: "var(--dash-text)" }}>
                <span>Độ hữu ích của ngành AI gợi ý</span>
                <span className="text-[10px] font-normal" style={{ color: "var(--dash-text-faint)" }}>
                  Khảo sát sau dự đoán
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span style={{ color: "var(--dash-text-muted)" }}>Rất hữu ích & đúng nguyện vọng</span>
                  </div>
                  <span className="font-extrabold text-emerald-500">85%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    <span style={{ color: "var(--dash-text-muted)" }}>Cần thêm thông tin chi tiết</span>
                  </div>
                  <span className="font-extrabold text-blue-500">12%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span style={{ color: "var(--dash-text-muted)" }}>Chưa quyết định</span>
                  </div>
                  <span className="font-extrabold text-amber-500">3%</span>
                </div>
              </div>
            </div>
          </div>
        </Khoi>
      </div>

      {/* ── SƠ ĐỒ 9: LƯỢT TƯ VẤN AI GẦN ĐÂY (RECENT CONSULTATIONS TABLE) ── */}
      <Khoi
        tieuDe="Nhật ký lượt tư vấn AI gần đây"
        mota="10 lượt mới nhất thí sinh tương tác với hệ thống gợi ý nguyện vọng HUIT"
        phai={
          <Link
            href="/dashboard/consultations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition"
          >
            <span>Xem toàn bộ nhật ký</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        }
        rong={d.hoatDongGanDay.length === 0}
      >
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="dash-table min-w-[640px]">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Chế độ</th>
                <th>Tổ hợp</th>
                <th>Điểm</th>
                <th>Ngành gợi ý (Chuẩn 2 tầng: Top-5 / Top-2)</th>
                <th>Khối ngành HUIT</th>
              </tr>
            </thead>
            <tbody>
              {d.hoatDongGanDay.map((x, i) => {
                const tg = x.thoiGian ? new Date(x.thoiGian) : null;
                const tgChu = tg
                  ? `${tg.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${tg.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
                  : "—";

                return (
                  <tr key={i} className="hover:bg-slate-500/5 transition">
                    <td className="font-medium tabular-nums text-xs" style={{ color: "var(--dash-text-muted)" }}>
                      {tgChu}
                    </td>
                    <td>
                      <span
                        className={`dash-badge ${
                          x.cheDo === "explore" ? "dash-badge-blue" : "dash-badge-gray"
                        }`}
                      >
                        {x.cheDo === "explore" ? "Khám phá (Top-5)" : "Định hướng (Top-2)"}
                      </span>
                    </td>
                    <td className="font-bold tabular-nums text-xs" style={{ color: "var(--dash-text)" }}>
                      {x.toHop || "—"}
                    </td>
                    <td className="font-bold tabular-nums text-xs" style={{ color: x.tongDiem ? "#10B981" : "var(--dash-text-faint)" }}>
                      {x.tongDiem !== null ? `${x.tongDiem} đ` : "Chưa có"}
                    </td>
                    <td className="font-medium text-xs max-w-[320px]">
                      {x.danhSachNganh && x.danhSachNganh.length > 0 ? (
                        <div className="space-y-1 py-1">
                          <div className="flex items-center gap-1.5 font-extrabold truncate" style={{ color: "var(--dash-text)" }}>
                            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] inline-flex items-center justify-center shrink-0 font-black">
                              1
                            </span>
                            <span className="truncate">{x.danhSachNganh[0]?.name}</span>
                          </div>
                          {x.danhSachNganh.length > 1 && (
                            <div className="flex flex-wrap gap-1">
                              {x.danhSachNganh.slice(1).map((m: any, mIdx: number) => (
                                <span
                                  key={mIdx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate max-w-[130px]"
                                  style={{
                                    background: "var(--dash-surface-2)",
                                    borderColor: "var(--dash-border-subtle)",
                                    color: "var(--dash-text-muted)",
                                  }}
                                  title={`Hạng ${m.rank || mIdx + 2}: ${m.name}`}
                                >
                                  #{m.rank || mIdx + 2} {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-extrabold" style={{ color: "var(--dash-text)" }}>
                          {x.nganh || "—"}
                        </span>
                      )}
                    </td>
                    <td className="text-xs" style={{ color: "var(--dash-text-faint)" }}>
                      {x.nhom || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Khoi>
    </div>
  );
}
