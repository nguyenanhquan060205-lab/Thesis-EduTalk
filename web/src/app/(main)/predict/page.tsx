"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Award, 
  TrendingUp,
  Target,
  FlaskConical,
  Cpu,
  Scale,
  Globe2,
  Utensils,
  BarChart3,
  User,
  Check
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { PredictService, type CatalogField } from "@/services/predict";
import { ADMISSION_BLOCKS } from "@/lib/admission";

// 7 Khối ngành HUIT
const FACULTIES = [
  { id: 0, name: "Công Nghệ Thông Tin & AI", icon: Cpu, desc: "CNTT, Khoa học dữ liệu, Trí tuệ nhân tạo, An toàn thông tin", tag: "4 chuyên ngành" },
  { id: 1, name: "Kinh Doanh & Quản Lý", icon: BarChart3, desc: "Marketing, Quản trị kinh doanh, Tài chính, Kế toán, Logistics", tag: "10 chuyên ngành" },
  { id: 2, name: "Du Lịch, Khách Sạn & Ẩm Thực", icon: Utensils, desc: "Quản trị khách sạn, Du lịch, Chế biến món ăn", tag: "6 chuyên ngành" },
  { id: 3, name: "Kỹ Thuật & Công Nghệ", icon: Layers, desc: "Cơ điện tử, Chế tạo máy, Tự động hóa, Điện - Điện tử", tag: "8 chuyên ngành" },
  { id: 4, name: "Thực Phẩm, Sinh Học & Môi Trường", icon: FlaskConical, desc: "Công nghệ thực phẩm, Sinh học, Quản lý môi trường", tag: "7 chuyên ngành" },
  { id: 5, name: "Luật & Luật Kinh Tế", icon: Scale, desc: "Luật học, Luật kinh tế và tư vấn pháp lý doanh nghiệp", tag: "2 chuyên ngành" },
  { id: 6, name: "Ngoại Ngữ Thương Mại", icon: Globe2, desc: "Ngôn ngữ Anh, Ngôn ngữ Trung Quốc thương mại", tag: "2 chuyên ngành" },
];


// 10 câu khảo sát — nội dung bám sát ĐÚNG tên cột mà mô hình đã học.
// Bản trước tự thêm khái niệm không có trong khảo sát gốc ("pháp lý" vào câu tranh
// luận, "ẩm thực" vào câu dinh dưỡng, và câu hướng nội bị viết thành "làm việc độc
// lập"), khiến học sinh trả lời một câu khác với câu mà 574 sinh viên đã trả lời.
// Thứ tự dưới đây trùng thứ tự cột trong dữ liệu huấn luyện.
const LIKERT_ITEMS = [
  { id: "likert_nang_dong", group: "Tính cách", label: "Năng động",
    desc: "Bạn thấy mình là người năng động, hoạt bát, thích vận động và tham gia nhiều hoạt động." },
  { id: "likert_huong_noi", group: "Tính cách", label: "Hướng nội",
    desc: "Bạn thiên về hướng nội: thấy thoải mái hơn khi ở một mình hoặc trong nhóm nhỏ, thay vì nơi đông người." },
  { id: "likert_sang_tao", group: "Tư duy", label: "Sáng tạo",
    desc: "Bạn hay nghĩ ra ý tưởng mới và thích làm mọi việc theo cách của riêng mình." },
  { id: "likert_logic", group: "Tư duy", label: "Tư duy logic",
    desc: "Bạn thích suy luận chặt chẽ, tìm quy luật và giải quyết vấn đề theo từng bước rõ ràng." },
  { id: "likert_to_mo", group: "Tư duy", label: "Tò mò",
    desc: "Bạn hay thắc mắc “tại sao” và thích tìm hiểu những điều mình chưa biết." },
  { id: "likert_thi_nghiem", group: "Sở thích", label: "Thích làm thí nghiệm",
    desc: "Bạn hứng thú với việc tự tay làm thí nghiệm, thử nghiệm để xem kết quả ra sao." },
  { id: "likert_moi_truong", group: "Mối quan tâm", label: "Quan tâm môi trường",
    desc: "Bạn quan tâm đến các vấn đề môi trường và thiên nhiên." },
  { id: "likert_dinh_duong", group: "Mối quan tâm", label: "Quan tâm dinh dưỡng",
    desc: "Bạn quan tâm đến dinh dưỡng và chế độ ăn uống." },
  { id: "likert_tranh_luan", group: "Sở thích", label: "Thích tranh luận",
    desc: "Bạn tự tin bày tỏ quan điểm của mình và thích tranh luận, phản biện." },
  { id: "likert_thiet_ke", group: "Sở thích", label: "Thích thiết kế",
    desc: "Bạn thích vẽ, thiết kế, tạo ra hình dáng hoặc sản phẩm." },
];


