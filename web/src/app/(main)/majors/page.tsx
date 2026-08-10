"use client";

import { BookOpen, Search, CheckCircle2, GraduationCap, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

interface Major {
  code: string;
  name: string;
  block: string;
  score: number;
}

export default function MajorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [majorsData, setMajorsData] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/v1/majors");
        if (response.data && response.data.majors) {
          const transformed: Major[] = Object.entries(response.data.majors).map(([name, info]: any) => ({
            name,
            code: info.code,
            block: info.blocks.join(", "),
            score: 22.0 // Score placeholder as backend doesn't provide it currently
          }));
          setMajorsData(transformed);
        }
      } catch (error) {
        console.error("Failed to fetch majors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMajors();
  }, []);

  const filteredMajors = majorsData.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.code.includes(searchTerm) ||
    m.block.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in-up mt-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#2563EB] px-3.5 py-1.5 rounded-full border border-blue-100 text-xs font-bold">
            <GraduationCap className="w-4 h-4" />
            Thông Tin Tuyển Sinh Chính Thức HUIT 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 text-slate-900 tracking-tight">
            <Building2 className="w-8 h-8 text-[#2563EB]" /> Danh Mục 39 Ngành Đào Tạo
          </h1>
          <p className="text-slate-600 max-w-3xl font-medium text-sm leading-relaxed">
            Tra cứu danh sách ngành học, mã ngành, tổ hợp môn xét tuyển và điểm chuẩn tham khảo tại Trường Đại học Công Thương TP.HCM.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-xs">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 text-[#2563EB]">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">39</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngành Đào Tạo Chính Thức</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-xs">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100 text-teal-600">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">15</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổ Hợp Môn Xét Tuyển</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-200 shadow-xs">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100 text-purple-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">2026</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cập Nhật Mới Nhất</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl overflow-hidden flex flex-col border border-slate-200 shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80">
          <h2 className="text-lg font-extrabold text-slate-900">Bảng Tra Cứu Ngành & Khối Thi</h2>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm tên ngành, mã ngành hoặc khối thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-500/15 transition w-full sm:w-80 shadow-xs font-medium"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold">STT</th>
                <th className="px-6 py-4 font-extrabold">Mã Ngành</th>
                <th className="px-6 py-4 font-extrabold">Tên Ngành Học</th>
                <th className="px-6 py-4 font-extrabold">Tổ Hợp Môn Xét Tuyển</th>
                <th className="px-6 py-4 font-extrabold">Điểm Chuẩn Năm Ngoái</th>
                <th className="px-6 py-4 font-extrabold text-center">Trạng Thái Tuyển Sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center font-medium text-slate-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredMajors.map((major, idx) => (
                <tr 
                  key={major.code + idx}
                  className="hover:bg-blue-50/40 transition group"
                >
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-mono text-[#2563EB] font-bold text-xs">{major.code}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{major.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                      {major.block}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-black text-xs">
                      {major.score.toFixed(1)} điểm
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg font-bold text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang tuyển sinh
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMajors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center font-medium text-slate-500">
                    Không tìm thấy ngành học hoặc tổ hợp môn phù hợp với từ khóa &quot;{searchTerm}&quot;.
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
