"use client";

import { motion } from "framer-motion";
import { History, BrainCircuit, Calendar, ChevronRight, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

const HISTORY_DATA = [
  {
    id: 1,
    date: "20/07/2026 - 14:30",
    major: "Công nghệ Thông tin",
    score: 26.25,
    match: 89,
    status: "safe",
    block: "A00"
  },
  {
    id: 2,
    date: "18/07/2026 - 09:15",
    major: "An toàn Thông tin",
    score: 25.00,
    match: 75,
    status: "warning",
    block: "A01"
  }
];

export default function HistoryPage() {
  return (
    <div className="max-w-4xl mx-auto mt-8 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-[#2563EB]" /> Lịch sử Dự đoán
          </h1>
          <p className="text-slate-600 mt-2 font-medium">Xem lại các kết quả phân tích AI trước đây của bạn.</p>
        </div>
        <Link href="/predict" className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition border border-slate-200 shadow-sm">
          <BrainCircuit className="w-5 h-5" /> Dự đoán mới
        </Link>
      </div>

      <div className="space-y-4">
        {HISTORY_DATA.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[#2563EB]/40 hover:shadow-md transition group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                item.status === 'safe' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
              }`}>
                {item.status === 'safe' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#2563EB] transition">{item.major}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1 font-medium">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {item.date}</span>
                  <span>•</span>
                  <span>Khối: <strong className="text-slate-900">{item.block}</strong></span>
                  <span>•</span>
                  <span>Điểm: <strong className="text-slate-900">{item.score}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 mb-1">Tỷ lệ so khớp</div>
                <div className={`text-2xl font-black ${
                  item.status === 'safe' ? 'text-emerald-600' : 'text-amber-600'
                }`}>{item.match}%</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
