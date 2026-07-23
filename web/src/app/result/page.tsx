"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert, Brain, ChevronLeft, BarChart3, Download, Share2, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

// Dữ liệu mô phỏng đóng góp SHAP cho 23 Features
const SHAP_DATA = [
  { name: "Tính cách: Công nghệ", value: 1.8 },
  { name: "Điểm Toán (A00)", value: 1.4 },
  { name: "Tính cách: Logic", value: 1.1 },
  { name: "Mục tiêu (Đi làm)", value: 0.8 },
  { name: "Tổ hợp: A00", value: 0.5 },
  { name: "Điểm Lý (A00)", value: 0.4 },
  { name: "Tính cách: Sức khỏe", value: -0.3 },
  { name: "Tính cách: Giao tiếp", value: -0.7 },
];

export default function ResultPage() {
  return (
    <div className="space-y-8 animate-fade-in-up mt-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
        <div>
          <Link href="/predict" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#2563EB] font-bold text-sm transition mb-3">
            <ChevronLeft className="w-4 h-4" /> Trở lại Form 23 Features
          </Link>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <Brain className="w-8 h-8 text-[#2563EB]" /> Báo cáo Kết quả Dự đoán AI & XAI
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Xử lý luồng: XGBoost Model $\rightarrow$ Backend Business Rules $\rightarrow$ Biểu đồ Giải thích SHAP.
          </p>
        </div>

        <div className="flex gap-3 shrink-0">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-bold transition shadow-xs text-slate-700">
            <Share2 className="w-4 h-4" /> Chia sẻ
          </button>
          <button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-bold transition shadow-md shadow-blue-500/20">
            <Download className="w-4 h-4" /> Tải Báo cáo PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Top Recommendation & Backend Rules (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Top 1 Recommendation Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <CheckCircle2 className="w-44 h-44 text-teal-400" />
            </div>

            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Khuyến nghị Tối ưu (Top 1)
            </div>

            <div className="text-3xl font-black text-white mb-2 leading-tight">
              Công nghệ Thông tin
            </div>
            <p className="text-slate-400 text-xs font-medium">Mã ngành HUIT: 7480201</p>

            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 mt-6">
              89.4%
            </div>
            <p className="text-slate-300 mt-2 text-xs font-bold">Xác suất Phù hợp Tâm lý & Học lực</p>
          </motion.div>

          {/* Backend Business Rules Warning (Rule 1 & Rule 2) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50/80 p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-3"
          >
            <h3 className="font-extrabold text-amber-800 flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> 
              Cảnh báo Backend Business Rule
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed font-semibold">
              <strong>Luật 2 (Điểm chuẩn HUIT):</strong> Tổng 3 môn khối A00 của bạn là <strong>24.0 điểm</strong>, xấp xỉ điểm chuẩn năm ngoái <strong>(24.5)</strong>.
            </p>
            <div className="pt-3 border-t border-amber-200/70 text-xs text-amber-800 font-medium">
              <strong className="text-amber-900 font-bold">Khuyên dùng nguyện vọng 2:</strong> Ngành An toàn Thông tin hoặc Kỹ thuật Phần mềm HUIT.
            </div>
          </motion.div>

          {/* Secondary Potential Options */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lựa chọn Tiềm năng Khác</h3>
            
            <div className="bg-white p-4.5 rounded-2xl flex items-center justify-between border border-slate-200 shadow-xs hover:border-[#2563EB]/40 transition">
              <div>
                <div className="font-bold text-slate-900 text-base">An toàn Thông tin</div>
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đủ điều kiện điểm chuẩn
                </div>
              </div>
              <div className="text-xl font-black text-[#2563EB]">78.5%</div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl flex items-center justify-between border border-slate-200 shadow-xs opacity-75">
              <div>
                <div className="font-bold text-slate-900 text-base">Kỹ thuật Điện tử</div>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                  <Info className="w-3.5 h-3.5" /> Lựa chọn an toàn
                </div>
              </div>
              <div className="text-xl font-black text-slate-500">65.2%</div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: SHAP XAI Visual Explanation Chart (8 Cols) */}
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 md:p-8 rounded-3xl h-full flex flex-col border border-slate-200 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold flex items-center gap-2.5 text-slate-900">
                  <BarChart3 className="w-6 h-6 text-purple-600" /> 
                  Giải thích Mô hình AI (Biểu đồ SHAP Values)
                </h2>
                <p className="text-slate-500 font-medium text-xs mt-1">
                  Đo lường mức độ ảnh hưởng của từng đặc trưng trong bộ 23 Features đối với quyết định gợi ý ngành CNTT.
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-[400px] w-full bg-slate-50/70 rounded-2xl p-4 md:p-6 border border-slate-100">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SHAP_DATA} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" tick={{fill: '#475569', fontWeight: 600, fontSize: 12}} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{fill: '#334155', fontSize: 12, fontWeight: 700}} width={170} />
                  <Tooltip 
                    cursor={{fill: 'rgba(37, 99, 235, 0.05)'}}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={26}>
                    {SHAP_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-600">
              <div className="flex items-center gap-6 font-semibold">
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span> Đóng góp Tích cực (+SHAP)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500"></span> Đóng góp Tiêu cực (-SHAP)
                </span>
              </div>
              <span className="text-slate-400 font-medium">Mô hình XGBoost + SHAP Tree Explainer</span>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
