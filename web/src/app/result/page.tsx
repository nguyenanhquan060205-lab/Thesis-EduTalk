"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert, Brain, ChevronLeft, BarChart3, Download, Share2 } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

const SHAP_DATA = [
  { name: "Sở thích: Công nghệ", value: 1.5 },
  { name: "Điểm Toán", value: 1.2 },
  { name: "Tư duy Logic", value: 1.0 },
  { name: "Mục tiêu (Đi làm)", value: 0.8 },
  { name: "Tổ hợp (A00)", value: 0.5 },
  { name: "Tính cách: Kinh doanh", value: -0.4 },
  { name: "Tính cách: Thích giao tiếp", value: -0.8 },
];

export default function ResultPage() {
  return (
    <div className="space-y-8 animate-fade-in-up mt-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <Link href="/predict" className="text-slate-500 hover:text-[#2563EB] flex items-center gap-1 transition font-bold mb-4">
            <ChevronLeft className="w-5 h-5" /> Trở lại Form Nhập liệu
          </Link>
          <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900">
            <Brain className="w-8 h-8 text-[#2563EB]" /> Báo cáo Phân tích Tuyển sinh
          </h1>
          <p className="text-slate-500 font-medium mt-2">Dựa trên mô hình XGBoost và Luật Điểm chuẩn HUIT 2025.</p>
        </div>
        <div className="hidden md:flex gap-3">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-bold transition shadow-sm text-slate-700">
            <Share2 className="w-4 h-4" /> Chia sẻ
          </button>
          <button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-bold transition shadow-md shadow-blue-500/20">
            <Download className="w-4 h-4" /> Tải PDF Báo cáo
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Top Results & Rules */}
        <div className="lg:col-span-4 space-y-6">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-3xl border border-teal-200 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <CheckCircle2 className="w-40 h-40 text-teal-600" />
            </div>
            
            <h2 className="text-sm font-black text-teal-700 mb-3 uppercase tracking-wider">Đề xuất Tối ưu (Top 1)</h2>
            <div className="text-3xl font-black text-slate-900 mb-2 leading-tight">Công nghệ <br/> Thông tin</div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-teal-600 to-[#2563EB] mt-6">
              89.4%
            </div>
            <p className="text-slate-500 mt-4 text-sm font-bold">Độ phù hợp tâm lý & học lực</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 p-6 rounded-3xl border border-amber-200 shadow-sm"
          >
            <h3 className="font-black text-amber-700 flex items-center gap-2 mb-3 text-lg">
              <ShieldAlert className="w-6 h-6" /> Cảnh báo Backend Rule
            </h3>
            <p className="text-sm text-amber-800 leading-relaxed font-semibold">
              Mặc dù mức độ phù hợp của bạn với ngành CNTT rất cao, nhưng <strong>Tổng điểm thi dự kiến (22.5)</strong> hiện đang thấp hơn điểm chuẩn năm 2025 của HUIT <strong>(24.5)</strong>.
            </p>
            <div className="mt-4 pt-4 border-t border-amber-200">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">Lời khuyên AI:</span>
              <p className="text-sm text-amber-800 mt-1 font-medium">Cân nhắc nguyện vọng 2: Kỹ thuật phần mềm hoặc An toàn thông tin.</p>
            </div>
          </motion.div>

          {/* Top 2 and 3 */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Các lựa chọn tiềm năng</h3>
            
            <div className="bg-white p-5 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm cursor-pointer hover:border-[#2563EB]/50 hover:shadow-md transition">
              <div>
                <div className="font-bold text-slate-900 text-lg">An toàn Thông tin</div>
                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Đạt chuẩn Tổ hợp Khối
                </div>
              </div>
              <div className="text-2xl font-black text-[#2563EB]">75.2%</div>
            </div>

            <div className="bg-white p-5 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition opacity-80">
              <div>
                <div className="font-bold text-slate-900 text-lg">Cơ điện tử</div>
                <div className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-1">
                  <ShieldAlert className="w-3 h-3" /> Nguy cơ thiếu điểm
                </div>
              </div>
              <div className="text-2xl font-black text-slate-500">62.8%</div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: SHAP Explainability */}
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 md:p-10 rounded-3xl h-full flex flex-col border border-slate-200 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
                  <BarChart3 className="w-7 h-7 text-purple-600" /> Giải thích Trí tuệ Nhân tạo (XAI)
                </h2>
                <p className="text-slate-500 font-medium mt-2">Biểu đồ SHAP (SHapley Additive exPlanations) phân tích lý do mô hình chọn ngành CNTT.</p>
              </div>
            </div>

            <div className="flex-1 min-h-[450px] w-full bg-slate-50 rounded-2xl p-4 md:p-8 border border-slate-100 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SHAP_DATA} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" tick={{fill: '#475569', fontWeight: 600}} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{fill: '#334155', fontSize: 13, fontWeight: 700}} width={160} />
                  <Tooltip 
                    cursor={{fill: 'rgba(37, 99, 235, 0.05)'}}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                    {SHAP_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-700">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 font-bold">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm border border-emerald-600"></span> Đóng góp Tích cực
                </span>
                <span className="flex items-center gap-2 font-bold">
                  <span className="w-4 h-4 rounded-full bg-red-500 shadow-sm border border-red-600"></span> Đóng góp Tiêu cực
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
