"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CalendarClock,
  Check,
  GitBranch,
  MessageSquareText,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Star,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  HuanLuyenService,
  type CauHinhHuanLuyen,
  type ChamMoHinh,
  type KetQuaLuot,
  type PhienBan,
  type TongQuanHuanLuyen,
  type TrangThaiPhienBan,
} from "@/services/huanLuyen";
import { pt } from "@/services/modelMetrics";

const THU = [
  ["mon", "Thứ hai"], ["tue", "Thứ ba"], ["wed", "Thứ tư"], ["thu", "Thứ năm"],
  ["fri", "Thứ sáu"], ["sat", "Thứ bảy"], ["sun", "Chủ nhật"],
] as const;

const NHAN_PHIEN_BAN: Record<TrangThaiPhienBan, { chu: string; lop: string }> = {
  dang_phuc_vu: { chu: "Đang phục vụ", lop: "dash-badge-blue" },
  cho_duyet: { chu: "Chờ duyệt", lop: "dash-badge-amber" },
  luu_tru: { chu: "Lưu trữ", lop: "dash-badge-gray" },
  tu_choi: { chu: "Trượt kiểm định", lop: "dash-badge-red" },
};

const NHAN_LUOT: Record<KetQuaLuot, string> = {
  dang_chay: "Đang chạy",
  da_phuc_vu: "Đã đưa vào phục vụ",
  cho_duyet: "Chờ duyệt",
  tu_choi: "Trượt kiểm định",
  bo_qua: "Bỏ qua",
  loi: "Lỗi",
};

const NHAN_BUOC: Record<string, string> = {
  khoi_dong: "khởi động", gom_du_lieu: "gom phiếu phản hồi", huan_luyen: "huấn luyện",
  cham: "chấm trên tập test và phiếu giữ lại", luu_phien_ban: "lưu phiên bản",
  dua_vao_phuc_vu: "đưa vào phục vụ",
};

function loiApi(e: unknown, macDinh: string) {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || macDinh;
}

function thoiGian(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Hiệu hai tỉ lệ theo điểm phần trăm: 0.908, 0.906 → "+0,2" */
function chenh(a?: number | null, b?: number | null) {
  if (a == null || b == null) return "—";
  const d = (a - b) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}`;
}

function Khoi({ tieuDe, mota, Icon, children, phai }: {
  tieuDe: string; mota?: string; Icon: typeof Star; children: React.ReactNode; phai?: React.ReactNode;
}) {
  return (
    <div className="dash-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--dash-active-bg)", color: "var(--dash-accent)" }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black" style={{ color: "var(--dash-text)" }}>{tieuDe}</h3>
            {mota && <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--dash-text-muted)" }}>{mota}</p>}
          </div>
        </div>
        {phai}
      </div>
      {children}
    </div>
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
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer ${
        phu ? "dash-btn" : "dash-btn dash-btn-primary"
      }`}
    >
      {children}
    </motion.button>
  );
}

