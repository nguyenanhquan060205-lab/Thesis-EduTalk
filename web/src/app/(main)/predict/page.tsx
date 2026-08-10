"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Calculator, User, Target, Sparkles, Sliders, CheckCircle2, ArrowRight } from "lucide-react";

// 15 Tổ hợp môn xét tuyển chuẩn HUIT
const BLOCKS: Record<string, { subjects: { id: string; label: string }[]; name: string }> = {
  "A00": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Ly", label: "Vật lý" }, { id: "Hoa", label: "Hóa học" }], name: "Toán, Vật lý, Hóa học" },
  "A01": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Ly", label: "Vật lý" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Vật lý, Tiếng Anh" },
  "B00": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Hoa", label: "Hóa học" }, { id: "Sinh", label: "Sinh học" }], name: "Toán, Hóa học, Sinh học" },
  "B08": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Sinh", label: "Sinh học" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Sinh học, Tiếng Anh" },
  "C00": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Su", label: "Lịch sử" }, { id: "Dia", label: "Địa lý" }], name: "Ngữ văn, Lịch sử, Địa lý" },
  "C01": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Toan", label: "Toán" }, { id: "Ly", label: "Vật lý" }], name: "Ngữ văn, Toán, Vật lý" },
  "C02": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Toan", label: "Toán" }, { id: "Hoa", label: "Hóa học" }], name: "Ngữ văn, Toán, Hóa học" },
  "C03": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Toan", label: "Toán" }, { id: "Su", label: "Lịch sử" }], name: "Ngữ văn, Toán, Lịch sử" },
  "D01": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Van", label: "Ngữ văn" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Ngữ văn, Tiếng Anh" },
  "D07": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Hoa", label: "Hóa học" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Hóa học, Tiếng Anh" },
  "D09": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Su", label: "Lịch sử" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Lịch sử, Tiếng Anh" },
  "D14": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Su", label: "Lịch sử" }, { id: "Anh", label: "Tiếng Anh" }], name: "Ngữ văn, Lịch sử, Tiếng Anh" },
  "D15": { subjects: [{ id: "Van", label: "Ngữ văn" }, { id: "Su", label: "Lịch sử" }, { id: "Anh", label: "Tiếng Anh" }], name: "Ngữ văn, Lịch sử, Tiếng Anh" },
  "X01": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Van", label: "Ngữ văn" }, { id: "GD", label: "GDKTPL" }], name: "Toán, Ngữ văn, GDKTPL" },
  "X26": { subjects: [{ id: "Toan", label: "Toán" }, { id: "Tin", label: "Tin học" }, { id: "Anh", label: "Tiếng Anh" }], name: "Toán, Tin học, Tiếng Anh" },
};

// 10 Chỉ số Tính cách / Sở thích
const TRAITS = [
  { id: "nangdong", label: "Năng động & Hướng ngoại", desc: "Thích giao tiếp, hòa đồng, tham gia hoạt động nhóm" },
  { id: "logic", label: "Tư duy Logic & Phân tích", desc: "Thích giải quyết bài toán khó, tư duy hệ thống" },
  { id: "sangtao", label: "Sáng tạo & Nghệ thuật", desc: "Đam mê thiết kế, tưởng tượng, ý tưởng mới" },
  { id: "congnghe", label: "Đam mê Công nghệ & Máy tính", desc: "Yêu thích tìm hiểu phần mềm, lập trình, thiết bị công nghệ" },
  { id: "xahoi", label: "Thích làm việc với Con người", desc: "Thích tư vấn, chăm sóc, chia sẻ kinh nghiệm" },
  { id: "tomo", label: "Tò mò & Thích nghiên cứu", desc: "Thích khám phá nguyên lý hoạt động của vạn vật" },
  { id: "camthong", label: "Cảm thông & Thấu hiểu", desc: "Lắng nghe, thấu hiểu cảm xúc của người khác" },
  { id: "suckhoe", label: "Quan tâm Sức khỏe & Y sinh", desc: "Hứng thú với y tế, dinh dưỡng, sinh học" },
  { id: "kinhdoanh", label: "Kinh doanh & Lãnh đạo", desc: "Muốn làm chủ, quản lý dự án, tài chính" },
  { id: "nghethuat", label: "Năng khiếu Truyền thông & Âm nhạc", desc: "Yêu thích âm nhạc, truyền thông, sự kiện" }
];

