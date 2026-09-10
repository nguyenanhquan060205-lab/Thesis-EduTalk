"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { toast } from "sonner";
import { 
  Calculator, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  GraduationCap, 
  Compass, 
  Layers, 
  Briefcase, 
  Brain, 
  Target,
  FlaskConical,
  Cpu,
  Scale,
  Globe2,
  Utensils,
  BarChart3,
  User,
  Check,
  BookOpen,
  Atom,
  Languages,
  TrendingUp,
  Zap,
  Info,
  ShieldCheck,
  Truck,
  Cog,
  Dna
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { PredictService, type CatalogField } from "@/services/predict";
import { ADMISSION_BLOCKS } from "@/lib/admission";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

// ============================================================================
// 1. DỮ LIỆU ĐỊNH DANH 9 NHÓM NGÀNH HUIT (KHỚP PIPELINE RESEARCH3 0..8)
// ============================================================================
const FACULTIES = [
  { 
    id: 0, 
    name: "CNTT & Máy tính", 
    icon: Cpu, 
    desc: "CNTT, Khoa học dữ liệu, An toàn thông tin, Kỹ thuật phần mềm", 
    tag: "4 chuyên ngành"
  },
  { 
    id: 1, 
    name: "Kinh Doanh & Marketing", 
    icon: BarChart3, 
    desc: "Quản trị kinh doanh, Marketing, Thương mại điện tử, Kinh doanh quốc tế", 
    tag: "4 chuyên ngành"
  },
  { 
    id: 2, 
    name: "Tài Chính & Kế Toán", 
    icon: Calculator, 
    desc: "Tài chính ngân hàng, Kế toán, Kiểm toán", 
    tag: "3 chuyên ngành"
  },
  { 
    id: 3, 
    name: "Logistics & Quản Lý Sản Xuất", 
    icon: Truck, 
    desc: "Logistics và quản lý chuỗi cung ứng, Quản lý công nghiệp", 
    tag: "2 chuyên ngành"
  },
  { 
    id: 4, 
    name: "Du Lịch, Khách Sạn & Ẩm Thực", 
    icon: Utensils, 
    desc: "Quản trị khách sạn, Du lịch, Quản trị nhà hàng và dịch vụ ăn uống", 
    tag: "3 chuyên ngành"
  },
  { 
    id: 5, 
    name: "Cơ Khí - Điện - Tự Động Hoá", 
    icon: Cog, 
    desc: "Kỹ thuật cơ điện tử, Cơ khí, Kỹ thuật điện - điện tử, Tự động hoá", 
    tag: "8 chuyên ngành"
  },
  { 
    id: 6, 
    name: "Hoá - Vật Liệu - Dệt May", 
    icon: FlaskConical, 
    desc: "Công nghệ kỹ thuật hoá học, Vật liệu, May, Thiết kế thời trang", 
    tag: "8 chuyên ngành"
  },
  { 
    id: 7, 
    name: "Thực Phẩm, Sinh Học & Môi Trường", 
    icon: Dna, 
    desc: "Công nghệ thực phẩm, Sinh học, Đảm bảo chất lượng, Kỹ thuật môi trường", 
    tag: "6 chuyên ngành"
  },
  { 
    id: 8, 
    name: "Luật & Ngôn Ngữ", 
    icon: Scale, 
    desc: "Luật kinh tế, Luật học, Ngôn ngữ Anh, Ngôn ngữ Trung Quốc", 
    tag: "4 chuyên ngành"
  },
];

// ============================================================================
// 2. MAPPING ICON CHO MÔN HỌC
// ============================================================================
const SUBJECT_ICONS: Record<string, any> = {
  Toan: Calculator,
  Van: BookOpen,
  Anh: Languages,
  Ly: Atom,
  Hoa: FlaskConical,
  Sinh: FlaskConical,
  Su: BookOpen,
  Dia: Compass,
  Tin: Cpu,
  Gdktpl: Scale,
};

// ============================================================================
// 3. 10 CÂU KHẢO SÁT THIÊN HƯỚNG — Đúng thứ tự huấn luyện của mô hình XGBoost
// ============================================================================
const LIKERT_ITEMS = [
  { id: "likert_nang_dong", group: "Tính cách", label: "Năng động & Hoạt bát",
    desc: "Bạn thấy mình là người năng động, hoạt bát, thích vận động và chủ động tham gia nhiều hoạt động xã hội." },
  { id: "likert_huong_noi", group: "Tính cách", label: "Thiên về hướng nội",
    desc: "Bạn thấy thoải mái, tập trung và làm việc hiệu quả nhất khi ở một mình hoặc trong không gian nhóm nhỏ yên tĩnh." },
  { id: "likert_sang_tao", group: "Tư duy", label: "Sáng tạo & Đổi mới",
    desc: "Bạn hay nghĩ ra ý tưởng mới, thích làm mọi việc theo cách riêng và tìm giải pháp khác biệt." },
  { id: "likert_logic", group: "Tư duy", label: "Tư duy logic & Chặt chẽ",
    desc: "Bạn thích suy luận có căn cứ, tìm quy luật và phân tích giải quyết vấn đề theo từng bước rõ ràng." },
  { id: "likert_to_mo", group: "Tư duy", label: "Tò mò & Khám phá",
    desc: "Bạn hay thắc mắc “tại sao”, luôn muốn tìm hiểu nguyên lý vận hành đằng sau những điều mình chưa biết." },
  { id: "likert_thi_nghiem", group: "Sở thích", label: "Thích làm thí nghiệm & Thao tác",
    desc: "Bạn hứng thú với việc tự tay làm thí nghiệm, lắp ráp, thử nghiệm thực tế để trực tiếp quan sát kết quả." },
  { id: "likert_tranh_luan", group: "Sở thích", label: "Thích tranh luận & Phản biện",
    desc: "Bạn tự tin bày tỏ chính kiến của mình, thích tranh luận logic và thuyết phục người khác bằng luận điểm vững chắc." },
  { id: "likert_thiet_ke", group: "Sở thích", label: "Thích thiết kế & Tạo hình",
    desc: "Bạn thích vẽ, thiết kế đồ họa, phối màu hoặc tạo ra hình dáng các sản phẩm trực quan sinh động." },
  { id: "likert_moi_truong", group: "Mối quan tâm", label: "Quan tâm môi trường sinh thái",
    desc: "Bạn đặc biệt quan tâm đến các vấn đề môi trường, phát triển bền vững và bảo tồn tài nguyên thiên nhiên." },
  { id: "likert_dinh_duong", group: "Mối quan tâm", label: "Quan tâm dinh dưỡng & Sức khỏe",
    desc: "Bạn chú trọng đến chế độ dinh dưỡng, nguồn gốc thực phẩm an toàn và thói quen sinh hoạt khoa học." },
];

const LIKERT_GROUPS = [
  { name: "Tính cách", badge: "Tính cách & Tác phong", icon: Zap },
  { name: "Tư duy", badge: "Tư duy & Phân tích", icon: Brain },
  { name: "Sở thích", badge: "Sở thích & Kỹ năng", icon: Compass },
  { name: "Mối quan tâm", badge: "Mối quan tâm thực tiễn", icon: Globe2 },
];

// Thang đo Likert 1-5 theo bảng màu khoá cứng (Slate -> Blue HUIT, không dùng emerald/amber/rose trang trí)
const LIKERT_OPTIONS = [
  { num: 1, text: "Hoàn toàn không", short: "Rất thấp" },
  { num: 2, text: "Ít hứng thú", short: "Thấp" },
  { num: 3, text: "Bình thường", short: "Trung bình" },
  { num: 4, text: "Khá phù hợp", short: "Khá cao" },
  { num: 5, text: "Rất đam mê", short: "Rất cao" },
];

// ============================================================================
// 4. 4 MỤC TIÊU NGHỀ NGHIỆP SAU ĐẠI HỌC
// ============================================================================
const CAREER_GOALS = [
  { 
    id: 1, 
    title: "Doanh Nghiệp & Tập Đoàn", 
    tag: "Thực chiến chuyên môn",
    desc: "Tập trung tích lũy kỹ năng thực tế, làm việc trong môi trường chuyên nghiệp, thăng tiến lên các vị trí quản lý hoặc chuyên gia chuyên sâu.",
    icon: Briefcase
  },
  { 
    id: 3, 
    title: "Khởi Nghiệp & Kinh Doanh Độc Lập", 
    tag: "Sáng tạo & Làm chủ",
    desc: "Tự tay xây dựng dự án riêng, phát triển sản phẩm thương mại độc lập và vận hành mô hình kinh doanh khởi nghiệp.",
    icon: TrendingUp
  },
  { 
    id: 2, 
    title: "Nghiên Cứu Chuyên Sâu & Học Cao Học", 
    tag: "Học thuật & Đổi mới",
    desc: "Theo đuổi học thuật, làm việc tại viện R&D, phòng thí nghiệm công nghệ, giảng dạy đại học hoặc học lên Thạc sĩ/Tiến sĩ.",
    icon: GraduationCap
  },
  { 
    id: 4, 
    title: "Khám Phá & Định Hình Trong Quá Trình Học", 
    tag: "Linh hoạt trải nghiệm",
    desc: "Giữ tinh thần cởi mở; vừa học vừa tích lũy kinh nghiệm thực tế qua các kỳ thực tập và dự án sinh viên để tìm đam mê đích thực.",
    icon: Compass
  },
];

export function PredictWizard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [predictMode, setPredictMode] = useState<"auto" | "guided">("auto");
  const [selectedFaculty, setSelectedFaculty] = useState<number>(0);
  const [selectedBlock, setSelectedBlock] = useState<string>("A00");
  const gender = user?.gender || "Nam";
  const [postGradGoal, setPostGradGoal] = useState<number | null>(null);

  // Điểm thi 3 môn
  const [scores, setScores] = useState<Record<string, string>>({});

  // 10 câu sở thích
  const [likertScores, setLikertScores] = useState<Record<string, number>>({});

  // Catalog tổ hợp từ backend
  const [catalog, setCatalog] = useState<CatalogField[] | null>(null);
  useEffect(() => {
    PredictService.catalog()
      .then((d) => setCatalog(d.fields))
      .catch(() => setCatalog(null));
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lọc tổ hợp hợp lệ theo nhóm ngành nếu chọn chế độ guided
  const allowedBlocks = useMemo(() => {
    const all = Object.keys(ADMISSION_BLOCKS);
    if (predictMode !== "guided" || !catalog) return all;
    const field = catalog.find((f) => f.id === selectedFaculty);
    if (!field?.subjectGroups?.length) return all;
    return all.filter((b) => field.subjectGroups.includes(b));
  }, [predictMode, catalog, selectedFaculty]);

  // Nếu đổi nhóm ngành mà tổ hợp hiện tại không thuộc nhóm ngành mới
  useEffect(() => {
    if (allowedBlocks.length && !allowedBlocks.includes(selectedBlock)) {
      setSelectedBlock(allowedBlocks[0]);
      setScores({});
    }
  }, [allowedBlocks, selectedBlock]);

  const subjectsOfBlock = useMemo(
    () => ADMISSION_BLOCKS[selectedBlock]?.subjects || [],
    [selectedBlock]
  );

  const parsedScores = useMemo(
    () =>
      subjectsOfBlock.map((sub) => {
        const raw = (scores[sub.id] ?? "").trim();
        const val = raw === "" ? NaN : parseFloat(raw);
        return { id: sub.id, raw, val, ok: !isNaN(val) && val >= 0 && val <= 10 };
      }),
    [subjectsOfBlock, scores]
  );

  const allScoresOk = parsedScores.length > 0 && parsedScores.every((p) => p.ok);

  const { totalScore, avgScore } = useMemo(() => {
    if (!allScoresOk) return { totalScore: null as number | null, avgScore: null as number | null };
    const sum = parsedScores.reduce((a, p) => a + p.val, 0);
    return { totalScore: sum, avgScore: sum / (parsedScores.length || 1) };
  }, [parsedScores, allScoresOk]);

  // Tiến trình hoàn thành từng bước
  const likertAnswered = LIKERT_ITEMS.filter(
    (i) => typeof likertScores[i.id] === "number"
  ).length;
  const step1Done = allScoresOk;
  const step2Done = postGradGoal !== null;
  const step3Done = likertAnswered === LIKERT_ITEMS.length;

  const canGoToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return step1Done;
    if (step === 3) return step1Done && step2Done;
    return false;
  };

  const handleBlockSelect = (blockKey: string) => {
    setSelectedBlock(blockKey);
    setScores({});
    setSubmitError(null);
  };

  const handleScoreChange = (subjectId: string, value: string) => {
    setScores(prev => ({ ...prev, [subjectId]: value }));
  };

  const handlePresetScore = (subjectId: string, value: number) => {
    setScores(prev => ({ ...prev, [subjectId]: value.toString() }));
  };

  const handleLikertChange = (id: string, val: number) => {
    setLikertScores(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const subjectOrder = (ADMISSION_BLOCKS[selectedBlock]?.subjects || []).map((s) => s.id);
    const invalid = subjectOrder.filter((id) => {
      const v = parseFloat(scores[id] ?? "");
      return isNaN(v) || v < 0 || v > 10;
    });
    if (invalid.length) {
      toast.error("Điểm mỗi môn phải là số trong khoảng 0 đến 10.");
      setSubmitError("Điểm mỗi môn phải là số trong khoảng 0 đến 10.");
      setIsSubmitting(false);
      setCurrentStep(1);
      return;
    }
    if (postGradGoal === null) {
      toast.error("Vui lòng chọn 1 mục tiêu phát triển sau khi tốt nghiệp.");
      setSubmitError("Vui lòng chọn 1 mục tiêu phát triển sau khi tốt nghiệp.");
      setIsSubmitting(false);
      setCurrentStep(2);
      return;
    }
    if (!step3Done) {
      const msg = `Bạn đã trả lời ${likertAnswered}/${LIKERT_ITEMS.length} câu. Vui lòng hoàn thành tất cả 10 câu để mô hình AI phân tích chính xác nhất.`;
      toast.error(msg);
      setSubmitError(msg);
      setIsSubmitting(false);
      return;
    }

    try {
      // Cờ save: true nếu user đã đăng nhập để lưu lịch sử, false nếu khách
      const result = await PredictService.recommend({
        likertScores,
        block: selectedBlock,
        scores,
        subjectOrder,
        goalId: postGradGoal,
        facultyId: predictMode === "guided" ? selectedFaculty : null,
        gender,
        limit: 3,
        save: !!user?.id,
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "edutalk_predict_data",
          JSON.stringify({
            result,
            input: {
              mode: predictMode,
              selectedFaculty: predictMode === "guided" ? selectedFaculty : null,
              block: selectedBlock,
              scores,
              totalScore,
              avgScore,
              gender,
              postGradGoal,
              likertScores,
            },
            timestamp: new Date().toISOString(),
          })
        );
      }
      toast.success("Phân tích thành công! Đang chuyển đến kết quả...");
      router.push("/result");
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };
      const detail = e.response?.data?.detail;
      const status = e.response?.status;
      const errorMsg = status === 503
        ? "Máy chủ đang cập nhật mô hình học máy. Vui lòng thử lại sau giây lát."
        : status === 422
        ? `Dữ liệu chưa hợp lệ: ${typeof detail === "string" ? detail : "vui lòng kiểm tra lại thông tin nhập."}`
        : e.message?.includes("Network")
        ? "Không thể kết nối đến máy chủ tuyển sinh. Vui lòng kiểm tra kết nối mạng."
        : "Có lỗi xảy ra trong quá trình phân tích. Vui lòng thử lại.";
      
      toast.error(errorMsg);
      setSubmitError(errorMsg);
      setIsSubmitting(false);
    }
  };

  // Tính phần trăm tiến trình tổng thể
  const overallProgress = useMemo(() => {
    let p = 0;
    if (step1Done) p += 34;
    if (step2Done) p += 33;
    if (step3Done) p += 33;
    else if (currentStep === 3) p += Math.round((likertAnswered / LIKERT_ITEMS.length) * 33);
    return Math.min(100, p);
  }, [step1Done, step2Done, step3Done, currentStep, likertAnswered]);

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. THANH TIẾN TRÌNH STEPPER HIỆN ĐẠI                                 */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0054A6] text-xs font-black">
              <GraduationCap className="w-4 h-4 text-[#0054A6]" />
              <span>Tuyển Sinh Đại Học Công Thương TP.HCM (HUIT) 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tư Vấn & Khảo Sát Định Hướng Ngành Học
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Pipeline XGBoost phân tích điểm thi THPT, mục tiêu nghề nghiệp và thiên hướng cá nhân trên 63 đặc trưng.
            </p>
          </div>

          {/* User profile info */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-auto">
            <div className="w-8 h-8 rounded-xl bg-[#0054A6] text-white flex items-center justify-center font-black text-xs shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-black text-slate-900">{user?.name || "Thí sinh tự do"}</div>
              <div className="text-[10px] text-slate-500 font-semibold">Giới tính: {gender}</div>
            </div>
          </div>
        </div>

        {/* CONNECTED WIZARD STEPPER */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span className="text-slate-900 font-black flex items-center gap-1.5">
              <span>Tiến trình khảo sát:</span>
              <span className="text-[#0054A6] font-black inline-flex items-center">
                <NumberFlow value={overallProgress} />%
              </span>
            </span>
            <span className="text-[11px] font-bold text-slate-500">Bước {currentStep} trên 3</span>
          </div>

          {/* Stepper bar with buttons */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { step: 1, title: "1. Phương thức & Điểm thi", short: "Điểm thi", icon: Calculator, done: step1Done },
              { step: 2, title: "2. Mục tiêu nghề nghiệp", short: "Mục tiêu", icon: Briefcase, done: step2Done },
              { step: 3, title: "3. 10 câu khảo sát", short: "Khảo sát", icon: Brain, done: step3Done },
            ].map((tab) => {
              const isCurrent = currentStep === tab.step;
              const isDone = tab.done;
              const accessible = canGoToStep(tab.step);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.step}
                  type="button"
                  disabled={!accessible}
                  onClick={() => accessible && setCurrentStep(tab.step)}
                  className={`relative p-2 sm:p-3.5 rounded-xl sm:rounded-2xl text-left transition-all flex items-center gap-2 sm:gap-3 border ${
                    isCurrent
                      ? "bg-blue-50/80 border-[#0054A6] shadow-sm text-slate-900 ring-1 ring-[#0054A6]/20"
                      : isDone
                      ? "bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100/80 cursor-pointer hover:border-slate-300"
                      : "bg-slate-50/40 border-slate-200/60 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-colors ${
                    isCurrent
                      ? "bg-[#0054A6] text-white shadow-xs"
                      : isDone
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}>
                    {isDone && !isCurrent ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" /> : <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>

                  <div className="overflow-hidden">
                    <div className={`text-xs font-black truncate ${isCurrent ? "text-[#0054A6]" : "text-slate-800"}`}>
                      <span className="hidden sm:inline">{tab.title}</span>
                      <span className="sm:hidden">{tab.short}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">
                      {isDone ? "Đã hoàn tất" : isCurrent ? "Đang thực hiện" : "Chưa thực hiện"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. NỘI DUNG TỪNG STEP                                                */}
      {/* ==================================================================== */}
      <AnimatePresence mode="wait">
        
        {/* ================================================================== */}
        {/* BƯỚC 1: PHƯƠNG THỨC TƯ VẤN & NHẬP ĐIỂM THI                        */}
        {/* ================================================================== */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* LỰA CHỌN PHƯƠNG THỨC TƯ VẤN */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#0054A6]" />
                  <span>Chọn Cơ Chế Tư Vấn Phù Hợp:</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  EduTalk hỗ trợ 2 cơ chế phân tích dựa trên mức độ định hình ngành nghề ban đầu của bạn:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chế độ 1: Toàn diện */}
                <div 
                  onClick={() => setPredictMode("auto")}
                  className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 sm:gap-4 relative hover:scale-[1.01] active:scale-[0.98] ${
                    predictMode === "auto" 
                      ? "border-[#0054A6] bg-blue-50/40 shadow-sm ring-1 ring-[#0054A6]/20" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    predictMode === "auto" ? "bg-[#0054A6] text-white shadow-xs" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Khám Phá Toàn Diện</span>
                      <span className="px-2 py-0.5 text-[10px] font-black bg-blue-50 text-[#0054A6] border border-blue-200 rounded-full">
                        Mặc định
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Phù hợp khi bạn chưa chọn ngành cụ thể. Mô hình tự động phân tích cả nhóm ngành lẫn 39 chuyên ngành để tìm ra ngành học phù hợp nhất.
                    </p>
                  </div>
                  {predictMode === "auto" && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#0054A6] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Chế độ 2: Guided */}
                <div 
                  onClick={() => setPredictMode("guided")}
                  className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 sm:gap-4 relative hover:scale-[1.01] active:scale-[0.98] ${
                    predictMode === "guided" 
                      ? "border-[#0054A6] bg-blue-50/40 shadow-sm ring-1 ring-[#0054A6]/20" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                    predictMode === "guided" ? "bg-[#0054A6] text-white shadow-xs" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">Tư Vấn Theo Nhóm Ngành</span>
                      <span className="px-2 py-0.5 text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                        Định hướng trước
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Dành cho bạn đã chọn sẵn 1 trong 9 nhóm ngành HUIT (CNTT, Kinh tế, Du lịch, Kỹ thuật...). Mô hình sẽ xếp hạng sâu bên trong nhóm đó.
                    </p>
                  </div>
                  {predictMode === "guided" && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#0054A6] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* BẢNG 9 NHÓM NGÀNH HUIT (KHI CHỌN GUIDED) */}
              {predictMode === "guided" && (
                <div className="pt-4 border-t border-slate-100 space-y-3 animate-fade-in-up">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Chọn 1 Trong 9 Nhóm Ngành Định Hướng:
                    </div>
                    <span className="text-[11px] font-bold text-[#0054A6]">
                      Đang chọn: {FACULTIES[selectedFaculty]?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
                    {FACULTIES.map((fac) => {
                      const Icon = fac.icon;
                      const isSelected = selectedFaculty === fac.id;
                      return (
                        <div
                          key={fac.id}
                          onClick={() => setSelectedFaculty(fac.id)}
                          className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-2.5 sm:gap-3 relative hover:scale-[1.02] active:scale-[0.98] ${
                            isSelected 
                              ? "border-[#0054A6] bg-blue-50/50 shadow-xs ring-1 ring-[#0054A6]/20" 
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-[#0054A6] text-white shadow-2xs" : "bg-slate-100 text-slate-600"
                          }`}>
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </div>
                          <div className="overflow-hidden pr-2 sm:pr-4">
                            <div className="text-[11px] sm:text-xs font-black text-slate-900 truncate">{fac.name}</div>
                            <div className="text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate mt-0.5">{fac.tag}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full bg-[#0054A6] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CHỌN TỔ HỢP XÉT TUYỂN & BẢNG ĐIỂM THI TẬP TRUNG */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#0054A6]" />
                    <span>Tổ Hợp Xét Tuyển & Nhập Điểm 3 Môn:</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                    {predictMode === "guided" && allowedBlocks.length < Object.keys(ADMISSION_BLOCKS).length
                      ? `Hiển thị ${allowedBlocks.length} tổ hợp có xét tuyển ngành thuộc "${FACULTIES[selectedFaculty]?.name}".`
                      : "15 tổ hợp chính thức theo đề án tuyển sinh HUIT 2026. Chọn tổ hợp phù hợp thế mạnh của bạn:"}
                  </p>
                </div>

                {/* Score Summary Badge with NumberFlow */}
                {totalScore !== null && (
                  <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-200/80 shrink-0 self-start sm:self-auto">
                    <div>
                      <div className="text-[10px] font-black uppercase text-[#0054A6] tracking-wider">Tổng Điểm 3 Môn</div>
                      <div className="text-lg font-black text-[#0054A6] flex items-center">
                        <NumberFlow value={totalScore} format={{ minimumFractionDigits: 1, maximumFractionDigits: 2 }} />
                        <span className="text-xs font-bold text-slate-500 ml-1">/ 30</span>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-blue-200" />
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Điểm TB</div>
                      <div className="text-sm font-black text-slate-800">
                        <NumberFlow value={avgScore!} format={{ minimumFractionDigits: 1, maximumFractionDigits: 2 }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GRID 15 TỔ HỢP XÉT TUYỂN */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Chọn Tổ Hợp Xét Tuyển:</span>
                  <span className="text-slate-500 font-bold normal-case text-[11px]">
                    Đang chọn: <strong className="text-[#0054A6] font-black">{selectedBlock}</strong> ({ADMISSION_BLOCKS[selectedBlock]?.name})
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {allowedBlocks.map((key) => {
                    const config = ADMISSION_BLOCKS[key];
                    const isSelected = selectedBlock === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleBlockSelect(key)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "border-[#0054A6] bg-[#0054A6] text-white font-black shadow-sm ring-2 ring-[#0054A6]/30"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 font-bold"
                        }`}
                      >
                        <div className="text-xs font-black">{key}</div>
                        <div className={`text-[9px] truncate mt-0.5 font-semibold ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                          {config.subjects.map(s => s.label).join("-")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 THẺ NHẬP ĐIỂM THI (SCORECARD) */}
              <div className="bg-slate-50/70 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Bảng Điểm 3 Môn Tổ Hợp {selectedBlock}:
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Thang điểm 10 · Nhập từ 0 đến 10</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {ADMISSION_BLOCKS[selectedBlock]?.subjects.map((sub, idx) => {
                    const Icon = SUBJECT_ICONS[sub.id] || Calculator;
                    const rawVal = scores[sub.id] ?? "";
                    const numVal = parseFloat(rawVal);
                    const isInvalid = rawVal !== "" && (isNaN(numVal) || numVal < 0 || numVal > 10);
                    const isEntered = rawVal !== "" && !isInvalid;

                    return (
                      <div 
                        key={sub.id} 
                        className={`bg-white p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                          isInvalid 
                            ? "border-red-300 ring-2 ring-red-100" 
                            : isEntered 
                            ? "border-blue-200 ring-1 ring-blue-100" 
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0054A6] flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black text-slate-900">
                              Môn {sub.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            Môn #{idx + 1}
                          </span>
                        </div>

                        {/* Input Box */}
                        <div>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={rawVal}
                            onChange={(e) => handleScoreChange(sub.id, e.target.value)}
                            placeholder="0.0"
                            className={`w-full text-center text-2xl font-black text-slate-900 bg-slate-50 border rounded-xl py-2.5 transition-all focus:bg-white focus:ring-2 focus:ring-[#0054A6] focus:outline-hidden ${
                              isInvalid ? "border-red-400 text-red-600" : "border-slate-200"
                            }`}
                          />
                          {isInvalid && (
                            <p className="text-[11px] font-bold text-red-600 text-center mt-1">
                              Điểm phải từ 0 đến 10
                            </p>
                          )}
                        </div>

                        {/* Quick preset buttons */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400">Chọn nhanh:</span>
                          <div className="flex items-center gap-1">
                            {[6.5, 7.5, 8.5, 9.0].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handlePresetScore(sub.id, preset)}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-[#0054A6] hover:text-white text-slate-600 transition-colors"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTION FOOTER BƯỚC 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500">
                  {step1Done ? (
                    <span className="text-[#0054A6] font-black flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Đã nhập hợp lệ điểm 3 môn tổ hợp {selectedBlock}.
                    </span>
                  ) : (
                    <span>Cần nhập đủ điểm 3 môn (từ 0 đến 10) để tiếp tục sang Bước 2.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!step1Done}
                  onClick={() => setCurrentStep(2)}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm ${
                    step1Done
                      ? "bg-[#0054A6] hover:bg-[#003B73] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <span>Tiếp tục: Bước 2 · Mục tiêu nghề nghiệp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* BƯỚC 2: MỤC TIÊU NGHỀ NGHIỆP SAU ĐẠI HỌC                           */}
        {/* ================================================================== */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0054A6] text-xs font-black mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Bước 2 trên 3</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Kỳ Vọng & Mục Tiêu Phát Triển Sau Khi Tốt Nghiệp:
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Kỳ vọng nghề nghiệp là trọng số thực tế giúp mô hình gợi ý chuyên ngành thực sự gắn liền với tương lai của bạn:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAREER_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = postGradGoal === goal.id;

                return (
                  <div
                    key={goal.id}
                    onClick={() => setPostGradGoal(goal.id)}
                    className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-3 relative hover:scale-[1.01] active:scale-[0.98] ${
                      isSelected 
                        ? "border-[#0054A6] bg-blue-50/40 shadow-sm ring-1 ring-[#0054A6]/20" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-[#0054A6] text-white shadow-xs" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-900">{goal.title}</div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mt-0.5 inline-block">
                            {goal.tag}
                          </span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected ? "bg-[#0054A6] text-white shadow-xs" : "border-2 border-slate-300"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {goal.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS BƯỚC 2 */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại Bước 1
              </button>

              <button
                type="button"
                disabled={!step2Done}
                onClick={() => setCurrentStep(3)}
                className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm ${
                  step2Done
                    ? "bg-[#0054A6] hover:bg-[#003B73] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>Tiếp tục: Bước 3 · 10 Câu Khảo Sát</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* BƯỚC 3: 10 CÂU KHẢO SÁT THIÊN HƯỚNG & PHÂN TÍCH                     */}
        {/* ================================================================== */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-6"
          >
            {/* Header bước 3 + Thanh tiến trình 10 câu */}
            <div className="border-b border-slate-100 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0054A6] text-xs font-black mb-2">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Bước 3 trên 3 · Khảo Sát Thiên Hướng</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    10 Câu Hỏi Trắc Nghiệm Tính Cách, Tư Duy & Sở Thích:
                  </h2>
                </div>

                {/* Counter badge */}
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <span className="text-xs font-bold text-slate-600">Tiến độ câu hỏi:</span>
                  <span className={`text-xs font-black ${step3Done ? "text-[#0054A6]" : "text-slate-900"}`}>
                    {likertAnswered}/{LIKERT_ITEMS.length} câu
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Chọn mức độ phù hợp từ <strong className="text-slate-900">1 (Hoàn toàn không)</strong> đến <strong className="text-slate-900">5 (Rất đam mê / Rất phù hợp)</strong>:
              </p>

              {/* Likert progress track */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0054A6] to-[#0072CE] transition-all duration-300 rounded-full"
                  style={{ width: `${(likertAnswered / LIKERT_ITEMS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* DANH SÁCH 10 CÂU THEO TỪNG NHÓM NĂNG LỰC */}
            <div className="space-y-6">
              {LIKERT_GROUPS.map((group) => {
                const itemsInGroup = LIKERT_ITEMS.filter((i) => i.group === group.name);
                if (!itemsInGroup.length) return null;
                const GroupIcon = group.icon;

                return (
                  <div key={group.name} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 text-[#0054A6] flex items-center justify-center">
                        <GroupIcon className="w-3.5 h-3.5" />
                      </div>
                      <span>{group.badge}</span>
                    </div>

                    <div className="space-y-3">
                      {itemsInGroup.map((item) => {
                        const currentVal = likertScores[item.id];
                        const isAnswered = typeof currentVal === "number";

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 ${
                              isAnswered
                                ? "bg-slate-50/70 border-slate-200"
                                : "bg-white border-dashed border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            <div className="space-y-1 max-w-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-black text-slate-900">
                                  {item.label}
                                </span>
                                {isAnswered && (
                                  <span className="text-[10px] font-bold text-[#0054A6] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                    Đã chọn: Mức {currentVal}/5
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                {item.desc}
                              </p>
                            </div>

                            {/* Segmented 1 - 5 Buttons (Bảng màu Slate -> Blue HUIT, co giãn mượt trên mobile) */}
                            <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shrink-0 w-full sm:w-auto self-stretch sm:self-auto shadow-2xs">
                              {LIKERT_OPTIONS.map((opt) => {
                                const isSelected = currentVal === opt.num;

                                return (
                                  <button
                                    key={opt.num}
                                    type="button"
                                    title={`${opt.num} - ${opt.text}`}
                                    onClick={() => handleLikertChange(item.id, opt.num)}
                                    className={`flex-1 sm:flex-initial w-auto sm:w-11 h-10 sm:h-11 rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center hover:scale-105 active:scale-95 ${
                                      isSelected
                                        ? "bg-[#0054A6] text-white shadow-md scale-105"
                                        : "text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                  >
                                    <span className="text-sm leading-none">{opt.num}</span>
                                    <span className={`text-[8px] mt-0.5 font-bold leading-none truncate max-w-[36px] ${
                                      isSelected ? "text-blue-100" : "text-slate-400"
                                    }`}>
                                      {opt.short}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION FOOTER BƯỚC 3 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại Bước 2
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !step3Done}
                className={`px-8 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                  isSubmitting || !step3Done
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-[#0054A6] hover:bg-[#003B73] text-white shadow-blue-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.97]"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Đang nạp mô hình AI XGBoost & phân tích hồ sơ...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Hoàn Tất & Xem Báo Cáo Định Hướng Ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
