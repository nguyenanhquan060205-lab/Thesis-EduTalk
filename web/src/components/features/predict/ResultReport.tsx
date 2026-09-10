"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Printer, 
  Sparkles, 
  MessageSquare, 
  ArrowRight, 
  Award, 
  Compass, 
  Brain, 
  Lightbulb, 
  BadgeCheck,
  Building2,
  CheckCircle2
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid, 
  ReferenceLine 
} from "recharts";
import { GOAL_BY_ID } from "@/services/predict";
import GiaiThichSHAP from "@/components/features/predict/GiaiThichSHAP";
import { BorderBeam } from "@/components/motion/BorderBeam";

// ============================================================================
// DỮ LIỆU CƠ BẢN 39 NGÀNH HUIT
// ============================================================================
const MAJORS_DB: Record<string, {
  name: string;
  code: string;
  faculty: string;
  facultyId: number;
  careers: string[];
  desc: string;
  blocks: string[];
}> = {
  "7480201": { 
    name: "Công Nghệ Thông Tin", 
    code: "7480201", 
    faculty: "CNTT & AI", 
    facultyId: 0, 
    careers: ["Kỹ sư phát triển phần mềm", "Kỹ sư giải pháp đám mây (Cloud)", "Quản trị hệ thống doanh nghiệp"], 
    desc: "Đào tạo chuyên sâu về kỹ thuật phần mềm, lập trình ứng dụng di động, hệ thống phân tán và kiến trúc dữ liệu hiện đại.", 
    blocks: ["A00", "A01", "D01", "X26"]
  },
  "7480107": { 
    name: "Trí Tuệ Nhân Tạo", 
    code: "7480107", 
    faculty: "CNTT & AI", 
    facultyId: 0, 
    careers: ["Kỹ sư Machine Learning", "Chuyên viên Computer Vision & NLP", "Kỹ sư AI tạo sinh"], 
    desc: "Nghiên cứu các thuật toán học máy tiên tiến, xử lý ngôn ngữ tự nhiên và tích hợp giải pháp AI vào công nghiệp 4.0.", 
    blocks: ["A00", "A01", "D01", "X26"]
  },
  "7460108": { 
    name: "Khoa Học Dữ Liệu", 
    code: "7460108", 
    faculty: "CNTT & AI", 
    facultyId: 0, 
    careers: ["Data Analyst", "Data Scientist", "Chuyên viên phân tích chiến lược kinh doanh"], 
    desc: "Thu thập, làm sạch và khai phá dữ liệu lớn (Big Data) nhằm hỗ trợ ra quyết định chiến lược cho doanh nghiệp.", 
    blocks: ["A00", "A01", "D01", "X26"]
  },
  "7480202": { 
    name: "An Toàn Thông Tin", 
    code: "7480202", 
    faculty: "CNTT & AI", 
    facultyId: 0, 
    careers: ["Chuyên viên an ninh mạng", "Kỹ sư bảo mật hệ thống", "SOC Analyst"], 
    desc: "Chuyên sâu về mật mã học, phòng thủ không gian mạng, kiểm thử xâm nhập và ứng cứu sự cố bảo mật.", 
    blocks: ["A00", "A01", "D01", "X26"]
  },
  "7340115": { 
    name: "Marketing", 
    code: "7340115", 
    faculty: "Kinh Doanh & Quản Lý", 
    facultyId: 1, 
    careers: ["Digital Marketing Specialist", "Quản lý nhãn hàng (Brand Manager)", "Chuyên viên nghiên cứu thị trường"], 
    desc: "Nghiên cứu hành vi người tiêu dùng, xây dựng chiến lược truyền thông tích hợp và quản trị thương hiệu số.", 
    blocks: ["D01", "A00", "A01", "C01"]
  },
  "7340101": { 
    name: "Quản Trị Kinh Doanh", 
    code: "7340101", 
    faculty: "Kinh Doanh & Quản Lý", 
    facultyId: 1, 
    careers: ["Quản lý dự án", "Chuyên viên phát triển kinh doanh", "Điều hành vận hành doanh nghiệp"], 
    desc: "Trang bị tư duy lãnh đạo, hoạch định chiến lược kinh doanh và quản trị chuỗi giá trị tổ chức.", 
    blocks: ["D01", "A00", "A01", "C01"]
  },
  "7510605": { 
    name: "Logistics & Quản Lý Chuỗi Cung Ứng", 
    code: "7510605", 
    faculty: "Kinh Doanh & Quản Lý", 
    facultyId: 1, 
    careers: ["Chuyên viên chuỗi cung ứng", "Điều phối kho thông minh", "Chuyên viên giao nhận vận tải quốc tế"], 
    desc: "Tối ưu hóa dòng luân chuyển hàng hóa, quản trị kho bãi và logistics thông minh trong chuỗi giá trị toàn cầu.", 
    blocks: ["D01", "A00", "A01", "C01"]
  },
  "7810201": { 
    name: "Quản Trị Khách Sạn", 
    code: "7810201", 
    faculty: "Du Lịch, Khách Sạn & Ẩm Thực", 
    facultyId: 2, 
    careers: ["Quản lý tiền sảnh (Front Office)", "Giám sát dịch vụ ẩm thực & sự kiện", "Quản lý vận hành khu nghỉ dưỡng"], 
    desc: "Nắm vững quy trình vận hành khách sạn 5 sao quốc tế, nghệ thuật phục vụ và quản trị trải nghiệm khách hàng.", 
    blocks: ["D01", "C00", "D14", "D15"]
  },
  "7510203": { 
    name: "Công Nghệ Kỹ Thuật Cơ Điện Tử", 
    code: "7510203", 
    faculty: "Kỹ Thuật & Công Nghệ", 
    facultyId: 3, 
    careers: ["Kỹ sư thiết kế Robot", "Kỹ sư tự động hóa dây chuyền", "Kỹ sư R&D thiết bị thông minh"], 
    desc: "Giao thoa giữa cơ khí chính xác, điện tử vi điều khiển và lập trình thuật toán điều khiển tự động.", 
    blocks: ["A00", "A01", "D01", "C01"]
  },
  "7540101": { 
    name: "Công Nghệ Thực Phẩm", 
    code: "7540101", 
    faculty: "Thực Phẩm, Sinh Học & Môi Trường", 
    facultyId: 4, 
    careers: ["Chuyên viên R&D phát triển sản phẩm", "Kỹ sư kiểm soát chất lượng (QA/QC)", "Quản đốc nhà máy chế biến"], 
    desc: "Ngành truyền thống mũi nhọn của HUIT, nghiên cứu công nghệ chế biến, bảo quản và phát triển sản phẩm dinh dưỡng.", 
    blocks: ["A00", "B00", "D07", "B08"]
  },
  "7380107": { 
    name: "Luật Kinh Tế", 
    code: "7380107", 
    faculty: "Luật & Luật Kinh Tế", 
    facultyId: 5, 
    careers: ["Chuyên viên pháp chế doanh nghiệp", "Luật sư tư vấn đầu tư thương mại", "Chuyên viên sở hữu trí tuệ"], 
    desc: "Am hiểu luật thương mại, hợp đồng đầu tư, giải quyết tranh chấp kinh tế và quản trị rủi ro pháp lý.", 
    blocks: ["D01", "C00", "C01", "X01"]
  },
  "7220201": { 
    name: "Ngôn Ngữ Anh", 
    code: "7220201", 
    faculty: "Ngoại Ngữ Thương Mại", 
    facultyId: 6, 
    careers: ["Biên - Phiên dịch viên cao cấp", "Chuyên viên đối ngoại & xuất nhập khẩu", "Giảng viên tiếng Anh thương mại"], 
    desc: "Thành thạo tiếng Anh thương mại quốc tế, kỹ năng giao tiếp liên văn hóa và dịch thuật chuyên ngành.", 
    blocks: ["D01", "A01", "D09", "D14"]
  },
};