export default function PredictPage() {
  const router = useRouter();
  
  const [block, setBlock] = useState<string>("D01");
  const [gender, setGender] = useState<number>(0);
  const [goal, setGoal] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, string>>({
    Toan: "8.5", Van: "8.0", Anh: "7.5"
  });
  const [traits, setTraits] = useState<Record<string, number>>({
    nangdong: 4, logic: 5, sangtao: 3, congnghe: 5, xahoi: 3,
    tomo: 4, camthong: 3, suckhoe: 2, kinhdoanh: 4, nghethuat: 2
  });

  const [isPredicting, setIsPredicting] = useState(false);

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlock = e.target.value;
    setBlock(newBlock);
    const activeSubs = BLOCKS[newBlock]?.subjects || [];
    const newScores: Record<string, string> = {};
    activeSubs.forEach(sub => {
      newScores[sub.id] = "8.0";
    });
    setScores(newScores);
  };

  const handlePredict = () => {
    if (!block) return alert("Vui lòng chọn Tổ hợp xét tuyển!");
    setIsPredicting(true);
    setTimeout(() => {
      router.push("/result");
    }, 1500);
  };

  const currentSubjects = BLOCKS[block]?.subjects || [];

  return (
    <div className="space-y-8 animate-fade-in-up mt-4 max-w-7xl mx-auto pb-16">
      
      {/* Friendly Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-white/10 blur-[90px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-bold text-blue-100 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            Trợ lý Tư vấn Tuyển sinh Thông minh
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Định Hướng Ngành Học Phù Hợp
          </h1>
          <p className="text-blue-100/90 text-sm md:text-base font-medium leading-relaxed">
            Chọn khối thi, nhập điểm 3 môn và hoàn thành bài đánh giá sở thích ngắn. Hệ thống thông minh sẽ phân tích và gợi ý cho bạn ngành học phù hợp nhất tại Đại học Công Thương TP.HCM (HUIT).
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Subject Selection & Personal Info (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Section 1: Subject Block & 3 Subject Inputs */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2.5 text-slate-900">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-black">1</div>
                Chọn Khối Thi & Nhập Điểm
              </h2>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                3 Môn xét tuyển
              </span>
            </div>
            
            {/* Block Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tổ hợp môn xét tuyển của bạn
              </label>
              <select 
                value={block} 
                onChange={handleBlockChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold text-base outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer shadow-xs"
              >
                {Object.keys(BLOCKS).map(b => (
                  <option key={b} value={b}>Khối {b} — {BLOCKS[b].name}</option>
                ))}
              </select>
            </div>

            {/* ONLY 3 SUBJECT INPUTS (UX IMPROVEMENT) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Nhập điểm dự kiến / điểm thi (Tổ hợp {block})
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {currentSubjects.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-900">{sub.label}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>

                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="10"
                      value={scores[sub.id] || ""}
                      onChange={(e) => setScores({...scores, [sub.id]: e.target.value})}
                      className="w-full text-center py-2.5 rounded-xl border border-blue-300 bg-white text-[#2563EB] font-bold text-lg outline-none focus:ring-4 focus:ring-blue-500/15 transition"
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Section 2: Personal Info & Career Orientation */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold flex items-center gap-2.5 text-slate-900">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">2</div>
                Thông Tin Cá Nhân & Định Hướng
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Giới tính
                </label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer shadow-xs"
                >
                  <option value={0}>Nam</option>
                  <option value={1}>Nữ</option>
                </select>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mục tiêu mong muốn sau tốt nghiệp
                </label>
                <select 
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer shadow-xs"
                >
                  <option value={1}>Đi làm doanh nghiệp / Công ty</option>
                  <option value={2}>Nghiên cứu / Học tiếp cao học</option>
                  <option value={3}>Tự khởi nghiệp / Kinh doanh</option>
                  <option value={4}>Chưa xác định cụ thể</option>
                </select>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: Personality Assessment (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2.5 text-slate-900">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">3</div>
                  Khảo Sát Tính Cách & Sở Thích
                </h2>
                <span className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100">
                  Thang 1 - 5
                </span>
              </div>

              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                {TRAITS.map((trait, idx) => (
                  <div key={trait.id} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-slate-800">
                        {idx + 1}. {trait.label}
                      </span>
                      <span className="text-xs font-extrabold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                        {traits[trait.id] || 3}/5
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 font-medium">{trait.desc}</p>
                    <input 
                      type="range" 
                      min="1" max="5" 
                      value={traits[trait.id] || 3}
                      onChange={(e) => setTraits({...traits, [trait.id]: parseInt(e.target.value)})}
                      className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <button 
                onClick={handlePredict}
                disabled={isPredicting}
                className="w-full py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {isPredicting ? (
                  <><BrainCircuit className="w-5 h-5 animate-spin" /> Đang phân tích kết quả...</>
                ) : (
                  <><span>Xem Gợi Ý Ngành Học</span> <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
