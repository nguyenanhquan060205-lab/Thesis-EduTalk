"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
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
} from "lucide-react";
import { AnalyticsService, type Analytics, type Muc } from "@/services/analytics";
import NumberFlow from "@number-flow/react";

const PALETTE = [
  "#0054A6", // Xanh HUIT
  "#0284c7", // Sky 600
  "#4f46e5", // Indigo 600
  "#7c3aed", // Violet 600
  "#0d9488", // Teal 600
  "#2563eb", // Blue 600
  "#0891b2", // Cyan 600
];

/** Khối biểu đồ, tự hiện trạng thái rỗng khi chưa có dữ liệu. */
function Khoi({
  tieuDe,
  mota,
  rong,
  children,
}: {
  tieuDe: string;
  mota?: string;
  rong: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-900">{tieuDe}</h3>
        {mota && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{mota}</p>}
      </div>
      {rong ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Inbox className="w-7 h-7" />
          <p className="text-xs font-bold">Chưa có dữ liệu</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/** Mũi tên tăng/giảm so với kỳ trước. `null` = kỳ trước chưa có dữ liệu. */
function Delta({ pt }: { pt: number | null }) {
  if (pt === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <Minus className="w-3 h-3" /> chưa có kỳ trước để so sánh
      </span>
    );
  }
  const len = pt > 0;
  const Icon = len ? TrendingUp : pt < 0 ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black ${
        len ? "text-emerald-600" : pt < 0 ? "text-rose-600" : "text-slate-500"
      }`}
    >
      <Icon className="w-3 h-3" />
      {len ? "+" : ""}
      {pt}% so với kỳ trước
    </span>
  );
}

/** Đường xu hướng nhỏ đặt dưới con số trong thẻ. */
function Sparkline({ data, mau }: { data: { soLuong: number }[]; mau: string }) {
  if (data.length < 2) return null;
  return (
    <div className="h-9 -mx-1 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`sp-${mau.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mau} stopOpacity={0.25} />
              <stop offset="100%" stopColor={mau} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="soLuong"
            stroke={mau}
            strokeWidth={1.8}
            fill={`url(#sp-${mau.replace("#", "")})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut kèm chú giải có số và phần trăm. */
function Donut({ data, tong }: { data: Muc[]; tong: number }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="soLuong"
              nameKey="ten"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                color: "#0f172a",
              }}
              formatter={(v) => [`${v} lượt`, ""] as [string, string]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900">{tong}</span>
          <span className="text-[10px] text-slate-400 font-bold">lượt</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((x, i) => (
          <div key={x.ten} className="flex items-center gap-2.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="font-medium text-slate-700 truncate flex-1">{x.ten}</span>
            <span className="font-black text-slate-900 tabular-nums">{x.soLuong}</span>
            <span className="text-slate-400 font-bold tabular-nums w-12 text-right">
              {tong ? Math.round((x.soLuong / tong) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BieuDoCot({ data, mau = 0 }: { data: Muc[]; mau?: number }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis
            dataKey="ten"
            type="category"
            width={150}
            tick={{ fontSize: 11, fill: "#334155" }}
          />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              color: "#0f172a",
            }}
            formatter={(v) => [`${v} lượt`, ""] as [string, string]}
          />
          <Bar dataKey="soLuong" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[(i + mau) % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsPage() {
  const [d, setD] = useState<Analytics | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soNgay, setSoNgay] = useState(30);

  const load = useCallback(async (days: number) => {
    try {
      setD(await AnalyticsService.get(days));
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

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải số liệu phân tích…</p>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="p-6 sm:p-10 max-w-5xl mx-auto">
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const t = d.tongQuan;
  const the = [
    {
      nhan: "Người dùng",
      so: t.nguoiDung,
      Icon: Users,
      mau: "text-[#0054A6]",
      nen: "bg-blue-50 border border-blue-200/60",
      hex: "#0054A6",
      delta: d.soSanh.nguoiMoiThayDoi,
    },
    {
      nhan: "Tổng lượt tư vấn",
      so: t.tongLuotTuVan,
      Icon: Sparkles,
      mau: "text-indigo-600",
      nen: "bg-indigo-50 border border-indigo-200/60",
      hex: "#4f46e5",
      spark: true,
    },
    {
      nhan: `Lượt ${d.soNgay} ngày qua`,
      so: t.luotGanDay,
      Icon: BarChart3,
      mau: "text-violet-600",
      nen: "bg-violet-50 border border-violet-200/60",
      hex: "#7c3aed",
      delta: d.soSanh.luotThayDoi,
    },
    {
      nhan: "Chưa xác minh email",
      so: t.chuaXacMinhEmail,
      Icon: ShieldAlert,
      mau: "text-amber-600",
      nen: "bg-amber-50 border border-amber-200/60",
      hex: "#d97706",
    },
  ] as {
    nhan: string;
    so: number;
    Icon: React.ElementType;
    mau: string;
    nen: string;
    hex: string;
    delta?: number | null;
    spark?: boolean;
  }[];

  const canXuLy = [
    { nhan: "Bài chờ duyệt", so: t.baiChoDuyet, href: "/dashboard/posts" },
    { nhan: "Bài bị báo cáo", so: t.baiBiBaoCao, href: "/dashboard/posts" },
    { nhan: "Hỗ trợ tồn đọng", so: t.hoTroTonDong, href: "/dashboard/support" },
    { nhan: "Thông báo chưa đọc", so: t.thongBaoChuaDoc, href: "/dashboard/support" },
  ];

  const cl = d.chatLuongDauVao;

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Thống kê & Phân tích
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Số Liệu Khảo Sát Hệ Thống
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Tổng hợp dữ liệu thực tế từ cơ sở dữ liệu — trực quan hoá phân bố nguyện vọng tuyển sinh.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setSoNgay(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-[0.98] ${
                soNgay === n ? "bg-[#0054A6] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {n} ngày
            </button>
          ))}
        </div>
      </div>

      {/* Thẻ tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {the.map((x) => (
          <div
            key={x.nhan}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2 hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  {x.nhan}
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                  <NumberFlow value={x.so} />
                </div>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${x.nen} group-hover:scale-105 transition-transform`}>
                <x.Icon className={`w-5 h-5 ${x.mau}`} />
              </div>
            </div>
            {x.delta !== undefined && <Delta pt={x.delta} />}
            {x.spark && <Sparkline data={d.theoNgay} mau={x.hex} />}
          </div>
        ))}
      </div>

      {/* Việc cần xử lý */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {canXuLy.map((x) => (
          <a
            key={x.nhan}
            href={x.href}
            className={`p-4 rounded-2xl border transition flex items-center justify-between gap-2 active:scale-[0.98] ${
              x.so > 0
                ? "bg-amber-50/80 border-amber-200/80 text-amber-900 hover:bg-amber-100/70"
                : "bg-white border-slate-200/80 hover:bg-slate-50"
            }`}
          >
            <span className="text-xs font-bold text-slate-700">{x.nhan}</span>
            <span
              className={`text-lg font-black tabular-nums ${x.so > 0 ? "text-amber-600" : "text-slate-400"}`}
            >
              {x.so}
            </span>
          </a>
        ))}
      </div>

      {/* Lượt tư vấn theo ngày - Recharts line chuẩn sáng */}
      <Khoi
        tieuDe="Lượt tư vấn theo ngày"
        mota={`${d.soNgay} ngày gần nhất`}
        rong={d.theoNgay.length === 0}
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.theoNgay} margin={{ left: -15, right: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="ngay" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "#0f172a",
                }}
                formatter={(v) => [`${v} lượt`, ""] as [string, string]}
              />
              <Line
                type="monotone"
                dataKey="soLuong"
                stroke="#0054A6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#0054A6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Khoi>

      {/* Biểu đồ phân tích 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="Ngành được gợi ý nhiều nhất"
          mota="Ngành xếp hạng 1 trong mỗi lượt khảo sát"
          rong={d.topNganh.length === 0}
        >
          <BieuDoCot data={d.topNganh} />
        </Khoi>

        <Khoi
          tieuDe="Phân bố theo nhóm ngành"
          mota="Kiểm tra mô hình có thiên lệch về nhóm nào không"
          rong={d.theoNhomNganh.length === 0}
        >
          <Donut
            data={d.theoNhomNganh}
            tong={d.theoNhomNganh.reduce((a, b) => a + b.soLuong, 0)}
          />
        </Khoi>

        <Khoi
          tieuDe="Tổ hợp thí sinh sử dụng nhiều nhất"
          mota="Đối chiếu với phân bố tổ hợp trong đề án tuyển sinh"
          rong={d.topToHop.length === 0}
        >
          <BieuDoCot data={d.topToHop} mau={1} />
        </Khoi>

        <Khoi
          tieuDe="Phổ tổng điểm 3 môn"
          mota="So sánh với phổ điểm của tập thí sinh thực tế"
          rong={d.phoDiem.length === 0}
        >
          <BieuDoCot data={d.phoDiem} mau={2} />
        </Khoi>

        <Khoi
          tieuDe="Mục tiêu sau tốt nghiệp"
          rong={d.mucTieu.length === 0}
        >
          <BieuDoCot data={d.mucTieu} mau={3} />
        </Khoi>

        <Khoi
          tieuDe="Chế độ khảo sát sử dụng"
          mota="Khám phá = tự động tìm ngành · Tư vấn = đã chọn nhóm"
          rong={d.cheDo.length === 0}
        >
          <BieuDoCot data={d.cheDo} mau={4} />
        </Khoi>
      </div>

      {/* Hoạt động gần đây */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Lượt tư vấn gần đây</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            10 lượt gần nhất thí sinh tương tác với mô hình XGBoost
          </p>
        </div>

        {d.hoatDongGanDay.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Inbox className="w-7 h-7" />
            <p className="text-xs font-bold">Chưa có lượt tư vấn nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-400 font-black border-b border-slate-100">
                <tr>
                  <th className="pb-2.5 pr-4 font-black">Thời gian</th>
                  <th className="pb-2.5 pr-4 font-black">Chế độ</th>
                  <th className="pb-2.5 pr-4 font-black">Tổ hợp</th>
                  <th className="pb-2.5 pr-4 font-black">Điểm</th>
                  <th className="pb-2.5 font-black">Ngành gợi ý đầu tiên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.hoatDongGanDay.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 pr-4 text-slate-500 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {h.thoiGian
                          ? new Date(h.thoiGian).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                          h.cheDo === "guided"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                            : "bg-blue-50 text-[#0054A6] border border-blue-200/60"
                        }`}
                      >
                        {h.cheDo === "guided" ? (
                          <>
                            <Target className="w-3 h-3" /> Tư vấn
                          </>
                        ) : (
                          <>
                            <Compass className="w-3 h-3" /> Khám phá
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-bold text-slate-700">{h.toHop ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-slate-900">
                      {h.tongDiem !== undefined && h.tongDiem !== null ? h.tongDiem : "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900 truncate">
                        {h.nganh ?? "—"}
                      </div>
                      {h.nhom && (
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          {h.nhom}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chất lượng đầu vào */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Chất lượng dữ liệu đầu vào</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Hồ sơ thiếu thông tin làm giảm độ chính xác của gợi ý. Đo trên 102 sinh viên
            thật: thiếu giới tính khiến Top-3 giảm từ 41,2% xuống 37,3%; không có điểm
            thi thì Top-3 chế độ explore chỉ còn khoảng 28% thay vì 39%.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            { nhan: "Lượt thiếu điểm thi", so: cl.thieuDiemThi, mau: "text-rose-600" },
            { nhan: "Lượt thiếu giới tính", so: cl.thieuGioiTinh, mau: "text-amber-600" },
            {
              nhan: "Bản ghi cũ chưa xác định",
              so: cl.khongRoGioiTinh,
              mau: "text-slate-500",
            },
          ].map((x) => (
            <div
              key={x.nhan}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/70"
            >
              <div className={`text-2xl font-black ${x.mau}`}>{x.so}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">
                {x.nhan}
              </div>
            </div>
          ))}
        </div>
        {cl.khongRoGioiTinh > 0 && (
          <p className="text-[10px] text-slate-400 font-medium">
            Bản ghi tạo trước khi hệ thống bắt đầu ghi cờ <code>genderMissing</code> lưu
            giá trị mặc định giống hệt nữ thật, nên không phân biệt được — chỉ đếm riêng
            chứ không gộp vào cột thiếu giới tính.
          </p>
        )}
      </div>
    </div>
  );
}
