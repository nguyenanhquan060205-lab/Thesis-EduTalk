"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Calculator, User, Target, Cpu } from "lucide-react";

const BLOCKS: Record<string, string[]> = {
  "A00": ["Toan", "Ly", "Hoa"],
  "A01": ["Toan", "Ly", "Anh"],
  "B00": ["Toan", "Hoa", "Sinh"],
  "D01": ["Toan", "Van", "Anh"],
  "D07": ["Toan", "Hoa", "Anh"]
};

const SUBJECTS = [
  { id: "Toan", label: "Toán" }, { id: "Van", label: "Ngữ văn" }, { id: "Anh", label: "Tiếng Anh" },
  { id: "Ly", label: "Vật lý" }, { id: "Hoa", label: "Hóa học" }, { id: "Sinh", label: "Sinh học" },
  { id: "Su", label: "Lịch sử" }, { id: "Dia", label: "Địa lý" }, { id: "GD", label: "GDKTPL" },
  { id: "Tin", label: "Tin học" }
];

const TRAITS = [
  { id: "nangdong", label: "Năng động & Hướng ngoại" },
  { id: "logic", label: "Tư duy Logic & Phân tích" },
  { id: "sangtao", label: "Sáng tạo & Nghệ thuật" },
  { id: "congnghe", label: "Đam mê Công nghệ & Số hóa" },
  { id: "xahoi", label: "Thích làm việc với Con người" },
  { id: "tomo", label: "Tò mò & Thích khám phá" },
  { id: "camthong", label: "Cảm thông & Thấu hiểu" },
  { id: "suckhoe", label: "Quan tâm Sức khỏe/Y tế" },
  { id: "kinhdoanh", label: "Máu kinh doanh & Lãnh đạo" },
  { id: "nghethuat", label: "Năng khiếu thẩm mỹ/âm nhạc" }
];

export default function PredictPage() {
  const router = useRouter();
  const [block, setBlock] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [traits, setTraits] = useState<Record<string, number>>({});

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlock = e.target.value;
    setBlock(newBlock);
    const activeSubjects = BLOCKS[newBlock] || [];
    const newScores: Record<string, string> = {};
    activeSubjects.forEach(sub => {
      newScores[sub] = (Math.random() * 3 + 6).toFixed(1);
    });
    setScores(newScores);
  };

  const handlePredict = () => {
    if (!block) return alert("Vui lòng chọn Tổ hợp khối thi!");
    setIsPredicting(true);
    setTimeout(() => {
      router.push("/result");
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in-up mt-8">
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl md:text-4xl font-black flex items-center justify-center gap-3 text-slate-900">
          <BrainCircuit className="w-8 h-8 text-[#2563EB]" /> Công cụ Phân tích AI
        </h1>
        <p className="text-slate-600 font-medium leading-relaxed">
          Hệ thống yêu cầu 23 đặc trưng đầu vào. Các môn không thuộc tổ hợp khối sẽ được tự động gán nhãn NaN và khóa lại để đảm bảo dữ liệu train cho XGBoost đạt chuẩn xác nhất.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Academics */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
              <Calculator className="w-6 h-6 text-[#2563EB]" /> 1. Khối xét tuyển & Điểm thi
            </h2>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">Chọn Tổ hợp Xét tuyển (VD: A00, A01)</label>
              <select 
                value={block} 
                onChange={handleBlockChange}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition cursor-pointer shadow-sm font-semibold"
              >
                <option value="">-- Click để chọn khối thi --</option>
                {Object.keys(BLOCKS).map(b => (
                  <option key={b} value={b}>Khối {b}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {SUBJECTS.map(sub => {
                const isActive = BLOCKS[block]?.includes(sub.id);
                return (
                  <div key={sub.id} className={`transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-95 grayscale'}`}>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{sub.label}</label>
                    <input 
                      type="number" 
                      disabled={!isActive}
                      value={scores[sub.id] || ""}
                      onChange={(e) => setScores({...scores, [sub.id]: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 outline-none focus:border-[#2563EB] transition disabled:cursor-not-allowed font-mono text-lg font-bold shadow-sm"
                      placeholder="NaN"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
              <User className="w-6 h-6 text-purple-600" /> 2. Cá nhân & Mục tiêu
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Giới tính</label>
                <select className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 font-semibold outline-none focus:border-purple-500 transition cursor-pointer shadow-sm">
                  <option value="0">Nam</option>
                  <option value="1">Nữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mục tiêu Nghề nghiệp</label>
                <select className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 font-semibold outline-none focus:border-purple-500 transition cursor-pointer shadow-sm">
                  <option value="1">Đi làm ngay sau tốt nghiệp</option>
                  <option value="2">Nghiên cứu / Học lên cao</option>
                  <option value="3">Khởi nghiệp / Kinh doanh</option>
                  <option value="4">Chưa xác định rõ</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Traits & Submit */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-slate-900">
              <Target className="w-6 h-6 text-teal-600" /> 3. Đặc trưng Tính cách
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-8">
              Sử dụng thanh trượt (1-5) để định lượng mức độ phù hợp của bạn với từng đặc điểm.
            </p>
            
            <div className="space-y-6 flex-1">
              {TRAITS.map(trait => (
                <div key={trait.id} className="group">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-slate-700">{trait.label}</span>
                    <span className="text-teal-700 font-bold bg-teal-50 border border-teal-100 px-2 rounded-md">{traits[trait.id] || 3}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="5" 
                    value={traits[trait.id] || 3}
                    onChange={(e) => setTraits({...traits, [trait.id]: parseInt(e.target.value)})}
                    className="w-full accent-teal-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer hover:bg-slate-300 transition"
                  />
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <motion.button 
              onClick={handlePredict}
              disabled={isPredicting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-10 w-full py-5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isPredicting ? (
                <><Cpu className="w-6 h-6 animate-pulse" /> Đang chạy luồng AI XGBoost...</>
              ) : (
                <><BrainCircuit className="w-6 h-6" /> Thực hiện Dự đoán</>
              )}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
