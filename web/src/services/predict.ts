import api from "@/lib/api";

/**
 * Gọi mô hình XGBoost 2 tầng ở backend.
 *
 * Giới tính KHÔNG gửi từ đây — backend tự lấy từ hồ sơ người dùng đã đăng ký.
 * Chỉ truyền `gender` khi test không có token đăng nhập.
 */

// THỨ TỰ 10 CÂU BẮT BUỘC ĐÚNG NHƯ LÚC HUẤN LUYỆN MÔ HÌNH.
// Đổi thứ tự = mô hình đọc sai câu, vẫn chạy nhưng kết quả sai âm thầm.
export const LIKERT_ORDER = [
  "likert_nang_dong",
  "likert_huong_noi",
  "likert_sang_tao",
  "likert_logic",
  "likert_to_mo",
  "likert_thi_nghiem",
  "likert_moi_truong",
  "likert_dinh_duong",
  "likert_tranh_luan",
  "likert_thiet_ke",
] as const;

export const GOAL_BY_ID: Record<number, string> = {
  1: "Đi làm",
  2: "Nghiên cứu",
  3: "Kinh doanh",
  4: "Chưa xác định",
};

export interface AdmissionInfo {
  cutoffs: Record<string, number>;
  min: number;
  max: number;
  latest: number;
  trend: "tang" | "giam" | "on_dinh" | "khong_du_du_lieu";
  level: "an_toan" | "co_kha_nang" | "rui_ro_cao" | null;
  gap: number | null;
}

/** Một dòng trong bảng giải thích SHAP. */
export interface ExplainFeature {
  ten: string;
  giaTri: string;
  /** φ₂ + β·φ₁ — dương là đẩy lên, âm là kéo xuống */
  dongGop: number;
  phanTram: number;
  /** "rất mạnh" | "mạnh" | "vừa" | "không đáng kể" — do backend chấm, đừng tự tính lại */
  mucDo: string;
  tang2: number;
  /** Phần do tầng 1; chế độ guided luôn bằng 0 */
  tang1: number;
  /**
   * Không hiển thị cho thí sinh — hiện chỉ có giới tính. Nêu một đặc điểm không
   * thể thay đổi vừa không giúp được gì, vừa củng cố định kiến. Vẫn tham gia dự
   * đoán và vẫn trả về để trang quản trị thấy đầy đủ.
   */
  anVoiThiSinh: boolean;
}

export interface MajorExplain {
  mode: string;
  base: number;
  features: ExplainFeature[];
  /** Số đặc trưng không lọt vào danh sách hiển thị */
  soConLai: number;
  dongGopConLai: number;
  /** Tỷ trọng cụm "yếu tố khác"; cộng với phanTram các dòng hiển thị ra 100% */
  phanTramConLai: number;
  /**
   * Tổng đóng góp cả 43 đặc trưng. Điểm xếp hạng = base + tongDongGop.
   * So sánh giữa các ngành phải dùng con số này — KHÔNG so riêng các thanh
   * hiển thị, vì mỗi ngành có `base` riêng và mỗi ngành hiện một bộ 6 khác nhau.
   */
  tongDongGop: number;
}

export interface MajorSuggestion {
  rank: number;
  code: string;
  name: string;
  field: string;
  score: number;
  admission: AdmissionInfo | null;
  explain?: MajorExplain | null;
}

export interface RecommendResponse {
  mode: "explore" | "guided";
  fields: { id: number; name: string; probability: number }[];
  majors: MajorSuggestion[];
  totalScore: number | null;
  warnings: string[];
}

export interface RecommendInput {
  likertScores: Record<string, number>;
  block: string;
  /** Điểm 3 môn, khóa là id môn (Toan, Ly, Hoa...) */
  scores: Record<string, string>;
  /** Thứ tự môn của tổ hợp — quyết định thứ tự gửi điểm đi */
  subjectOrder: string[];
  goalId: number;
  facultyId: number | null;
  gender?: string;
  limit?: number;
  /**
   * true → gọi `POST /api/v1/survey/submit`: cùng mô hình, cùng kết quả, nhưng
   * server GHI LẠI vào `prediction_history` và tăng `usageCount`. Cần token.
   * false → `POST /api/v1/predict/recommend`: chạy xong là quên, không cần đăng nhập.
   *
   * Trang /history đọc `prediction_history`, nên nếu luôn gọi /recommend thì
   * lịch sử của người dùng sẽ vĩnh viễn rỗng.
   */
  save?: boolean;
}

export interface CatalogField {
  id: number;
  name: string;
  /** Hợp các tổ hợp mà ngành trong khối này xét tuyển */
  subjectGroups: string[];
  majors: CatalogMajor[];
}

export interface CatalogMajor {
  code: string;
  name: string;
  subjectGroups: string[];
  /** Điểm chuẩn thi THPT theo năm, vd { "2024": 20.0, "2025": 22.0, "2026": 19.0 } */
  cutoffs: Record<string, number>;
}

export interface CatalogResponse {
  fields: CatalogField[];
}

export const PredictService = {
  recommend: async (input: RecommendInput): Promise<RecommendResponse> => {
    const interests = LIKERT_ORDER.map((k) => {
      const v = input.likertScores[k];
      if (typeof v !== "number" || v < 1 || v > 5) {
        throw new Error(`Thiếu hoặc sai câu sở thích: ${k}`);
      }
      return v;
    });

    // Điểm phải gửi ĐÚNG thứ tự môn của tổ hợp (vd A00 → Toán, Lý, Hoá)
    const raw = input.subjectOrder.map((id) => parseFloat(input.scores[id] ?? ""));
    const scores = raw.every((v) => !isNaN(v)) ? raw : null;

    const body = {
      interests,
      subjectGroup: input.block,
      scores,
      goal: GOAL_BY_ID[input.goalId] ?? "Chưa xác định",
      fieldId: input.facultyId,
      limit: input.limit ?? 5,
      gender: input.gender,
    };

    if (input.save) {
      // `/survey/submit` bọc kết quả trong { status, results }
      const { data } = await api.post<{ results: RecommendResponse }>(
        "/api/v1/survey/submit",
        body
      );
      return data.results;
    }

    const { data } = await api.post<RecommendResponse>(
      "/api/v1/predict/recommend",
      body
    );
    return data;
  },

  catalog: async (): Promise<CatalogResponse> => {
    const { data } = await api.get<CatalogResponse>("/api/v1/predict/catalog");
    return data;
  },
};

/**
 * Nhờ LLM diễn giải bảng SHAP thành 2–3 câu tiếng Việt.
 *
 * Gọi theo yêu cầu (người dùng bấm nút) chứ không tự chạy mỗi lần dự đoán —
 * mỗi lượt là một lần gọi Gemini, bật sẵn cho cả 5 ngành thì vừa chậm vừa tốn.
 *
 * Backend chỉ đưa CHÍNH bảng số này vào prompt và cấm LLM thêm lý do ngoài bảng.
 */
export async function giaiThichBangLoi(
  nganh: string,
  features: ExplainFeature[]
): Promise<string> {
  const { data } = await api.post("/api/v1/predict/explain-text", {
    nganh,
    features,
  });
  return data.text as string;
}
