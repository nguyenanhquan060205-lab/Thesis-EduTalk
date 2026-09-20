"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, GraduationCap, MessageSquareText, Pencil, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { PredictService, type CatalogField } from "@/services/predict";
import {
  NHAN_TRANG_THAI_NGANH,
  PhanHoiService,
  type GoiYHuuIch,
  type PhanHoiDuDoan,
  type TrangThaiNganh,
} from "@/services/phanHoi";

// Trang lịch sử có nhiều thẻ cùng lúc — tải danh mục ngành đúng một lần cho cả trang
let _catalog: Promise<CatalogField[]> | null = null;
function layCatalog() {
  if (!_catalog) {
    _catalog = PredictService.catalog()
      .then((d) => d.fields)
      .catch((e) => {
        _catalog = null;
        throw e;
      });
  }
  return _catalog;
}

const LUA_CHON_HUU_ICH: { gt: GoiYHuuIch; nhan: string; Icon: typeof ThumbsUp }[] = [
  { gt: "co", nhan: "Có, khá sát", Icon: ThumbsUp },
  { gt: "mot_phan", nhan: "Một phần", Icon: MessageSquareText },
  { gt: "khong", nhan: "Chưa sát", Icon: ThumbsDown },
];

const nutSpring = { type: "spring" as const, stiffness: 300, damping: 28 };

/**
 * Phản hồi cho MỘT lượt tư vấn đã lưu: gợi ý có hữu ích không + ngành đã chọn / đã đỗ.
 *
 * Nhãn ngành là dữ liệu cho vòng lặp huấn luyện lại, và thường chỉ biết SAU kỳ xét tuyển —
 * nên cùng component này xuất hiện ở trang kết quả (ngay sau khi tư vấn) và ở trang lịch sử
 * (`gonGang`, quay lại cập nhật lúc nào cũng được).
 */
