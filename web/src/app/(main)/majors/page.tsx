"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Cpu,
  BarChart3,
  Utensils,
  FlaskConical,
  Scale,
  Globe2,
  SlidersHorizontal,
  ArrowUpDown,
  BookOpen,
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

const FACULTY_ICONS: Record<number, any> = {
  0: Cpu,
  1: BarChart3,
  2: Utensils,
  3: Layers,
  4: FlaskConical,
  5: Scale,
  6: Globe2,
};

type SortOption = "default" | "cutoff_desc" | "cutoff_asc" | "trend_desc" | "name_asc";

/** Chênh lệch điểm chuẩn giữa năm mới nhất và năm trước đó. */
function trendOf(cutoffs: Record<string, number>) {
  const have = YEARS.filter((y) => typeof cutoffs[y] === "number");
  if (have.length < 2) return null;
  const last = cutoffs[have[have.length - 1]];
  const prev = cutoffs[have[have.length - 2]];
  return { delta: +(last - prev).toFixed(2), latest: last, year: have[have.length - 1] };
}

/** Thanh so sánh điểm chuẩn 3 năm — chuyển tiếp CSS tăng tốc phần cứng mượt mà */
function CutoffBars({ cutoffs }: { cutoffs: Record<string, number> }) {
  const LO = 14;
  const HI = 30;
  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {YEARS.map((y) => {
        const v = cutoffs[y];
        const pct = typeof v === "number" ? Math.max(12, ((v - LO) / (HI - LO)) * 100) : 0;
        const isLatest = y === "2026";
        return (
          <div key={y} className="flex flex-col items-center gap-1 group/bar">
            <span
              className={`text-[10px] font-black tabular-nums transition-colors leading-tight ${
                isLatest ? "text-[#0054A6]" : "text-slate-500 group-hover/bar:text-slate-700"
              }`}
            >
              {typeof v === "number" ? v.toFixed(2) : "—"}
            </span>
            <div className="w-full h-8 flex items-end rounded-lg bg-slate-200/80 p-0.5 overflow-hidden">
              <div
                style={{ height: `${pct}%` }}
                className={`w-full rounded-md transition-all duration-500 ease-out ${
                  isLatest
                    ? "bg-gradient-to-t from-[#0054A6] to-[#0072CE] shadow-xs"
                    : "bg-slate-300 group-hover/bar:bg-slate-400"
                }`}
              />
            </div>
            <span
              className={`text-[9px] font-bold ${
                isLatest ? "text-[#0054A6] font-black" : "text-slate-400"
              }`}
            >
              {y}
            </span>
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
    ? "bg-rose-50 text-rose-700 border-rose-200/90 shadow-2xs"
    : down
    ? "bg-emerald-50 text-emerald-700 border-emerald-200/90 shadow-2xs"
    : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-tight ${cls}`}
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
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [detail, setDetail] = useState<MajorRow | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    PredictService.catalog()
      .then((d) => setFields(d.fields))
      .catch(() =>
        setError(
          "Không tải được danh mục ngành từ máy chủ tuyển sinh. Vui lòng kiểm tra lại kết nối mạng."
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

  const activeBlock = availableBlocks.includes(selectedBlock) ? selectedBlock : "";

  // Lọc và sắp xếp ngành học
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = allMajors.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.includes(q) ||
        m.fieldName.toLowerCase().includes(q);
      const matchField = selectedField === ALL || m.fieldId === selectedField;
      const matchBlock = !activeBlock || m.subjectGroups.includes(activeBlock);
      return matchSearch && matchField && matchBlock;
    });

    return list.sort((a, b) => {
      if (sortBy === "cutoff_desc") {
        const ca = a.cutoffs?.["2026"] ?? 0;
        const cb = b.cutoffs?.["2026"] ?? 0;
        return cb - ca;
      }
      if (sortBy === "cutoff_asc") {
        const ca = a.cutoffs?.["2026"] ?? 99;
        const cb = b.cutoffs?.["2026"] ?? 99;
        return ca - cb;
      }
      if (sortBy === "trend_desc") {
        const ta = trendOf(a.cutoffs)?.delta ?? -99;
        const tb = trendOf(b.cutoffs)?.delta ?? -99;
        return tb - ta;
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "vi");
      }
      return 0; // default
    });
  }, [allMajors, searchTerm, selectedField, activeBlock, sortBy]);

  const hasFilter = !!searchTerm || selectedField !== ALL || !!activeBlock || sortBy !== "default";
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedField(ALL);
    setSelectedBlock("");
    setSortBy("default");
  };

  const totalBlocks = useMemo(
    () => new Set(allMajors.flatMap((m) => m.subjectGroups)).size,
    [allMajors]
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0054A6]" />
        <p className="text-sm font-bold text-slate-600">Đang tải danh mục 39 ngành học HUIT…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white rounded-3xl p-8 border border-rose-200 text-center space-y-4 shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Không tải được dữ liệu tuyển sinh</h2>
        <p className="text-sm text-slate-600 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-[#0054A6] text-white text-xs font-bold shadow-xs hover:bg-[#00478F] transition"
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
      
      {/* ==================================================================== */}
      {/* 1. HERO HEADER BANNER                                               */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50/50 via-sky-50/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#0054A6] text-xs font-black">
              <GraduationCap className="w-4 h-4 text-[#0054A6]" />
              <span>Dữ Liệu Tuyển Sinh Chính Thức Đại Học Công Thương TP.HCM (HUIT)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Danh Mục 39 Ngành Đào Tạo Đại Học
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
              Tra cứu mã ngành chính thức, tổ hợp xét tuyển 2026 và điểm chuẩn 3 năm liên tiếp theo{" "}
              <strong className="text-slate-900">phương thức thi tốt nghiệp THPT</strong> tại HUIT.
            </p>
          </div>

          {/* Quick Stat Widgets */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {[
              {
                v: allMajors.length,
                l: "Ngành đào tạo",
                sub: "Chương trình chuẩn",
                box: "bg-blue-50/80 border-blue-200/80",
                num: "text-[#0054A6]",
                lab: "text-blue-900",
                onClick: () => clearFilters(),
              },
              {
                v: fields.length,
                l: "Khoa / Nhóm ngành",
                sub: "Đa ngành ứng dụng",
                box: "bg-violet-50/80 border-violet-200/80",
                num: "text-violet-700",
                lab: "text-violet-900",
                onClick: () => setSelectedField(0),
              },
              {
                v: totalBlocks,
                l: "Tổ hợp xét tuyển",
                sub: "Tuyển sinh 2026",
                box: "bg-emerald-50/80 border-emerald-200/80",
                num: "text-emerald-700",
                lab: "text-emerald-900",
                onClick: () => setSelectedBlock("A00"),
              },
            ].map((s) => (
              <div
                key={s.l}
                onClick={s.onClick}
                className={`${s.box} border rounded-2xl p-3.5 sm:p-4 text-center min-w-[100px] cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all`}
                title="Nhấp để lọc nhanh"
              >
                <div className={`text-2xl sm:text-3xl font-black ${s.num}`}>{s.v}</div>
                <div className={`text-[10px] sm:text-[11px] font-black ${s.lab} uppercase tracking-tight mt-0.5`}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. THANH LỌC NHÓM NGÀNH (FACULTY FILTER STRIP)                       */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
            <Layers className="w-4 h-4 text-[#0054A6]" />
            <span>Lọc theo nhóm ngành đào tạo</span>
          </div>
          {selectedField !== ALL && (
            <button
              onClick={() => setSelectedField(ALL)}
              className="text-xs font-bold text-[#0054A6] hover:underline cursor-pointer"
            >
              Xem tất cả nhóm ngành
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Tất cả */}
          <button
            type="button"
            onClick={() => setSelectedField(ALL)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              selectedField === ALL
                ? "bg-[#0054A6] text-white border-[#0054A6] shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              selectedField === ALL ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {allMajors.length}
            </span>
          </button>

          {/* 7 Khối ngành */}
          {fields.map((f) => {
            const active = selectedField === f.id;
            const st = FIELD_STYLE[f.id];
            const Icon = FACULTY_ICONS[f.id] || GraduationCap;

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedField(f.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${st?.dot ?? "bg-slate-400"}`} />
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span>{f.name}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {f.majors.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* TOOLBAR: TÌM KIẾM + TỔ HỢP + SẮP XẾP + CHẾ ĐỘ XEM */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên ngành (VD: Công nghệ thông tin...) hoặc mã ngành (7480201)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-hidden focus:bg-white focus:border-[#0054A6] focus:ring-2 focus:ring-blue-500/10 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lọc theo tổ hợp */}
          <select
            value={activeBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-hidden focus:border-[#0054A6] cursor-pointer"
          >
            <option value="">Tất cả {availableBlocks.length} tổ hợp xét tuyển</option>
            {availableBlocks.map((b) => (
              <option key={b} value={b}>
                {b} — {ADMISSION_BLOCKS[b]?.name ?? "Tổ hợp " + b}
              </option>
            ))}
          </select>

          {/* Sắp xếp */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="cutoff_desc">Điểm 2026: Cao nhất</option>
              <option value="cutoff_asc">Điểm 2026: Thấp nhất</option>
              <option value="trend_desc">Biến động: Tăng nhiều nhất</option>
              <option value="name_asc">Tên ngành: A ➔ Z</option>
            </select>
          </div>

          {/* Switch Grid / Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-end lg:self-auto">
            {(
              [
                ["grid", LayoutGrid, "Dạng thẻ"],
                ["table", TableIcon, "Dạng bảng"],
              ] as const
            ).map(([mode, Icon, title]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                title={title}
                className={`p-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs cursor-pointer ${
                  viewMode === mode
                    ? "bg-white text-[#0054A6] shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gợi ý từ khóa tìm kiếm nhanh */}
        {!searchTerm && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
            <span className="text-[11px] font-bold text-slate-400">Từ khóa gợi ý:</span>
            {["Công nghệ thông tin", "Marketing", "Logistics", "Thực phẩm", "Luật", "Ngôn ngữ Anh"].map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => setSearchTerm(kw)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-blue-50 hover:text-[#0054A6] text-slate-600 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 3. SỐ LƯỢNG KẾT QUẢ & CLEAR FILTERS                                 */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between text-xs font-black text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span>Tìm thấy</span>
          <strong className="text-[#0054A6] font-black text-sm">{filtered.length}</strong>
          <span>/ {allMajors.length} ngành đào tạo</span>
          {activeBlock && (
            <span className="font-bold text-slate-400 hidden sm:inline">
              · xét tuyển bằng tổ hợp {activeBlock}
            </span>
          )}
        </span>
        {hasFilter && (
          <button
            onClick={clearFilters}
            className="text-xs font-black text-[#0054A6] hover:underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ bộ lọc</span>
          </button>
        )}
      </div>

      {/* KHÔNG CÓ KẾT QUẢ */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 text-center space-y-3 shadow-sm">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800">Không tìm thấy ngành nào phù hợp</h3>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
            Không có ngành học nào khớp với từ khóa &quot;{searchTerm}&quot; hoặc các bộ lọc đã chọn. Hãy thử tìm từ khóa khác hoặc xóa bộ lọc.
          </p>
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 rounded-xl bg-[#0054A6] text-white text-xs font-black hover:bg-[#00478F] transition cursor-pointer"
          >
            Xóa bộ lọc để xem tất cả
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. DẠNG THẺ GRID (GRID VIEW)                                         */}
      {/* ==================================================================== */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const st = FIELD_STYLE[m.fieldId];
            const Icon = FACULTY_ICONS[m.fieldId] || GraduationCap;

            return (
              <div
                key={m.code}
                onClick={() => setDetail(m)}
                className="text-left bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:border-[#0054A6]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4 group cursor-pointer relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top info: Faculty chip + Code */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-md border ${
                        st?.chip ?? "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{m.fieldName}</span>
                    </span>

                    <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      {m.code}
                    </span>
                  </div>

                  {/* Major title */}
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#0054A6] transition-colors leading-snug line-clamp-2 min-h-[2.8rem]">
                    {m.name}
                  </h3>

                  {/* Cutoff bars card */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100/90 space-y-1.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Điểm chuẩn THPT
                      </span>
                      <TrendBadge cutoffs={m.cutoffs} />
                    </div>
                    <CutoffBars cutoffs={m.cutoffs} />
                  </div>

                  {/* Subject Groups */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Tổ hợp xét tuyển 2026:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.subjectGroups.map((b) => (
                        <span
                          key={b}
                          title={ADMISSION_BLOCKS[b]?.name}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border transition-colors ${
                            b === activeBlock
                              ? "bg-[#0054A6] text-white border-[#0054A6] shadow-2xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 group-hover:border-slate-300"
                          }`}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#0054A6] transition-colors">
                  <span className="text-[11px] font-black">Xem chi tiết & tổ hợp môn</span>
                  <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. DẠNG BẢNG (TABLE VIEW)                                           */}
      {/* ==================================================================== */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm">
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
                      Điểm {y}
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
                    <td className="px-5 py-3.5 font-mono font-black text-[#0054A6]">
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
                            ? "font-black text-[#0054A6] bg-blue-50/40"
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

      {/* ==================================================================== */}
      {/* 6. GHI CHÚ NGUỒN DỮ LIỆU CHÍNH THỨC                                  */}
      {/* ==================================================================== */}
      <div className="flex items-start gap-3 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <p className="leading-relaxed">
          Nguồn dữ liệu: <strong className="text-slate-700">{ADMISSION_SOURCE}</strong>. Trường Đại học Công Thương TP.HCM xét tuyển bằng nhiều phương thức (học bạ THPT, điểm thi ĐGNL ĐHQG-HCM, xét tuyển thẳng). Điểm chuẩn trên bảng này áp dụng đối với phương thức xét kết quả thi tốt nghiệp THPT qua các năm.
        </p>
      </div>

      {/* ==================================================================== */}
      {/* 7. MODAL CHI TIẾT NGÀNH HỌC                                          */}
      {/* ==================================================================== */}
      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-black ${
                      FIELD_STYLE[detail.fieldId]?.chip ?? "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {detail.fieldName}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(detail.code)}
                    className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Sao chép mã ngành"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Mã {detail.code}</span>
                  </button>
                </div>

                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {detail.name}
                </h2>
              </div>

              <button
                onClick={() => setDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Điểm chuẩn 3 năm */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Điểm Chuẩn Thi Tốt Nghiệp THPT (3 Năm)
                </h4>
                <TrendBadge cutoffs={detail.cutoffs} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {YEARS.map((y) => {
                  const v = detail.cutoffs[y];
                  const latest = y === "2026";
                  return (
                    <div
                      key={y}
                      className={`rounded-2xl p-4 border text-center ${
                        latest
                          ? "bg-blue-50/80 border-blue-200"
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
                  <p className="text-xs text-slate-600 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Năm {t.year}{" "}
                    {flat ? (
                      <>điểm chuẩn giữ mức ổn định so với năm trước.</>
                    ) : (
                      <>
                        điểm chuẩn {up ? "tăng" : "giảm"}{" "}
                        <strong className={up ? "text-rose-600" : "text-emerald-600"}>
                          {Math.abs(t.delta).toFixed(2)} điểm
                        </strong>{" "}
                        so với năm trước đó.
                      </>
                    )}
                  </p>
                );
              })()}
            </div>

            {/* Tổ hợp xét tuyển chi tiết */}
            <div className="space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                {detail.subjectGroups.length} Tổ Hợp Xét Tuyển Chính Thức Năm 2026
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {detail.subjectGroups.map((b) => {
                  const blockInfo = ADMISSION_BLOCKS[b];
                  return (
                    <div
                      key={b}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-md">
                          {b}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {blockInfo?.category || "Tổ hợp xét tuyển"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {blockInfo?.name ?? "Chưa có mô tả"}
                      </div>
                      {blockInfo?.desc && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          {blockInfo.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Đóng
              </button>

              <Link
                href="/predict"
                className="px-6 py-3 rounded-2xl bg-[#0054A6] hover:bg-[#00478F] text-white font-black text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Khảo sát xem bạn có hợp ngành này không</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
