"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Cpu,
  Loader2,
  AlertCircle,
  Inbox,
  Target,
  Activity,
  Calendar,
  Layers,
  TriangleAlert,
  ShieldCheck,
  BarChart2,
} from "lucide-react";
import {
  ModelService,
  pt,
  so,
  type ModelMetrics,
} from "@/services/modelMetrics";

const PALETTE = [
  "#0054A6", // HUIT Primary
  "#0284c7", // Sky 600
  "#4f46e5", // Indigo 600
  "#7c3aed", // Violet 600
  "#0d9488", // Teal 600
  "#2563eb", // Blue 600
  "#0891b2", // Cyan 600
];

/** Khối có tiêu đề, tự hiện trạng thái rỗng. */
function Khoi({
  tieuDe,
  mota,
  rong,
  ghiChuRong,
  children,
}: {
  tieuDe: string;
  mota?: string;
  rong?: boolean;
  ghiChuRong?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-900">{tieuDe}</h3>
        {mota && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{mota}</p>}
      </div>
      {rong ? (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-slate-400 text-center px-4">
          <Inbox className="w-7 h-7" />
          <p className="text-xs font-bold">{ghiChuRong ?? "Chưa có dữ liệu"}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function ModelPerformancePage() {
  const [m, setM] = useState<ModelMetrics | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setM(await ModelService.metrics());
      setError(null);
    } catch (e) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Không tải được chỉ số mô hình."
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

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải chỉ số mô hình...</p>
      </div>
    );
  }

  if (error || !m) {
    return (
      <div className="p-6 sm:p-10 max-w-5xl mx-auto">
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const t = m.test ?? {};
  const auto = t["auto_CHI_SO_CHINH"];
  const tuVan = t["tu_van_CO_DIEU_KIEN"];
  const phang = t["phang_39_doi_chung"];
  const tang1 = t["tang1_khoi"];
  const bl = m.baseline ?? {};
  const auc = m.aucRoc ?? {};

  // So sánh các kiến trúc trên cùng tập kiểm tra 102 sinh viên thật
  const soSanh = [
    {
      ten: "Mốc so sánh",
      mota: "Luôn đoán ngành đông người học nhất, không dùng mô hình. Bất kỳ cách nào cũng phải hơn mức này.",
      nhan: "không dùng AI",
      top1: bl.nganh_top1,
      top3: bl.nganh_top3,
      f1: m.cvMacroF1?.["Đoán lớp đông nhất"],
    },
    {
      ten: "Một tầng",
      mota: "Một mô hình duy nhất đoán thẳng 1 trong 39 ngành, bỏ qua việc các ngành thuộc nhóm nào.",
      nhan: "để đối chứng",
      top1: phang?.top1,
      top3: phang?.top3,
      f1: phang?.macro_f1,
      auc: auc.phang_macro,
    },
    {
      ten: "Pipeline — chế độ Khám phá",
      mota: "Người dùng KHÔNG chọn nhóm ngành. Mô hình phẳng xếp hạng cả 39 ngành (Top-3 = 35,3%). Đây là con số đại diện cho hệ thống.",
      nhan: "đang dùng",
      dung: true,
      top1: auto?.top1,
      top3: auto?.top3,
      f1: auto?.macro_f1,
      auc: auc.auto_macro,
    },
    {
      ten: "Pipeline — chế độ Tư vấn",
      mota: "Người dùng ĐÃ chọn sẵn nhóm ngành, mô hình riêng của nhóm đó xếp hạng (Top-3 = 86,3%).",
      nhan: "đang dùng",
      dung: true,
      top1: tuVan?.top1,
      top3: tuVan?.top3,
      f1: tuVan?.macro_f1,
      auc: auc.tu_van_macro,
    },
  ];

  const duLieuCot = soSanh.map((x) => ({
    ten: x.ten.replace("Pipeline — chế độ ", ""),
    "Top-1": x.top1 != null ? +(x.top1 * 100).toFixed(1) : 0,
    "Top-3": x.top3 != null ? +(x.top3 * 100).toFixed(1) : 0,
  }));

  const aucKhoi = Object.entries(auc.tang1_tung_khoi ?? {}).map(([k, v]) => ({
    ten: k,
    soLuong: +(v * 100).toFixed(1),
  }));

  const the = [
    {
      nhan: "Accuracy Top-1 (khám phá)",
      gt: pt(auto?.top1),
      Icon: Target,
      mau: "text-[#0054A6]",
      nen: "bg-blue-50 border border-blue-200/60",
    },
    {
      nhan: "Accuracy Top-3 (khám phá)",
      gt: pt(auto?.top3),
      Icon: Target,
      mau: "text-indigo-600",
      nen: "bg-indigo-50 border border-indigo-200/60",
    },
    {
      nhan: "Macro F1-score",
      gt: so(auto?.macro_f1),
      Icon: Activity,
      mau: "text-slate-700",
      nen: "bg-slate-100 border border-slate-200",
    },
    {
      nhan: "AUC-ROC (macro)",
      gt: so(auc.auto_macro),
      Icon: Layers,
      mau: "text-slate-700",
      nen: "bg-slate-100 border border-slate-200",
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
            <Cpu className="w-3.5 h-3.5" /> Hiệu suất mô hình
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Đánh Giá Pipeline XGBoost (research3)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Đo trên <strong className="text-slate-900">{m.duLieu?.test_that ?? "—"}</strong>{" "}
            sinh viên thật chưa từng dùng để huấn luyện.
          </p>
        </div>
        {m.ngayChay && (
          <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            Huấn luyện {m.ngayChay} · seed {m.seed}
          </div>
        )}
      </div>

      {/* 4 Thẻ chỉ số chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {the.map((x) => (
          <div
            key={x.nhan}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between gap-2 hover:shadow-md transition group"
          >
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                {x.nhan}
              </div>
              <div className="text-2xl font-black mt-0.5 tabular-nums text-slate-900">{x.gt}</div>
            </div>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${x.nen} group-hover:scale-105 transition-transform`}
            >
              <x.Icon className={`w-5 h-5 ${x.mau}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Giải thích kiến trúc Pipeline phân nhóm */}
      <Khoi
        tieuDe='Kiến trúc "Pipeline phân nhóm" nghĩa là gì?'
        mota="Thay vì một mô hình chung đoán phẳng 39 ngành, hệ thống định tuyến theo từng nhóm ngành và phân tầng chuyên biệt để tối ưu độ chính xác."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 space-y-1.5">
            <div className="text-[10px] font-black text-[#0054A6] uppercase tracking-wide">
              Bước 1 · Tầng 1
            </div>
            <div className="font-black text-sm text-slate-900">Đoán NHÓM ngành</div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Chọn 1 trong <strong className="text-slate-900">9 nhóm ngành</strong>: CNTT, Kinh
              doanh, Tài chính, Logistics, Du lịch, Cơ khí - Điện, Hoá, Thực phẩm, Luật & Ngôn ngữ.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-1.5">
            <div className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">
              Bước 2 · Tầng 2
            </div>
            <div className="font-black text-sm text-slate-900">Đoán NGÀNH cụ thể</div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Chỉ xếp hạng các ngành bên trong nhóm đã chọn ở bước 1 (mỗi nhóm chỉ có 3–8 ngành).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1.5">
            <div className="text-[10px] font-black text-emerald-700 uppercase tracking-wide">
              Lợi ích khoa học
            </div>
            <div className="font-black text-sm text-slate-900">Tăng độ chính xác</div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Giảm thiểu nhầm lẫn giữa các ngành thuộc các nhóm xa nhau, tăng độ tin cậy kết quả.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            <strong className="text-slate-900">Vì sao chia theo nhóm ngành?</strong> Đoán đúng 1
            trong 39 ngành rất khó, nhưng đoán đúng trong nhóm ngành đã chọn thì chính xác hơn nhiều —
            model chuyên biệt theo nhóm đạt <strong className="text-[#0054A6]">{pt(tang1?.top1)}</strong>, trong
            khi đoán phẳng cả 39 ngành chỉ được{" "}
            <strong className="text-slate-700">{pt(phang?.top1)}</strong>.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            <strong className="text-slate-900">Hai chế độ khác nhau ở đâu?</strong>{" "}
            <span className="text-[#0054A6] font-bold">Khám phá</span> — người dùng không
            biết mình hợp nhóm nào, mô hình tự đoán cả nhóm lẫn ngành.{" "}
            <span className="text-indigo-700 font-bold">Tư vấn</span> — người dùng đã chọn
            sẵn nhóm, mô hình chỉ xếp hạng trong nhóm đó. Chế độ Tư vấn có số đẹp hơn
            nhiều vì bài toán đã dễ đi một nửa, nên{" "}
            <strong className="text-slate-900">
              không được lấy nó làm con số đại diện cho hệ thống
            </strong>
            .
          </p>
        </div>
      </Khoi>

      {/* Bảng so sánh kiến trúc & Biểu đồ có Baseline */}
      <Khoi
        tieuDe="So sánh các phương pháp thực nghiệm"
        mota="Cùng tập kiểm tra, cùng đặc trưng, cùng bộ chia dữ liệu. Đảm bảo mốc đối chứng khoa học."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
              <tr>
                <th className="pb-2.5 pr-4">Kiến trúc</th>
                <th className="pb-2.5 pr-4 text-right">Top-1</th>
                <th className="pb-2.5 pr-4 text-right">Top-3</th>
                <th className="pb-2.5 pr-4 text-right">Macro F1</th>
                <th className="pb-2.5 text-right">AUC-ROC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soSanh.map((x) => (
                <tr
                  key={x.ten}
                  className={x.dung ? "bg-blue-50/50" : "hover:bg-slate-50/60"}
                >
                  <td className="py-3 pr-4 min-w-[15rem]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{x.ten}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          x.dung
                            ? "bg-blue-100 text-[#0054A6]"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {x.nhan}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">
                      {x.mota}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black text-slate-900">
                    {pt(x.top1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black text-slate-900">
                    {pt(x.top3)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 font-semibold">
                    {so(x.f1)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600 font-semibold">
                    {so(x.auc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Biểu đồ cột so sánh CÓ ReferenceLine Baseline */}
        <div className="h-72 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={duLieuCot} margin={{ left: -10, right: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="ten"
                tick={{ fontSize: 11, fill: "#475569" }}
                interval={0}
              />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(v) => [`${v}%`, ""] as [string, string]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              
              {/* MỐC ĐỐI CHỨNG ĐOÁN BỪA BẮT BUỘC THEO QUY ƯỚC KHOÁ LUẬN */}
              <ReferenceLine
                y={2.6}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: "Đoán bừa (1/39 = 2.6%)",
                  position: "insideBottomRight",
                  fill: "#e11d48",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              {bl.nganh_top1 != null && (
                <ReferenceLine
                  y={+(bl.nganh_top1 * 100).toFixed(1)}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{
                    value: `Lớp đông nhất (${(bl.nganh_top1 * 100).toFixed(1)}%)`,
                    position: "insideTopRight",
                    fill: "#d97706",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              <Bar dataKey="Top-1" fill="#0054A6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Top-3" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Khoi>

      {/* Bước 1 — bài toán 9 nhóm ngành */}
      {tang1 && (
        <Khoi
          tieuDe="Riêng bước 1: đoán nhóm ngành có chính xác không?"
          mota="Chỉ chọn 1 trong 9 nhóm nên dễ hơn hẳn — KHÔNG so trực tiếp với bảng 39 ngành ở trên. Bước này xác định định hướng ban đầu của thí sinh."
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              ["Top-1", pt(tang1.top1)],
              ["Top-2", pt(tang1.top2)],
              ["Top-3", pt(tang1.top3)],
              ["Macro F1", so(tang1.macro_f1)],
              ["AUC-ROC", so(auc.tang1_macro)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-center"
              >
                <div className="text-[10px] text-slate-400 font-bold uppercase">{k}</div>
                <div className="font-black tabular-nums text-base mt-0.5 text-slate-900">{v}</div>
              </div>
            ))}
          </div>
        </Khoi>
      )}

      {/* Hai khối biểu đồ AUC và Overfitting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AUC theo khối */}
        <Khoi
          tieuDe="AUC-ROC theo từng nhóm ngành"
          mota="AUC càng gần 1 càng tốt. Cho biết bước 1 phân biệt nhóm nào kém nhất."
          rong={aucKhoi.length === 0}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aucKhoi} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  dataKey="ten"
                  type="category"
                  width={160}
                  tick={{ fontSize: 10, fill: "#334155" }}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(v) => [`AUC ${(Number(v) / 100).toFixed(3)}`, ""] as [string, string]}
                />
                <Bar dataKey="soLuong" radius={[0, 6, 6, 0]}>
                  {aucKhoi.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Khoi>

        {/* Overfit + dữ liệu huấn luyện */}
        <Khoi
          tieuDe="Dữ liệu và mức độ quá khớp (Overfitting)"
          mota="Khoảng cách train–val cho biết mô hình học thuộc tới đâu trên tập mẫu"
        >
          <div className="space-y-3">
            {m.overfit && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Top-1 trên TRAIN</span>
                  <span className="font-black tabular-nums text-slate-700">
                    {pt(m.overfit.train_top1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Top-1 trên VAL (thật)</span>
                  <span className="font-black tabular-nums text-[#0054A6]">
                    {pt(m.overfit.val_top1)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex">
                  <div
                    className="bg-[#0054A6]"
                    style={{ width: `${m.overfit.val_top1 * 100}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{
                      width: `${(m.overfit.train_top1 - m.overfit.val_top1) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Chênh lệch{" "}
                  {pt(m.overfit.train_top1 - m.overfit.val_top1)} — mô hình khớp dữ liệu
                  huấn luyện tốt hơn dữ liệu kiểm thử thực tế.
                </p>
              </div>
            )}

            {m.duLieu && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Dòng thật (train)", m.duLieu.train_that],
                  ["Dòng tổng hợp", m.duLieu.train_tong_hop],
                  ["Dòng kiểm tra", m.duLieu.test_that],
                  ["Số đặc trưng", m.duLieu.n_dac_trung],
                  ["Số lớp ngành", m.duLieu.n_lop_nganh],
                  ["Số lớp nhóm", m.duLieu.n_lop_khoi],
                ].map(([k, v]) => (
                  <div
                    key={k as string}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70"
                  >
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      {k}
                    </div>
                    <div className="font-black tabular-nums text-slate-900">
                      {(v as number).toLocaleString("vi-VN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Khoi>
      </div>

      {/* Hai phần đề cương */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="So sánh với Random Forest baseline"
          mota="Đề cương yêu cầu đối chiếu XGBoost với Random Forest"
          rong={!m.baselineRandomForest}
          ghiChuRong="Chưa train Random Forest. Cần chạy trên cùng bộ CV folds với XGBoost rồi xuất baseline_random_forest.json."
        >
          <pre className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-auto">
            {JSON.stringify(m.baselineRandomForest, null, 2)}
          </pre>
        </Khoi>

        <Khoi
          tieuDe="Biến động qua các chu kỳ huấn luyện lại"
          mota="Theo dõi hiệu suất mỗi lần retrain"
          rong={!m.lichSuHuanLuyen || m.lichSuHuanLuyen.length === 0}
          ghiChuRong="Mô hình mới huấn luyện một lần, chưa có chu kỳ retrain nào để so sánh."
        >
          <pre className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-auto">
            {JSON.stringify(m.lichSuHuanLuyen, null, 2)}
          </pre>
        </Khoi>
      </div>

      {/* Siêu tham số */}
      {m.sieuThamSo && (
        <Khoi tieuDe="Siêu tham số đã chọn" mota="Tìm bằng RandomizedSearch trên CV thật">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {Object.entries(m.sieuThamSo).map(([tang, gt]) => (
              <div
                key={tang}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70"
              >
                <div className="text-[11px] font-black text-[#0054A6] uppercase mb-2">
                  {tang}
                </div>
                {typeof gt === "object" ? (
                  <div className="space-y-1">
                    {Object.entries(gt).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-slate-500 font-medium">{k}</span>
                        <span className="font-bold tabular-nums text-slate-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-bold tabular-nums text-slate-900">{String(gt)}</span>
                )}
              </div>
            ))}
          </div>
        </Khoi>
      )}

      {m.canhBao && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800 font-medium leading-relaxed space-y-1">
            {(Array.isArray(m.canhBao) ? m.canhBao : [m.canhBao]).map((c, i) => (
              <p key={i}>{c}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
