"use client";

import {
  Search,
  GraduationCap,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Layers,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PredictService,
  type CatalogField,
  type CatalogMajor,
} from "@/services/predict";
import { ADMISSION_BLOCKS, FIELD_STYLE, ADMISSION_SOURCE } from "@/lib/admission";
import Modal from "@/components/ui/Modal";

/** Một ngành đã gắn kèm nhóm ngành của nó, để lọc và hiển thị phẳng. */
interface MajorRow extends CatalogMajor {
  fieldId: number;
  fieldName: string;
}

const YEARS = ["2024", "2025", "2026"];
const ALL = -1;

/** Chênh lệch điểm chuẩn giữa năm mới nhất và năm trước đó. */
function trendOf(cutoffs: Record<string, number>) {
  const have = YEARS.filter((y) => typeof cutoffs[y] === "number");
  if (have.length < 2) return null;
  const last = cutoffs[have[have.length - 1]];
  const prev = cutoffs[have[have.length - 2]];
  return { delta: +(last - prev).toFixed(2), latest: last, year: have[have.length - 1] };
}

/** Thanh so sánh điểm chuẩn 3 năm — chuẩn hóa theo thang 14–30 cho dễ so. */
function CutoffBars({ cutoffs }: { cutoffs: Record<string, number> }) {
  const LO = 14;
  const HI = 30;
  return (
    <div className="flex items-end gap-1.5 h-14">
      {YEARS.map((y) => {
        const v = cutoffs[y];
        const pct = typeof v === "number" ? Math.max(6, ((v - LO) / (HI - LO)) * 100) : 0;
        const isLatest = y === "2026";
        return (
          <div key={y} className="flex-1 flex flex-col items-center gap-1">
            <span
              className={`text-[10px] font-black tabular-nums ${
                isLatest ? "text-[#0054A6]" : "text-slate-400"
              }`}
            >
              {typeof v === "number" ? v.toFixed(2) : "—"}
            </span>
            <div className="w-full h-7 flex items-end rounded-md bg-slate-100 overflow-hidden">
              <div
                className={`w-full rounded-md transition-all ${
                  isLatest ? "bg-[#0054A6]" : "bg-slate-300"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-400">{y}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendBadge({ cutoffs }: { cutoffs: Record<string, number> }) {
  const t = trendOf(cutoffs);
  if (!t) return null;
  const up = t.delta > 0.001;
  const down = t.delta < -0.001;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const cls = up
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : down
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black ${cls}`}
      title={`So với năm ${YEARS[YEARS.indexOf(t.year) - 1]}`}
    >
      <Icon className="w-3 h-3" />
      {up ? "+" : ""}
      {t.delta.toFixed(2)}
    </span>
  );
}

export default function MajorsPage() {
  const [fields, setFields] = useState<CatalogField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState<number>(ALL);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [detail, setDetail] = useState<MajorRow | null>(null);

  useEffect(() => {
    PredictService.catalog()
      .then((d) => setFields(d.fields))
      .catch(() =>
        setError(
          "Không tải được danh mục ngành từ máy chủ. Kiểm tra backend có đang chạy không."
        )
      )
      .finally(() => setLoading(false));
  }, []);

  // Trải 7 nhóm ngành thành danh sách ngành phẳng
  const allMajors: MajorRow[] = useMemo(
    () =>
      fields.flatMap((f) =>
        f.majors.map((m) => ({ ...m, fieldId: f.id, fieldName: f.name }))
      ),
    [fields]
  );

  // Chỉ hiện tổ hợp thật sự có ngành xét tuyển trong nhóm ngành đang chọn
  const availableBlocks = useMemo(() => {
    const src =
      selectedField === ALL
        ? allMajors
        : allMajors.filter((m) => m.fieldId === selectedField);
    return [...new Set(src.flatMap((m) => m.subjectGroups))].sort();
  }, [allMajors, selectedField]);

  // Đổi nhóm ngành mà tổ hợp đang lọc không còn ngành nào → coi như bỏ lọc tổ hợp.
  // Tính lúc render thay vì useEffect để tránh một nhịp hiển thị "0 ngành".
  const activeBlock = availableBlocks.includes(selectedBlock) ? selectedBlock : "";

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allMajors.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.includes(q) ||
        m.fieldName.toLowerCase().includes(q);
      const matchField = selectedField === ALL || m.fieldId === selectedField;
      const matchBlock = !activeBlock || m.subjectGroups.includes(activeBlock);
      return matchSearch && matchField && matchBlock;
    });
  }, [allMajors, searchTerm, selectedField, activeBlock]);

  const hasFilter = !!searchTerm || selectedField !== ALL || !!activeBlock;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedField(ALL);
    setSelectedBlock("");
  };

  const totalBlocks = useMemo(
    () => new Set(allMajors.flatMap((m) => m.subjectGroups)).size,
    [allMajors]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold">Đang tải danh mục ngành…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Không tải được dữ liệu</h2>
        <p className="text-sm text-slate-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up mt-2 max-w-7xl mx-auto pb-20">
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold">
              <GraduationCap className="w-4 h-4" />
              <span>Dữ liệu tuyển sinh chính thức HUIT</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Danh mục {allMajors.length} ngành đào tạo đại học
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Mã ngành, tổ hợp xét tuyển 2026 và điểm chuẩn 3 năm gần nhất theo{" "}
              <strong className="text-slate-800">phương thức thi tốt nghiệp THPT</strong>{" "}
              tại Trường Đại học Công Thương TP.HCM.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {[
              {
                v: allMajors.length,
                l: "Ngành",
                box: "bg-blue-50 border-blue-100",
                num: "text-blue-700",
                lab: "text-blue-900",
              },
              {
                v: fields.length,
                l: "Nhóm ngành",
                box: "bg-violet-50 border-violet-100",
                num: "text-violet-700",
                lab: "text-violet-900",
              },
              {
                v: totalBlocks,
                l: "Tổ hợp",
                box: "bg-emerald-50 border-emerald-100",
                num: "text-emerald-700",
                lab: "text-emerald-900",
              },
            ].map((s) => (
              <div
                key={s.l}
                className={`${s.box} border rounded-2xl p-4 text-center min-w-[92px]`}
              >
                <div className={`text-3xl font-black ${s.num}`}>{s.v}</div>
                <div
                  className={`text-[10px] font-extrabold ${s.lab} uppercase tracking-wide`}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LỌC THEO NHÓM NGÀNH */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
          <Layers className="w-3.5 h-3.5" />
          Lọc theo nhóm ngành
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedField(ALL)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
              selectedField === ALL
                ? "bg-[#0054A6] text-white border-[#0054A6] shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            Tất cả · {allMajors.length}
          </button>
          {fields.map((f) => {
            const active = selectedField === f.id;
            const st = FIELD_STYLE[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setSelectedField(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition flex items-center gap-2 ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${st?.dot ?? "bg-slate-400"}`} />
                {f.name}
                <span className={active ? "text-white/60" : "text-slate-400"}>
                  {f.majors.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* TÌM KIẾM + TỔ HỢP + CHẾ ĐỘ XEM */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên ngành hoặc mã ngành…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-[#0054A6] focus:ring-4 focus:ring-blue-500/10 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={activeBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#0054A6] cursor-pointer"
          >
            <option value="">Tất cả {availableBlocks.length} tổ hợp</option>
            {availableBlocks.map((b) => (
              <option key={b} value={b}>
                {b} — {ADMISSION_BLOCKS[b]?.name ?? "Tổ hợp " + b}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {(
              [
                ["grid", LayoutGrid, "Dạng thẻ"],
                ["table", TableIcon, "Dạng bảng"],
              ] as const
            ).map(([mode, Icon, title]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={title}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === mode
                    ? "bg-white text-[#0054A6] shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ĐẾM KẾT QUẢ */}
      <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 px-1">
        <span>
          Hiển thị <strong className="text-[#0054A6] font-black">{filtered.length}</strong>
          /{allMajors.length} ngành
          {activeBlock && (
            <span className="font-bold text-slate-400">
              {" "}
              · xét tuyển bằng tổ hợp {activeBlock}
            </span>
          )}
        </span>
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="text-[#0054A6] hover:underline font-bold cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">
            Không có ngành nào khớp bộ lọc hiện tại.
          </p>
          <button
            onClick={clearFilters}
            className="text-xs font-extrabold text-[#0054A6] hover:underline"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* DẠNG THẺ */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const st = FIELD_STYLE[m.fieldId];
            return (
              <button
                key={m.code}
                onClick={() => setDetail(m)}
                className="text-left bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-[#0054A6]/60 hover:shadow-md transition-all duration-200 flex flex-col gap-3.5 group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border ${
                      st?.chip ?? "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {m.fieldName}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0">
                    {m.code}
                  </span>
                </div>

                <h3 className="text-base font-black text-[#0F172A] group-hover:text-[#0054A6] transition-colors leading-snug min-h-[2.6rem]">
                  {m.name}
                </h3>

                <div className="rounded-2xl bg-[#F5F8FA] border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Điểm chuẩn THPT
                    </span>
                    <TrendBadge cutoffs={m.cutoffs} />
                  </div>
                  <CutoffBars cutoffs={m.cutoffs} />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Tổ hợp xét tuyển 2026
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.subjectGroups.map((b) => (
                      <span
                        key={b}
                        title={ADMISSION_BLOCKS[b]?.name}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          b === activeBlock
                            ? "bg-[#0054A6] text-white border-[#0054A6]"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* DẠNG BẢNG */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-black">
                <tr>
                  <th className="px-5 py-4">Mã ngành</th>
                  <th className="px-5 py-4">Tên ngành</th>
                  <th className="px-5 py-4">Nhóm ngành</th>
                  <th className="px-5 py-4">Tổ hợp 2026</th>
                  {YEARS.map((y) => (
                    <th key={y} className="px-4 py-4 text-center">
                      {y}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center">Biến động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((m) => (
                  <tr
                    key={m.code}
                    onClick={() => setDetail(m)}
                    className="hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono font-black text-blue-700">
                      {m.code}
                    </td>
                    <td className="px-5 py-3.5 font-extrabold text-slate-900">{m.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            FIELD_STYLE[m.fieldId]?.dot ?? "bg-slate-400"
                          }`}
                        />
                        {m.fieldName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {m.subjectGroups.map((b) => (
                          <span
                            key={b}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              b === activeBlock
                                ? "bg-[#0054A6] text-white border-[#0054A6]"
                                : "bg-slate-100 border-slate-200"
                            }`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                    {YEARS.map((y) => (
                      <td
                        key={y}
                        className={`px-4 py-3.5 text-center tabular-nums ${
                          y === "2026"
                            ? "font-black text-blue-700 bg-blue-50/40"
                            : "font-bold text-slate-500"
                        }`}
                      >
                        {typeof m.cutoffs[y] === "number" ? m.cutoffs[y].toFixed(2) : "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3.5 text-center">
                      <TrendBadge cutoffs={m.cutoffs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NGUỒN DỮ LIỆU */}
      <div className="flex items-start gap-2.5 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <p>
          Nguồn: {ADMISSION_SOURCE}. Trường xét tuyển bằng nhiều phương thức khác nhau
          (học bạ, đánh giá năng lực, ưu tiên xét tuyển); điểm chuẩn hiển thị ở đây{" "}
          <strong className="text-slate-700">chỉ áp dụng cho phương thức thi THPT</strong>{" "}
          và mang tính tham khảo, không phải cam kết trúng tuyển năm sau.
        </p>
      </div>

      {/* CHI TIẾT NGÀNH */}
      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-extrabold ${
                      FIELD_STYLE[detail.fieldId]?.chip ??
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {detail.fieldName}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    Mã ngành {detail.code}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {detail.name}
                </h2>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Điểm chuẩn 3 năm */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Điểm chuẩn thi tốt nghiệp THPT
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {YEARS.map((y) => {
                  const v = detail.cutoffs[y];
                  const latest = y === "2026";
                  return (
                    <div
                      key={y}
                      className={`rounded-2xl p-4 border text-center ${
                        latest
                          ? "bg-blue-50 border-blue-200"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-400 mb-0.5">
                        Năm {y}
                      </div>
                      <div
                        className={`font-black text-2xl tabular-nums ${
                          latest ? "text-[#0054A6]" : "text-slate-700"
                        }`}
                      >
                        {typeof v === "number" ? v.toFixed(2) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const t = trendOf(detail.cutoffs);
                if (!t) return null;
                const up = t.delta > 0.001;
                const flat = Math.abs(t.delta) <= 0.001;
                return (
                  <p className="text-xs text-slate-600 font-medium">
                    Năm {t.year}{" "}
                    {flat ? (
                      <>giữ nguyên so với năm trước.</>
                    ) : (
                      <>
                        {up ? "tăng" : "giảm"}{" "}
                        <strong className={up ? "text-rose-600" : "text-emerald-600"}>
                          {Math.abs(t.delta).toFixed(2)} điểm
                        </strong>{" "}
                        so với năm trước.
                      </>
                    )}
                  </p>
                );
              })()}
            </div>

            {/* Tổ hợp xét tuyển */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                {detail.subjectGroups.length} tổ hợp xét tuyển năm 2026
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detail.subjectGroups.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <span className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-1 rounded-md shrink-0">
                      {b}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 leading-tight">
                      {ADMISSION_BLOCKS[b]?.name ?? "Chưa có mô tả"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setDetail(null)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
              >
                Đóng
              </button>
              <Link
                href="/predict"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
              >
                <span>Làm khảo sát gợi ý ngành</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
