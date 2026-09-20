import api from "@/lib/api";

/**
 * Phản hồi của người dùng — đầu vào của vòng lặp huấn luyện lại (`/api/v1/phan-hoi`).
 *
 * - Đánh giá app: hỏi sau lần dự đoán ĐẦU TIÊN, một người một bản ghi. Không dùng để huấn luyện.
 * - Phản hồi gợi ý: gắn vào một lượt tư vấn ĐÃ LƯU (chỉ người đã đăng nhập mới có). Nhãn
 *   "ngành đã chọn / đã đỗ" là dữ liệu mới để mô hình học lại theo chu kỳ.
 */

export type GoiYHuuIch = "co" | "mot_phan" | "khong";
export type TrangThaiNganh = "da_do" | "dang_hoc" | "du_dinh";

export interface PhanHoiDuDoan {
  goi_y_huu_ich?: GoiYHuuIch | null;
  nganh_da_chon?: string | null;
  trang_thai_nganh?: TrangThaiNganh | null;
  cap_nhat_luc?: string;
}

export interface TrangThaiPhanHoi {
  soLuotDuDoan: number;
  daDanhGiaApp: boolean;
  saoDaCho: number | null;
  canHoiDanhGia: boolean;
}

export const NHAN_TRANG_THAI_NGANH: Record<TrangThaiNganh, string> = {
  da_do: "Đã trúng tuyển",
  dang_hoc: "Đang học",
  du_dinh: "Dự định chọn",
};

export const PhanHoiService = {
  trangThai: async (): Promise<TrangThaiPhanHoi> =>
    (await api.get("/api/v1/phan-hoi/trang-thai")).data,

  danhGiaApp: async (sao: number, yKien: string, predictionId?: string | null) =>
    (await api.post("/api/v1/phan-hoi/danh-gia-app", {
      sao,
      yKien: yKien.trim() || null,
      predictionId: predictionId ?? null,
      nguon: "web",
    })).data,

  /** Gửi trường nào cập nhật trường đó; `nganhDaChon: null` là xoá nhãn đã gửi. */
  capNhatDuDoan: async (
    predictionId: string,
    body: { goiYHuuIch?: GoiYHuuIch; nganhDaChon?: string | null; trangThaiNganh?: TrangThaiNganh | null }
  ): Promise<{ phanHoi: PhanHoiDuDoan }> =>
    (await api.put(`/api/v1/phan-hoi/du-doan/${predictionId}`, body)).data,
};
