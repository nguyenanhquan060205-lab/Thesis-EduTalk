"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, RotateCcw, X, AlertCircle, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";

/** Kết quả xác thực thất bại do backend trả về, dạng có cấu trúc. */
export interface OtpFailure {
  message: string;
  expired?: boolean;
  /** Đã sai quá số lần cho phép — phiên bị huỷ, phải làm lại từ đầu */
  reset?: boolean;
  /** Tài khoản vừa bị xoá (chỉ xảy ra ở luồng đăng ký) */
  deleted?: boolean;
  attemptsLeft?: number | null;
}

/** Bóc `detail` của FastAPI, chấp nhận cả kiểu chuỗi lẫn kiểu object. */
export function bocLoiOtp(err: unknown, macDinh: string): OtpFailure {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  if (d && typeof d === "object") return d as OtpFailure;
  return { message: typeof d === "string" ? d : macDinh };
}

const SO_O = 6;
const GIAY = 90;

interface Props {
  /** Địa chỉ nhận mã, hiện lại cho người dùng đối chiếu */
  target: string;
  title?: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onSuccess: () => void;
  /** Sai quá số lần cho phép — trang cha dọn dữ liệu và bắt làm lại */
  onReset: (f: OtpFailure) => void;
  onClose: () => void;
}

/**
 * Popup nhập mã OTP 6 số, dùng chung cho đăng ký và đổi email.
 *
 * Mã sống 90 giây, sai tối đa 3 lần. Hết giờ thì khoá ô nhập và bật nút gửi lại;
 * sai lần thứ 3 thì backend huỷ mã và `onReset` được gọi.
 */
export default function OtpDialog({ open, ...props }: Props & { open: boolean }) {
  // Thân nằm ở component riêng và chỉ mount khi mở, nên mọi state tự reset sau
  // mỗi lần đóng — không cần effect dọn state khi `open` đổi.
  return (
    <Modal open={open} onClose={props.onClose}>
      {open && <OtpBody {...props} />}
    </Modal>
  );
}

function OtpBody({
  target,
  title = "Xác minh email",
  onVerify,
  onResend,
  onSuccess,
  onReset,
  onClose,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(SO_O).fill(""));
  const [conLai, setConLai] = useState(GIAY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const oRef = useRef<(HTMLInputElement | null)[]>([]);
  // Mốc hết hạn tuyệt đối: đếm theo Date.now() nên máy ngủ dậy vẫn đúng, khác
  // với cộng dồn setInterval sẽ bị trôi. Gán trong effect chứ không phải lúc
  // render — Date.now() là hàm không thuần khiết.
  const hetHanRef = useRef<number>(0);

  useEffect(() => {
    hetHanRef.current = Date.now() + GIAY * 1000;
    oRef.current[0]?.focus();
    const id = setInterval(() => {
      setConLai(Math.max(0, Math.ceil((hetHanRef.current - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const hetGio = conLai <= 0;

  const guiMa = async (ma: string) => {
    setBusy(true);
    setErr(null);
    try {
      await onVerify(ma);
      onSuccess();
    } catch (e) {
      const f = bocLoiOtp(e, "Mã không đúng.");
      if (f.reset || f.deleted) {
        onReset(f);
        return;
      }
      setErr(f.message);
      setDigits(Array(SO_O).fill(""));
      oRef.current[0]?.focus();
      // Backend báo mã đã hết hạn → cho đồng hồ về 0 để bật nút gửi lại
      if (f.expired) setConLai(0);
    } finally {
      setBusy(false);
    }
  };

  const dat = (i: number, v: string) => {
    const so = v.replace(/\D/g, "");
    if (!so) {
      setDigits((d) => d.map((x, k) => (k === i ? "" : x)));
      return;
    }
    // Dán cả chuỗi 6 số vào một ô cũng điền được hết
    const moi = [...digits];
    for (let k = 0; k < so.length && i + k < SO_O; k++) moi[i + k] = so[k];
    setDigits(moi);
    oRef.current[Math.min(i + so.length, SO_O - 1)]?.focus();

    // Đủ 6 số thì gửi luôn, khỏi bắt bấm nút
    const ma = moi.join("");
    if (ma.length === SO_O && !moi.includes("") && !busy && !hetGio) void guiMa(ma);
  };

  const phim = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) oRef.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) oRef.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < SO_O - 1) oRef.current[i + 1]?.focus();
  };

  const guiLai = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onResend();
      setDigits(Array(SO_O).fill(""));
      hetHanRef.current = Date.now() + GIAY * 1000;
      setConLai(GIAY);
      oRef.current[0]?.focus();
    } catch (e) {
      setErr(bocLoiOtp(e, "Không gửi lại được mã.").message);
    } finally {
      setBusy(false);
    }
  };

  const phut = Math.floor(conLai / 60);
  const giay = conLai % 60;

  return (
    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium break-words">
              Mã 6 số đã gửi tới <strong className="text-slate-700">{target}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              oRef.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            maxLength={SO_O}
            disabled={hetGio || busy}
            onChange={(e) => dat(i, e.target.value)}
            onKeyDown={(e) => phim(i, e)}
            className={`w-11 h-14 text-center text-xl font-black rounded-2xl border-2 outline-none transition disabled:bg-slate-50 disabled:text-slate-300 ${
              err
                ? "border-rose-300 text-rose-700"
                : d
                  ? "border-[#0054A6] text-slate-900"
                  : "border-slate-200 text-slate-900 focus:border-[#0054A6]"
            }`}
          />
        ))}
      </div>

      {err && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      <div className="text-center space-y-2">
        {hetGio ? (
          <>
            <p className="text-xs font-bold text-slate-500">
              Mã đã hết hạn và không còn dùng được.
            </p>
            <button
              onClick={guiLai}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] disabled:opacity-60 text-white text-xs font-black transition"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Gửi lại mã
            </button>
          </>
        ) : (
          <p className="text-xs font-bold text-slate-500">
            Mã còn hiệu lực{" "}
            <span className="text-[#0054A6] tabular-nums">
              {phut}:{String(giay).padStart(2, "0")}
            </span>
            {busy && " · đang kiểm tra…"}
          </p>
        )}
        <p className="text-[10px] text-slate-400 font-medium">
          Nhập sai 3 lần, phiên xác thực sẽ bị huỷ.
        </p>
      </div>
    </div>
  );
}
