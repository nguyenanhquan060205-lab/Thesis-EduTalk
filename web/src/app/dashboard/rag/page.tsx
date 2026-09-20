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
  da_nap: { chu: "Đã nạp", lop: "dash-badge-blue" },
  chua_nap: { chu: "Chưa nạp", lop: "dash-badge-amber" },
  co_thay_doi: { chu: "Có thay đổi", lop: "dash-badge-amber" },
  bi_bo_qua: { chu: "Bị bỏ qua", lop: "dash-badge-red" },
  rong: { chu: "Rỗng", lop: "dash-badge-gray" },
};

function loiApi(e: unknown, macDinh: string): string {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || macDinh;
}

/** Khối có tiêu đề */
function Khoi({ tieuDe, mota, children, phai }: {
  tieuDe: string; mota?: string; children: React.ReactNode; phai?: React.ReactNode;
}) {
  return (
    <div className="dash-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black" style={{ color: "var(--dash-text)" }}>{tieuDe}</h3>
          {mota && <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--dash-text-muted)" }}>{mota}</p>}
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
    <span className={`dash-badge whitespace-nowrap ${x.lop}`}>
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
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        phu ? "dash-btn" : "dash-btn dash-btn-primary"
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
          <span>{loi}</span>
        </div>
      </div>
    );
  }

  if (!tt || !kk) {
    return (
      <div className="dash-empty min-h-[60vh]">
        <Database className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải thông tin kho tri thức…
        </p>
      </div>
    );
  }

  // Hai luồng đúng như báo cáo tuần 3: xây kho (offline, 4 bước) và trả lời (online).
  const soTepMd = kk.tai_lieu.filter((t) => t.trang_thai !== "bi_bo_qua").length;
  const luong = [
    {
      ten: "Xây dựng kho tri thức",
      phu: "offline · scripts/nap_kho.py",
      buoc: [
        { ten: "1. Thu thập", chi: `${tt.nguon_co_cau_truc.so_nganh} ngành từ JSON · ${soTepMd} tệp .md` },
        { ten: "2. Làm sạch", chi: "tách metadata đầu tệp · khử trùng SHA-256" },
        { ten: "3. Chunking", chi: `theo ngữ nghĩa · ≤ ${tt.chunking.tu_toi_da} từ · lấn ${tt.chunking.tu_chong_lan} từ` },
        { ten: "4. Embedding", chi: `${tt.model_nhung?.replace("models/", "") ?? "—"} · ${tt.so_chieu ?? "—"} chiều · Chroma` },
      ],
    },
    {
      ten: "Trả lời một câu hỏi",
      phu: "online · mỗi lượt chat",
      buoc: [
        { ten: "1. Truy hồi", chi: `cosine · top-${tt.nguong.top_k} · lọc lạc đề > ${so(tt.nguong.lac_de, 2)}` },
        { ten: "2. Ghép ngữ cảnh", chi: `biên độ ${so(tt.nguong.bien_do, 2)} · prompt augment` },
        { ten: "3. Sinh câu trả lời", chi: "Gemini · dựa trên ngữ cảnh được cấp" },
        { ten: "4. Trích dẫn", chi: "nhãn nguồn tới cấp mục, kèm năm" },
      ],
    },
  ];

  return (
    <div className="dash-page space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="border-b pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4" style={{ borderColor: "var(--dash-border)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--dash-active-bg)", color: "var(--dash-accent)" }}
          >
            <Database size={20} />
          </div>
          <div>
            <div className="dash-section-label mb-1">Kho tri thức · RAG Knowledge Base</div>
            <h1 className="dash-page-title">
              Quản Lý RAG Của Trợ Lý EduTalk
            </h1>
            <p className="text-xs font-medium mt-1 max-w-3xl" style={{ color: "var(--dash-text-muted)" }}>
              Nguồn gốc là file trong <code>backend/data/</code>; Chroma chỉ là
              index dựng lại từ artifact <code>kho.json</code>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="dash-badge dash-badge-blue">
            {tt.san_sang ? `Đang phục vụ · ${tt.so_chunk} chunk` : "Kho chưa dựng"}
          </span>
          <Nut onClick={napLai} disabled={dangNap}>
            <RefreshCw className={`w-3.5 h-3.5 ${dangNap ? "animate-spin" : ""}`} />
            Nạp lại index
          </Nut>
        </div>
      </div>

      {thongBao && (
        <div
          className="p-3.5 rounded-xl border text-xs font-bold"
          style={{
            background: "var(--dash-active-bg)",
            borderColor: "var(--dash-active-border)",
            color: "var(--dash-accent)",
          }}
        >
          {thongBao}
        </div>
      )}

      {(kk.lech_index || kk.can_nap_lai) && (
        <div
          className="dash-card-2 p-4 flex items-start gap-3"
          style={{ borderColor: "rgba(245,158,11,0.3)" }}
        >
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <div className="text-[11px] font-medium leading-relaxed space-y-1" style={{ color: "var(--dash-text-muted)" }}>
            {kk.can_nap_lai && (
              <p>
                <strong style={{ color: "var(--dash-text)" }}>Có nguồn đã sửa nhưng chưa nhúng.</strong> Chatbot đang trả lời
                bằng nội dung cũ. Chạy <code>python scripts/nap_kho.py</code> rồi bấm Nạp lại.
              </p>
            )}
            {kk.lech_index && (
              <p>
                <strong style={{ color: "var(--dash-text)" }}>Artifact trên đĩa mới hơn index đang phục vụ</strong> (dựng lúc{" "}
                {kk.artifact?.tao_luc}). Bấm Nạp lại để dùng bản mới.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hai luồng của pipeline RAG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {luong.map((l) => (
          <div key={l.ten} className="dash-card space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs font-black" style={{ color: "var(--dash-text)" }}>{l.ten}</div>
              <div className="text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>{l.phu}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {l.buoc.map((b) => (
                <motion.div
                  key={b.ten}
                  whileHover={giam ? undefined : { y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="dash-card-2 p-3"
                >
                  <div className="text-[10px] font-black" style={{ color: "var(--dash-accent)" }}>{b.ten}</div>
                  <div className="text-[11px] font-medium leading-snug mt-1" style={{ color: "var(--dash-text-muted)" }}>{b.chi}</div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b" style={{ borderColor: "var(--dash-border)" }}>
        {TABS.map(({ id, nhan, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="relative inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-black transition-colors cursor-pointer"
            style={{ color: tab === id ? "var(--dash-accent)" : "var(--dash-text-muted)" }}
          >
            <Icon className="w-4 h-4" />
            {nhan}
            {tab === id && (
              <motion.span
                layoutId="gach-tab-rag"
                className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                style={{ background: "var(--dash-accent)" }}
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
          mota="Code tự viết mỗi ngành thành một đoạn văn tự chứa đủ nghĩa rồi mới nhúng."
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-black" style={{ color: "var(--dash-text)" }}>{kk.co_cau_truc.so_nganh} ngành</div>
              <div className="text-[11px] font-medium" style={{ color: "var(--dash-text-muted)" }}>{kk.co_cau_truc.nguon}</div>
            </div>
            <div className="text-right space-y-1">
              <ChipTrangThai tt={kk.co_cau_truc.trang_thai} />
              <div className="text-[11px] font-bold tabular-nums" style={{ color: "var(--dash-text-faint)" }}>
                {kk.co_cau_truc.da_nap}/{kk.co_cau_truc.so_chunk} chunk trong kho
              </div>
            </div>
          </div>
        </Khoi>

        <Khoi tieuDe="Artifact và index" mota="Artifact là file đi theo git; index là bản Chroma đang phục vụ.">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Chunk trong artifact", kk.artifact?.so_chunk?.toLocaleString("vi-VN") ?? "—"],
              ["Dung lượng", kk.artifact ? `${kk.artifact.dung_luong_kb.toLocaleString("vi-VN")} KB` : "—"],
              ["Artifact dựng lúc", kk.artifact?.tao_luc?.replace("T", " ") ?? "—"],
              ["Index đang phục vụ", kk.index.tao_luc?.replace("T", " ") ?? "chưa nạp"],
            ].map(([k, v]) => (
              <div key={k} className="dash-card-2 p-3">
                <div className="dash-section-label">{k}</div>
                <div className="font-black tabular-nums mt-0.5" style={{ color: "var(--dash-text)" }}>{v}</div>
              </div>
            ))}
          </div>
        </Khoi>
      </div>

      <Khoi
        tieuDe="Độ phủ theo loại tài liệu văn xuôi"
        mota="Loại lấy theo tên thư mục trong data/kho_tri_thuc/."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {kk.theo_loai.map((l) => (
            <div
              key={l.loai}
              className="dash-card-2 p-3"
              style={l.so_tep === 0 ? { borderStyle: "dashed" } : {}}
            >
              <div className="flex items-center justify-between gap-2">
                <code className="font-black" style={{ color: "var(--dash-text)" }}>{l.loai}/</code>
                <span className="text-[10px] font-black tabular-nums" style={{ color: "var(--dash-text-faint)" }}>
                  {l.so_tep} tệp · {l.so_chunk_trong_kho} chunk
                </span>
              </div>
              <div className="text-[11px] font-medium mt-1 leading-snug" style={{ color: "var(--dash-text-muted)" }}>{l.mo_ta}</div>
            </div>
          ))}
        </div>
      </Khoi>

      <Khoi
        tieuDe="Tệp văn xuôi (.md)"
        mota={`So băm từng chunk với artifact. Trường bắt buộc: ${kk.truong_bat_buoc.join(", ")}.`}
      >
        {kk.tai_lieu.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-2 text-center" style={{ color: "var(--dash-text-faint)" }}>
            <FileText className="w-7 h-7" />
            <p className="text-xs font-bold">Chưa có tài liệu văn xuôi nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Tệp</th>
                  <th>Năm · nguồn</th>
                  <th style={{ textAlign: "right" }}>Chunk</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {kk.tai_lieu.map((t) => (
                  <tr key={t.tep}>
                    <td className="py-2.5 pr-3">
                      <code className="font-bold" style={{ color: "var(--dash-text)" }}>{t.tep}</code>
                      <div className="text-[10px] font-medium" style={{ color: "var(--dash-text-faint)" }}>sửa {t.sua_luc.replace("T", " ")}</div>
                    </td>
                    <td className="py-2.5 pr-3 font-medium min-w-[12rem]" style={{ color: "var(--dash-text-muted)" }}>
                      {t.meta?.nam ?? "—"} · {t.meta?.nguon ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums font-black whitespace-nowrap" style={{ color: "var(--dash-text)" }}>
                      {t.so_chunk != null ? `${t.da_nap}/${t.so_chunk}` : "—"}
                      {!!t.chunk_trung && (
                        <div className="text-[10px]" style={{ color: "var(--dash-text-faint)" }}>{t.chunk_trung} trùng bị bỏ</div>
                      )}
                    </td>
                    <td className="py-2.5">
                      <ChipTrangThai tt={t.trang_thai} />
                      {t.ly_do && <div className="text-[10px] font-medium mt-1" style={{ color: "var(--dash-text-muted)" }}>{t.ly_do}</div>}
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
    const h = setTimeout(() => tai(tim, loai, trang), 250);
    return () => clearTimeout(h);
  }, [tim, loai, trang, tai]);

  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  return (
    <Khoi tieuDe="Duyệt chunk trong kho" mota="Tìm không dấu được. Mỗi chunk là một đoạn nhúng độc lập.">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--dash-text-faint)" }} />
          <input
            value={tim}
            onChange={(e) => { setTim(e.target.value); setTrang(1); }}
            placeholder="Tìm theo nội dung hoặc metadata, vd: cong nghe thong tin"
            className="dash-input w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>
        <select
          value={loai}
          onChange={(e) => { setLoai(e.target.value); setTrang(1); }}
          className="dash-input px-3 py-2 text-xs font-bold cursor-pointer"
        >
          <option value="">Mọi loại</option>
          {loaiCo.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {loi && <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{loi}</p>}
      <div className="text-[11px] font-bold" style={{ color: "var(--dash-text-faint)" }}>
        {tong.toLocaleString("vi-VN")} chunk khớp
      </div>

      <div className="space-y-2">
        {ds === null
          ? [0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--dash-surface-2)" }} />)
          : ds.map((c) => (
              <div key={c.id} className="dash-card p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMo(mo === c.id ? null : c.id)}
                  className="w-full p-3.5 flex items-start justify-between gap-3 text-left cursor-pointer transition"
                  style={{ background: "var(--dash-surface)" }}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-[11px] font-black" style={{ color: "var(--dash-text)" }}>{c.id}</code>
                      <span className="dash-badge dash-badge-blue">
                        {String(c.meta.loai ?? "—")}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>{c.so_tu} từ</span>
                    </div>
                    <p className={`text-xs font-medium leading-relaxed ${mo === c.id ? "" : "line-clamp-2"}`} style={{ color: "var(--dash-text-muted)" }}>
                      {c.noi_dung}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${mo === c.id ? "rotate-180" : ""}`} style={{ color: "var(--dash-text-faint)" }} />
                </button>
                {mo === c.id && (
                  <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
                    {Object.entries(c.meta).map(([k, v]) => (
                      <div key={k} className="dash-card-2 flex justify-between gap-3 px-2.5 py-1.5">
                        <span className="font-bold" style={{ color: "var(--dash-text-faint)" }}>{k}</span>
                        <span className="font-semibold text-right break-all" style={{ color: "var(--dash-text)" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
      </div>

      {soTrang > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs font-bold pt-2">
          <Nut phu disabled={trang <= 1} onClick={() => setTrang(trang - 1)}>Trước</Nut>
          <span className="tabular-nums" style={{ color: "var(--dash-text-faint)" }}>{trang}/{soTrang}</span>
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
        mota="Xem đúng đoạn nào được lấy về, khoảng cách bao nhiêu, đoạn nào bị ngưỡng loại."
      >
        <div className="space-y-2">
          <textarea
            value={cau}
            onChange={(e) => setCau(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) chay(); }}
            rows={2}
            placeholder="Vd: em thích lập trình và muốn làm game thì nên học ngành gì?"
            className="dash-input w-full p-3 text-xs font-medium"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={cauTruoc}
              onChange={(e) => setCauTruoc(e.target.value)}
              placeholder="(Tuỳ chọn) câu hỏi lượt trước — thử kịch bản hỏi nối tiếp, vd: ngành CNTT"
              className="dash-input flex-1 px-3 py-2 text-xs font-medium"
            />
            <label className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--dash-text-muted)" }}>
              top-k
              <select value={k} onChange={(e) => setK(Number(e.target.value))} className="dash-input px-2 py-1.5 font-bold">
                {[1, 2, 3, 4, 5, 6, 8, 10].map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <Nut onClick={chay} disabled={dang || !cau.trim()}>
              <Sparkles className="w-3.5 h-3.5" />
              {dang ? "Đang truy xuất…" : "Truy xuất"}
            </Nut>
          </div>
        </div>
        {loi && <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{loi}</p>}
      </Khoi>

      {kq && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="dash-badge dash-badge-gray">
              {kq.so_doan_vao_ngu_canh}/{kq.truy_xuat.length} đoạn vào ngữ cảnh
            </span>
            {kq.co_ghep_lich_su && (
              <span className="dash-badge dash-badge-blue">
                Đã ghép lịch sử: “{kq.truy_van_thuc_te}”
              </span>
            )}
            {kq.lac_de && (
              <span className="dash-badge dash-badge-red">Bị coi là lạc đề</span>
            )}
          </div>

          <Khoi tieuDe="Các đoạn lấy về" mota="Khoảng cách cosine: 0 là trùng khớp, càng lớn càng xa nghĩa.">
            <div className="space-y-2">
              {kq.truy_xuat.map((d, i) => (
                <div
                  key={i}
                  className="dash-card p-3.5"
                  style={d.vao_ngu_canh ? { borderColor: "var(--dash-accent)" } : { opacity: 0.7 }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-black">
                      <span style={{ color: "var(--dash-text)" }}>#{i + 1}</span>
                      <span style={{ color: "var(--dash-text-muted)" }}>{String(d.meta.nganh ?? d.meta.tep ?? d.meta.loai ?? "")}</span>
                    </div>
                    <span className={`text-[10px] font-black ${d.vao_ngu_canh ? "text-[#3B8FD4]" : ""}`} style={!d.vao_ngu_canh ? { color: "var(--dash-text-faint)" } : {}}>
                      {d.ly_do}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--dash-surface-2)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: d.vao_ngu_canh ? "var(--dash-accent)" : "var(--dash-text-faint)",
                          width: `${Math.min(100, (d.khoang_cach / xaNhat) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-black tabular-nums w-12 text-right" style={{ color: "var(--dash-text)" }}>
                      {so(d.khoang_cach)}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed mt-2 line-clamp-3" style={{ color: "var(--dash-text-muted)" }}>{d.noi_dung}</p>
                </div>
              ))}
            </div>
          </Khoi>

          <Khoi tieuDe="Ngữ cảnh gửi cho model" mota={kq.nguon.length ? `Nguồn trích: ${kq.nguon.join(" · ")}` : "Không có nguồn nào."}>
            <pre className="dash-card-2 p-3 text-[11px] overflow-auto whitespace-pre-wrap max-h-80" style={{ color: "var(--dash-text)" }}>
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
        mota="Chạy bộ câu hỏi gán nhãn tay qua kho đang phục vụ."
        phai={
          <Nut onClick={batDau} disabled={!sanSang || !!dc?.dang_chay}>
            <Play className="w-3.5 h-3.5" />
            {dc?.dang_chay ? "Đang đo…" : "Chạy đo"}
          </Nut>
        }
      >
        {dc?.dang_chay && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold" style={{ color: "var(--dash-text-muted)" }}>
              <span>Đang chạy câu {dc.xong}/{dc.tong || "…"}</span>
              <span>mỗi câu một lượt nhúng Gemini</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--dash-surface-2)" }}>
              <motion.div
                className="h-full"
                style={{ background: "var(--dash-accent)" }}
                animate={{ width: dc.tong ? `${(dc.xong / dc.tong) * 100}%` : "4%" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            </div>
          </div>
        )}
        {loi && <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{loi}</p>}
        {!g && !dc?.dang_chay && (
          <p className="text-xs font-medium" style={{ color: "var(--dash-text-muted)" }}>Chưa có lượt đo nào. Bấm “Chạy đo” — mất khoảng một phút.</p>
        )}
      </Khoi>

      {g && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [`Precision@${g.k}`, so(g.tong.precision_k), `độ sạch của top-${g.k}`],
              [`Recall@${g.k}`, so(g.tong.recall_k), `từ khoá ${so(g.tong.tu_khoa_recall_k)} · bừa ${so(g.tong.bua_recall_k)}`],
              ["Context Precision", so(g.tong.context_precision), "phần đúng trong prompt"],
              ["Context Recall", so(g.tong.context_recall), "phần cần có đã vào prompt"],
            ].map(([k, v, p]) => (
              <div key={k} className="dash-card p-4">
                <div className="dash-section-label">{k}</div>
                <div className="text-2xl font-black tabular-nums mt-0.5" style={{ color: "var(--dash-text)" }}>{v}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--dash-text-muted)" }}>{p}</div>
              </div>
            ))}
          </div>

          {g.so_loi_nhung > 0 && (
            <div
              className="dash-card-2 p-3.5 text-[11px] font-bold flex items-start gap-2 border"
              style={{ borderColor: "rgba(245,158,11,0.3)", color: "var(--dash-text)" }}
            >
              <TriangleAlert className="w-4 h-4 shrink-0" style={{ color: "#F59E0B" }} />
              {g.so_loi_nhung} câu không nhúng được (lỗi mạng hoặc tần suất) và bị tính là trượt.
            </div>
          )}

          <Khoi
            tieuDe={`Theo mức độ khó · ${g.so_cau} câu · k = ${g.k}`}
            mota={`Đo lúc ${g.tao_luc.replace("T", " ")} trên kho ${g.kho?.so_chunk ?? "—"} chunk.`}
          >
            <div className="overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Mức</th>
                    <th style={{ textAlign: "right" }}>Câu</th>
                    <th style={{ textAlign: "right" }}>P@{g.k}</th>
                    <th style={{ textAlign: "right" }}>R@{g.k}</th>
                    <th style={{ textAlign: "right" }}>Ctx P</th>
                    <th style={{ textAlign: "right" }}>Ctx R</th>
                    <th style={{ textAlign: "right" }}>Hit@1</th>
                    <th style={{ textAlign: "right" }}>MRR</th>
                    <th style={{ textAlign: "right" }}>R@{g.k} từ khoá</th>
                    <th style={{ textAlign: "right" }}>R@{g.k} bừa</th>
                  </tr>
                </thead>
                <tbody>
                  {[...g.theo_muc.map((r) => ({ ...r, ten: r.muc, dam: false })), { ...g.tong, muc: "tong", mo_ta: "", ten: "TỔNG", dam: true }].map((r) => (
                    <tr
                      key={r.muc}
                      style={r.dam ? { background: "var(--dash-active-bg)" } : {}}
                    >
                      <td className="py-2.5 pr-3 min-w-[12rem]">
                        <div className="font-black" style={{ color: "var(--dash-text)" }}>{r.ten}</div>
                        {r.mo_ta && <div className="text-[10px] font-medium" style={{ color: "var(--dash-text-faint)" }}>{r.mo_ta}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{r.n}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{so(r.precision_k)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-black" style={{ color: "var(--dash-accent)" }}>{so(r.recall_k)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{so(r.context_precision)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-black" style={{ color: "var(--dash-accent)" }}>{so(r.context_recall)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{pt(r.hit1)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{so(r.mrr)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text-faint)" }}>{so(r.tu_khoa_recall_k)}</td>
                      <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--dash-text-faint)" }}>{so(r.bua_recall_k)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Khoi>

          <Khoi tieuDe="Câu có đoạn đúng không đứng hạng nhất" mota="Chỗ nên xem đầu tiên khi muốn cải thiện chunk hoặc bổ sung tài liệu.">
            {g.cau_truot.length === 0 ? (
              <p className="text-xs font-medium" style={{ color: "var(--dash-text-muted)" }}>Không có — mọi câu đều lấy đúng đoạn ở hạng nhất.</p>
            ) : (
              <div className="space-y-2">
                {g.cau_truot.map((x, i) => (
                  <div key={i} className="dash-card-2 p-3 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold" style={{ color: "var(--dash-text)" }}>“{x.hoi}”</span>
                      <span className="text-[10px] font-black" style={{ color: "var(--dash-text-faint)" }}>
                        {x.muc} · {x.hang ? `hạng ${x.hang}` : `không có trong top-${g.k}`}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium" style={{ color: "var(--dash-text-muted)" }}>
                      Lấy về đầu: <strong style={{ color: "var(--dash-text)" }}>{x.lay_ve_dau?.ten ?? "—"}</strong>
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
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Lúc</th>
                      <th style={{ textAlign: "right" }}>Chunk</th>
                      <th style={{ textAlign: "right" }}>P@k</th>
                      <th style={{ textAlign: "right" }}>R@k</th>
                      <th style={{ textAlign: "right" }}>Ctx P</th>
                      <th style={{ textAlign: "right" }}>Ctx R</th>
                      <th style={{ textAlign: "right" }}>Lỗi nhúng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.lich_su.map((h, i) => (
                      <tr key={i}>
                        <td className="py-2.5 pr-3 font-bold" style={{ color: "var(--dash-text)" }}>
                          {h.tao_luc?.replace("T", " ")} · k={h.k}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{h.so_chunk ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{so(h.tong?.precision_k)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-black" style={{ color: "var(--dash-accent)" }}>{so(h.tong?.recall_k)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>{so(h.tong?.context_precision)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-black" style={{ color: "var(--dash-accent)" }}>{so(h.tong?.context_recall)}</td>
                        <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--dash-text-faint)" }}>{h.so_loi_nhung}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Khoi>
          )}
        </>
      )}

      {!st && !loi && <div className="h-40 rounded-2xl animate-pulse" style={{ background: "var(--dash-surface-2)" }} />}
      <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>
        <Layers className="w-3.5 h-3.5" /> Chạy tay cùng số liệu: <code>python scripts/kiem_truy_hoi.py</code>
      </div>
    </div>
  );
}
