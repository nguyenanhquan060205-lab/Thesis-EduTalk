"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Info, Sparkles } from "lucide-react";
import {
  giaiThichBangLoi,
  type ExplainFeature,
  type MajorExplain,
} from "@/services/predict";

/**
 * "Vì sao mô hình xếp ngành này" — trực quan hoá giá trị SHAP.
 *
 * Mỗi thanh là đóng góp hợp nhất `φ₂ + β·φ₁` của một đặc trưng vào điểm xếp hạng
 * cuối cùng: xanh đẩy ngành lên, đỏ kéo xuống, độ dài là mức ảnh hưởng.
 *
 * Đây là dạng "Waterfall/Force plot đơn giản hoá thành biểu đồ thanh" — bỏ trục
 * số học và mũi tên tích luỹ của waterfall gốc, vì người đọc là học sinh phổ thông.
 */
import { motion, AnimatePresence } from "framer-motion";

export default function GiaiThichSHAP({
  explain,
  tenNganh,
}: {
  explain?: MajorExplain | null;
  tenNganh: string;
}) {
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [hong, setHong] = useState(false);
  const daGoi = useRef(false);

  const muc = (explain?.features ?? []).filter((f) => !f.anVoiThiSinh);

  useEffect(() => {
    if (!mo || daGoi.current) return;
    const ds = (explain?.features ?? []).filter((f) => !f.anVoiThiSinh);
    if (!ds.length) return;
    daGoi.current = true;

    let huy = false;
    (async () => {
      try {
        const t = await giaiThichBangLoi(tenNganh, ds);
        if (!huy) setLoi(t);
      } catch {
        if (!huy) setHong(true);
      }
    })();
    return () => {
      huy = true;
    };
  }, [mo, explain, tenNganh]);

  const dangTai = mo && loi === null && !hong;

  if (!muc.length) return null;

  const lonNhat = Math.max(...muc.map((f) => f.phanTram)) || 1;
  const guided = explain?.mode === "guided";

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer py-1"
      >
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0054A6]" />
          <span>Vì sao mô hình xếp ngành này (XAI SHAP)</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs font-black text-[#0054A6] bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors shrink-0">
          {mo ? "Thu gọn" : "Xem giải thích chi tiết"}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${mo ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      <AnimatePresence>
        {mo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 pt-2">
              {muc.map((f) => (
                <Thanh key={f.ten} f={f} lonNhat={lonNhat} />
              ))}

              {explain!.soConLai > 0 && (
                <Thanh
                  f={{
                    ten: `${explain!.soConLai} yếu tố khác`,
                    giaTri: "gộp lại",
                    dongGop: explain!.dongGopConLai,
                    phanTram: explain!.phanTramConLai,
                    mucDo: "",
                    tang1: 0,
                    tang2: 0,
                    anVoiThiSinh: false,
                  }}
                  lonNhat={lonNhat}
                  mo_nhat
                />
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 rounded-sm bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs" /> 
                  Đặc trưng phù hợp cao với ngành
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 rounded-sm bg-gradient-to-r from-rose-500 to-pink-400 shadow-xs" /> 
                  Đặc trưng có độ lệch trung bình
                </span>
                <span className="text-slate-400">| Tổng mức độ ảnh hưởng = 100%</span>
              </div>

              {muc.some((f) => f.dongGop < 0) && (
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <strong className="text-slate-700 font-black">Lưu ý chuyên môn:</strong> Thanh màu hồng/đỏ <strong className="text-slate-700">không phải điểm yếu</strong>. Hệ thống đang đối chiếu bạn với hồ sơ sinh viên tiêu chuẩn của ngành này để đánh giá độ tương đồng đặc trưng.
                </p>
              )}

              {!hong && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0054A6]/[0.08] to-[#0072CE]/[0.03] border border-[#0054A6]/20 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#0054A6]" />
                    <span className="text-xs font-black text-[#0054A6] uppercase tracking-wide">
                      Diễn giải trực quan từ Trợ lý AI
                    </span>
                  </div>

                  {!dangTai && loi ? (
                    <>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {loi}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-2">
                        Phân tích tự động trích xuất trực tiếp từ vector trọng số SHAP.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2 animate-pulse" aria-hidden>
                      <div className="h-2.5 rounded bg-blue-200/50 w-full" />
                      <div className="h-2.5 rounded bg-blue-200/50 w-[90%]" />
                      <div className="h-2.5 rounded bg-blue-200/50 w-[60%]" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Đây là các chỉ số giải thích lý do <strong className="text-slate-700 font-bold">mô hình XGBoost</strong> xếp ngành {tenNganh} ở thứ hạng này.
                  {guided && (
                    <> Bạn đã chọn sẵn nhóm ngành nên phần phân tích chỉ tập trung vào các chuyên ngành trong nhóm đó.</>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Thanh({
  f,
  lonNhat,
  mo_nhat = false,
}: {
  f: ExplainFeature;
  lonNhat: number;
  mo_nhat?: boolean;
}) {
  const duong = f.dongGop > 0;
  const rong = (f.phanTram / lonNhat) * 50;

  return (
    <div className={`flex items-center gap-3 text-xs ${mo_nhat ? "opacity-60" : ""}`}>
      <div className="w-28 sm:w-44 shrink-0 text-right leading-tight">
        <div className="font-bold text-slate-800 truncate">{f.ten}</div>
        <div className="text-[10px] text-slate-400 font-medium">{f.giaTri}</div>
      </div>

      <div className="flex-1 relative h-6 min-w-0 bg-slate-100/70 rounded-md overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-300 z-10" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(rong, 50)}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute top-1 bottom-1 rounded-sm shadow-xs ${
            mo_nhat
              ? duong
                ? "bg-slate-400 left-1/2"
                : "bg-slate-400 right-1/2"
              : duong
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 left-1/2"
                : "bg-gradient-to-l from-rose-500 to-pink-400 right-1/2"
          }`}
        />
      </div>

      <div className="w-20 sm:w-24 shrink-0 text-right">
        <span
          className={`font-black tabular-nums text-xs ${
            mo_nhat ? "text-slate-500" : duong ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {f.phanTram < 0.5 ? "<1" : f.phanTram.toFixed(0)}%
        </span>
        {!mo_nhat && (
          <div className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
            {f.mucDo}
          </div>
        )}
      </div>
    </div>
  );
}

