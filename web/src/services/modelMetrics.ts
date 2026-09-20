import api from "@/lib/api";

/**
 * Chỉ số đánh giá mô hình ĐANG PHỤC VỤ — mặc định Hướng 1, đọc từ gói
 * `backend/data/mo_hinh/huong1/` (đóng gói từ `research/data/processed/10_ChotModel/`).
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

/** Chỉ số xếp hạng ở điểm vận hành k (tư vấn k=2, khám phá k=5) */
export interface ChiSoXepHang {
  k: number;
  hit_k: number;
  /** Trung bình Hit@k của TỪNG ngành — ngành nhỏ nặng ngang ngành lớn */
  macro_hit_k: number;
  mrr: number;
  mrr_doan_bua: number;
  ndcg_k: number;
  hang_trung_vi: number;
  hang_trung_binh: number;
  n_nganh_duoi_50: number;
  n_nganh: number;
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
  cachNhom?: string | null;

  // ── Chỉ có ở mô hình Hướng 1 ────────────────────────────────────────────────
  pipeline?: "h1";
  /** Số gợi ý mà hệ thống hiển thị — mọi chỉ số chính đo đúng ở đây */
  diemVanHanh?: { tu_van: number; kham_pha: number };
  /** Mốc đối chứng theo từng Top-k: bốc bừa trong nhóm, gợi ý ngành đông nhất, bốc bừa 39 ngành */
  doanBua?: {
    tu_van_trong_nhom: BoChiSo;
    tu_van_nganh_dong_nhat: BoChiSo;
    kham_pha: BoChiSo;
  };
  /** Khoá: "TƯ VẤN (biết nhóm)" · "KHÁM PHÁ (cả 39)" */
  chiSoXepHang?: Record<string, ChiSoXepHang>;
  kyNang?: Record<string, number>;
  saiSo95?: Record<string, number>;
  /** Hướng 2 đo trên 676 phiếu khảo sát niêm phong — mức nên kỳ vọng với người dùng thật */
  nguoiThat?: {
    nguon: string;
    n: number;
    n_34_nganh: number;
    tu_van: BoChiSo;
    kham_pha: BoChiSo;
    tu_van_34_nganh: BoChiSo;
    kham_pha_34_nganh: BoChiSo;
    doan_bua: {
      tu_van_trong_nhom: BoChiSo;
      tu_van_nganh_dong_nhat: BoChiSo;
      kham_pha: BoChiSo;
    };
  } | null;

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
