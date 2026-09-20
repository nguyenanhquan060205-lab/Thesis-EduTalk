"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Boxes,
  ChevronDown,
  Database,
  FileText,
  FlaskConical,
  Layers,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  RagService,
  type Chunk,
  type KetQuaThu,
  type KiemKe,
  type ThongTinKho,
  type TrangThaiDo,
  type TrangThaiNguon,
} from "@/services/rag";
import { pt, so } from "@/services/modelMetrics";

type Tab = "nguon" | "chunk" | "thu" | "do";

const TABS: { id: Tab; nhan: string; Icon: typeof BookOpen }[] = [
  { id: "nguon", nhan: "Tài liệu nguồn", Icon: BookOpen },
  { id: "chunk", nhan: "Duyệt chunk", Icon: Boxes },
  { id: "thu", nhan: "Thử truy xuất", Icon: Search },
  { id: "do", nhan: "Đo truy hồi", Icon: FlaskConical },
];

const NHAN_TRANG_THAI: Record<TrangThaiNguon, { chu: string; lop: string }> = {
  da_nap: { chu: "Đã nạp", lop: "bg-blue-50 text-[#0054A6] border-blue-200" },
  chua_nap: { chu: "Chưa nạp", lop: "bg-violet-50 text-violet-700 border-violet-200" },
  co_thay_doi: { chu: "Có thay đổi", lop: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  bi_bo_qua: { chu: "Bị bỏ qua", lop: "bg-slate-800 text-white border-slate-800" },
  rong: { chu: "Rỗng", lop: "bg-slate-100 text-slate-500 border-slate-200" },
};

function loiApi(e: unknown, macDinh: string): string {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || macDinh;
}

/** Khối có tiêu đề — cùng kiểu với trang Hiệu suất mô hình */
function Khoi({ tieuDe, mota, children, phai }: {
  tieuDe: string; mota?: string; children: React.ReactNode; phai?: React.ReactNode;
}) {
  return (
    <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">{tieuDe}</h3>
          {mota && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{mota}</p>}
        </div>
        {phai}
      </div>
      {children}
    </div>
  );
}

function ChipTrangThai({ tt }: { tt: TrangThaiNguon }) {
  const x = NHAN_TRANG_THAI[tt];
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black whitespace-nowrap ${x.lop}`}>
      {x.chu}
    </span>
  );
}

function Nut({ children, onClick, disabled, phu }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; phu?: boolean;
}) {
  const giam = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={giam || disabled ? undefined : { y: -2, scale: 1.02 }}
      whileTap={giam || disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
        phu
          ? "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
          : "bg-[#0054A6] text-white ring-1 ring-[#0054A6]/20 shadow-[#0054A6]/20"
      }`}
    >
      {children}
    </motion.button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function RagPage() {
  const giam = useReducedMotion();
  const [tab, setTab] = useState<Tab>("nguon");
  const [tt, setTt] = useState<ThongTinKho | null>(null);
  const [kk, setKk] = useState<KiemKe | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangNap, setDangNap] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([RagService.thongTin(), RagService.kiemKe()]);
      setTt(a);
      setKk(b);
      setLoi(null);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được thông tin kho tri thức."));
    }
  }, []);

  useEffect(() => {
    let huy = false;
    (async () => {
      await tai();
      if (huy) return;
    })();
    return () => {
      huy = true;
    };
  }, [tai]);

  const napLai = async () => {
    if (!window.confirm("Nạp lại index từ data/kho_vector/kho.json? Chatbot dùng kho mới ngay sau khi xong.")) return;
    setDangNap(true);
    try {
      const r = await RagService.napLai();
      setThongBao(`Đã nạp lại: ${r.so_chunk} chunk, dựng lúc ${r.tao_luc}.`);
      await tai();
    } catch (e) {
      setThongBao(loiApi(e, "Nạp lại thất bại."));
    } finally {
      setDangNap(false);
    }
  };

  if (loi) {
    return (
      <div className="p-6 sm:p-10 max-w-5xl mx-auto">
        <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-sm font-bold flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{loi}</span>
        </div>
      </div>
    );
  }

  if (!tt || !kk) {
    return (
      <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true">
        <div className="h-16 rounded-2xl bg-slate-100" />
        <div className="h-28 rounded-2xl bg-slate-100" />
        <div className="h-80 rounded-2xl bg-slate-100" />
      </div>
    );
  }

  // Hai luồng đúng như báo cáo tuần 3: xây kho (offline, 4 bước) và trả lời (online).
  // Mọi con số đọc từ API — đổi hằng số trong code là trang tự đổi theo.
  const soTepMd = kk.tai_lieu.filter((t) => t.trang_thai !== "bi_bo_qua").length;
  const luong = [
    {
      ten: "Xây dựng kho tri thức",
      phu: "offline · chạy scripts/nap_kho.py",
      buoc: [
        { ten: "1. Thu thập", chi: `${tt.nguon_co_cau_truc.so_nganh} ngành từ JSON đề án · ${soTepMd} tệp .md văn xuôi` },
        { ten: "2. Làm sạch", chi: "tách metadata đầu tệp · khử chunk trùng bằng băm SHA-256" },
        { ten: "3. Chunking", chi: `theo ngữ nghĩa (đoạn, mục) · ≤ ${tt.chunking.tu_toi_da} từ · chồng lấn ${tt.chunking.tu_chong_lan} từ` },
        { ten: "4. Embedding & lưu trữ", chi: `${tt.model_nhung?.replace("models/", "") ?? "—"} · ${tt.so_chieu ?? "—"} chiều · Chroma · metadata ngành, loại, nguồn, năm` },
      ],
    },
    {
      ten: "Trả lời một câu hỏi",
      phu: "online · mỗi lượt chat",
      buoc: [
        { ten: "1. Truy hồi", chi: `nhúng câu hỏi · top-${tt.nguong.top_k} theo cosine · lạc đề nếu gần nhất > ${so(tt.nguong.lac_de, 2)}` },
        { ten: "2. Ghép ngữ cảnh", chi: `giữ đoạn trong biên độ ${so(tt.nguong.bien_do, 2)} · augmented prompt` },
        { ten: "3. Sinh câu trả lời", chi: "Gemini · chỉ dựa trên ngữ cảnh được cấp" },
        { ten: "4. Trích dẫn nguồn", chi: "nhãn nguồn tới cấp mục, kèm năm" },
      ],
    },
  ];

  return (
    <div className="p-6 sm:p-10 max-w-6xl mx-auto space-y-6 text-slate-900 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] border border-blue-200 text-[10px] font-black uppercase mb-2">
            <Database className="w-3.5 h-3.5" /> Kho tri thức
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Quản Lý RAG Của Trợ Lý EduTalk
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1 max-w-3xl">
            Nguồn gốc là file trong <code className="text-slate-700">backend/data/</code>; Chroma chỉ là
            index dựng lại từ artifact <code className="text-slate-700">kho.json</code>. Sửa nguồn thì chạy{" "}
            <code className="text-slate-700">python scripts/nap_kho.py</code> rồi bấm Nạp lại.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
            tt.san_sang ? "bg-blue-50 text-[#0054A6] border-blue-200" : "bg-slate-800 text-white border-slate-800"
          }`}>
            {tt.san_sang ? `Đang phục vụ · ${tt.so_chunk} chunk` : "Kho chưa dựng"}
          </span>
          <Nut onClick={napLai} disabled={dangNap}>
            <RefreshCw className={`w-3.5 h-3.5 ${dangNap ? "animate-spin" : ""}`} />
            Nạp lại index
          </Nut>
        </div>
      </div>

      {thongBao && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#0054A6]">
          {thongBao}
        </div>
      )}

      {(kk.lech_index || kk.can_nap_lai) && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 flex items-start gap-3">
          <TriangleAlert className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700 font-medium leading-relaxed space-y-1">
            {kk.can_nap_lai && (
              <p>
                <strong className="text-slate-900">Có nguồn đã sửa nhưng chưa nhúng.</strong> Chatbot đang trả lời
                bằng nội dung cũ. Chạy <code>python scripts/nap_kho.py</code> (chỉ nhúng lại phần đổi), rồi bấm Nạp lại.
              </p>
            )}
            {kk.lech_index && (
              <p>
                <strong className="text-slate-900">Artifact trên đĩa mới hơn index đang phục vụ</strong> (dựng lúc{" "}
                {kk.artifact?.tao_luc}). Bấm Nạp lại để dùng bản mới.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hai luồng của pipeline RAG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {luong.map((l) => (
          <div key={l.ten} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs font-black text-slate-900">{l.ten}</div>
              <div className="text-[10px] font-bold text-slate-400">{l.phu}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {l.buoc.map((b) => (
                <motion.div
                  key={b.ten}
                  whileHover={giam ? undefined : { y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs"
                >
                  <div className="text-[10px] font-black text-[#0054A6]">{b.ten}</div>
                  <div className="text-[11px] text-slate-600 font-medium leading-snug mt-1">{b.chi}</div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(({ id, nhan, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-black transition-colors ${
              tab === id ? "text-[#0054A6]" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {nhan}
            {tab === id && (
              <motion.span
                layoutId="gach-tab-rag"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#0054A6] rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={giam ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={giam ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "nguon" && <TabNguon kk={kk} />}
          {tab === "chunk" && <TabChunk loaiCo={Object.keys(tt.theo_loai)} />}
          {tab === "thu" && <TabThu topK={tt.nguong.top_k} />}
          {tab === "do" && <TabDo topK={tt.nguong.top_k} sanSang={tt.san_sang} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
function TabNguon({ kk }: { kk: KiemKe }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Khoi
          tieuDe="Nguồn có cấu trúc — JSON tuyển sinh"
          mota="Code tự viết mỗi ngành thành một đoạn văn tự chứa đủ nghĩa (tên, mã, nhóm, tổ hợp, điểm chuẩn) rồi mới nhúng."
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-black text-slate-900">{kk.co_cau_truc.so_nganh} ngành</div>
              <div className="text-[11px] text-slate-500 font-medium">{kk.co_cau_truc.nguon}</div>
            </div>
            <div className="text-right space-y-1">
              <ChipTrangThai tt={kk.co_cau_truc.trang_thai} />
              <div className="text-[11px] text-slate-500 font-bold tabular-nums">
                {kk.co_cau_truc.da_nap}/{kk.co_cau_truc.so_chunk} chunk trong kho
              </div>
            </div>
          </div>
        </Khoi>

        <Khoi tieuDe="Artifact và index" mota="Artifact là file đi theo git; index là bản Chroma đang phục vụ trong RAM.">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Chunk trong artifact", kk.artifact?.so_chunk?.toLocaleString("vi-VN") ?? "—"],
              ["Dung lượng", kk.artifact ? `${kk.artifact.dung_luong_kb.toLocaleString("vi-VN")} KB` : "—"],
              ["Artifact dựng lúc", kk.artifact?.tao_luc?.replace("T", " ") ?? "—"],
              ["Index đang phục vụ", kk.index.tao_luc?.replace("T", " ") ?? "chưa nạp"],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-[10px] text-slate-400 font-bold uppercase">{k}</div>
                <div className="font-black tabular-nums text-slate-900 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </Khoi>
      </div>

      <Khoi
        tieuDe="Độ phủ theo loại tài liệu văn xuôi"
        mota="Loại lấy theo TÊN THƯ MỤC trong data/kho_tri_thuc/. Loại chưa có tệp nào là chủ đề chatbot chưa trả lời được bằng dữ liệu."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {kk.theo_loai.map((l) => (
            <div
              key={l.loai}
              className={`p-3 rounded-xl border ${
                l.so_tep === 0 ? "bg-white border-dashed border-slate-300" : "bg-blue-50/50 border-blue-200/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <code className="font-black text-slate-900">{l.loai}/</code>
                <span className="text-[10px] font-black text-slate-500 tabular-nums">
                  {l.so_tep} tệp · {l.so_chunk_trong_kho} chunk
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{l.mo_ta}</div>
            </div>
          ))}
        </div>
      </Khoi>

      <Khoi
        tieuDe="Tệp văn xuôi (.md)"
        mota={`So băm từng chunk với artifact. Trường bắt buộc ở phần đầu tệp: ${kk.truong_bat_buoc.join(", ")} — thiếu là bị bỏ qua khi nạp.`}
      >
        {kk.tai_lieu.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center text-slate-400">
            <FileText className="w-7 h-7" />
            <p className="text-xs font-bold">Chưa có tài liệu văn xuôi nào.</p>
            <p className="text-[11px] font-medium max-w-md">
              Chép <code>data/kho_tri_thuc/_MAU.md</code> vào đúng thư mục loại, điền nội dung, rồi chạy{" "}
              <code>python scripts/nap_kho.py</code>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
                <tr>
                  <th className="pb-2 pr-3">Tệp</th>
                  <th className="pb-2 pr-3">Năm · nguồn</th>
                  <th className="pb-2 pr-3 text-right">Chunk</th>
                  <th className="pb-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kk.tai_lieu.map((t) => (
                  <tr key={t.tep} className="hover:bg-slate-50/60 align-top">
                    <td className="py-2.5 pr-3">
                      <code className="font-bold text-slate-900">{t.tep}</code>
                      <div className="text-[10px] text-slate-400 font-medium">sửa {t.sua_luc.replace("T", " ")}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 font-medium min-w-[12rem]">
                      {t.meta?.nam ?? "—"} · {t.meta?.nguon ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-black text-slate-900 whitespace-nowrap">
                      {t.so_chunk != null ? `${t.da_nap}/${t.so_chunk}` : "—"}
                      {!!t.chunk_trung && (
                        <div className="text-[10px] text-slate-400 font-bold">{t.chunk_trung} trùng bị bỏ</div>
                      )}
                    </td>
                    <td className="py-2.5">
                      <ChipTrangThai tt={t.trang_thai} />
                      {t.ly_do && <div className="text-[10px] text-slate-500 font-medium mt-1">{t.ly_do}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Khoi>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
function TabChunk({ loaiCo }: { loaiCo: string[] }) {
  const [tim, setTim] = useState("");
  const [loai, setLoai] = useState("");
  const [trang, setTrang] = useState(1);
  const [ds, setDs] = useState<Chunk[] | null>(null);
  const [tong, setTong] = useState(0);
  const [mo, setMo] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const MOI_TRANG = 10;

  const tai = useCallback(async (t: string, l: string, p: number) => {
    try {
      const r = await RagService.chunks({ tim: t, loai: l, trang: p, moiTrang: MOI_TRANG });
      setDs(r.chunk);
      setTong(r.tong);
      setLoi(null);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được danh sách chunk."));
    }
  }, []);

  useEffect(() => {
    const h = setTimeout(() => tai(tim, loai, trang), 250); // gõ xong mới tìm
    return () => clearTimeout(h);
  }, [tim, loai, trang, tai]);

  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  return (
    <Khoi tieuDe="Duyệt chunk trong kho" mota="Tìm không dấu được. Mỗi chunk là một đoạn nhúng độc lập — metadata là thứ bot dùng để trích nguồn.">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={tim}
            onChange={(e) => { setTim(e.target.value); setTrang(1); }}
            placeholder="Tìm theo nội dung hoặc metadata, vd: cong nghe thong tin"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
          />
        </div>
        <select
          value={loai}
          onChange={(e) => { setLoai(e.target.value); setTrang(1); }}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
        >
          <option value="">Mọi loại</option>
          {loaiCo.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {loi && <p className="text-xs font-bold text-rose-700">{loi}</p>}
      <div className="text-[11px] text-slate-500 font-bold">{tong.toLocaleString("vi-VN")} chunk khớp</div>

      <div className="space-y-2">
        {ds === null
          ? [0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)
          : ds.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200/80 bg-white">
                <button
                  type="button"
                  onClick={() => setMo(mo === c.id ? null : c.id)}
                  className="w-full p-3.5 flex items-start justify-between gap-3 text-left hover:bg-slate-50/60 rounded-xl"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-[11px] font-black text-slate-900">{c.id}</code>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0054A6] text-[10px] font-black">
                        {String(c.meta.loai ?? "—")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{c.so_tu} từ</span>
                    </div>
                    <p className={`text-xs text-slate-600 font-medium leading-relaxed ${mo === c.id ? "" : "line-clamp-2"}`}>
                      {c.noi_dung}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${mo === c.id ? "rotate-180" : ""}`} />
                </button>
                {mo === c.id && (
                  <div className="px-3.5 pb-3.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {Object.entries(c.meta).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3 px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-slate-500 font-bold">{k}</span>
                        <span className="text-slate-900 font-semibold text-right break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
      </div>

      {soTrang > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs font-bold">
          <Nut phu disabled={trang <= 1} onClick={() => setTrang(trang - 1)}>Trước</Nut>
          <span className="text-slate-500 tabular-nums">{trang}/{soTrang}</span>
          <Nut phu disabled={trang >= soTrang} onClick={() => setTrang(trang + 1)}>Sau</Nut>
        </div>
      )}
    </Khoi>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
function TabThu({ topK }: { topK: number }) {
  const [cau, setCau] = useState("");
  const [cauTruoc, setCauTruoc] = useState("");
  const [k, setK] = useState(topK);
  const [kq, setKq] = useState<KetQuaThu | null>(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const chay = async () => {
    if (!cau.trim()) return;
    setDang(true);
    try {
      setKq(await RagService.thuTruyXuat(cau, k, cauTruoc));
      setLoi(null);
    } catch (e) {
      setLoi(loiApi(e, "Truy xuất thất bại."));
    } finally {
      setDang(false);
    }
  };

  const xaNhat = useMemo(() => Math.max(0.6, ...(kq?.truy_xuat.map((d) => d.khoang_cach) ?? [])), [kq]);

  return (
    <div className="space-y-4">
      <Khoi
        tieuDe="Thử một câu hỏi"
        mota="Xem đúng đoạn nào được lấy về, khoảng cách bao nhiêu, đoạn nào bị ngưỡng loại và vì sao — để biết bot trả lời sai do truy hồi hay do sinh."
      >
        <div className="space-y-2">
          <textarea
            value={cau}
            onChange={(e) => setCau(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) chay(); }}
            rows={2}
            placeholder="Vd: em thích lập trình và muốn làm game thì nên học ngành gì?"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={cauTruoc}
              onChange={(e) => setCauTruoc(e.target.value)}
              placeholder="(Tuỳ chọn) câu hỏi lượt trước — thử kịch bản hỏi nối tiếp, vd: ngành CNTT"
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              top-k
              <select value={k} onChange={(e) => setK(Number(e.target.value))} className="px-2 py-2 rounded-lg border border-slate-200 bg-white">
                {[1, 2, 3, 4, 5, 6, 8, 10].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <Nut onClick={chay} disabled={dang || !cau.trim()}>
              <Sparkles className="w-3.5 h-3.5" />
              {dang ? "Đang truy xuất…" : "Truy xuất"}
            </Nut>
          </div>
        </div>
        {loi && <p className="text-xs font-bold text-rose-700">{loi}</p>}
      </Khoi>

      {kq && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {kq.so_doan_vao_ngu_canh}/{kq.truy_xuat.length} đoạn vào ngữ cảnh
            </span>
            {kq.co_ghep_lich_su && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                Đã ghép lịch sử: “{kq.truy_van_thuc_te}”
              </span>
            )}
            {kq.lac_de && (
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-white">Bị coi là lạc đề — trả lời không có ngữ cảnh</span>
            )}
          </div>

          <Khoi tieuDe="Các đoạn lấy về" mota="Khoảng cách cosine: 0 là trùng khớp, càng lớn càng xa nghĩa.">
            <div className="space-y-2">
              {kq.truy_xuat.map((d, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border ${d.vao_ngu_canh ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white opacity-80"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-black">
                      <span className="text-slate-900">#{i + 1}</span>
                      <span className="text-slate-600">{String(d.meta.nganh ?? d.meta.tep ?? d.meta.loai ?? "")}</span>
                    </div>
                    <span className={`text-[10px] font-black ${d.vao_ngu_canh ? "text-[#0054A6]" : "text-slate-500"}`}>
                      {d.ly_do}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={d.vao_ngu_canh ? "h-full bg-[#0054A6]" : "h-full bg-slate-400"}
                        style={{ width: `${Math.min(100, (d.khoang_cach / xaNhat) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-black tabular-nums text-slate-700 w-12 text-right">
                      {so(d.khoang_cach)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2 line-clamp-3">{d.noi_dung}</p>
                </div>
              ))}
            </div>
          </Khoi>

          <Khoi tieuDe="Ngữ cảnh gửi cho model" mota={kq.nguon.length ? `Nguồn trích: ${kq.nguon.join(" · ")}` : "Không có nguồn nào."}>
            <pre className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 overflow-auto whitespace-pre-wrap max-h-80">
              {kq.ngu_canh_gui_cho_model || "(rỗng — model trả lời không dựa trên dữ liệu)"}
            </pre>
          </Khoi>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
function TabDo({ topK, sanSang }: { topK: number; sanSang: boolean }) {
  const [st, setSt] = useState<TrangThaiDo | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await RagService.trangThaiDo();
      setSt(r);
      setLoi(r.dang_chay.loi);
      // Đang chạy thì hỏi lại sau 2 giây cho tới khi xong
      if (r.dang_chay.dang_chay) hen.current = setTimeout(tai, 2000);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được kết quả đo."));
    }
  }, []);

  useEffect(() => {
    tai();
    return () => { if (hen.current) clearTimeout(hen.current); };
  }, [tai]);

  const batDau = async () => {
    try {
      await RagService.batDauDo(topK);
      await tai();
    } catch (e) {
      setLoi(loiApi(e, "Không chạy được lượt đo."));
    }
  };

  const dc = st?.dang_chay;
  const g = st?.gan_nhat;

  return (
    <div className="space-y-4">
      <Khoi
        tieuDe="Đo chất lượng truy hồi"
        mota="Chạy bộ câu hỏi gán nhãn tay (data/kiem_thu/truy_hoi.json) qua kho đang phục vụ. Có hai mốc đối chứng: tìm bằng từ khoá (TF-IDF) và bốc bừa."
        phai={
          <Nut onClick={batDau} disabled={!sanSang || !!dc?.dang_chay}>
            <Play className="w-3.5 h-3.5" />
            {dc?.dang_chay ? "Đang đo…" : "Chạy đo"}
          </Nut>
        }
      >
        {dc?.dang_chay && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span>Đang chạy câu {dc.xong}/{dc.tong || "…"}</span>
              <span>mỗi câu một lượt nhúng Gemini</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full bg-[#0054A6]"
                animate={{ width: dc.tong ? `${(dc.xong / dc.tong) * 100}%` : "4%" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            </div>
          </div>
        )}
        {loi && <p className="text-xs font-bold text-rose-700">{loi}</p>}
        {!g && !dc?.dang_chay && (
          <p className="text-xs text-slate-500 font-medium">Chưa có lượt đo nào. Bấm “Chạy đo” — mất khoảng một phút.</p>
        )}
      </Khoi>

      {g && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [`Precision@${g.k}`, so(g.tong.precision_k), `độ sạch của top-${g.k} lấy về`],
              [`Recall@${g.k}`, so(g.tong.recall_k), `từ khoá ${so(g.tong.tu_khoa_recall_k)} · bừa ${so(g.tong.bua_recall_k)}`],
              ["Context Precision", so(g.tong.context_precision), "phần đúng trong ngữ cảnh gửi model"],
              ["Context Recall", so(g.tong.context_recall), "phần cần có đã vào ngữ cảnh"],
            ].map(([k, v, p]) => (
              <div key={k} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase">{k}</div>
                <div className="text-2xl font-black tabular-nums text-slate-900">{v}</div>
                <div className="text-[10px] text-slate-500 font-medium">{p}</div>
              </div>
            ))}
          </div>

          {g.so_loi_nhung > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-[11px] font-bold text-slate-700 flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 shrink-0" />
              {g.so_loi_nhung} câu không nhúng được (lỗi mạng hoặc trần tần suất) và bị tính là trượt — con số thấp hơn thực tế, nên đo lại.
            </div>
          )}

          <Khoi
            tieuDe={`Theo mức độ khó · ${g.so_cau} câu · k = ${g.k}`}
            mota={`Đo lúc ${g.tao_luc.replace("T", " ")} trên kho ${g.kho?.so_chunk ?? "—"} chunk. Mức D không nêu tên ngành — chỗ tìm bằng từ khoá bó tay và tầng nhúng phải chứng minh giá trị.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
                  <tr>
                    <th className="pb-2 pr-3">Mức</th>
                    <th className="pb-2 pr-3 text-right">Câu</th>
                    <th className="pb-2 pr-3 text-right">P@{g.k}</th>
                    <th className="pb-2 pr-3 text-right">R@{g.k}</th>
                    <th className="pb-2 pr-3 text-right">Ctx P</th>
                    <th className="pb-2 pr-3 text-right">Ctx R</th>
                    <th className="pb-2 pr-3 text-right">Hit@1</th>
                    <th className="pb-2 pr-3 text-right">MRR</th>
                    <th className="pb-2 pr-3 text-right">R@{g.k} từ khoá</th>
                    <th className="pb-2 text-right">R@{g.k} bừa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...g.theo_muc.map((r) => ({ ...r, ten: r.muc, dam: false })), { ...g.tong, muc: "tong", mo_ta: "", ten: "TỔNG", dam: true }].map((r) => (
                    <tr key={r.muc} className={r.dam ? "bg-blue-50/50" : "hover:bg-slate-50/60"}>
                      <td className="py-2.5 pr-3 min-w-[12rem]">
                        <div className="font-black text-slate-900">{r.ten}</div>
                        {r.mo_ta && <div className="text-[10px] text-slate-500 font-medium">{r.mo_ta}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.n}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{so(r.precision_k)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-black">{so(r.recall_k)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{so(r.context_precision)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-black">{so(r.context_recall)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{pt(r.hit1)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{so(r.mrr)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">{so(r.tu_khoa_recall_k)}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-500">{so(r.bua_recall_k)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Precision@k và Recall@k theo công thức (7), (8) của báo cáo tuần 1; Context Precision/Recall tính trên
              các đoạn thật sự vào prompt sau ngưỡng lạc đề và biên độ. Câu chỉ có một ngành đúng thì Precision@{g.k} tối
              đa là {so(1 / g.k, 2)} — đọc cùng Recall@{g.k}. Đáp án biết chắc nên chấm thẳng, không cần LLM chấm như RAGAS.
              Tầng sinh (Faithfulness, Answer Relevancy) đo riêng bằng <code>scripts/kiem_rag.py</code>.
            </p>
          </Khoi>

          <Khoi tieuDe="Câu có đoạn đúng không đứng hạng nhất" mota="Chỗ nên xem đầu tiên khi muốn cải thiện chunk hoặc bổ sung tài liệu.">
            {g.cau_truot.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">Không có — mọi câu đều lấy đúng đoạn ở hạng nhất.</p>
            ) : (
              <div className="space-y-2">
                {g.cau_truot.map((x, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">“{x.hoi}”</span>
                      <span className="text-[10px] font-black text-slate-500">
                        {x.muc} · {x.hang ? `hạng ${x.hang}` : `không có trong top-${g.k}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      Lấy về đầu: <strong className="text-slate-700">{x.lay_ve_dau?.ten ?? "—"}</strong>
                      {x.khoang_cach_dau != null && ` (${so(x.khoang_cach_dau)})`} · Đáp án:{" "}
                      {x.dap_an.map((d) => d.ten ?? d.ma).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Khoi>

          {st && st.lich_su.length > 1 && (
            <Khoi tieuDe="Các lần đo trước" mota="So sau mỗi lần thêm tài liệu hoặc chỉnh chunk.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-slate-200">
                    <tr>
                      <th className="pb-2 pr-3">Lúc</th>
                      <th className="pb-2 pr-3 text-right">Chunk</th>
                      <th className="pb-2 pr-3 text-right">P@k</th>
                      <th className="pb-2 pr-3 text-right">R@k</th>
                      <th className="pb-2 pr-3 text-right">Ctx P</th>
                      <th className="pb-2 pr-3 text-right">Ctx R</th>
                      <th className="pb-2 text-right">Lỗi nhúng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {st.lich_su.map((h, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 font-bold text-slate-700">{h.tao_luc?.replace("T", " ")} · k={h.k}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{h.so_chunk ?? "—"}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{so(h.tong?.precision_k)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-black">{so(h.tong?.recall_k)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{so(h.tong?.context_precision)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-black">{so(h.tong?.context_recall)}</td>
                        <td className="py-2 text-right tabular-nums">{h.so_loi_nhung}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Khoi>
          )}
        </>
      )}

      {!st && !loi && <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />}
      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
        <Layers className="w-3.5 h-3.5" /> Chạy tay cùng số liệu: <code>python scripts/kiem_truy_hoi.py</code>
      </div>
    </div>
  );
}