export default function PredictPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [predictMode, setPredictMode] = useState<"auto" | "guided">("auto");
  const [selectedFaculty, setSelectedFaculty] = useState<number>(0);
  const [selectedBlock, setSelectedBlock] = useState<string>("A00");
  const [gender, setGender] = useState<string>(user?.gender || "Nam");
  // Không đặt giá trị mặc định cho bất kỳ trường nào: người dùng phải tự nhập,
  // nếu không hệ thống sẽ chạy trên dữ liệu họ chưa từng khai báo.
  const [postGradGoal, setPostGradGoal] = useState<number | null>(null);

  // Điểm thi 3 môn — để trống
  const [scores, setScores] = useState<Record<string, string>>({});

  // 10 câu sở thích — để trống
  const [likertScores, setLikertScores] = useState<Record<string, number>>({});

  // Danh mục khối/ngành + tổ hợp lấy từ backend (một nguồn dữ liệu duy nhất)
  const [catalog, setCatalog] = useState<CatalogField[] | null>(null);
  useEffect(() => {
    PredictService.catalog()
      .then((d) => setCatalog(d.fields))
      .catch(() => setCatalog(null)); // hỏng thì cho chọn cả 15 tổ hợp
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tính tổng điểm & điểm TB
  // Ở chế độ tư vấn, chỉ cho chọn tổ hợp thật sự xét tuyển vào khối đã chọn
  const allowedBlocks = useMemo(() => {
    const all = Object.keys(ADMISSION_BLOCKS);
    if (predictMode !== "guided" || !catalog) return all;
    const field = catalog.find((f) => f.id === selectedFaculty);
    if (!field?.subjectGroups?.length) return all;
    return all.filter((b) => field.subjectGroups.includes(b));
  }, [predictMode, catalog, selectedFaculty]);

  // Đổi khối mà tổ hợp đang chọn không còn hợp lệ → chuyển sang tổ hợp hợp lệ đầu tiên
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

  const allScoresOk = parsedScores.every((p) => p.ok);

  const { totalScore, avgScore } = useMemo(() => {
    if (!allScoresOk) return { totalScore: null as number | null, avgScore: null as number | null };
    const sum = parsedScores.reduce((a, p) => a + p.val, 0);
    return { totalScore: sum, avgScore: sum / (parsedScores.length || 1) };
  }, [parsedScores, allScoresOk]);

  // ── Điều kiện hoàn thành từng bước ────────────────────────────────────────
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
    // Đổi tổ hợp là đổi bộ môn — xoá điểm cũ để không mang số của môn khác sang
    setScores({});
    setSubmitError(null);
  };

  const handleScoreChange = (subjectId: string, value: string) => {
    setScores(prev => ({ ...prev, [subjectId]: value }));
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
      setSubmitError("Điểm mỗi môn phải là số trong khoảng 0 đến 10.");
      setIsSubmitting(false);
      setCurrentStep(1);
      return;
    }
    if (postGradGoal === null) {
      setSubmitError("Bạn chưa chọn mục tiêu sau khi tốt nghiệp.");
      setIsSubmitting(false);
      setCurrentStep(2);
      return;
    }
    if (!step3Done) {
      setSubmitError(
        `Bạn mới trả lời ${likertAnswered}/${LIKERT_ITEMS.length} câu sở thích. Hãy trả lời đủ để hệ thống phân tích chính xác.`
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await PredictService.recommend({
        likertScores,
        block: selectedBlock,
        scores,
        subjectOrder,
        goalId: postGradGoal,
        facultyId: predictMode === "guided" ? selectedFaculty : null,
        gender,
        limit: 3,
        // Đã đăng nhập thì gửi qua /survey/submit để lần tư vấn này được lưu lại
        // và hiện ra ở trang Lịch sử; chưa đăng nhập vẫn xem được kết quả.
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
      router.push("/result");
    } catch (err: unknown) {
      // Không đẩy người dùng sang trang kết quả khi chưa có kết quả thật —
      // thà báo lỗi rõ ràng còn hơn hiển thị số liệu không có thật.
      const e = err as { response?: { status?: number; data?: { detail?: unknown } }; message?: string };
      const detail = e.response?.data?.detail;
      const status = e.response?.status;
      setSubmitError(
        status === 503
          ? "Máy chủ chưa nạp được mô hình dự đoán. Vui lòng thử lại sau."
          : status === 422
          ? `Dữ liệu chưa hợp lệ: ${typeof detail === "string" ? detail : "vui lòng kiểm tra lại các bước."}`
          : e.message?.includes("Network")
          ? "Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại."
          : "Có lỗi xảy ra khi phân tích. Vui lòng thử lại."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4 pb-28 space-y-6">
      
      {/* ==================================================================== */}
      {/* 1. HEADER COMPACT & BREADCRUMB TIẾN TRÌNH */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F8FA] text-[#0054A6] text-xs font-black">
              <GraduationCap className="w-4 h-4 text-[#0054A6]" />
              <span>Tuyển Sinh Đại Học Công Thương TP.HCM (HUIT) 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Khảo Sát Năng Lực & Tư Vấn Ngành Học
            </h1>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-3 bg-[#F5F8FA] px-4 py-2.5 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
            <div className="w-8 h-8 rounded-lg bg-[#0054A6] text-white flex items-center justify-center font-black text-xs shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-black text-[#0F172A]">{user?.name || "Thí sinh tự do"}</div>
              <div className="text-[10px] text-slate-500 font-bold">Giới tính: {gender}</div>
            </div>
          </div>
        </div>

        {/* 3 BƯỚC TIẾN TRÌNH RÕ RÀNG */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
          {[
            { step: 1, title: "1. Phương Thức & Điểm Thi", icon: Calculator },
            { step: 2, title: "2. Mục Tiêu Nghề Nghiệp", icon: Briefcase },
            { step: 3, title: "3. 10 Câu Sở Thích", icon: Brain },
          ].map((tab) => {
            const isDone = currentStep > tab.step;
            const isCurrent = currentStep === tab.step;
            const Icon = tab.icon;

            return (
              <button
                key={tab.step}
                type="button"
                disabled={!canGoToStep(tab.step)}
                title={canGoToStep(tab.step) ? undefined : "Hoàn thành bước trước đã"}
                onClick={() => canGoToStep(tab.step) && setCurrentStep(tab.step)}
                className={`py-3 px-3 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center sm:justify-start gap-2 ${
                  isCurrent
                    ? "bg-[#0054A6] text-white shadow-xs cursor-pointer"
                    : !canGoToStep(tab.step)
                    ? "bg-[#F5F8FA] text-slate-300 cursor-not-allowed"
                    : isDone
                    ? "bg-[#F5F8FA] text-[#0054A6] hover:bg-slate-100 cursor-pointer"
                    : "bg-[#F5F8FA] text-slate-500 hover:text-slate-700 cursor-pointer"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate hidden sm:inline">{tab.title}</span>
                <span className="sm:hidden">Bước {tab.step}</span>
                {isDone && <Check className="w-3.5 h-3.5 ml-auto text-[#0054A6] hidden sm:block" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. NỘI DUNG TỪNG STEP RÕ RÀNG, MƯỢT MÀ */}
      {/* ==================================================================== */}
      <AnimatePresence mode="wait">
        
        {/* ================================================================== */}
        {/* BƯỚC 1: CHỌN HƯỚNG + CHỌN TỔ HỢP & ĐIỂM THI */}
        {/* ================================================================== */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* LỰA CHỌN PHƯƠNG THỨC */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-black text-[#0F172A] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#0054A6]" />
                  Chọn Cách Bạn Muốn EduTalk Tư Vấn:
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Bạn có thể để hệ thống tự động phân tích hoặc chọn trước 1 nhóm ngành bạn yêu thích:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Option 1 */}
                <div 
                  onClick={() => setPredictMode("auto")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    predictMode === "auto" 
                      ? "border-[#0054A6] bg-[#F5F8FA] shadow-2xs" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    predictMode === "auto" ? "bg-[#0054A6] text-white" : "bg-[#F5F8FA] text-slate-600"
                  }`}>
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#0F172A]">Khám Phá Toàn Diện</span>
                      <span className="px-2 py-0.5 text-[9px] font-black bg-red-50 text-[#D71920] border border-red-200/60 rounded-full">Khuyên dùng</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Dành cho bạn chưa biết chọn ngành nào. Hệ thống tự động phân tích để tìm nhóm ngành phù hợp và gợi ý 5 ngành đáng tìm hiểu.
                    </p>
                  </div>
                </div>

                {/* Option 2 */}
                <div 
                  onClick={() => setPredictMode("guided")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                    predictMode === "guided" 
                      ? "border-[#0054A6] bg-[#F5F8FA] shadow-2xs" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    predictMode === "guided" ? "bg-[#0054A6] text-white" : "bg-[#F5F8FA] text-slate-600"
                  }`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-[#0F172A]">Tư Vấn Theo Nhóm Ngành</span>
                      <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 rounded-full">Top 3: 69.6%</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Dành cho bạn đã nhắm trước một lĩnh vực yêu thích (CNTT, Kinh tế, Kỹ thuật...). Hệ thống chỉ xếp hạng trong nhóm đó nên chính xác hơn.
                    </p>
                  </div>
                </div>
              </div>

              {/* NẾU LÀ HƯỚNG 2: HIỂN THỊ 7 KHỐI NGÀNH ĐỂ CHỌN */}
              {predictMode === "guided" && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                    Chọn 1 Nhóm Ngành Bạn Đang Định Hướng:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FACULTIES.map((fac) => {
                      const Icon = fac.icon;
                      const isSelected = selectedFaculty === fac.id;
                      return (
                        <div
                          key={fac.id}
                          onClick={() => setSelectedFaculty(fac.id)}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                            isSelected 
                              ? "border-[#0054A6] bg-[#F5F8FA] shadow-2xs" 
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-[#0054A6] text-white" : "bg-[#F5F8FA] text-slate-600"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-black text-[#0F172A] truncate">{fac.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">{fac.tag}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CHỌN TỔ HỢP XÉT TUYỂN & ĐIỂM THI */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-[#0F172A] flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#0054A6]" />
                    Chọn Tổ Hợp Xét Tuyển & Nhập Điểm 3 Môn:
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {predictMode === "guided" && allowedBlocks.length < Object.keys(ADMISSION_BLOCKS).length
                      ? `Chỉ hiện ${allowedBlocks.length} tổ hợp có xét tuyển vào nhóm ngành "${FACULTIES[selectedFaculty].name}".`
                      : "15 tổ hợp chính thức tại HUIT. Chọn tổ hợp phù hợp nhất với thế mạnh của bạn:"}
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tổng điểm xét tuyển</div>
                  {totalScore !== null ? (
                    <div className="text-base font-black text-[#0054A6]">
                      {totalScore.toFixed(2)} đ (TB: {avgScore!.toFixed(2)})
                    </div>
                  ) : (
                    <div className="text-base font-black text-slate-300">— chưa nhập đủ</div>
                  )}
                </div>
              </div>

              {/* Grid 15 tổ hợp */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                {allowedBlocks.map((key) => {
                  const config = ADMISSION_BLOCKS[key];
                  const isSelected = selectedBlock === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleBlockSelect(key)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#0054A6] bg-[#0054A6] text-white font-black shadow-xs scale-[1.02]"
                          : "border-slate-200 bg-[#F5F8FA] hover:bg-slate-100 text-slate-700 font-bold"
                      }`}
                    >
                      <div className="text-xs font-black">{key}</div>
                      <div className={`text-[8px] truncate mt-0.5 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                        {config.subjects.map(s => s.label).join("-")}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 3 Ô NHẬP ĐIỂM */}
              <div className="bg-[#F5F8FA] p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-black text-[#0F172A]">
                  Nhập Điểm 3 Môn Thuộc Tổ Hợp {selectedBlock} ({ADMISSION_BLOCKS[selectedBlock]?.name}):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ADMISSION_BLOCKS[selectedBlock]?.subjects.map((sub) => (
                    <div key={sub.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Môn {sub.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Thang 10</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={scores[sub.id] ?? ""}
                        onChange={(e) => handleScoreChange(sub.id, e.target.value)}
                        placeholder="Nhập điểm"
                        className={`w-full text-center text-lg font-black text-[#0F172A] bg-white border rounded-lg py-2 focus:ring-2 focus:ring-[#0054A6] focus:outline-hidden ${
                          (scores[sub.id] ?? "") !== "" &&
                          !parsedScores.find((x) => x.id === sub.id)?.ok
                            ? "border-[#D71920] ring-1 ring-red-200"
                            : "border-slate-200"
                        }`}
                      />
                      {(scores[sub.id] ?? "") !== "" &&
                        !parsedScores.find((x) => x.id === sub.id)?.ok && (
                          <p className="text-[10px] font-bold text-[#D71920]">Điểm phải từ 0 đến 10</p>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
                <p className="text-xs font-bold text-slate-400">
                  {step1Done
                    ? "Đã nhập đủ điểm 3 môn."
                    : `Cần nhập đủ và hợp lệ điểm ${subjectsOfBlock.length} môn để sang bước sau.`}
                </p>
                <button
                  type="button"
                  disabled={!step1Done}
                  onClick={() => setCurrentStep(2)}
                  className={`px-6 py-3 rounded-xl text-white text-xs font-black transition flex items-center gap-2 shadow-xs ${
                    step1Done
                      ? "bg-[#0054A6] hover:bg-[#0072CE] cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  <span>Tiếp tục: Mục tiêu nghề nghiệp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* BƯỚC 2: MỤC TIÊU NGHỀ NGHIỆP SAU ĐẠI HỌC */}
        {/* ================================================================== */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-[#0F172A] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0054A6]" />
                Bước 2: Mục Tiêu Phát Triển Sau Khi Tốt Nghiệp
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kỳ vọng nghề nghiệp của bạn là cơ sở quan trọng để chọn đúng định hướng chuyên ngành:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { id: 1, label: "Đi làm tại Doanh nghiệp & Tập đoàn", desc: "Tập trung tích lũy kinh nghiệm thực chiến và thăng tiến nghề nghiệp chuyên môn." },
                { id: 3, label: "Khởi nghiệp & Tự kinh doanh riêng", desc: "Phát triển dự án riêng, quản trị doanh nghiệp và làm chủ sản phẩm thương mại." },
                { id: 2, label: "Nghiên cứu Chuyên sâu & Học Cao học", desc: "Theo đuổi học thuật, viện nghiên cứu, giảng dạy hoặc học lên Thạc sĩ/Tiến sĩ." },
                { id: 4, label: "Chưa xác định cụ thể", desc: "Mong muốn vừa học vừa khám phá thêm cơ hội thực tế trong quá trình học tập." },
              ].map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => setPostGradGoal(goal.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    postGradGoal === goal.id 
                      ? "border-[#0054A6] bg-[#F5F8FA] shadow-2xs" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-black text-[#0F172A] flex items-center justify-between">
                    <span>{goal.label}</span>
                    {postGradGoal === goal.id && <CheckCircle2 className="w-4 h-4 text-[#0054A6]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{goal.desc}</p>
                </div>
              ))}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div className="flex items-center gap-3">
                {!step2Done && (
                  <span className="text-xs font-bold text-slate-400">Chọn 1 mục tiêu</span>
                )}
                <button
                  type="button"
                  disabled={!step2Done}
                  onClick={() => setCurrentStep(3)}
                  className={`px-6 py-3 rounded-xl text-white text-xs font-black transition flex items-center gap-2 shadow-xs ${
                    step2Done
                      ? "bg-[#0054A6] hover:bg-[#0072CE] cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  <span>Tiếp tục: 10 Câu Khảo Sát Sở Thích</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* BƯỚC 3: 10 CÂU KHẢO SÁT SỞ THÍCH */}
        {/* ================================================================== */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-[#0F172A] flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#0054A6]" />
                Bước 3: Khảo Sát 10 Thiên Hướng Sở Thích & Phong Cách
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chọn mức độ từ 1 (Ít hứng thú) đến 5 (Rất đam mê / Rất phù hợp):
              </p>
              <div className="flex items-center gap-3 pt-3">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0054A6] transition-all"
                    style={{ width: `${(likertAnswered / LIKERT_ITEMS.length) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-black ${step3Done ? "text-[#0054A6]" : "text-slate-400"}`}>
                  {likertAnswered}/{LIKERT_ITEMS.length} câu
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {LIKERT_ITEMS.map((item) => {
                const currentVal = likertScores[item.id]; // undefined = chưa trả lời
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                      currentVal === undefined
                        ? "bg-white border-dashed border-slate-300"
                        : "bg-[#F5F8FA] border-slate-200/70"
                    }`}
                  >
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white text-[#0054A6] border border-slate-200">
                          {item.group}
                        </span>
                        <span className="text-xs font-black text-[#0F172A]">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>

                    {/* Segmented 1 - 5 buttons */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0 self-end md:self-auto">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleLikertChange(item.id, num)}
                          className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            currentVal === num
                              ? "bg-[#0054A6] text-white shadow-xs scale-105"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* THÔNG BÁO LỖI — không chuyển trang khi chưa có kết quả thật */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D71920] text-white flex items-center justify-center shrink-0 font-black text-sm">
                  !
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black text-[#D71920]">Chưa phân tích được</div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !step3Done}
                className={`px-8 py-3.5 rounded-xl text-white text-xs font-black transition flex items-center gap-2 shadow-md ${
                  isSubmitting || !step3Done
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-[#0054A6] hover:bg-[#0072CE] shadow-[#0054A6]/20 cursor-pointer"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Đang xử lý kết quả tuyển sinh HUIT...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Hoàn Tất & Xem Báo Cáo Định Hướng Ngay</span>
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
