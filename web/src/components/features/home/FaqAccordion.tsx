"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const FAQS = [
  {
    q: "Hệ thống AI EduTalk hỗ trợ thí sinh chọn ngành học như thế nào?",
    a: "EduTalk phân tích đa chiều điểm thi 3 môn theo 15 tổ hợp xét tuyển, kết hợp với kỳ vọng nghề nghiệp sau đại học và 10 chỉ số đánh giá thiên hướng cá nhân để đưa ra bảng đề xuất Top 3 ngành học sáng giá nhất kèm đánh giá khả năng trúng tuyển thực tế tại HUIT."
  },
  {
    q: "Điểm chuẩn và tổ hợp xét tuyển trên EduTalk lấy từ nguồn nào?",
    a: "Toàn bộ dữ liệu điểm chuẩn và tổ hợp xét tuyển được trích xuất trực tiếp từ đề án tuyển sinh chính thức của Trường Đại học Công Thương TP.HCM (HUIT) các năm 2024, 2025 và 2026, áp dụng cho phương thức xét điểm thi tốt nghiệp THPT."
  },
  {
    q: "Làm thế nào để nộp hồ sơ xét tuyển sớm vào HUIT?",
    a: "Thí sinh có thể đăng ký trực tuyến tại cổng thông tin tuyển sinh chính thức https://tuyensinh.huit.edu.vn hoặc nộp hồ sơ trực tiếp tại Trung tâm Tuyển sinh & Truyền thông - 140 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP.HCM."
  },
  {
    q: "Hai chế độ 'Khám phá toàn diện' và 'Tư vấn theo nhóm ngành' khác nhau thế nào?",
    a: "Chế độ Khám phá toàn diện tự động tìm kiếm trên cả 39 chuyên ngành thuộc 9 nhóm ngành HUIT. Trong khi đó, chế độ Tư vấn theo nhóm ngành dành cho thí sinh đã xác định được nhóm ngành yêu thích (như CNTT hoặc Kinh tế), mô hình sẽ tập trung xếp hạng chuyên sâu trong nhóm đó."
  }
];

export function FaqAccordion() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-left">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0054A6] text-xs font-black uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Giải Đáp Thắc Mắc</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Câu Hỏi Thường Gặp Về Tuyển Sinh HUIT
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium">
          Những thông tin quan trọng nhất giúp thí sinh nắm rõ quy chế và cơ hội trúng tuyển 2026:
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = activeFaq === idx;
          return (
            <div 
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-black text-xs sm:text-sm text-slate-900 hover:text-[#0054A6] transition cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-[#0054A6]" : ""
                  }`} 
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={shouldReduceMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