export function PhanHoiGoiY({
  predictionId,
  goiY,
  banDau,
  gonGang = false,
}: {
  predictionId?: string | null;
  goiY: { code: string; name: string }[];
  banDau?: PhanHoiDuDoan | null;
  gonGang?: boolean;
}) {
  const giam = useReducedMotion();
  const [huuIch, setHuuIch] = useState<GoiYHuuIch | null>(banDau?.goi_y_huu_ich ?? null);
  const [nhanDaLuu, setNhanDaLuu] = useState<{ ma: string; tt: TrangThaiNganh | null } | null>(
    banDau?.nganh_da_chon ? { ma: banDau.nganh_da_chon, tt: banDau.trang_thai_nganh ?? null } : null
  );
  const [moSua, setMoSua] = useState(!gonGang && !banDau?.nganh_da_chon);
  const [nganh, setNganh] = useState(banDau?.nganh_da_chon ?? "");
  const [trangThai, setTrangThai] = useState<TrangThaiNganh>(banDau?.trang_thai_nganh ?? "du_dinh");
  const [catalog, setCatalog] = useState<CatalogField[] | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (!predictionId || !moSua || catalog) return;
    layCatalog().then(setCatalog).catch(() => setLoi("Không tải được danh mục ngành."));
  }, [predictionId, moSua, catalog]);

  const tenNganh = useMemo(() => {
    const m = new Map<string, string>();
    goiY.forEach((g) => m.set(g.code, g.name));
    catalog?.forEach((f) => f.majors.forEach((x) => m.set(x.code, x.name)));
    return m;
  }, [goiY, catalog]);

  if (!predictionId) {
    return (
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>
          <strong className="text-slate-900">Muốn góp ý cho kết quả này?</strong> Đăng nhập trước khi làm khảo sát
          để kết quả được lưu — bạn sẽ cho biết được gợi ý có sát không và ngành cuối cùng mình chọn.
        </span>
        <Link href="/auth/login" className="px-4 py-2 rounded-xl bg-[#0054A6] text-white font-black text-center shrink-0">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const gui = async (body: Parameters<typeof PhanHoiService.capNhatDuDoan>[1]) => {
    setDangGui(true);
    setLoi(null);
    try {
      const r = await PhanHoiService.capNhatDuDoan(predictionId, body);
      return r.phanHoi;
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLoi(typeof detail === "string" ? detail : "Chưa gửi được, bạn thử lại nhé.");
      return null;
    } finally {
      setDangGui(false);
    }
  };

  const chonHuuIch = async (gt: GoiYHuuIch) => {
    const cu = huuIch;
    setHuuIch(gt); // hiện ngay, lỗi thì trả lại
    if (!(await gui({ goiYHuuIch: gt }))) setHuuIch(cu);
  };

  const luuNganh = async () => {
    if (!nganh) return;
    const r = await gui({ nganhDaChon: nganh, trangThaiNganh: trangThai });
    if (r) {
      setNhanDaLuu({ ma: nganh, tt: trangThai });
      setMoSua(false);
    }
  };

  const xoaNganh = async () => {
    if (await gui({ nganhDaChon: null, trangThaiNganh: null })) {
      setNhanDaLuu(null);
      setNganh("");
      setMoSua(!gonGang);
    }
  };

  return (
    <div className={gonGang ? "space-y-3" : "p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5"}>
      {!gonGang && (
        <div>
          <h3 className="text-base font-black text-slate-900">Kết quả này có giúp được bạn không?</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Góp ý của bạn được dùng để mô hình học lại theo định kỳ — chỉ dùng câu trả lời khảo sát và ngành bạn chọn,
            không dùng tên hay email.
          </p>
        </div>
      )}

      {/* Câu 1 — gợi ý có hữu ích không */}
      <div className="space-y-2">
        <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Gợi ý có sát với bạn không?</div>
        <div className="flex flex-wrap gap-2">
          {LUA_CHON_HUU_ICH.map(({ gt, nhan, Icon }) => {
            const chon = huuIch === gt;
            return (
              <motion.button
                key={gt}
                type="button"
                disabled={dangGui}
                onClick={() => chonHuuIch(gt)}
                whileHover={giam ? undefined : { y: -2, scale: 1.02 }}
                whileTap={giam ? undefined : { scale: 0.97 }}
                transition={nutSpring}
                aria-pressed={chon}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold ${
                  chon
                    ? "bg-[#0054A6] text-white border-[#0054A6] shadow-sm shadow-[#0054A6]/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {nhan}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Câu 2 — ngành đã chọn / đã đỗ: nhãn cho huấn luyện lại */}
      <div className="space-y-2">
        <div className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
          Cuối cùng bạn chọn (hoặc đã đỗ) ngành nào?
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {nhanDaLuu && !moSua ? (
            <motion.div
              key="da-luu"
              initial={giam ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={giam ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-blue-50/60 border border-blue-200/70"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <GraduationCap className="w-4 h-4 text-[#0054A6]" />
                {tenNganh.get(nhanDaLuu.ma) ?? `Mã ${nhanDaLuu.ma}`}
                {nhanDaLuu.tt && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[10px] font-black text-[#0054A6]">
                    {NHAN_TRANG_THAI_NGANH[nhanDaLuu.tt]}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setMoSua(true)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white" aria-label="Sửa ngành đã chọn">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={xoaNganh} disabled={dangGui} className="p-1.5 rounded-lg text-slate-500 hover:bg-white" aria-label="Xoá ngành đã chọn">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </motion.div>
          ) : moSua ? (
            <motion.div
              key="sua"
              initial={giam ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={giam ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              <select
                value={nganh}
                onChange={(e) => setNganh(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
              >
                <option value="">— Chọn ngành —</option>
                <optgroup label="Các ngành được gợi ý lần này">
                  {goiY.map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
                </optgroup>
                {catalog?.map((f) => (
                  <optgroup key={f.id} label={f.name}>
                    {f.majors
                      .filter((m) => !goiY.some((g) => g.code === m.code))
                      .map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(NHAN_TRANG_THAI_NGANH) as TrangThaiNganh[]).map((tt) => (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => setTrangThai(tt)}
                    aria-pressed={trangThai === tt}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                      trangThai === tt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {NHAN_TRANG_THAI_NGANH[tt]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  onClick={luuNganh}
                  disabled={!nganh || dangGui}
                  whileHover={giam || !nganh ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={giam || !nganh ? undefined : { scale: 0.97 }}
                  transition={nutSpring}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0054A6] text-white text-xs font-black disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Lưu ngành đã chọn
                </motion.button>
                {gonGang && (
                  <button type="button" onClick={() => setMoSua(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">
                    Để sau
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="mo"
              type="button"
              onClick={() => setMoSua(true)}
              whileHover={giam ? undefined : { y: -2 }}
              transition={nutSpring}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-[#0054A6] hover:text-[#0054A6]"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Cập nhật ngành đã chọn
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {loi && <p className="text-xs font-bold text-rose-700">{loi}</p>}
    </div>
  );
}
