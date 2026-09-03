"use client";

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
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { GOAL_BY_ID } from "@/services/predict";

// ============================================================================
// DỮ LIỆU 39 NGÀNH HUIT
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

export default function ResultPage() {
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("edutalk_predict_data");
      if (saved) {
        try {
          setReportData(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Kết quả THẬT do mô hình XGBoost 2 tầng ở backend trả về
  const apiResult = reportData?.result ?? null;
  const input = reportData?.input ?? null;

  const totalScore = apiResult?.totalScore ?? parseFloat(input?.totalScore ?? "0");
  const block = input?.block || "A00";
  const mode = apiResult?.mode === "guided" ? "guided" : "auto";
  const goalLabel = GOAL_BY_ID[input?.postGradGoal as number] ?? "Chưa chọn";

  // Tính toán kết quả tư vấn cá nhân hóa
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
          // Không hiển thị xác suất thô của mô hình cho người dùng cuối:
          // giá trị thật chỉ quanh 10–15%, hiện ra sẽ tưởng hệ thống hỏng.
          matchScore: null,
          admission: ad,
          cutoffs: ad?.cutoffs ?? null,
          score2024: ad?.cutoffs?.["2024"] ?? null,
          score2025: ad?.cutoffs?.["2025"] ?? null,
          score2026: ad?.cutoffs?.["2026"] ?? null,
          safetyStatus: ad?.level ? NHAN[ad.level] : "Chưa có dữ liệu điểm chuẩn",
          // 27/39 ngành chưa có nội dung mô tả trong MAJORS_DB — để trống thay vì bịa
          blocks: m.subjectGroups?.length ? m.subjectGroups : (info.blocks ?? []),
          desc: info.desc ?? null,
          careers: info.careers ?? [],
        };
      });

      // `fields` = phân bố nhóm ngành CUỐI CÙNG (đã gộp từ danh sách ngành),
      // `fieldsStage1` = dự đoán thô của riêng tầng 1, chỉ để đối chiếu ở guided.
      const fields = apiResult.fields ?? [];
      const stage1 = apiResult.fieldsStage1 ?? fields;
      // Biểu đồ dùng xác suất khối ngành THẬT của mô hình, không phải số minh hoạ
      const impacts = (mode === "guided" ? stage1 : fields)
        .slice(0, 5)
        .map((f: any, i: number) => ({
          name: f.name,
          value: Math.round(f.probability * 1000) / 10,
          color: i === 0 ? "#0054A6" : "#0072CE",
        }));

      const chosenFieldText = apiResult.majors[0]?.field ?? "chưa xác định";
      const nhomText = chosenFieldText;
      const diemText = apiResult.totalScore != null
        ? `tổng ${apiResult.totalScore} điểm tổ hợp ${block}`
        : "chưa có điểm thi";

      // Ở chế độ tư vấn, nhóm ngành là do NGƯỜI DÙNG chọn — tầng 1 không tham gia
      // xếp hạng (công thức là p2 × mask khối, không có p1). Trước đây chỗ này lấy
      // fields[0] cho cả hai chế độ nên banner hiện nhóm do mô hình tự đoán, trong
      // khi danh sách ngành bên dưới lại thuộc nhóm người dùng chọn → tự mâu thuẫn.
      const chosenField = majors[0]?.faculty ?? null;

      // Ở explore, banner cũng phải bám vào ngành #1 chứ không lấy argmax riêng của
      // phân bố nhóm: xếp theo TỔNG cả nhóm và theo NGÀNH mạnh nhất là hai tiêu chí
      // khác nhau (nhóm 10 ngành trung bình vẫn thắng tổng nhóm 2 ngành rất mạnh),
      // nên 16/102 sinh viên thật thấy banner một nhóm mà ngành #1 lại nhóm khác.
      const topFieldProb = fields.find((f: any) => f.name === chosenField)?.probability;

      return {
        primaryFaculty:
          mode === "guided"
            ? { name: chosenField ?? "Chưa xác định", match: null }
            : {
                name: chosenField ?? "Chưa xác định",
                match:
                  topFieldProb != null ? Math.round(topFieldProb * 1000) / 10 : null,
              },
        top3Majors: majors,
        featureImpacts: impacts,
        personalizedNarrative:
          mode === "guided"
            ? `Trong nhóm ngành bạn đã chọn, kết hợp với ${diemText} và 10 câu khảo sát sở thích, hệ thống xếp ${majors[0].name} lên đầu danh sách. Đây là gợi ý để bạn tìm hiểu thêm, không phải kết luận — hãy xem cả ${majors.length} ngành bên dưới trước khi quyết định.`
            : `Dựa trên 10 câu khảo sát sở thích và ${diemText}, hệ thống nhận thấy bạn có thiên hướng rõ nhất ở nhóm ${nhomText}. ${majors.length} ngành bên dưới là những lựa chọn đáng tìm hiểu, xếp theo mức phù hợp giảm dần.`,
      };
    }

    // Chưa có kết quả từ máy chủ — không bịa số liệu
    if (!apiResult) {
      return {
        primaryFaculty: { name: "Chưa có dữ liệu", match: 0 },
        top3Majors: [] as any[],
        featureImpacts: [] as any[],
        personalizedNarrative:
          "Chưa có kết quả khảo sát. Vui lòng làm bài khảo sát để nhận gợi ý ngành học.",
      };
    }

    // Không còn nhánh dự phòng nào — mọi số liệu hiển thị đều đến từ mô hình thật.
    // Trước đây chỗ này hardcode CNTT/AI/Khoa học dữ liệu với điểm khớp bịa (92.6/87.2/80.4).
    return {
      primaryFaculty: { name: "Chưa có dữ liệu", match: 0 },
      top3Majors: [] as any[],
      featureImpacts: [] as any[],
      personalizedNarrative: "Không đọc được kết quả. Vui lòng làm lại bài khảo sát.",
    };
  }, [apiResult, input, mode, totalScore, block]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Vào thẳng /result mà chưa làm khảo sát, hoặc phiên đã hết —
  // hiển thị màn hình trống thay vì dựng báo cáo từ dữ liệu không có.
  if (!top3Majors.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-16 pb-28">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F8FA] text-[#0054A6] flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">
              Chưa có kết quả khảo sát
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {reportData
                ? "Phiên làm bài đã hết hạn hoặc dữ liệu không đọc được. Bạn hãy làm lại bài khảo sát để nhận gợi ý ngành học."
                : "Bạn cần hoàn thành bài khảo sát trước khi xem báo cáo định hướng."}
            </p>
          </div>
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition"
          >
            <Sparkles className="w-4 h-4" />
            Làm bài khảo sát
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-28 space-y-8 animate-fade-in-up">
      
      {/* ==================================================================== */}
      {/* TOP HEADER ACTION BAR */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <Link 
            href="/predict" 
            className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#0054A6] transition mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Làm lại bài khảo sát
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#0054A6]/10 text-[#0054A6] text-[10px] font-black uppercase">
              {mode === "guided" ? "Tư Vấn Theo Nhóm Ngành" : "Khám Phá Toàn Diện"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight mt-1">
            Báo Cáo Định Hướng Ngành Học & Đánh Giá Tuyển Sinh
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In / Tải PDF Báo Cáo
          </button>
          <Link 
            href={`/chat?q=${encodeURIComponent(`Tư vấn chi tiết về ngành ${top3Majors[0].name} tại Trường Đại học Công Thương TP.HCM (HUIT)`)}`}
            className="px-4 py-2.5 rounded-xl bg-[#0054A6] hover:bg-[#0072CE] text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-[#0054A6]/20"
          >
            <MessageSquare className="w-4 h-4" /> Hỏi Trợ Lý AI Về Ngành Này
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. KẾT QUẢ CHÍNH — NGÀNH ĐỨNG ĐẦU                                    */}
      {/*    Câu trả lời của hệ thống là DANH SÁCH NGÀNH, nên ngành #1 phải là  */}
      {/*    thứ to nhất trên trang. Trước đây chỗ này để nhóm ngành, khiến    */}
      {/*    người dùng tưởng nhóm mới là kết quả rồi thấy mâu thuẫn bên dưới. */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-br from-[#003B73] via-[#0054A6] to-[#0072CE] text-white rounded-3xl p-6 sm:p-9 shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-black backdrop-blur-xs mb-4">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>Ngành phù hợp nhất với bạn</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
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
                      ? "bg-emerald-300 text-emerald-950"
                      : top3Majors[0].admission.level === "co_kha_nang"
                        ? "bg-amber-300 text-amber-950"
                        : "bg-rose-300 text-rose-950"
                  }`}
                >
                  {top3Majors[0].safetyStatus}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-50/90 font-medium leading-relaxed max-w-2xl">
              {mode === "guided"
                ? `Xếp hạng trong nhóm ${primaryFaculty.name} mà bạn đã chọn — không ngành nào ngoài nhóm này được đề xuất.`
                : "Xếp hạng trên toàn bộ 39 ngành của trường. Hệ thống không giới hạn bạn trong một nhóm ngành nào."}{" "}
              {top3Majors.length > 1 && `Còn ${top3Majors.length - 1} ngành nữa ngay bên dưới.`}
            </p>
          </div>

          {/* Tóm tắt những gì bạn đã nhập — để người dùng biết kết quả dựa trên đâu */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md shrink-0 w-full lg:w-auto">
            <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-2">
              Kết quả dựa trên
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-2 text-xs">
              <div>
                <span className="text-blue-200 font-semibold">Tổ hợp </span>
                <strong className="font-black">{block}</strong>
                {totalScore ? <strong className="font-black"> · {totalScore} điểm</strong> : null}
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

      {/* Cách đọc trang này — 3 bước, đặt ngay dưới kết quả chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { n: "1", t: "Danh sách ngành", d: `${top3Majors.length} ngành xếp theo mức phù hợp — đây là kết quả chính.`, icon: Award },
          { n: "2", t: "Khả năng trúng tuyển", d: "Đối chiếu điểm của bạn với điểm chuẩn 3 năm gần nhất.", icon: BadgeCheck },
          { n: "3", t: "Nhóm ngành tham khảo", d: "Mô hình đánh giá bạn hợp nhóm nào — chỉ để tham khảo thêm.", icon: Compass },
        ].map((s) => (
          <div key={s.n} className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#0054A6]/10 text-[#0054A6] flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-[#0F172A]">{s.t}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* 2. DANH SÁCH NGÀNH ĐƯỢC ĐỀ XUẤT (số lượng theo `limit` gửi lên API) */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              {top3Majors.length} Ngành Bạn Nên Tìm Hiểu Thêm
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Xếp theo mức phù hợp giảm dần. Đây là gợi ý để bạn tìm hiểu, không phải kết luận —
              hãy xem hết {top3Majors.length} ngành trước khi quyết định.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {top3Majors.map((major: any, idx: number) => {
            const isTop1 = idx === 0;
            return (
              <div 
                key={major.code}
                className={`p-6 sm:p-8 rounded-3xl border transition-all bg-white relative ${
                  isTop1 
                    ? "border-[#0054A6] shadow-md ring-2 ring-[#0054A6]/10" 
                    : "border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-xs ${
                      idx === 0 
                        ? "bg-amber-400 text-amber-950" 
                        : idx === 1 
                        ? "bg-slate-200 text-slate-800" 
                        : "bg-orange-200 text-orange-950"
                    }`}>
                      #{major.rank}
                    </div>

                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-[#0F172A]">{major.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#F5F8FA] text-slate-700 text-[11px] font-black border border-slate-200">
                          Mã: {major.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#0054A6]/10 text-[#0054A6] text-[11px] font-bold">
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
                  <div className="flex sm:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 bg-[#F5F8FA] lg:bg-transparent p-4 lg:p-0 rounded-2xl">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Thứ hạng phù hợp</div>
                      <div className="text-2xl font-black text-[#0054A6]">#{major.rank}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                        major.admission?.level === "an_toan"
                          ? "bg-emerald-100 text-emerald-800"
                          : major.admission?.level === "co_kha_nang"
                          ? "bg-amber-100 text-amber-800"
                          : major.admission?.level === "rui_ro_cao"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {major.safetyStatus}
                    </span>
                  </div>

                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
                  <div className="p-3.5 rounded-2xl border col-span-2 bg-[#F5F8FA] border-slate-100">
                    <div className="text-slate-400 font-bold text-[10px] uppercase">
                      Điểm chuẩn 3 năm (thi THPT)
                    </div>
                    {major.cutoffs ? (
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {Object.keys(major.cutoffs).sort().map((y: string) => (
                          <span key={y} className="text-[11px] font-bold text-slate-600">
                            {y}:{" "}
                            <span className="text-[#0F172A] font-black">{major.cutoffs[y]}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 font-bold mt-0.5 text-xs">Ngành mới, chưa có</div>
                    )}
                  </div>
                  <div className="bg-[#F5F8FA] p-3.5 rounded-2xl border border-slate-100 col-span-2">
                    <div className="text-slate-400 font-bold text-[10px] uppercase">Tổ hợp môn xét tuyển tại HUIT</div>
                    <div className="text-[#0F172A] font-black mt-1 flex flex-wrap gap-1.5">
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
                    <span key={cIdx} className="px-2.5 py-1 rounded-lg bg-[#F5F8FA] text-slate-700 text-[11px] font-medium border border-slate-200/60">
                      {career}
                    </span>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. THAM KHẢO THÊM: MỨC PHÙ HỢP THEO NHÓM NGÀNH */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F8FA] text-[#0054A6] text-xs font-black mb-2 border border-[#0054A6]/20">
            <Brain className="w-4 h-4" />
            <span>Tham Khảo Thêm</span>
          </div>
          <h2 className="text-lg font-black text-[#0F172A]">
            {mode === "guided"
              ? "Nếu Không Chọn Trước, Mô Hình Sẽ Nghiêng Về Nhóm Nào?"
              : "Mức Phù Hợp Của Bạn Với Từng Nhóm Ngành"}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {mode === "guided"
              ? "Đây chỉ là thông tin tham khảo — ở chế độ tư vấn, kết quả bên trên được xếp hạng HOÀN TOÀN trong nhóm ngành bạn chọn, biểu đồ này không tác động đến thứ hạng."
              : "Cộng mức phù hợp của các ngành trong cùng một nhóm. Bảng này xếp theo CẢ NHÓM nên có thể khác thứ tự ở trên — nhóm nhiều ngành đều đều vẫn có tổng cao hơn nhóm ít ngành nhưng rất hợp với bạn."}
          </p>
        </div>

        {/* Lời giải thích tự nhiên */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F8FA] border border-slate-200/80 flex items-start gap-3.5">
          <Lightbulb className="w-5 h-5 text-[#0054A6] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {personalizedNarrative}
          </p>
        </div>

        {/* Bar Chart phân tích đóng góp */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Xác Suất Mô Hình Gán Cho Từng Nhóm Ngành (%)
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={featureImpacts}
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#0F172A", fontWeight: "bold" }} width={150} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Xác suất mô hình gán"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "12px" }}
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
      {/* 4. FOOTER CTA - HỎI AI & TRA CỨU NGÀNH */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-[#003B73] via-[#0054A6] to-[#0072CE] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-lg font-black">Bạn Cần Tìm Hiểu Thêm Về Học Phí & Chỉ Tiêu Tuyển Sinh?</h3>
          <p className="text-xs text-blue-100 font-medium">
            Trợ lý AI EduTalk luôn sẵn sàng giải đáp chi tiết về chương trình đào tạo và đời sống sinh viên HUIT 24/7.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/majors"
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20"
          >
            Xem 39 Ngành HUIT
          </Link>
          <Link
            href={`/chat?q=${encodeURIComponent(`Tư vấn chương trình đào tạo và học phí ngành ${top3Majors[0].name} HUIT`)}`}
            className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#0054A6] text-xs font-black transition shadow-md flex items-center gap-2"
          >
            <span>Trò Chuyện Với AI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
