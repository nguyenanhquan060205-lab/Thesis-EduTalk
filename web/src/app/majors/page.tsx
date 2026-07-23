"use client";

import { motion } from "framer-motion";
import { Database, Search, FileSpreadsheet, Download, RefreshCcw, Filter } from "lucide-react";
import { useState } from "react";

const MAJORS = [
  { code: "7480201", name: "Công nghệ thông tin", block: "A00, A01, D01, D07", score: 24.5 },
  { code: "7480103", name: "Kỹ thuật phần mềm", block: "A00, A01, D01, D07", score: 24.0 },
  { code: "7480202", name: "An toàn thông tin", block: "A00, A01, D01, D07", score: 23.5 },
  { code: "7540101", name: "Công nghệ thực phẩm", block: "A00, B00, D07", score: 22.5 },
  { code: "7340101", name: "Quản trị kinh doanh", block: "A00, A01, D01", score: 23.0 },
  { code: "7220201", name: "Ngôn ngữ Anh", block: "D01, D14, D15", score: 23.5 },
  { code: "7510201", name: "Công nghệ kỹ thuật cơ khí", block: "A00, A01", score: 20.5 },
  { code: "7340301", name: "Kế toán", block: "A00, A01, D01, D07", score: 22.0 },
];

export default function MajorsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMajors = MAJORS.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.code.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-fade-in-up mt-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900">
            <Database className="w-8 h-8 text-[#2563EB]" /> Trung tâm Dữ liệu HUIT
          </h1>
          <p className="text-slate-600 max-w-2xl font-medium">
            Hệ thống quản lý dữ liệu Điểm chuẩn và Chỉ tiêu của 37 ngành học. Dữ liệu này được sử dụng làm cơ sở để đối chiếu cho các Backend Rules.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-bold transition shadow-sm text-slate-700">
            <RefreshCcw className="w-4 h-4" /> Đồng bộ Backend
          </button>
          <button className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl px-5 py-3 flex items-center gap-2 text-sm font-bold transition shadow-md shadow-blue-500/20">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">37</div>
            <div className="text-sm font-bold text-slate-500">Ngành Đào tạo</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
            <Database className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">5,000+</div>
            <div className="text-sm font-bold text-slate-500">Mẫu Train XGBoost</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100 shadow-sm">
            <Database className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">2.4<span className="text-lg">GB</span></div>
            <div className="text-sm font-bold text-slate-500">Dữ liệu RAG Vector</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden flex flex-col border border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <h2 className="text-xl font-black text-slate-900">Danh sách Ngành & Điểm chuẩn</h2>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên ngành hoặc mã ngành..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition w-full sm:w-80 shadow-sm font-medium"
              />
            </div>
            <button className="bg-white border border-slate-300 rounded-xl px-4 py-3 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition shadow-sm font-bold">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100 text-slate-500">
              <tr>
                <th className="px-8 py-5 font-black">Mã Ngành</th>
                <th className="px-8 py-5 font-black">Tên Ngành</th>
                <th className="px-8 py-5 font-black">Tổ hợp Xét tuyển</th>
                <th className="px-8 py-5 font-black">Điểm chuẩn (2025)</th>
                <th className="px-8 py-5 font-black text-center">Trạng thái (Rule)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMajors.map((major, idx) => (
                <motion.tr 
                  key={major.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-slate-50 transition group cursor-pointer"
                >
                  <td className="px-8 py-5 font-mono text-[#2563EB] font-bold">{major.code}</td>
                  <td className="px-8 py-5 font-black text-slate-900">{major.name}</td>
                  <td className="px-8 py-5 font-medium text-slate-600">{major.block}</td>
                  <td className="px-8 py-5">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-black">
                      {major.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filteredMajors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center font-medium text-slate-500">
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