function OSo({ nhan, gt, phu }: { nhan: string; gt: React.ReactNode; phu?: string }) {
  return (
    <div className="dash-card-2 p-3.5">
      <div className="dash-section-label">{nhan}</div>
      <div className="text-lg font-black tabular-nums leading-tight mt-0.5" style={{ color: "var(--dash-text)" }}>{gt}</div>
      {phu && <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--dash-text-muted)" }}>{phu}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function RetrainPage() {
  const [d, setD] = useState<TongQuanHuanLuyen | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const [cfg, setCfg] = useState<CauHinhHuanLuyen | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangBam, setDangBam] = useState<string | null>(null);
  const hen = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await HuanLuyenService.tongQuan();
      setD(r);
      setCfg((c) => c ?? r.cau_hinh);
      setLoi(null);
      // Đang có lượt chạy thì hỏi lại sau 3 giây cho tới khi xong
      if (hen.current) clearTimeout(hen.current);
      if (r.dang_chay) hen.current = setTimeout(tai, 3000);
    } catch (e) {
      setLoi(loiApi(e, "Không tải được thông tin huấn luyện lại."));
    }
  }, []);

  useEffect(() => {
    tai();
    return () => { if (hen.current) clearTimeout(hen.current); };
  }, [tai]);

  const chayNgay = async () => {
    if (!window.confirm("Huấn luyện lại ngay với toàn bộ phiếu phản hồi hiện có? Mất khoảng vài chục giây; kết quả vẫn phải qua cổng kiểm định.")) return;
    setDangBam("chay");
    try {
      await HuanLuyenService.chayNgay();
      setThongBao("Đã bắt đầu huấn luyện lại — trang tự cập nhật khi xong.");
      await tai();
    } catch (e) {
      setThongBao(loiApi(e, "Không chạy được."));
    } finally {
      setDangBam(null);
    }
  };

  const phucVu = async (ma: string) => {
    const cau = ma === "goc"
      ? "Quay về mô hình gốc trong gói (mô hình đã báo cáo trong khoá luận)?"
      : `Đưa phiên bản ${ma} vào phục vụ người dùng ngay?`;
    if (!window.confirm(cau)) return;
    setDangBam(ma);
    try {
      await HuanLuyenService.phucVu(ma);
      setThongBao(ma === "goc" ? "Đã quay về mô hình gốc." : `Phiên bản ${ma} đang phục vụ.`);
      await tai();
    } catch (e) {
      setThongBao(loiApi(e, "Không đổi được phiên bản."));
    } finally {
      setDangBam(null);
    }
  };

  const luuCauHinh = async () => {
    if (!cfg) return;
    setDangLuu(true);
    try {
      const r = await HuanLuyenService.capNhatCauHinh(cfg);
      setThongBao(r.lich_tiep_theo ? `Đã lưu. Lần chạy tới: ${thoiGian(r.lich_tiep_theo)}.` : "Đã lưu. Huấn luyện theo lịch đang tắt.");
      await tai();
    } catch (e) {
      setThongBao(loiApi(e, "Không lưu được cấu hình."));
    } finally {
      setDangLuu(false);
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

  if (!d || !cfg) {
    return (
      <div className="dash-empty min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "var(--dash-accent)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--dash-text-faint)" }}>
          Đang tải thông tin huấn luyện lại…
        </p>
      </div>
    );
  }

  const tk = d.du_lieu_huan_luyen;
  const k = d.goc.diem_van_hanh;
  const dangPhucVu = d.phien_ban.find((v) => v.ma === d.phien_ban_dang_phuc_vu);
  const tongHuuIch = d.phan_hoi.co_danh_gia_goi_y || 0;
  const dg = d.danh_gia_app;
  const maxSao = Math.max(1, ...Object.values(dg.theo_sao));

  return (
    <div className="dash-page space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b" style={{ borderColor: "var(--dash-border)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--dash-active-bg)", color: "var(--dash-accent)" }}
          >
            <RefreshCw size={20} />
          </div>
          <div>
            <div className="dash-section-label mb-1">Vòng lặp phản hồi · Continuous Active Learning</div>
            <h1 className="dash-page-title">Huấn Luyện Lại Mô Hình</h1>
            <p className="text-xs font-medium mt-1 max-w-3xl" style={{ color: "var(--dash-text-muted)" }}>
              Người dùng cho biết ngành đã chọn hoặc đã đỗ → mô hình học lại theo chu kỳ với đúng cấu hình đã chốt
              → chỉ được đưa vào phục vụ khi không tụt trên tập test khoá và trên phiếu phản hồi giữ lại.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {d.phien_ban_dang_phuc_vu !== "goc" && (
            <Nut phu onClick={() => phucVu("goc")} disabled={!!dangBam}>
              <RotateCcw className="w-3.5 h-3.5" /> Quay về mô hình gốc
            </Nut>
          )}
          <Nut onClick={chayNgay} disabled={!!d.dang_chay || !!dangBam}>
            <Play className="w-3.5 h-3.5" /> {d.dang_chay ? "Đang huấn luyện…" : "Huấn luyện lại ngay"}
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

      {d.dang_chay && (
        <div
          className="dash-card flex items-center gap-3"
          style={{ borderColor: "var(--dash-accent)" }}
        >
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--dash-accent)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--dash-text)" }}>
            Đang huấn luyện lại · bắt đầu {thoiGian(d.dang_chay.bat_dau)} · bước:{" "}
            {NHAN_BUOC[d.lich_su.find((x) => x.ket_qua === "dang_chay")?.buoc ?? ""] ?? "đang chạy"}
          </span>
        </div>
      )}

      {/* 4 ô tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OSo
          nhan="Đang phục vụ"
          gt={d.phien_ban_dang_phuc_vu === "goc" ? "Mô hình gốc" : d.phien_ban_dang_phuc_vu}
          phu={dangPhucVu ? `từ ${thoiGian(dangPhucVu.phuc_vu_luc)}` : `chốt ${d.goc.ngay_chot}`}
        />
        <OSo
          nhan={`Tư vấn Top-${k.tu_van} · test`}
          gt={pt(dangPhucVu?.chi_so.ung_vien.test.tu_van ?? d.goc.test.tu_van)}
          phu={`khám phá Top-${k.kham_pha}: ${pt(dangPhucVu?.chi_so.ung_vien.test.kham_pha ?? d.goc.test.kham_pha)}`}
        />
        <OSo nhan="Nhãn dùng được" gt={tk.dung_duoc.toLocaleString("vi-VN")} phu={`${tk.nhan_moi} nhãn mới từ lần trước`} />
        <OSo nhan="Lần chạy tới" gt={d.lich_tiep_theo ? thoiGian(d.lich_tiep_theo) : "Đang tắt"} phu={`cần ≥ ${d.cau_hinh.nhan_toi_thieu} nhãn mới`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lịch & cổng kiểm định */}
        <Khoi
          tieuDe="Lịch và cổng kiểm định"
          mota="Giờ Việt Nam. Lượt theo lịch tự bỏ qua khi chưa đủ nhãn mới, nên đặt lịch dày cũng không huấn luyện vô ích."
          Icon={CalendarClock}
        >
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Chu kỳ</span>
              <select
                value={cfg.chu_ky}
                onChange={(e) => setCfg({ ...cfg, chu_ky: e.target.value as CauHinhHuanLuyen["chu_ky"] })}
                className="dash-input w-full font-bold cursor-pointer"
              >
                <option value="tat">Tắt</option>
                <option value="hang_ngay">Hằng ngày</option>
                <option value="hang_tuan">Hằng tuần</option>
                <option value="hang_thang">Hằng tháng</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Giờ chạy</span>
              <select
                value={cfg.gio}
                disabled={cfg.chu_ky === "tat"}
                onChange={(e) => setCfg({ ...cfg, gio: Number(e.target.value) })}
                className="dash-input w-full font-bold cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
              </select>
            </label>
            {cfg.chu_ky === "hang_tuan" && (
              <label className="space-y-1 col-span-2">
                <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Thứ</span>
                <select
                  value={cfg.thu}
                  onChange={(e) => setCfg({ ...cfg, thu: e.target.value as CauHinhHuanLuyen["thu"] })}
                  className="dash-input w-full font-bold cursor-pointer"
                >
                  {THU.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              </label>
            )}
            {cfg.chu_ky === "hang_thang" && (
              <label className="space-y-1 col-span-2">
                <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Ngày trong tháng</span>
                <select
                  value={cfg.ngay}
                  onChange={(e) => setCfg({ ...cfg, ngay: Number(e.target.value) })}
                  className="dash-input w-full font-bold cursor-pointer"
                >
                  {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Ngày {i + 1}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Nhãn mới tối thiểu</span>
              <input
                type="number"
                min={1}
                value={cfg.nhan_toi_thieu}
                onChange={(e) => setCfg({ ...cfg, nhan_toi_thieu: Math.max(1, Number(e.target.value)) })}
                className="dash-input w-full font-bold tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Phiếu giữ lại tối thiểu</span>
              <input
                type="number"
                min={5}
                value={cfg.giu_lai_toi_thieu}
                onChange={(e) => setCfg({ ...cfg, giu_lai_toi_thieu: Math.max(5, Number(e.target.value)) })}
                className="dash-input w-full font-bold tabular-nums"
              />
            </label>
            <label className="space-y-1">
              <span className="font-bold" style={{ color: "var(--dash-text-muted)" }}>Dung sai được tụt (%)</span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={cfg.dung_sai_diem}
                onChange={(e) => setCfg({ ...cfg, dung_sai_diem: Math.min(10, Math.max(0, Number(e.target.value))) })}
                className="dash-input w-full font-bold tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 pt-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cfg.tu_dong_phuc_vu}
                onChange={(e) => setCfg({ ...cfg, tu_dong_phuc_vu: e.target.checked })}
                className="w-4 h-4 accent-[#0054A6]"
              />
              <span className="font-bold" style={{ color: "var(--dash-text)" }}>Qua cổng thì tự phục vụ</span>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: "var(--dash-border-subtle)" }}>
            <p className="text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
              Cổng: tư vấn Top-{k.tu_van} và khám phá Top-{k.kham_pha} không tụt quá dung sai.
            </p>
            <Nut onClick={luuCauHinh} disabled={dangLuu}>
              <Check className="w-3.5 h-3.5" /> Lưu
            </Nut>
          </div>
        </Khoi>

        {/* Dữ liệu phản hồi cho huấn luyện */}
        <Khoi
          tieuDe="Nhãn phản hồi cho huấn luyện"
          mota="Mỗi phiếu nặng ngang một dòng dữ liệu gốc — vài chục phiếu chỉ nhích mô hình rất ít, đúng như mong muốn."
          Icon={Users}
        >
          <div className="grid grid-cols-3 gap-2">
            <OSo nhan="Có nhãn" gt={tk.tong_nhan} />
            <OSo nhan="Dùng để học" gt={tk.hoc} />
            <OSo nhan="Giữ lại để đo" gt={tk.giu_lai} />
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="dash-section-label">Bị loại và vì sao</div>
            {[
              ["Không có điểm thi", tk.loai_khong_diem],
              ["Hồ sơ thiếu giới tính", tk.loai_thieu_gioi_tinh],
              ["Trùng người — giữ phiếu mới nhất", tk.loai_trung_nguoi],
              ["Dữ liệu không hợp lệ", tk.loai_khong_hop_le],
            ].map(([n, v]) => (
              <div
                key={n as string}
                className="flex justify-between gap-3 px-3 py-1.5 rounded-lg border"
                style={{
                  background: "var(--dash-surface-2)",
                  borderColor: "var(--dash-border-subtle)",
                }}
              >
                <span className="font-medium" style={{ color: "var(--dash-text-muted)" }}>{n}</span>
                <span className="font-black tabular-nums" style={{ color: "var(--dash-text)" }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {Object.entries(tk.theo_trang_thai).map(([t, n]) => (
              <span
                key={t}
                className="dash-badge dash-badge-blue"
              >
                {({ da_do: "Đã trúng tuyển", dang_hoc: "Đang học", du_dinh: "Dự định", khong_ro: "Không rõ" } as Record<string, string>)[t] ?? t}: {n}
              </span>
            ))}
          </div>
        </Khoi>
      </div>

      {/* Phiên bản */}
      <Khoi
        tieuDe="Phiên bản mô hình"
        mota="Lưu trong cơ sở dữ liệu, không mất khi server khởi động lại. Chỉ số so với mô hình đang phục vụ tại thời điểm huấn luyện."
        Icon={GitBranch}
      >
        {d.phien_ban.length === 0 ? (
          <p className="text-xs font-medium" style={{ color: "var(--dash-text-muted)" }}>
            Chưa có phiên bản huấn luyện lại nào — đang phục vụ mô hình gốc (tư vấn Top-{k.tu_van} {pt(d.goc.test.tu_van)},
            khám phá Top-{k.kham_pha} {pt(d.goc.test.kham_pha)} trên tập test).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th style={{ textAlign: "right" }}>Phiếu học</th>
                  <th style={{ textAlign: "right" }}>Test · tư vấn@{k.tu_van}</th>
                  <th style={{ textAlign: "right" }}>Test · khám phá@{k.kham_pha}</th>
                  <th style={{ textAlign: "right" }}>Giữ lại · tư vấn / khám phá</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.phien_ban.map((v: PhienBan) => {
                  const u = v.chi_so.ung_vien, h = v.chi_so.hien_tai;
                  const giu = (x: ChamMoHinh) => (x.n ? `${pt(x.tu_van)} / ${pt(x.kham_pha)}` : "—");
                  return (
                    <tr
                      key={v.ma}
                      style={v.trang_thai === "dang_phuc_vu" ? { background: "var(--dash-active-bg)" } : {}}
                    >
                      <td className="py-2.5 pr-3">
                        <code className="font-black" style={{ color: "var(--dash-text)" }}>{v.ma}</code>
                        <div className="text-[10px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
                          {thoiGian(v.tao_luc)} · so với {v.chi_so.phien_ban_so_sanh}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums" style={{ color: "var(--dash-text)" }}>
                        {v.du_lieu.n_phan_hoi_hoc}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        <span className="font-black" style={{ color: "var(--dash-text)" }}>{pt(u.test.tu_van)}</span>{" "}
                        <span className="text-[10px]" style={{ color: "var(--dash-text-faint)" }}>({chenh(u.test.tu_van, h.test.tu_van)})</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        <span className="font-black" style={{ color: "var(--dash-text)" }}>{pt(u.test.kham_pha)}</span>{" "}
                        <span className="text-[10px]" style={{ color: "var(--dash-text-faint)" }}>({chenh(u.test.kham_pha, h.test.kham_pha)})</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        <span style={{ color: "var(--dash-text)" }}>{giu(u.giu_lai)}</span>
                        <div className="text-[10px]" style={{ color: "var(--dash-text-faint)" }}>hiện tại {giu(h.giu_lai)} · n={u.giu_lai.n}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`dash-badge ${NHAN_PHIEN_BAN[v.trang_thai].lop}`}>
                          {NHAN_PHIEN_BAN[v.trang_thai].chu}
                        </span>
                        {!v.cong.du_phieu_giu_lai && (
                          <div className="text-[10px] mt-1" style={{ color: "var(--dash-text-faint)" }}>chưa đủ phiếu giữ lại</div>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {(v.trang_thai === "cho_duyet" || v.trang_thai === "luu_tru") && (
                          <Nut phu onClick={() => phucVu(v.ma)} disabled={!!dangBam}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Phục vụ
                          </Nut>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Khoi>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Đánh giá app */}
        <Khoi tieuDe="Đánh giá EduTalk" mota="Hỏi sau lần tư vấn đầu tiên. Không dùng để huấn luyện — chỉ để biết trải nghiệm." Icon={Star}>
          <div className="flex items-center gap-5">
            <div className="text-center shrink-0">
              <div className="text-4xl font-black tabular-nums" style={{ color: "var(--dash-text)" }}>
                {dg.trung_binh != null ? dg.trung_binh.toFixed(1).replace(".", ",") : "—"}
              </div>
              <div className="text-[10px] font-bold" style={{ color: "var(--dash-text-muted)" }}>{dg.so_luot} lượt đánh giá</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((s) => (
                <div key={s} className="flex items-center gap-2 text-[11px] font-bold" style={{ color: "var(--dash-text-muted)" }}>
                  <span className="inline-flex w-8 items-center gap-0.5 tabular-nums">
                    {s}
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden />
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--dash-surface-2)" }}>
                    <div className="h-full rounded-full" style={{ background: "var(--dash-accent)", width: `${(dg.theo_sao[String(s)] / maxSao) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right tabular-nums">{dg.theo_sao[String(s)]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {dg.y_kien_gan_day.length === 0 ? (
              <p className="text-xs font-medium" style={{ color: "var(--dash-text-faint)" }}>Chưa có ý kiến nào.</p>
            ) : (
              dg.y_kien_gan_day.map((y, i) => (
                <div
                  key={i}
                  className="dash-card-2 p-3"
                >
                  <div className="flex justify-between text-[10px] font-bold" style={{ color: "var(--dash-text-faint)" }}>
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3 h-3 ${n <= y.sao ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200 opacity-40"}`}
                        />
                      ))}
                    </span>
                    <span>{thoiGian(y.updatedAt)} · {y.nguon ?? "web"}</span>
                  </div>
                  <p className="text-xs font-medium mt-1" style={{ color: "var(--dash-text)" }}>{y.y_kien}</p>
                </div>
              ))
            )}
          </div>
        </Khoi>

        {/* Gợi ý có hữu ích */}
        <Khoi tieuDe="Gợi ý có sát không" mota={`Người dùng tự chấm từng lượt tư vấn. ${d.phan_hoi.so_luot_tu_van.toLocaleString("vi-VN")} lượt đã lưu, ${tongHuuIch} lượt được chấm.`} Icon={MessageSquareText}>
          <div className="space-y-2">
            {[["co", "Có, khá sát"], ["mot_phan", "Một phần"], ["khong", "Chưa sát"]].map(([khoa, nhan]) => {
              const n = d.phan_hoi.goi_y_huu_ich[khoa] ?? 0;
              return (
                <div key={khoa} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold" style={{ color: "var(--dash-text)" }}>
                    <span>{nhan}</span>
                    <span className="tabular-nums">{n} · {tongHuuIch ? pt(n / tongHuuIch) : "—"}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--dash-surface-2)" }}>
                    <div className="h-full rounded-full" style={{ background: "var(--dash-accent)", width: tongHuuIch ? `${(n / tongHuuIch) * 100}%` : "0%" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] font-medium" style={{ color: "var(--dash-text-faint)" }}>
            Đây là cảm nhận của người dùng, không phải độ chính xác — độ chính xác thật chỉ đo được khi biết ngành họ đã chọn.
          </p>
        </Khoi>
      </div>

      {/* Lịch sử chạy */}
      <Khoi tieuDe="Lịch sử các lượt huấn luyện" mota="20 lượt gần nhất, cả lượt theo lịch lẫn lượt admin bấm." Icon={RefreshCw}>
        {d.lich_su.length === 0 ? (
          <p className="text-xs font-medium" style={{ color: "var(--dash-text-faint)" }}>Chưa có lượt nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Bắt đầu</th>
                  <th>Kích hoạt</th>
                  <th>Kết quả</th>
                  <th>Lý do</th>
                  <th style={{ textAlign: "right" }}>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {d.lich_su.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2.5 pr-3 font-bold whitespace-nowrap" style={{ color: "var(--dash-text)" }}>
                      {thoiGian(x.bat_dau)}
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: "var(--dash-text-muted)" }}>
                      {x.kich_hoat === "lich" ? "Theo lịch" : "Admin bấm"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`dash-badge ${
                        x.ket_qua === "da_phuc_vu" ? "dash-badge-blue"
                          : x.ket_qua === "loi" || x.ket_qua === "tu_choi" ? "dash-badge-red"
                          : "dash-badge-gray"
                      }`}>
                        {NHAN_LUOT[x.ket_qua]}
                      </span>
                      {x.phien_ban && <div className="text-[10px] mt-1" style={{ color: "var(--dash-text-faint)" }}><code>{x.phien_ban}</code></div>}
                    </td>
                    <td className="py-2.5 pr-3 font-medium min-w-[16rem]" style={{ color: "var(--dash-text-muted)" }}>
                      {x.ket_qua === "loi" && <TriangleAlert className="w-3.5 h-3.5 inline mr-1" style={{ color: "#EF4444" }} />}
                      {x.ly_do ?? (x.buoc ? `đang ${NHAN_BUOC[x.buoc] ?? x.buoc}` : "—")}
                    </td>
                    <td className="py-2.5 text-right tabular-nums" style={{ color: "var(--dash-text-faint)" }}>
                      {x.giay != null ? `${x.giay} s` : "—"}
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
