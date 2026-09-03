"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Hộp thoại nổi, render qua portal thẳng vào `document.body`.
 *
 * Vì sao phải dùng portal: các trang đều bọc trong `.animate-fade-in-up`, mà
 * class này chạy `animation` có `transform` + `forwards`. Phần tử có transform
 * trở thành **containing block** cho mọi con `position: fixed` — nên
 * `fixed inset-0` sẽ bám vào khung trang chứ không phải viewport, làm lớp phủ
 * không che hết màn hình. Navbar lại là `sticky z-50` nên còn đè lên trên nữa.
 * Đưa ra ngoài `body` là thoát cả hai vấn đề.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  // Giữ onClose trong ref: nếu đưa thẳng vào deps thì mỗi lần cha render lại
  // (gõ một ký tự trong form là một lần) sẽ gỡ/gắn lại listener và ghi lại
  // body.style — thừa và dễ sinh lỗi.
  const dong = useRef(onClose);
  useEffect(() => {
    dong.current = onClose;
  }, [onClose]);

  // Đóng bằng phím Esc + khoá cuộn nền khi hộp thoại đang mở
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong.current();
    };
    document.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [open]);

  // `open` luôn là false ở lần render đầu trên server nên không lệch hydrate;
  // vẫn chặn thêm cho môi trường không có DOM.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
      // z-index cao hơn navbar (z-50) và BottomNav (z-50)
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {children}
      </div>
    </div>,
    document.body
  );
}
