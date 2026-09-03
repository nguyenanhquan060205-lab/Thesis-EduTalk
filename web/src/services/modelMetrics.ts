import api from "@/lib/api";

/**
 * Chỉ số đánh giá mô hình — đọc từ `research/data/processed/08_model/`.
 *
 * Khác hẳn `/admin/analytics`: bên đó là số liệu **sử dụng thực tế** của người
 * dùng, bên này là kết quả **huấn luyện và kiểm thử** mô hình.
 */
export interface BoChiSo {
  top1?: number;
  top2?: number;
  top3?: number;
  top5?: number;
  macro_f1?: number;
  balanced_acc?: number;
}

export interface ModelMetrics {
  ngayChay?: string;
  seed?: number;
  duLieu?: {
    train_that: number;
    train_tong_hop: number;
    test_that: number;
    n_dac_trung: number;
    n_lop_nganh: number;
    n_lop_khoi: number;
  };
  cv?: { n_splits: number; n_repeats: number; ghi_chu?: string };
  sieuThamSo?: Record<string, Record<string, number> | number>;
  cvMacroF1?: Record<string, number>;
  overfit?: { train_top1: number; val_top1: number };
  test?: Record<string, BoChiSo>;
  baseline?: Record<string, number>;
  aucRoc?: {
    tang1_macro?: number;
    tang1_weighted?: number;
    auto_macro?: number;
    auto_weighted?: number;
    phang_macro?: number;
    tu_van_macro?: number;
    tang1_tung_khoi?: Record<string, number>;
  };
  canhBao?: string[] | string;
  /** null = chưa train Random Forest để so sánh */
  baselineRandomForest: Record<string, unknown> | null;
  /** null = mô hình mới train một lần, chưa có chu kỳ retrain */
  lichSuHuanLuyen: Record<string, unknown>[] | null;
}

export interface Consultation {
  id: string;
  thoiGian: string | null;
  nguoiDung: string;
  cheDo: string | null;
  toHop: string | null;
  tongDiem: number | null;
  mucTieu: string | null;
  thieuGioiTinh: boolean | null;
  goiY: { rank: number; ten: string; nhom: string }[];
}

export const ModelService = {
  metrics: async (): Promise<ModelMetrics> => {
    const { data } = await api.get("/api/v1/admin/model-metrics");
    return data;
  },

  consultations: async (params: {
    page?: number;
    size?: number;
    mode?: string;
    subjectGroup?: string;
    q?: string;
  }): Promise<{
    data: Consultation[];
    tong: number;
    trang: number;
    soTrang: number;
  }> => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    });
    const { data } = await api.get(`/api/v1/admin/consultations?${sp}`);
    return data;
  },
};

/** 0.3921 → "39,2%" */
export function pt(v?: number | null): string {
  if (v === undefined || v === null) return "—";
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

/** 0.8439 → "0,844" — cho chỉ số không phải phần trăm như AUC, F1 */
export function so(v?: number | null, n = 3): string {
  if (v === undefined || v === null) return "—";
  return v.toFixed(n).replace(".", ",");
}
