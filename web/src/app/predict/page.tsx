"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Calculator, User, Target, Cpu, CheckCircle2, Lock, Sparkles, Sliders } from "lucide-react";

// 15 Tổ hợp môn xét tuyển chuẩn HUIT
const BLOCKS: Record<string, { subjects: string[]; name: string }> = {
  "A00": { subjects: ["Toan", "Ly", "Hoa"], name: "Toán, Vật lý, Hóa học" },
  "A01": { subjects: ["Toan", "Ly", "Anh"], name: "Toán, Vật lý, Tiếng Anh" },
  "B00": { subjects: ["Toan", "Hoa", "Sinh"], name: "Toán, Hóa học, Sinh học" },
  "B08": { subjects: ["Toan", "Sinh", "Anh"], name: "Toán, Sinh học, Tiếng Anh" },
  "C00": { subjects: ["Van", "Su", "Dia"], name: "Ngữ văn, Lịch sử, Địa lý" },
  "C01": { subjects: ["Van", "Toan", "Ly"], name: "Ngữ văn, Toán, Vật lý" },
  "C02": { subjects: ["Van", "Toan", "Hoa"], name: "Ngữ văn, Toán, Hóa học" },
  "C03": { subjects: ["Van", "Toan", "Su"], name: "Ngữ văn, Toán, Lịch sử" },
  "D01": { subjects: ["Toan", "Van", "Anh"], name: "Toán, Ngữ văn, Tiếng Anh" },
  "D07": { subjects: ["Toan", "Hoa", "Anh"], name: "Toán, Hóa học, Tiếng Anh" },
  "D09": { subjects: ["Toan", "Su", "Anh"], name: "Toán, Lịch sử, Tiếng Anh" },
  "D14": { subjects: ["Van", "Su", "Anh"], name: "Ngữ văn, Lịch sử, Tiếng Anh" },
  "D15": { subjects: ["Van", "Su", "Anh"], name: "Ngữ văn, Lịch sử, Tiếng Anh" },
  "X01": { subjects: ["Toan", "Van", "GD"], name: "Toán, Ngữ văn, GDKTPL" },
  "X26": { subjects: ["Toan", "Tin", "Anh"], name: "Toán, Tin học, Tiếng Anh" },
};

// 10 Môn học thi tốt nghiệp HUIT
const SUBJECTS = [
  { id: "Toan", label: "Toán" },
  { id: "Van", label: "Ngữ văn" },
  { id: "Anh", label: "Tiếng Anh" },
  { id: "Ly", label: "Vật lý" },
  { id: "Hoa", label: "Hóa học" },
  { id: "Sinh", label: "Sinh học" },
  { id: "Su", label: "Lịch sử" },
  { id: "Dia", label: "Địa lý" },
  { id: "GD", label: "GDKTPL" },
  { id: "Tin", label: "Tin học" }
];

// 10 Chỉ số Tính cách / Sở thích
const TRAITS = [
  { id: "nangdong", label: "Năng động & Hướng ngoại", desc: "Thích giao tiếp, hòa đồng" },
  { id: "logic", label: "Tư duy Logic & Phân tích", desc: "Giỏi giải quyết vấn đề toán học" },
  { id: "sangtao", label: "Sáng tạo & Thẩm mỹ", desc: "Thiết kế, vẽ, đồ họa" },
  { id: "congnghe", label: "Đam mê Công nghệ & Số hóa", desc: "Thích máy tính, lập trình, gadget" },
  { id: "xahoi", label: "Thích làm việc với Con người", desc: "Tư vấn, giảng dạy, nhân sự" },
  { id: "tomo", label: "Tò mò & Thích khám phá", desc: "Tìm hiểu cơ chế hoạt động vạn vật" },
  { id: "camthong", label: "Cảm thông & Thấu hiểu", desc: "Lắng nghe, tâm lý, chia sẻ" },
  { id: "suckhoe", label: "Quan tâm Sức khỏe/Y tế", desc: "Sinh học, dược phẩm, dinh dưỡng" },
  { id: "kinhdoanh", label: "Máu kinh doanh & Lãnh đạo", desc: "Quản lý, thương mại, tài chính" },
  { id: "nghethuat", label: "Năng khiếu Nghệ thuật/Âm nhạc", desc: "Âm nhạc, diễn xuất, truyền thông" }
];

