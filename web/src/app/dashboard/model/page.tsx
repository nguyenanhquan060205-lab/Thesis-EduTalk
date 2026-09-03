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
} from "lucide-react";
import {
  ModelService,
  pt,
  so,
  type ModelMetrics,
} from "@/services/modelMetrics";

const MAU = ["#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb923c"];

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
    <div className="p-5 sm:p-6 bg-white/[0.04] rounded-3xl border border-white/10 space-y-4">
      <div>
        <h3 className="text-sm font-black text-white">{tieuDe}</h3>
        {mota && <p className="text-[11px] text-gray-400 font-medium mt-0.5">{mota}</p>}
      </div>
      {rong ? (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-gray-500 text-center px-4">
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
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm font-bold">Đang tải chỉ số mô hình…</p>
      </div>
    );
  }

  if (error || !m) {
    return (
      <div className="p-6 sm:p-10 max-w-5xl mx-auto">
        <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/30 text-rose-200 text-sm font-bold flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          {error}
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
      ten: "Hai tầng — chế độ Khám phá",
      mota: "Người dùng KHÔNG chọn nhóm ngành. Mô hình tự đoán nhóm rồi đoán ngành. Đây là con số đại diện cho hệ thống.",
      nhan: "đang dùng",
      dung: true,
      top1: auto?.top1,
      top3: auto?.top3,
      f1: auto?.macro_f1,
      auc: auc.auto_macro,
    },
    {
      ten: "Hai tầng — chế độ Tư vấn",
      mota: "Người dùng ĐÃ chọn sẵn nhóm ngành, mô hình chỉ xếp hạng trong nhóm đó nên dễ hơn hẳn.",
      nhan: "đang dùng",
      dung: true,
      top1: tuVan?.top1,
      top3: tuVan?.top3,
      f1: tuVan?.macro_f1,
      auc: auc.tu_van_macro,
    },
  ];

  const duLieuCot = soSanh.map((x) => ({
    // Trục X hẹp nên rút gọn, tên đầy đủ đã có ở bảng ngay trên
    ten: x.ten.replace("Hai tầng — chế độ ", ""),
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
      mau: "text-cyan-400",
      nen: "bg-cyan-400/15",
    },
    {
      nhan: "Accuracy Top-3 (khám phá)",
      gt: pt(auto?.top3),
      Icon: Target,
      mau: "text-blue-400",
      nen: "bg-blue-400/15",
    },
    {
      nhan: "Macro F1-score",
      gt: so(auto?.macro_f1),
      Icon: Activity,
      mau: "text-violet-400",
      nen: "bg-violet-400/15",
    },
    {
      nhan: "AUC-ROC (macro)",
      gt: so(auc.auto_macro),
      Icon: Layers,
      mau: "text-emerald-400",
      nen: "bg-emerald-400/15",
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-white animate-fade-in-up">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-violet-400/20 text-violet-300 text-[10px] font-black uppercase mb-2">
            <Cpu className="w-3.5 h-3.5" /> Hiệu suất mô hình
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Đánh Giá Mô Hình XGBoost 2 Tầng
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">
            Đo trên <strong className="text-gray-200">{m.duLieu?.test_that ?? "—"}</strong>{" "}
            sinh viên thật chưa từng dùng để huấn luyện.
          </p>
        </div>
        {m.ngayChay && (
          <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            Huấn luyện {m.ngayChay} · seed {m.seed}
          </div>
        )}
      </div>

      {/* Chỉ số chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {the.map((x) => (
          <div
            key={x.nhan}
            className="p-5 bg-white/[0.04] rounded-3xl border border-white/10 flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                {x.nhan}
              </div>
              <div className="text-2xl font-black mt-0.5 tabular-nums">{x.gt}</div>
            </div>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${x.nen}`}
            >
              <x.Icon className={`w-5 h-5 ${x.mau}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Giải thích "hai tầng" trước khi đọc bảng số */}
      <Khoi
        tieuDe='"Hai tầng" nghĩa là gì?'
        mota="Thay vì đoán thẳng 1 trong 39 ngành, mô hình chia bài toán thành hai bước nhỏ hơn."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-cyan-400/[0.07] border border-cyan-400/25 space-y-1.5">
            <div className="text-[10px] font-black text-cyan-300 uppercase tracking-wide">
              Bước 1 · Tầng 1
            </div>
            <div className="font-black text-sm">Đoán NHÓM ngành</div>
            <p className="text-gray-400 font-medium leading-relaxed">
              Chọn 1 trong <strong className="text-gray-200">7 nhóm</strong>: CNTT, Kinh
              doanh, Du lịch, Kỹ thuật, Thực phẩm, Luật, Ngoại ngữ.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-violet-400/[0.07] border border-violet-400/25 space-y-1.5">
            <div className="text-[10px] font-black text-violet-300 uppercase tracking-wide">
              Bước 2 · Tầng 2
            </div>
            <div className="font-black text-sm">Đoán NGÀNH cụ thể</div>
            <p className="text-gray-400 font-medium leading-relaxed">
              Chấm điểm cả <strong className="text-gray-200">39 ngành</strong>. Tầng này
              chạy độc lập, không bị tầng 1 giới hạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-400/[0.07] border border-emerald-400/25 space-y-1.5">
            <div className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">
              Bước 3 · Kết hợp
            </div>
            <div className="font-black text-sm">Nhân hai kết quả</div>
            <p className="text-gray-400 font-medium leading-relaxed">
              Điểm cuối = điểm ngành × điểm nhóm chứa ngành đó. Nhóm nào tầng 1 thấy hợp
              thì ngành trong nhóm được nâng lên.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            <strong className="text-gray-200">Vì sao chia hai tầng?</strong> Đoán đúng 1
            trong 39 ngành rất khó, nhưng đoán đúng 1 trong 7 nhóm thì dễ hơn nhiều —
            tầng 1 đạt <strong className="text-cyan-300">{pt(tang1?.top1)}</strong>, trong
            khi đoán thẳng 39 ngành chỉ được{" "}
            <strong className="text-gray-300">{pt(phang?.top1)}</strong>. Tầng 1 thu hẹp
            phạm vi giúp tầng 2 đỡ phải đoán mò.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            <strong className="text-gray-200">Hai chế độ khác nhau ở đâu?</strong>{" "}
            <span className="text-cyan-300 font-bold">Khám phá</span> — người dùng không
            biết mình hợp nhóm nào, mô hình tự đoán cả nhóm lẫn ngành.{" "}
            <span className="text-violet-300 font-bold">Tư vấn</span> — người dùng đã chọn
            sẵn nhóm, mô hình chỉ xếp hạng trong nhóm đó. Chế độ Tư vấn có số đẹp hơn
            nhiều vì bài toán đã dễ đi một nửa, nên{" "}
            <strong className="text-gray-200">
              không được lấy nó làm con số đại diện cho hệ thống
            </strong>
            .
          </p>
        </div>
      </Khoi>

      {/* Bảng so sánh kiến trúc */}
      <Khoi
        tieuDe="So sánh các cách làm"
        mota="Cùng tập kiểm tra, cùng đặc trưng, cùng bộ chia dữ liệu. Càng xuống dưới càng nhiều thông tin đầu vào."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-gray-500 font-black border-b border-white/10">
              <tr>
                <th className="pb-2 pr-4">Kiến trúc</th>
                <th className="pb-2 pr-4 text-right">Top-1</th>
                <th className="pb-2 pr-4 text-right">Top-3</th>
                <th className="pb-2 pr-4 text-right">Macro F1</th>
                <th className="pb-2 text-right">AUC-ROC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {soSanh.map((x) => (
                <tr
                  key={x.ten}
                  className={x.dung ? "bg-cyan-400/[0.04]" : "hover:bg-white/[0.02]"}
                >
                  <td className="py-3 pr-4 min-w-[15rem]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-100">{x.ten}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          x.dung
                            ? "bg-cyan-400/20 text-cyan-300"
                            : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {x.nhan}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-snug mt-0.5">
                      {x.mota}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black">
                    {pt(x.top1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black">
                    {pt(x.top3)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-gray-300">
                    {so(x.f1)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-gray-300">
                    {so(x.auc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={duLieuCot} margin={{ left: -18, right: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
              <XAxis
                dataKey="ten"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                interval={0}
              />
              <YAxis unit="%" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                cursor={{ fill: "#ffffff08" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid #ffffff20",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}%`, ""] as [string, string]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Top-1" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Top-3" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Khoi>

      {/* Tầng 1 — bài toán 7 lớp, KHÔNG xếp chung bảng với 39 lớp ở trên */}
      {tang1 && (
        <Khoi
          tieuDe="Riêng bước 1: đoán nhóm ngành có chính xác không?"
          mota="Chỉ chọn 1 trong 7 nhóm nên dễ hơn hẳn — KHÔNG so trực tiếp với bảng 39 ngành ở trên. Bước này sai nhóm thì bước 2 khó cứu, nên nó là trần trên của chế độ Khám phá."
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
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-center"
              >
                <div className="text-[10px] text-gray-500 font-bold uppercase">{k}</div>
                <div className="font-black tabular-nums text-base mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Khoi>
      )}

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
                  stroke="#ffffff12"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  dataKey="ten"
                  type="category"
                  width={160}
                  tick={{ fontSize: 10, fill: "#e2e8f0" }}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff08" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #ffffff20",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`AUC ${(Number(v) / 100).toFixed(3)}`, ""] as [string, string]}
                />
                <Bar dataKey="soLuong" radius={[0, 6, 6, 0]}>
                  {aucKhoi.map((_, i) => (
                    <Cell key={i} fill={MAU[i % MAU.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Khoi>

        {/* Overfit + dữ liệu huấn luyện */}
        <Khoi
          tieuDe="Dữ liệu và mức khớp quá"
          mota="Khoảng cách train–val cho biết mô hình học thuộc tới đâu"
        >
          <div className="space-y-3">
            {m.overfit && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">Top-1 trên TRAIN</span>
                  <span className="font-black tabular-nums text-rose-300">
                    {pt(m.overfit.train_top1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-bold">Top-1 trên VAL (thật)</span>
                  <span className="font-black tabular-nums text-cyan-300">
                    {pt(m.overfit.val_top1)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                  <div
                    className="bg-cyan-400"
                    style={{ width: `${m.overfit.val_top1 * 100}%` }}
                  />
                  <div
                    className="bg-rose-400/70"
                    style={{
                      width: `${(m.overfit.train_top1 - m.overfit.val_top1) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  Chênh lệch{" "}
                  {pt(m.overfit.train_top1 - m.overfit.val_top1)} — mô hình khớp dữ liệu
                  huấn luyện tốt hơn hẳn dữ liệu chưa thấy.
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
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="text-[10px] text-gray-500 font-bold uppercase">
                      {k}
                    </div>
                    <div className="font-black tabular-nums">
                      {(v as number).toLocaleString("vi-VN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Khoi>
      </div>

      {/* Hai phần đề cương yêu cầu nhưng chưa có dữ liệu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="So sánh với Random Forest baseline"
          mota="Đề cương yêu cầu đối chiếu XGBoost với Random Forest"
          rong={!m.baselineRandomForest}
          ghiChuRong="Chưa train Random Forest. Cần chạy trên cùng bộ CV folds với XGBoost rồi xuất baseline_random_forest.json."
        >
          <pre className="text-[11px] text-gray-300 overflow-auto">
            {JSON.stringify(m.baselineRandomForest, null, 2)}
          </pre>
        </Khoi>

        <Khoi
          tieuDe="Biến động qua các chu kỳ huấn luyện lại"
          mota="Theo dõi hiệu suất mỗi lần retrain"
          rong={!m.lichSuHuanLuyen || m.lichSuHuanLuyen.length === 0}
          ghiChuRong="Mô hình mới huấn luyện một lần, chưa có chu kỳ retrain nào để so sánh."
        >
          <pre className="text-[11px] text-gray-300 overflow-auto">
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
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <div className="text-[11px] font-black text-cyan-300 uppercase mb-2">
                  {tang}
                </div>
                {typeof gt === "object" ? (
                  <div className="space-y-1">
                    {Object.entries(gt).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-gray-400 font-medium">{k}</span>
                        <span className="font-bold tabular-nums">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-bold tabular-nums">{String(gt)}</span>
                )}
              </div>
            ))}
          </div>
        </Khoi>
      )}

      {m.canhBao && (
        <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-start gap-3">
          <TriangleAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-100 font-medium leading-relaxed space-y-1">
            {(Array.isArray(m.canhBao) ? m.canhBao : [m.canhBao]).map((c, i) => (
              <p key={i}>{c}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
