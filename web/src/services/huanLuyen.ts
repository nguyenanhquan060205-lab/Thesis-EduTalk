import api from "@/lib/api";

/**
 * Quản trị vòng lặp phản hồi và huấn luyện lại — `/api/v1/admin/huan-luyen`.
 */

export type ChuKy = "tat" | "hang_ngay" | "hang_tuan" | "hang_thang";

export interface CauHinhHuanLuyen {
  chu_ky: ChuKy;
  gio: number;
  thu: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  ngay: number;
  nhan_toi_thieu: number;
  giu_lai_toi_thieu: number;
  dung_sai_diem: number;
  tu_dong_phuc_vu: boolean;
}

export interface ChamMoHinh {
  n: number;
  tu_van: number | null;
  kham_pha: number | null;
}

export interface ChiSoLuot {
  phien_ban_so_sanh: string;
  hien_tai: { test: ChamMoHinh; giu_lai: ChamMoHinh };
  ung_vien: { test: ChamMoHinh; giu_lai: ChamMoHinh };
  k: { tu_van: number; kham_pha: number };
}

export interface CongKiemDinh {
  dung_sai_diem: number;
  qua_test: boolean;
  qua_giu_lai: boolean | null;
  du_phieu_giu_lai: boolean;
  dat: boolean;
}

export type TrangThaiPhienBan = "dang_phuc_vu" | "cho_duyet" | "luu_tru" | "tu_choi";

export interface PhienBan {
  ma: string;
  tao_luc: string;
  trang_thai: TrangThaiPhienBan;
  du_lieu: { n_goc: number; n_phan_hoi_hoc: number; n_phan_hoi_giu_lai: number };
  chi_so: ChiSoLuot;
  cong: CongKiemDinh;
  phuc_vu_luc?: string;
}

export type KetQuaLuot = "dang_chay" | "da_phuc_vu" | "cho_duyet" | "tu_choi" | "bo_qua" | "loi";

export interface LuotHuanLuyen {
  id: string;
  bat_dau: string;
  ket_thuc?: string;
  kich_hoat: "lich" | "thu_cong";
  ket_qua: KetQuaLuot;
  ly_do?: string;
  buoc?: string;
  giay?: number;
  phien_ban?: string;
  chi_so?: ChiSoLuot;
  cong?: CongKiemDinh;
  du_lieu?: ThongKeDuLieu;
}

export interface ThongKeDuLieu {
  tong_nhan: number;
  dung_duoc: number;
  hoc: number;
  giu_lai: number;
  nhan_moi: number;
  loai_khong_diem: number;
  loai_thieu_gioi_tinh: number;
  loai_trung_nguoi: number;
  loai_khong_hop_le: number;
  theo_trang_thai: Record<string, number>;
}

export interface TongQuanHuanLuyen {
  cau_hinh: CauHinhHuanLuyen;
  lich_tiep_theo: string | null;
  dang_chay: { bat_dau: string; lan_chay: string } | null;
  du_lieu_huan_luyen: ThongKeDuLieu;
  ti_le_giu_lai: number;
  phien_ban: PhienBan[];
  phien_ban_dang_phuc_vu: string;
  phien_ban_worker_dang_nap: string | null;
  goc: {
    ngay_chot: string;
    n_hoc: number;
    test: { tu_van: number; kham_pha: number };
    diem_van_hanh: { tu_van: number; kham_pha: number };
    hp: Record<string, number>;
  };
  lich_su: LuotHuanLuyen[];
  phan_hoi: { so_luot_tu_van: number; co_danh_gia_goi_y: number; goi_y_huu_ich: Record<string, number> };
  danh_gia_app: {
    so_luot: number;
    trung_binh: number | null;
    theo_sao: Record<string, number>;
    y_kien_gan_day: { sao: number; y_kien: string; nguon?: string; updatedAt?: string }[];
  };
}

const GOC = "/api/v1/admin/huan-luyen";

export const HuanLuyenService = {
  tongQuan: async (): Promise<TongQuanHuanLuyen> => (await api.get(GOC)).data,

  capNhatCauHinh: async (cfg: CauHinhHuanLuyen): Promise<{ lich_tiep_theo: string | null }> =>
    (await api.put(`${GOC}/cau-hinh`, cfg)).data,

  chayNgay: async () => (await api.post(`${GOC}/chay-ngay`)).data,

  /** `ma = "goc"` để quay về mô hình trong gói */
  phucVu: async (ma: string) => (await api.post(`${GOC}/phien-ban/${ma}/phuc-vu`)).data,
};