export default function PredictPage() {
  const router = useRouter();
  
  // State 23 Input Features
  const [block, setBlock] = useState<string>("D01"); // 1 feature: Mã tổ hợp
  const [gender, setGender] = useState<number>(0); // 1 feature: Giới tính (0: Nam, 1: Nữ)
  const [goal, setGoal] = useState<number>(1); // 1 feature: Mục tiêu sau tốt nghiệp (1..4)
  const [scores, setScores] = useState<Record<string, string>>({
    Toan: "8.5", Van: "8.0", Anh: "7.5"
  }); // 10 features: Điểm thi 10 môn
  const [traits, setTraits] = useState<Record<string, number>>({
    nangdong: 4, logic: 5, sangtao: 3, congnghe: 5, xahoi: 3,
    tomo: 4, camthong: 3, suckhoe: 2, kinhdoanh: 4, nghethuat: 2
  }); // 10 features: Tính cách

  const [isPredicting, setIsPredicting] = useState(false);

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlock = e.target.value;
    setBlock(newBlock);
    const activeSubs = BLOCKS[newBlock]?.subjects || [];
    const newScores: Record<string, string> = {};
    activeSubs.forEach(sub => {
      newScores[sub] = (Math.random() * 2 + 7.5).toFixed(1);
    });
    setScores(newScores);
  };

  const handlePredict = () => {
    if (!block) return alert("Vui lòng chọn Tổ hợp khối thi!");
    setIsPredicting(true);
    setTimeout(() => {
      router.push("/result");
    }, 1800);
  };

  const activeSubjectCount = (BLOCKS[block]?.subjects || []).length;
  const totalConfiguredFeatures = 1 + 1 + 1 + 10 + 10; // 23 features

  return (
    <div className="space-y-8 animate-fade-in-up mt-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E1B4B] rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-400/30 text-xs font-bold text-blue-300 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Mô hình XGBoost & Multi-Feature Vector (15 Tổ Hợp Môn HUIT)
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
              Form Phân tích Tuyển sinh AI
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-normal max-w-2xl leading-relaxed">
              Nhập <strong>Bộ 23 Đặc trưng Đầu vào (Input Features - X)</strong> chuẩn hóa theo Đề án HUIT. Các môn không thuộc tổ hợp sẽ được tự động gán giá trị <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">NaN</code> để triệt tiêu nhiễu dữ liệu.
            </p>
          </div>

          {/* 23 Features Badge Counter */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-5 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[180px]">
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300">
              {totalConfiguredFeatures} / 23
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-1">
              Features Đã Khởi Tạo
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-400 to-teal-400 h-full w-full rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Academics & Personal Specs (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Section 1: Exam Block & 10 Subject Scores */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <Calculator className="w-5 h-5 text-[#2563EB]" />
                1. Khối xét tuyển & 10 Môn học (11 Features)
              </h2>
              <span className="text-xs font-bold bg-blue-50 text-[#2563EB] px-3 py-1 rounded-full border border-blue-100">
                15 Tổ hợp Môn HUIT
              </span>
            </div>
            
            {/* Block Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Chọn Tổ hợp Xét tuyển (Feature 1/23)
              </label>
              <select 
                value={block} 
                onChange={handleBlockChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer shadow-xs"
              >
                {Object.keys(BLOCKS).map(b => (
                  <option key={b} value={b}>Tổ hợp Khối {b} — {BLOCKS[b].name}</option>
                ))}
              </select>
            </div>

            {/* 10 Subject Grid */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Điểm thi 10 môn thực tế (Features 2 - 11/23)
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  Thuộc khối {block}: <strong className="text-emerald-600 font-bold">{activeSubjectCount} mở</strong> | Khác: <strong className="text-slate-400 font-bold">{10 - activeSubjectCount} khóa (NaN)</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {SUBJECTS.map(sub => {
                  const isActive = BLOCKS[block]?.subjects.includes(sub.id);
                  return (
                    <div 
                      key={sub.id} 
                      className={`p-3 rounded-2xl border transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-50/50 border-blue-200 shadow-xs' 
                          : 'bg-slate-50/80 border-slate-200/80 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                          {sub.label}
                        </span>
                        {isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ) : (
                          <Lock className="w-3 h-3 text-slate-400" />
                        )}
                      </div>

                      <input 
                        type="number" 
                        step="0.1"
                        disabled={!isActive}
                        value={scores[sub.id] || ""}
                        onChange={(e) => setScores({...scores, [sub.id]: e.target.value})}
                        className={`w-full text-center py-2 rounded-xl border text-sm font-mono font-bold outline-none transition ${
                          isActive 
                            ? 'bg-white border-blue-300 text-[#2563EB] focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        placeholder="NaN"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Section 2: Gender & Career Goal (2 Features) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-purple-600" />
                2. Thông tin Cá nhân & Mục tiêu (2 Features)
              </h2>
              <span className="text-xs font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100">
                Giới tính + Mục tiêu
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Giới tính (Feature 12/23)
                </label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer shadow-xs"
                >
                  <option value={0}>Nam (Mã hoá: 0)</option>
                  <option value={1}>Nữ (Mã hoá: 1)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mục tiêu Sau Tốt nghiệp (Feature 13/23)
                </label>
                <select 
                  value={goal}
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-slate-900 font-bold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer shadow-xs"
                >
                  <option value={1}>1: Đi làm doanh nghiệp / Công ty ngay</option>
                  <option value={2}>2: Nghiên cứu sinh / Học Cao học</option>
                  <option value={3}>3: Khởi nghiệp / Tự kinh doanh</option>
                  <option value={4}>4: Chưa xác định rõ (AI chống nhiễu)</option>
                </select>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Right Column: 10 Personality Traits & Submit (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <Sliders className="w-5 h-5 text-teal-600" />
                  3. 10 Chỉ số Tính cách (10 Features)
                </h2>
                <span className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-100">
                  Thang điểm 1 - 5
                </span>
              </div>

              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                {TRAITS.map((trait, idx) => (
                  <div key={trait.id} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-slate-800">
                        {idx + 14}. {trait.label}
                      </span>
                      <span className="text-xs font-extrabold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                        Mức {traits[trait.id] || 3}/5
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
                className="w-full py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {isPredicting ? (
                  <><Cpu className="w-5 h-5 animate-spin" /> Đang truyền Vector 23 Features vào XGBoost...</>
                ) : (
                  <><BrainCircuit className="w-5 h-5" /> Trích xuất 23 Features & Dự đoán</>
                )}
              </button>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
