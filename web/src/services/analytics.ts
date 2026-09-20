import api from "@/lib/api";

/**
 * Thống kê khu vực quản trị — `GET /api/v1/admin/analytics`.
 *
 * Toàn bộ số liệu gộp từ MongoDB bằng aggregation pipeline, không có giá trị
 * minh hoạ nào. Dữ liệu còn ít thì các mảng sẽ rỗng và giao diện phải hiển thị
 * trạng thái rỗng, tuyệt đối không độn số mẫu.
 */
export interface Muc {
  ten: string;
  soLuong: number;
  khamPha?: number;
  tuVan?: number;
}

export interface Analytics {
  tongQuan: {
    nguoiDung: number;
    chuaXacMinhEmail: number;
    tongLuotTuVan: number;
    luotGanDay: number;
    baiChoDuyet: number;
    baiBiBaoCao: number;
    hoTroTonDong: number;
    thongBaoChuaDoc: number;
  };
  soNgay: number;
  theoNgay: {
    ngay: string;
    soLuong: number;
    khamPha?: number;
    tuVan?: number;
  }[];
  topNganh: Muc[];
  theoNhomNganh: Muc[];
  topToHop: Muc[];
  mucTieu: Muc[];
  cheDo: Muc[];
  phoDiem: Muc[];
  soSanh: {
    luotKyTruoc: number;
    /** null = kỳ trước không có dữ liệu, không tính được phần trăm */
    luotThayDoi: number | null;
    nguoiMoi: number;
    nguoiMoiKyTruoc: number;
    nguoiMoiThayDoi: number | null;
  };
  hoatDongGanDay: {
    thoiGian: string | null;
    cheDo: string | null;
    toHop: string | null;
    tongDiem: number | null;
    nganh: string | null;
    nhom: string | null;
    danhSachNganh?: {
      name: string;
      field?: string;
      rank?: number;
      code?: string;
    }[];
  }[];
  chatLuongDauVao: {
    thieuDiemThi: number;
    thieuGioiTinh: number;
    /** Bản ghi tạo trước khi hệ thống bắt đầu ghi cờ `genderMissing` */
    khongRoGioiTinh: number;
  };
  danhGia?: {
    trungBinhSao: number;
    tongDanhGia: number;
    phanBoSao: { sao: number; soLuong: number }[];
    phanHoiHuuIch: { nhan: string; soLuong: number }[];
  };
}

export const AnalyticsService = {
  get: async (days = 30): Promise<Analytics> => {
    const { data } = await api.get(`/api/v1/admin/analytics?days=${days}`);
    return data;
  },
};
