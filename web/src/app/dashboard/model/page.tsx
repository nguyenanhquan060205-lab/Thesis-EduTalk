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
  Legend,
} from "recharts";
import {
  Cpu,
  AlertCircle,
  Inbox,
  Target,
  Compass,
  Users,
  Calendar,
  TriangleAlert,
} from "lucide-react";
import {
  ModelService,
  pt,
  so,
  type BoChiSo,
  type ModelMetrics,
} from "@/services/modelMetrics";

/** Top-k của một bộ chỉ số, k lấy từ điểm vận hành chứ không gõ cứng */
function lay(b: BoChiSo | null | undefined, k: number): number | undefined {
  return b ? (b as Record<string, number | undefined>)[`top${k}`] : undefined;
}

/** Hiệu hai tỉ lệ, đơn vị điểm phần trăm: 0.906, 0.476 → "+43,0 điểm" */
function diem(a?: number | null, b?: number | null): string {
  if (a == null || b == null) return "—";
  const d = (a - b) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")} điểm`;
}

/** Tỉ lệ → số phần trăm một chữ số thập phân cho biểu đồ */
function phanTram(v?: number | null): number | undefined {
  return v == null ? undefined : +(v * 100).toFixed(1);
}

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

/** Khung chờ — giữ đúng bố cục trang để không nhảy khi dữ liệu về */
function KhungCho() {
  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true">
      <div className="h-16 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-100" />
      <div className="h-56 rounded-2xl bg-slate-100" />
    </div>
  );
}

