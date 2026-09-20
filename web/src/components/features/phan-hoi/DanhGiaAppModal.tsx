"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { PhanHoiService } from "@/services/phanHoi";

const NHAN_SAO = ["", "Chưa tốt", "Tạm được", "Ổn", "Tốt", "Rất tốt"];

/**
 * Hỏi đánh giá EduTalk sau lần dự đoán ĐẦU TIÊN (backend báo `canHoiDanhGia`).
 * Sao tô màu thương hiệu, KHÔNG dùng amber — amber dành riêng cho mức "có khả năng" trúng tuyển.
 */
export function DanhGiaAppModal({
  open,
  onClose,
  predictionId,
}: {
  open: boolean;
  onClose: (daGui: boolean) => void;
  predictionId?: string | null;
}) {
  const giam = useReducedMotion();
  const [sao, setSao] = useState(0);
  const [di, setDi] = useState(0);
  const [yKien, setYKien] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [xong, setXong] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const gui = async () => {
    if (!sao) return;
    setDangGui(true);
    setLoi(null);
    try {
      await PhanHoiService.danhGiaApp(sao, yKien, predictionId);
      setXong(true);
      setTimeout(() => onClose(true), 1400);
    } catch {
      setLoi("Chưa gửi được, bạn thử lại nhé.");
    } finally {
      setDangGui(false);
    }
  };

  const hien = di || sao;

  return (
    <Modal open={open} onClose={() => !dangGui && onClose(false)} labelledBy="tieu-de-danh-gia">
      <motion.div
        initial={giam ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl ring-1 ring-slate-900/5 space-y-5"
      >
        <AnimatePresence mode="wait" initial={false}>
          {xong ? (
            <motion.div
              key="xong"
              initial={giam ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#0054A6] text-white flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-900">Cảm ơn bạn đã góp ý!</p>
            </motion.div>
          ) : (
            <motion.div key="form" exit={giam ? undefined : { opacity: 0 }} className="space-y-5">
              <div>
                <h2 id="tieu-de-danh-gia" className="text-lg font-black text-slate-900">
                  Bạn thấy EduTalk thế nào?
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Bạn vừa xong lần tư vấn đầu tiên. Một phút góp ý giúp nhóm làm ứng dụng tốt hơn.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2" onMouseLeave={() => setDi(0)}>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Số sao">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={sao === i}
                      aria-label={`${i} sao — ${NHAN_SAO[i]}`}
                      onClick={() => setSao(i)}
                      onMouseEnter={() => setDi(i)}
                      whileHover={giam ? undefined : { y: -3, scale: 1.1 }}
                      whileTap={giam ? undefined : { scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className="p-1"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          i <= hien ? "fill-[#0054A6] text-[#0054A6]" : "fill-transparent text-slate-300"
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>
                <span className="h-4 text-xs font-bold text-slate-600">{NHAN_SAO[hien]}</span>
              </div>

              <textarea
                value={yKien}
                onChange={(e) => setYKien(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Điều bạn thích, điều chưa ổn, hoặc tính năng bạn muốn có… (không bắt buộc)"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
              />
              {loi && <p className="text-xs font-bold text-rose-700">{loi}</p>}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onClose(false)}
                  disabled={dangGui}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Để sau
                </button>
                <motion.button
                  type="button"
                  onClick={gui}
                  disabled={!sao || dangGui}
                  whileHover={giam || !sao ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={giam || !sao ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="px-5 py-2.5 rounded-xl bg-[#0054A6] text-white text-xs font-black disabled:opacity-50 shadow-sm shadow-[#0054A6]/20"
                >
                  {dangGui ? "Đang gửi…" : "Gửi đánh giá"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
}