export function ResultReport() {
  const shouldReduceMotion = useReducedMotion();
  const [reportData, setReportData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("edutalk_predict_data");
      if (saved) {
        try {
          setReportData(JSON.parse(saved));
        } catch (e) {
          console.error("Lỗi đọc dữ liệu khảo sát:", e);
        }
      }
    }
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const apiResult = reportData?.result ?? null;
  const input = reportData?.input ?? null;

  const totalScore = apiResult?.totalScore ?? parseFloat(input?.totalScore ?? "0");
  const block = input?.block || "A00";
  const mode = apiResult?.mode === "guided" ? "guided" : "auto";
  const goalLabel = GOAL_BY_ID[input?.postGradGoal as number] ?? "Chưa chọn";

  const { primaryFaculty, top3Majors, featureImpacts, personalizedNarrative } = useMemo(() => {
    if (apiResult?.majors?.length) {
      const NHAN: Record<string, string> = {
        an_toan: "Trong tầm với (trên mức cao nhất 3 năm)",
        co_kha_nang: "Có khả năng (trong khoảng dao động 3 năm)",
        rui_ro_cao: "Cần cố gắng (dưới mức thấp nhất 3 năm)",
      };

      const majors = apiResult.majors.map((m: any, idx: number) => {
        const info = MAJORS_DB[m.code] || {};
        const ad = m.admission;
        return {
          ...info,
          code: m.code,
          name: m.name,
          faculty: m.field,
          rank: m.rank ?? idx + 1,
          admission: ad,
          explain: m.explain ?? null,
          cutoffs: ad?.cutoffs ?? null,
          safetyStatus: ad?.level ? NHAN[ad.level] : "Chưa có dữ liệu điểm chuẩn",
          blocks: m.subjectGroups?.length ? m.subjectGroups : (info.blocks ?? []),
          desc: info.desc ?? null,
          careers: info.careers ?? [],
        };
      });

      const fields = apiResult.fields ?? [];
      const stage1 = apiResult.fieldsStage1 ?? fields;
      const impacts = (mode === "guided" ? stage1 : fields)
        .slice(0, 5)
        .map((f: any, i: number) => ({
          name: f.name,
          value: Math.round(f.probability * 1000) / 10,
          color: i === 0 ? "#0054A6" : "#0072CE",
        }));

      const chosenField = majors[0]?.faculty ?? null;
      const topFieldProb = fields.find((f: any) => f.name === chosenField)?.probability;
      const nhomText = chosenField ?? "chưa xác định";
      const diemText = apiResult.totalScore != null
        ? `tổng ${apiResult.totalScore} điểm tổ hợp ${block}`
        : "chưa có điểm thi";

      return {
        primaryFaculty:
          mode === "guided"
            ? { name: chosenField ?? "Chưa xác định", match: null }
            : {
                name: chosenField ?? "Chưa xác định",
                match: topFieldProb != null ? Math.round(topFieldProb * 1000) / 10 : null,
              },
        top3Majors: majors,
        featureImpacts: impacts,
        personalizedNarrative:
          mode === "guided"
            ? `Trong nhóm ngành bạn đã chọn, kết hợp với ${diemText} và 10 câu khảo sát sở thích, hệ thống xếp ${majors[0].name} lên đầu danh sách. Đây là gợi ý để bạn tìm hiểu thêm, không phải kết luận — hãy xem cả ${majors.length} ngành bên dưới trước khi quyết định.`
            : `Dựa trên 10 câu khảo sát sở thích và ${diemText}, hệ thống nhận thấy bạn có thiên hướng rõ nhất ở nhóm ${nhomText}. ${majors.length} ngành bên dưới là những lựa chọn đáng tìm hiểu, xếp theo mức phù hợp giảm dần.`,
      };
    }

    return {
      primaryFaculty: { name: "Chưa có dữ liệu", match: 0 },
      top3Majors: [] as any[],
      featureImpacts: [] as any[],
      personalizedNarrative: "Chưa có kết quả khảo sát. Vui lòng làm bài khảo sát để nhận gợi ý ngành học.",
    };
  }, [apiResult, input, mode, block]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Trạng thái chờ khởi tạo client
  if (!mounted) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  // Trạng thái chưa làm khảo sát
  if (!top3Majors.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-16 pb-28">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0054A6] flex items-center justify-center mx-auto shadow-xs">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Chưa có kết quả khảo sát
            </h1>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {reportData
                ? "Phiên làm bài đã hết hạn hoặc dữ liệu không đọc được. Bạn hãy làm lại bài khảo sát để nhận gợi ý ngành học."
                : "Bạn cần hoàn thành bài khảo sát trước khi xem báo cáo định hướng."}
            </p>
          </div>
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0054A6] hover:bg-[#003B73] text-white text-xs font-black transition-all shadow-md shadow-[#0054A6]/20 hover:scale-[1.02] active:scale-[0.97]"
          >
            <Sparkles className="w-4 h-4" />
            Làm bài khảo sát ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* ==================================================================== */}
      {/* VÙNG 1: TOP HEADER ACTION BAR                                        */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link 
            href="/predict" 
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#0054A6] transition mb-2 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> 
            Làm lại bài khảo sát
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] text-[10px] font-black uppercase border border-blue-200">
              {mode === "guided" ? "Tư Vấn Theo Nhóm Ngành" : "Khám Phá Toàn Diện"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Báo Cáo Định Hướng Ngành Học & Tuyển Sinh HUIT
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button 
            onClick={handlePrint}
            className="justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
          >
            <Printer className="w-4 h-4" /> In / Tải PDF
          </button>
          <Link 
            href={`/chat?q=${encodeURIComponent(`Tư vấn chi tiết về ngành ${top3Majors[0].name} tại Trường Đại học Công Thương TP.HCM (HUIT)`)}`}
            className="justify-center px-4 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#003B73] text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-[#0054A6]/20 hover:scale-[1.02] active:scale-[0.97]"
          >
            <MessageSquare className="w-4 h-4" /> Hỏi Trợ Lý AI Về Ngành Này
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 2: HERO BANNER — NGÀNH ĐỨNG ĐẦU (#1)                            */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-br from-[#002855] via-[#0054A6] to-[#0072CE] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-9 shadow-xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-black backdrop-blur-xs mb-4 border border-white/20">
          <Award className="w-3.5 h-3.5 text-cyan-300" />
          <span>Chuyên ngành phù hợp nhất với hồ sơ của bạn</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div className="space-y-3 min-w-0">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {top3Majors[0].name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-[11px] font-bold">
                Mã ngành {top3Majors[0].code}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-300/20 text-cyan-100 text-[11px] font-bold">
                Nhóm {top3Majors[0].faculty}
              </span>
              {top3Majors[0].admission?.level && (
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                    top3Majors[0].admission.level === "an_toan"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : top3Majors[0].admission.level === "co_kha_nang"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {top3Majors[0].safetyStatus}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-50/90 font-medium leading-relaxed max-w-2xl">
              {mode === "guided"
                ? `Xếp hạng trong nhóm ${primaryFaculty.name} mà bạn đã chọn — không ngành nào ngoài nhóm này được đề xuất.`
                : "Xếp hạng trên toàn bộ 39 ngành của trường. Hệ thống phân tích đa chiều để đưa ra thứ tự gợi ý tối ưu."}{" "}
              {top3Majors.length > 1 && `Còn ${top3Majors.length - 1} ngành tiềm năng khác ngay bên dưới.`}
            </p>
          </div>

          {/* Tóm tắt dữ liệu đầu vào */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-3.5 sm:p-4 backdrop-blur-md shrink-0 w-full lg:w-auto">
            <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-2">
              Dữ liệu đầu vào đối soát
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 lg:gap-2 text-xs">
              <div>
                <span className="text-blue-200 font-semibold">Tổ hợp </span>
                <strong className="font-black">{block}</strong>
                {totalScore ? <strong className="font-black"> · {totalScore}đ</strong> : null}
              </div>
              <div>
                <span className="text-blue-200 font-semibold">Mục tiêu </span>
                <strong className="font-black">{goalLabel}</strong>
              </div>
              <div>
                <span className="text-blue-200 font-semibold">Khảo sát </span>
                <strong className="font-black">10/10 câu</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 3: 3 THẺ HƯỚNG DẪN ĐỌC BÁO CÁO                                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { n: "1", t: "Danh sách ngành gợi ý", d: `${top3Majors.length} ngành xếp theo mức phù hợp giảm dần — đây là câu trả lời trọng tâm.`, icon: Award },
          { n: "2", t: "Khả năng trúng tuyển", d: "Đối chiếu mức điểm của bạn với điểm chuẩn 3 năm gần nhất của trường HUIT.", icon: BadgeCheck },
          { n: "3", t: "Mức độ phù hợp nhóm", d: "Mô hình ước lượng tỷ trọng thiên hướng với từng nhóm ngành để tham khảo.", icon: Compass },
        ].map((s) => (
          <div 
            key={s.n} 
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3.5 hover:shadow-md transition-all hover:scale-[1.01]"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0054A6] flex items-center justify-center shrink-0 font-black">
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900">{s.t}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 4: DANH SÁCH CÁC NGÀNH ĐƯỢC ĐỀ XUẤT                             */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#0054A6]" />
            Danh Sách {top3Majors.length} Chuyên Ngành Bạn Nên Tìm Hiểu
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Xếp hạng theo độ tương thích giảm dần từ thuật toán. Hãy đối chiếu cả {top3Majors.length} ngành trước khi đưa ra quyết định đặt nguyện vọng:
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {top3Majors.map((major: any, idx: number) => {
            const isTop1 = idx === 0;
            return (
              <div 
                key={major.code}
                className={`p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border transition-all bg-white relative overflow-hidden ${
                  isTop1 
                    ? "border-[#0054A6] shadow-xl ring-2 ring-[#0054A6]/20 shadow-[#0054A6]/5" 
                    : "border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                {isTop1 && (
                  <BorderBeam size={120} duration={8} colorFrom="#00B4D8" colorTo="#0054A6" borderWidth={2} />
                )}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 sm:gap-6 relative z-10">
                  
                  {/* Left info */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-xs ${
                      idx === 0 
                        ? "bg-[#0054A6] text-white shadow-md shadow-[#0054A6]/20" 
                        : idx === 1 
                        ? "bg-blue-50 text-[#0054A6] border border-blue-200" 
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      #{major.rank}
                    </div>

                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900">{major.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[11px] font-black border border-slate-200">
                          Mã: {major.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0054A6] text-[11px] font-bold border border-blue-200">
                          {major.faculty}
                        </span>
                      </div>
                      {major.desc ? (
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{major.desc}</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">
                          Chưa có phần mô tả cho ngành này — xem chi tiết ở trang Danh mục ngành.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Score & Safety */}
                  <div className="flex sm:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 bg-slate-50 lg:bg-transparent p-4 lg:p-0 rounded-2xl">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thứ hạng gợi ý</div>
                      <div className="text-2xl font-black text-[#0054A6]">#{major.rank}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                        major.admission?.level === "an_toan"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : major.admission?.level === "co_kha_nang"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : major.admission?.level === "rui_ro_cao"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {major.safetyStatus}
                    </span>
                  </div>

                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
                  <div className="p-3.5 rounded-2xl border col-span-2 bg-slate-50 border-slate-200/80">
                    <div className="text-slate-500 font-bold text-[10px] uppercase">
                      Điểm chuẩn 3 năm thi tốt nghiệp THPT
                    </div>
                    {major.cutoffs ? (
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {Object.keys(major.cutoffs).sort().map((y: string) => (
                          <span key={y} className="text-[11px] font-bold text-slate-600">
                            {y}:{" "}
                            <span className="text-slate-900 font-black">{major.cutoffs[y]}đ</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 font-bold mt-0.5 text-xs">Ngành mới, đang cập nhật</div>
                    )}
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 col-span-2">
                    <div className="text-slate-500 font-bold text-[10px] uppercase">Tổ hợp môn xét tuyển tại HUIT</div>
                    <div className="text-slate-900 font-black mt-1 flex flex-wrap gap-1.5">
                      {(major.blocks ?? []).map((b: string) => (
                        <span key={b} className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          b === block 
                            ? "bg-[#0054A6] text-white shadow-2xs" 
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vị trí việc làm tiêu biểu */}
                <div className="mt-3 pt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400">Vị trí nghề nghiệp:</span>
                  {(major.careers ?? []).map((career: string, cIdx: number) => (
                    <span key={cIdx} className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                      {career}
                    </span>
                  ))}
                </div>

                {/* Giải thích SHAP */}
                <GiaiThichSHAP explain={major.explain} tenNganh={major.name} />

              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 5: THAM KHẢO THÊM — XÁC SUẤT KHỐI VỚI MỐC ĐOÁN BỪA KHOA HỌC    */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#0054A6] text-xs font-black mb-2 border border-blue-200">
            <Brain className="w-4 h-4" />
            <span>Đối Chiếu Khoa Học & Phân Bổ Nhóm Ngành</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {mode === "guided"
              ? "Nếu Không Chọn Trước, Mô Hình Sẽ Nghiêng Về Nhóm Nào?"
              : "Mức Độ Tương Thích Với Từng Nhóm Ngành"}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {mode === "guided"
              ? "Ở chế độ tư vấn, kết quả được xếp hạng trong nhóm ngành bạn chọn. Biểu đồ dưới đây là xác suất dự đoán khách quan của tầng 1."
              : "Tổng hợp mức độ phù hợp của các ngành trong cùng một nhóm. Có đường đối chứng so với mốc đoán ngẫu nhiên (11.1% = 1/9 nhóm)."}
          </p>
        </div>

        {/* Lời giải thích tự nhiên */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
          <Lightbulb className="w-5 h-5 text-[#0054A6] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {personalizedNarrative}
          </p>
        </div>

        {/* Bar Chart phân tích đóng góp với MỐC ĐOÁN BỪA (11.1%) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider">
            <span>Xác Suất Mô Hình Gán Cho Từng Nhóm Ngành (%)</span>
            <span className="text-[11px] font-bold normal-case text-slate-400">
              Đường nét đứt: Mốc đoán ngẫu nhiên (11.1%)
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={featureImpacts}
                margin={{ 
                  top: 15, 
                  right: isMobile ? 15 : 30, 
                  left: isMobile ? 85 : 160, 
                  bottom: 5 
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "#64748b" }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "#0F172A", fontWeight: "bold" }} 
                  width={isMobile ? 80 : 150} 
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Xác suất mô hình gán"]}
                  contentStyle={{ 
                    borderRadius: "12px", 
                    border: "1px solid #e2e8f0", 
                    fontSize: "12px",
                    background: "#ffffff",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                />
                {/* MỐC ĐOÁN BỪA XUYÊN SUỐT: 1 trong 9 nhóm ngành = 11.1% */}
                <ReferenceLine 
                  x={11.1} 
                  stroke="#0054A6" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5}
                  label={{ 
                    value: "Mốc đoán bừa: 11.1%", 
                    fill: "#0054A6", 
                    fontSize: 10, 
                    position: "top",
                    fontWeight: "bold" 
                  }} 
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {featureImpacts.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VÙNG 6: FOOTER CTA — HỎI AI & TRA CỨU NGÀNH                          */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-[#002855] via-[#0054A6] to-[#0072CE] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-lg font-black">Bạn Cần Tìm Hiểu Thêm Về Học Phí & Chỉ Tiêu Tuyển Sinh?</h3>
          <p className="text-xs text-blue-100 font-medium">
            Trợ lý AI EduTalk luôn sẵn sàng giải đáp chi tiết về chương trình đào tạo và đời sống sinh viên HUIT 24/7.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/majors"
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 hover:scale-[1.02] active:scale-[0.97]"
          >
            Xem 39 Ngành HUIT
          </Link>
          <Link
            href={`/chat?q=${encodeURIComponent(`Tư vấn chương trình đào tạo và học phí ngành ${top3Majors[0].name} HUIT`)}`}
            className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#0054A6] text-xs font-black transition shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.97]"
          >
            <span>Trò Chuyện Với AI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