const MAU = {
  moHinh: "#0054A6",
  nguoiThat: "#60a5fa",
  dongNhat: "#94a3b8",
  bocBua: "#cbd5e1",
};

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

  if (!loaded) return <KhungCho />;

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

  // Điểm vận hành do backend đọc từ gói mô hình — tư vấn 2, khám phá 5 với Hướng 1
  const kTv = m.diemVanHanh?.tu_van ?? 3;
  const kKp = m.diemVanHanh?.kham_pha ?? 3;

  const tvTest = m.test?.tu_van;
  const kpTest = m.test?.kham_pha;
  const tvTrain = m.test?.tren_train_tu_van;
  const kpTrain = m.test?.tren_train_kham_pha;
  const bua = m.doanBua;
  const nt = m.nguoiThat ?? null;
  const xhTv = m.chiSoXepHang?.["TƯ VẤN (biết nhóm)"];
  const xhKp = m.chiSoXepHang?.["KHÁM PHÁ (cả 39)"];

  const the = [
    {
      nhan: `Tư vấn · Top-${kTv}`,
      gt: pt(lay(tvTest, kTv)),
      phu: `tập test · bốc bừa trong nhóm ${pt(lay(bua?.tu_van_trong_nhom, kTv))}`,
      Icon: Target,
    },
    {
      nhan: `Khám phá · Top-${kKp}`,
      gt: pt(lay(kpTest, kKp)),
      phu: `tập test · bốc bừa ${pt(lay(bua?.kham_pha, kKp))}`,
      Icon: Compass,
    },
    {
      nhan: `Người thật · tư vấn Top-${kTv}`,
      gt: pt(lay(nt?.tu_van, kTv)),
      phu: nt ? `${nt.n.toLocaleString("vi-VN")} phiếu khảo sát niêm phong` : "chưa có số đo người thật",
      Icon: Users,
    },
    {
      nhan: `Người thật · khám phá Top-${kKp}`,
      gt: pt(lay(nt?.kham_pha, kKp)),
      phu: nt ? `${nt.n.toLocaleString("vi-VN")} phiếu khảo sát niêm phong` : "chưa có số đo người thật",
      Icon: Users,
    },
  ];

  const bieuDo = [
    {
      ten: `Tư vấn · Top-${kTv}`,
      "Mô hình (test)": phanTram(lay(tvTest, kTv)),
      "Người thật": phanTram(lay(nt?.tu_van, kTv)),
      "Gợi ý ngành đông nhất": phanTram(lay(bua?.tu_van_nganh_dong_nhat, kTv)),
      "Bốc bừa": phanTram(lay(bua?.tu_van_trong_nhom, kTv)),
    },
    {
      ten: `Khám phá · Top-${kKp}`,
      "Mô hình (test)": phanTram(lay(kpTest, kKp)),
      "Người thật": phanTram(lay(nt?.kham_pha, kKp)),
      "Bốc bừa": phanTram(lay(bua?.kham_pha, kKp)),
    },
  ];

  const K_DS = [1, 2, 3, 5];

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
            <Cpu className="w-3.5 h-3.5" /> Hiệu suất mô hình
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Đánh Giá Mô Hình XGBoost {m.pipeline === "h1" ? "— Hướng 1" : ""}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 max-w-3xl">
            Tập test{" "}
            <strong className="text-slate-900">
              {m.duLieu?.test_that?.toLocaleString("vi-VN") ?? "—"}
            </strong>{" "}
            dòng, khoá bằng SHA-256 và chỉ mở một lần. Phần lớn là hồ sơ trúng tuyển có phần sở
            thích do mô hình sinh — mức nên kỳ vọng với người dùng thật nằm ở hai thẻ bên phải.
          </p>
        </div>
        {m.ngayChay && (
          <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            Chốt mô hình {m.ngayChay} · seed {m.seed}
          </div>
        )}
      </div>

      {/* 4 thẻ chỉ số ở đúng điểm vận hành */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {the.map((x, i) => (
          <div
            key={x.nhan}
            className={`p-5 rounded-2xl border shadow-xs flex items-start justify-between gap-2 hover:shadow-md hover:-translate-y-0.5 transition group ${
              i < 2 ? "bg-white border-slate-200/80" : "bg-blue-50/40 border-blue-200/70"
            }`}
          >
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                {x.nhan}
              </div>
              <div className="text-2xl font-black mt-0.5 tabular-nums text-slate-900">{x.gt}</div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{x.phu}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-200/60 group-hover:scale-105 transition-transform">
              <x.Icon className="w-5 h-5 text-[#0054A6]" />
            </div>
          </div>
        ))}
      </div>

      {/* Hai chế độ */}
      <Khoi
        tieuDe="Hai chế độ, hai loại mô hình"
        mota="Số ngành hiển thị ở mỗi chế độ chính là điểm vận hành — mọi chỉ số chính trên trang này đo đúng ở đó."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/70 space-y-1.5">
            <div className="text-[10px] font-black text-[#0054A6] uppercase tracking-wide">
              Khám phá · chưa chọn nhóm
            </div>
            <div className="font-black text-sm text-slate-900">
              Mô hình 39 ngành → hiện {kKp} ngành
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Xếp hạng toàn bộ ngành của trường. Bốc bừa {kKp} trong 39 ngành chỉ đúng{" "}
              <strong className="text-slate-900">{pt(lay(bua?.kham_pha, kKp))}</strong>, nên đây
              là con số cho biết mô hình có học được gì thật hay không.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
              Tư vấn · đã chọn nhóm
            </div>
            <div className="font-black text-sm text-slate-900">
              Mô hình riêng của nhóm → hiện {kTv} ngành
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Mỗi nhóm ngành một mô hình, chỉ phân biệt các ngành bên trong nhóm. Không hiện 3
              ngành: nhóm nhỏ nhất chỉ có 3 ngành nên gợi ý 3 là trúng chắc, và tính chung mọi
              nhóm thì bốc bừa 3 ngành đã đúng{" "}
              <strong className="text-slate-900">
                {pt(lay(bua?.tu_van_trong_nhom, 3))}
              </strong>
              , gợi ý 3 ngành đông nhất đúng{" "}
              <strong className="text-slate-900">
                {pt(lay(bua?.tu_van_nganh_dong_nhat, 3))}
              </strong>{" "}
              — không còn phân biệt được mô hình.
            </p>
          </div>
        </div>
      </Khoi>

      {/* So với mốc đối chứng */}
      <Khoi
        tieuDe="So với mốc đối chứng"
        mota="Mô hình phải hơn cả bốc bừa lẫn quy tắc đơn giản nhất: luôn gợi ý ngành đông thí sinh nhất trong nhóm (không cần khảo sát, không cần điểm)."
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bieuDo} margin={{ left: -10, right: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="ten" tick={{ fontSize: 11, fill: "#475569" }} interval={0} />
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
                formatter={(v, ten) =>
                  [`${String(v).replace(".", ",")}%`, String(ten)] as [string, string]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              <Bar dataKey="Mô hình (test)" fill={MAU.moHinh} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Người thật" fill={MAU.nguoiThat} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gợi ý ngành đông nhất" fill={MAU.dongNhat} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Bốc bừa" fill={MAU.bocBua} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          Tư vấn Top-{kTv} hơn bốc bừa{" "}
          <strong className="text-slate-900">
            {diem(lay(tvTest, kTv), lay(bua?.tu_van_trong_nhom, kTv))}
          </strong>{" "}
          và hơn gợi ý ngành đông nhất{" "}
          <strong className="text-slate-900">
            {diem(lay(tvTest, kTv), lay(bua?.tu_van_nganh_dong_nhat, kTv))}
          </strong>
          . Khám phá Top-{kKp} hơn bốc bừa{" "}
          <strong className="text-slate-900">
            {diem(lay(kpTest, kKp), lay(bua?.kham_pha, kKp))}
          </strong>
          .
          {nt && (
            <>
              {" "}
              Trên người thật (mô hình cùng cấu hình chưa từng học các phiếu này), tư vấn vẫn hơn
              gợi ý ngành đông nhất{" "}
              <strong className="text-slate-900">
                {diem(lay(nt.tu_van, kTv), lay(nt.doan_bua.tu_van_nganh_dong_nhat, kTv))}
              </strong>
              .
            </>
          )}
        </p>
      </Khoi>

      {/* Bảng theo số gợi ý */}
      <Khoi
        tieuDe="Độ chính xác theo số ngành gợi ý"
        mota="Dòng tô màu là số ngành hệ thống thật sự hiển thị. Các dòng khác để thấy toàn cảnh."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {
              ten: "Tư vấn (đã chọn nhóm)",
              k: kTv,
              moHinh: tvTest,
              that: nt?.tu_van,
              cot: [
                { ten: "Bốc bừa", gt: bua?.tu_van_trong_nhom },
                { ten: "Ngành đông nhất", gt: bua?.tu_van_nganh_dong_nhat },
              ],
            },
            {
              ten: "Khám phá (cả 39 ngành)",
              k: kKp,
              moHinh: kpTest,
              that: nt?.kham_pha,
              cot: [{ ten: "Bốc bừa", gt: bua?.kham_pha }],
            },
          ].map((bang) => (
            <div key={bang.ten} className="overflow-x-auto">
              <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide mb-2">
                {bang.ten}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
                  <tr>
                    <th className="pb-2 pr-3">Số gợi ý</th>
                    <th className="pb-2 pr-3 text-right">Mô hình (test)</th>
                    <th className="pb-2 pr-3 text-right">Người thật</th>
                    {bang.cot.map((c) => (
                      <th key={c.ten} className="pb-2 pr-3 text-right last:pr-0">
                        {c.ten}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {K_DS.map((k) => (
                    <tr key={k} className={k === bang.k ? "bg-blue-50/60" : ""}>
                      <td className="py-2 pr-3 font-bold text-slate-900">
                        Top-{k}
                        {k === bang.k && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-[#0054A6]">
                            đang dùng
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-black text-slate-900">
                        {pt(lay(bang.moHinh, k))}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold text-[#0054A6]">
                        {pt(lay(bang.that, k))}
                      </td>
                      {bang.cot.map((c) => (
                        <td
                          key={c.ten}
                          className="py-2 pr-3 last:pr-0 text-right tabular-nums text-slate-500 font-semibold"
                        >
                          {pt(lay(c.gt, k))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        {nt && (
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Cột &quot;Người thật&quot;: {nt.nguon}. Bỏ 5 ngành không có hồ sơ trúng tuyển (
            {nt.n_34_nganh.toLocaleString("vi-VN")} phiếu) thì còn tư vấn Top-{kTv}{" "}
            {pt(lay(nt.tu_van_34_nganh, kTv))}, khám phá Top-{kKp}{" "}
            {pt(lay(nt.kham_pha_34_nganh, kKp))}.
          </p>
        )}
      </Khoi>

      {/* Chỉ số xếp hạng */}
      <Khoi
        tieuDe="Chỉ số xếp hạng ở điểm vận hành"
        mota="Đo trên tập test. Hệ thống trả nhiều gợi ý có thứ tự, nên đánh giá bằng chỉ số xếp hạng thay vì chỉ số phân loại một nhãn."
        rong={!xhTv || !xhKp}
        ghiChuRong="Mô hình đang phục vụ không xuất chỉ số xếp hạng."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
              <tr>
                <th className="pb-2.5 pr-4">Chỉ số</th>
                <th className="pb-2.5 pr-4 text-right">Tư vấn @{xhTv?.k}</th>
                <th className="pb-2.5 pr-4 text-right">Khám phá @{xhKp?.k}</th>
                <th className="pb-2.5">Đọc thế nào</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["Hit@k", pt(xhTv?.hit_k), pt(xhKp?.hit_k), "Ngành đúng nằm trong k gợi ý — chính là Top-k"],
                ["macro Hit@k", pt(xhTv?.macro_hit_k), pt(xhKp?.macro_hit_k), "Mỗi ngành trọng số bằng nhau — thấp hơn Hit@k là mô hình kém ở ngành ít dữ liệu"],
                ["Ngành đạt dưới 50%", `${xhTv?.n_nganh_duoi_50}/${xhTv?.n_nganh}`, `${xhKp?.n_nganh_duoi_50}/${xhKp?.n_nganh}`, "Số ngành mà mô hình gợi ý trúng chưa tới một nửa"],
                ["MRR (bốc bừa)", `${so(xhTv?.mrr)} (${so(xhTv?.mrr_doan_bua)})`, `${so(xhKp?.mrr)} (${so(xhKp?.mrr_doan_bua)})`, "Trung bình 1/hạng của ngành đúng — giữ thông tin thứ tự"],
                ["NDCG@k", so(xhTv?.ndcg_k), so(xhKp?.ndcg_k), "Chấm theo vị trí, cắt ở k: hạng 1 trọn điểm, hạng 2 ≈ 0,63"],
                ["Hạng trung vị", String(xhTv?.hang_trung_vi ?? "—"), String(xhKp?.hang_trung_vi ?? "—"), "Ít nhất một nửa số thí sinh có ngành đúng đứng ở hạng này hoặc đứng trước"],
              ].map(([ten, a, b, doc]) => (
                <tr key={ten} className="hover:bg-slate-50/60">
                  <td className="py-2.5 pr-4 font-bold text-slate-900 whitespace-nowrap">{ten}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black text-slate-900">{a}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-black text-slate-900">{b}</td>
                  <td className="py-2.5 text-[11px] text-slate-500 font-medium min-w-[14rem]">{doc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
          Không báo cáo precision@k và recall@k: mỗi thí sinh chỉ có một ngành đúng, nên
          recall@k trùng Hit@k còn precision@k chỉ là Hit@k chia cho k.
        </p>
      </Khoi>

      {/* Học vẹt + dữ liệu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="Mức học vẹt: train+val so với test"
          mota="Cùng loại dữ liệu mà test thấp hơn nhiều là mô hình học thuộc. Chênh vài điểm là bình thường."
        >
          <div className="space-y-3">
            {[
              { ten: `Tư vấn · Top-${kTv}`, tr: lay(tvTrain, kTv), te: lay(tvTest, kTv) },
              { ten: `Khám phá · Top-${kKp}`, tr: lay(kpTrain, kKp), te: lay(kpTest, kKp) },
            ].map((x) => (
              <div
                key={x.ten}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-900 font-black">{x.ten}</span>
                  <span className="text-[11px] text-slate-500 font-bold">
                    chênh {diem(x.tr, x.te)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Train+val</span>
                  <span className="font-black tabular-nums text-slate-700">{pt(x.tr)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Test (khoá)</span>
                  <span className="font-black tabular-nums text-[#0054A6]">{pt(x.te)}</span>
                </div>
                {x.tr != null && x.te != null && (
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden flex">
                    <div className="bg-[#0054A6]" style={{ width: `${x.te * 100}%` }} />
                    <div
                      className="bg-slate-400"
                      style={{ width: `${Math.max(0, x.tr - x.te) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Khoi>

        <Khoi tieuDe="Dữ liệu huấn luyện và kiểm tra" rong={!m.duLieu}>
          {m.duLieu && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Phiếu khảo sát trong dữ liệu học", m.duLieu.train_that],
                ["Dòng dẫn xuất từ hồ sơ trúng tuyển", m.duLieu.train_tong_hop],
                ["Dòng kiểm tra (test)", m.duLieu.test_that],
                ["Số đặc trưng", m.duLieu.n_dac_trung],
                ["Số ngành", m.duLieu.n_lop_nganh],
                ["Số nhóm ngành", m.duLieu.n_lop_khoi],
              ].map(([k, v]) => (
                <div key={k as string} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{k}</div>
                  <div className="font-black tabular-nums text-slate-900">
                    {v == null ? "—" : (v as number).toLocaleString("vi-VN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Khoi>
      </div>

      {/* Chỉ số phân loại Top-1 */}
      <Khoi
        tieuDe="Chỉ số phân loại một nhãn (để đối chiếu)"
        mota="Hệ thống không trả về một ngành duy nhất, nên các chỉ số này chỉ để so với nghiên cứu phân loại đơn nhãn. AUC ở đây càng gần 1 càng tốt."
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {[
            ["Top-1 tư vấn", pt(tvTest?.top1)],
            ["Top-1 khám phá", pt(kpTest?.top1)],
            ["Macro-F1 tư vấn", so(tvTest?.macro_f1)],
            ["Macro-F1 khám phá", so(kpTest?.macro_f1)],
            ["AUC OvR khám phá", so(m.aucRoc?.auto_macro)],
          ].map(([k, v]) => (
            <div key={k} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">{k}</div>
              <div className="font-black tabular-nums text-base mt-0.5 text-slate-900">{v}</div>
            </div>
          ))}
        </div>
      </Khoi>

      {/* Hai phần đề cương */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="So sánh với Random Forest baseline"
          mota="Đề cương yêu cầu đối chiếu XGBoost với Random Forest"
          rong={!m.baselineRandomForest}
          ghiChuRong="Chưa train Random Forest. Cần chạy trên cùng tập train/val/test với XGBoost rồi xuất baseline_random_forest.json."
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
        <Khoi
          tieuDe="Cấu hình mô hình đã chốt"
          mota="Chọn trên tập val: loại mọi cấu hình học vẹt, rồi lấy cấu hình tốt nhất còn lại. Tầng tư vấn dùng mô hình riêng cho từng nhóm."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {Object.entries(m.sieuThamSo).map(([k, v]) => (
              <div key={k} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="text-[10px] text-slate-400 font-bold">{k}</div>
                <div className="font-black tabular-nums text-base mt-0.5 text-slate-900">
                  {typeof v === "object" ? JSON.stringify(v) : String(v).replace(".", ",")}
                </div>
              </div>
            ))}
          </div>
        </Khoi>
      )}

      {m.canhBao && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <TriangleAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700 font-medium leading-relaxed space-y-1">
            <p className="font-black text-slate-900">Hạn chế đã ghi khi chốt mô hình</p>
            {(Array.isArray(m.canhBao) ? m.canhBao : [m.canhBao]).map((c, i) => (
              <p key={i}>• {c}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
