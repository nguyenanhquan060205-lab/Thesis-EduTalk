import api from "@/lib/api";

/**
 * Kho tri thức RAG — API quản trị ở `backend/app/api/v1/kho_tri_thuc.py`.
 *
 * Chroma chạy nhúng TRONG tiến trình backend nên không có giao diện web riêng; mọi
 * thứ trang quản trị thấy được đều đi qua các endpoint này.
 */

export interface ThongTinKho {
  san_sang: boolean;
  so_chunk?: number;
  model_nhung?: string;
  so_chieu?: number;
  tao_luc?: string;
  theo_loai: Record<string, number>;
  nguon_co_cau_truc: { so_nganh: number; so_nhom: number; nguon: string };
  nguong: { lac_de: number; bien_do: number; top_k: number };
  chunking: { tu_toi_da: number; tu_toi_thieu: number; tu_chong_lan: number };
}

export type TrangThaiNguon = "da_nap" | "chua_nap" | "co_thay_doi" | "bi_bo_qua" | "rong";

export interface TepNguon {
  tep: string;
  loai: string;
  sua_luc: string;
  trang_thai: TrangThaiNguon;
  ly_do?: string;
  meta?: { nam?: number; nguon?: string; link?: string; ngay_lay?: string; nganh?: string };
  so_chunk?: number;
  da_nap?: number;
  chunk_trung?: number;
  so_tu?: number;
}

export interface KiemKe {
  artifact: {
    so_chunk: number;
    tao_luc: string;
    model_nhung: string;
    so_chieu: number;
    dung_luong_kb: number;
    sua_luc: string;
  } | null;
  index: { san_sang: boolean; so_chunk?: number; tao_luc?: string };
  /** Artifact trên đĩa mới hơn index đang phục vụ → cần bấm Nạp lại */
  lech_index: boolean;
  /** Có nguồn sửa mà chưa chạy scripts/nap_kho.py */
  can_nap_lai: boolean;
  co_cau_truc: { nguon: string; so_nganh: number; so_chunk: number; da_nap: number; trang_thai: TrangThaiNguon };
  tai_lieu: TepNguon[];
  theo_loai: { loai: string; mo_ta: string; so_tep: number; so_chunk_trong_kho: number }[];
  truong_bat_buoc: string[];
}

export interface Chunk {
  id: string;
  noi_dung: string;
  meta: Record<string, string | number>;
  so_tu: number;
}

export interface DoanTruyXuat {
  noi_dung: string;
  meta: Record<string, string | number>;
  khoang_cach: number;
  vao_ngu_canh: boolean;
  ly_do: string;
}

export interface KetQuaThu {
  cau_hoi: string;
  truy_van_thuc_te: string;
  co_ghep_lich_su: boolean;
  lac_de: boolean;
  so_doan_vao_ngu_canh: number;
  truy_xuat: DoanTruyXuat[];
  nguon: string[];
  ngu_canh_gui_cho_model: string;
}

/**
 * Chỉ số tầng truy hồi — bám đúng báo cáo tuần của đề tài:
 * precision@k, recall@k (tuần 1, CT 7–8); context precision/recall (tuần 2).
 */
export interface ChiSoTruyHoi {
  n: number;
  precision_k: number;
  recall_k: number;
  context_precision: number;
  context_recall: number;
  hit1: number;
  hitk: number;
  mrr: number;
  tu_khoa_recall_k: number;
  tu_khoa_hit1: number;
  tu_khoa_hitk: number;
  bua_recall_k: number;
  bua_hit1: number;
}

export interface KetQuaDoTruyHoi {
  tao_luc: string;
  k: number;
  so_cau: number;
  so_loi_nhung: number;
  kho: { so_chunk?: number; model_nhung?: string; tao_luc?: string };
  theo_muc: ({ muc: string; mo_ta: string } & ChiSoTruyHoi)[];
  tong: ChiSoTruyHoi;
  cau_truot: {
    hoi: string;
    muc: string;
    hang: number;
    dap_an: { ma: string; ten: string | null }[];
    lay_ve_dau: { ma: string; ten: string | null } | null;
    khoang_cach_dau: number | null;
  }[];
}

export interface TrangThaiDo {
  dang_chay: { dang_chay: boolean; xong: number; tong: number; bat_dau: string | null; loi: string | null };
  gan_nhat: KetQuaDoTruyHoi | null;
  lich_su: { tao_luc: string; k: number; so_cau: number; so_chunk?: number; tong: ChiSoTruyHoi; so_loi_nhung: number }[];
}

const GOC = "/api/v1/kho-tri-thuc";

export const RagService = {
  thongTin: async (): Promise<ThongTinKho> => (await api.get(`${GOC}/thong-tin`)).data,

  kiemKe: async (): Promise<KiemKe> => (await api.get(`${GOC}/tai-lieu`)).data,

  chunks: async (p: { tim?: string; loai?: string; trang?: number; moiTrang?: number }) => {
    const sp = new URLSearchParams();
    if (p.tim) sp.set("tim", p.tim);
    if (p.loai) sp.set("loai", p.loai);
    sp.set("trang", String(p.trang ?? 1));
    sp.set("moi_trang", String(p.moiTrang ?? 10));
    const { data } = await api.get<{ tong: number; trang: number; moi_trang: number; chunk: Chunk[] }>(
      `${GOC}/chunks?${sp}`
    );
    return data;
  },

  thuTruyXuat: async (cauHoi: string, k: number, cauTruoc?: string): Promise<KetQuaThu> => {
    const lich_su = cauTruoc?.trim() ? [{ role: "user", text: cauTruoc.trim() }] : [];
    return (await api.post(`${GOC}/thu-truy-xuat`, { cau_hoi: cauHoi, k, lich_su })).data;
  },

  batDauDo: async (k: number) => (await api.post(`${GOC}/do-truy-hoi?k=${k}`)).data,

  trangThaiDo: async (): Promise<TrangThaiDo> => (await api.get(`${GOC}/do-truy-hoi`)).data,

  napLai: async () => (await api.post(`${GOC}/nap-lai`)).data,
};
