/**
 * Bảng tra tổ hợp xét tuyển & nhóm ngành — nguồn dùng chung cho mọi trang.
 *
 * THỨ TỰ MÔN PHẢI KHỚP TUYỆT ĐỐI với `TO_HOP_MAP` trong
 * `backend/app/services/major_predictor.py`: backend gán điểm cho từng môn
 * **theo vị trí** (`zip(TO_HOP_MAP[to_hop], scores)`). Đảo thứ tự = điểm môn này
 * chui vào cột môn kia, mô hình vẫn chạy nhưng dự đoán sai âm thầm.
 */

export interface Subject {
  id: string;
  label: string;
}

export interface BlockInfo {
  category: string;
  name: string;
  subjects: Subject[];
  desc: string;
}

const S: Record<string, Subject> = {
  Toan: { id: "Toan", label: "Toán" },
  Van: { id: "Van", label: "Ngữ văn" },
  Anh: { id: "Anh", label: "Tiếng Anh" },
  Ly: { id: "Ly", label: "Vật lý" },
  Hoa: { id: "Hoa", label: "Hóa học" },
  Sinh: { id: "Sinh", label: "Sinh học" },
  Su: { id: "Su", label: "Lịch sử" },
  Dia: { id: "Dia", label: "Địa lý" },
  Tin: { id: "Tin", label: "Tin học" },
  Gdktpl: { id: "Gdktpl", label: "GDKT&PL" },
};

/** 15 tổ hợp HUIT xét tuyển năm 2026 bằng điểm thi tốt nghiệp THPT. */
export const ADMISSION_BLOCKS: Record<string, BlockInfo> = {
  A00: { category: "Tự nhiên", name: "Toán - Vật lý - Hóa học", subjects: [S.Toan, S.Ly, S.Hoa], desc: "Kỹ thuật, CNTT, Cơ khí" },
  A01: { category: "Tự nhiên", name: "Toán - Vật lý - Tiếng Anh", subjects: [S.Toan, S.Ly, S.Anh], desc: "Kỹ thuật & công nghệ" },
  B00: { category: "Y sinh - Thực phẩm", name: "Toán - Hóa học - Sinh học", subjects: [S.Toan, S.Hoa, S.Sinh], desc: "Thực phẩm, sinh học, môi trường" },
  B08: { category: "Y sinh - Thực phẩm", name: "Toán - Sinh học - Tiếng Anh", subjects: [S.Toan, S.Sinh, S.Anh], desc: "Dinh dưỡng & sinh học ứng dụng" },
  C00: { category: "Xã hội", name: "Ngữ văn - Lịch sử - Địa lý", subjects: [S.Van, S.Su, S.Dia], desc: "Du lịch & luật" },
  C01: { category: "Kinh tế", name: "Ngữ văn - Toán - Vật lý", subjects: [S.Van, S.Toan, S.Ly], desc: "Kinh tế & quản trị" },
  C02: { category: "Kinh tế", name: "Ngữ văn - Toán - Hóa học", subjects: [S.Van, S.Toan, S.Hoa], desc: "Kinh tế dịch vụ & thực phẩm" },
  C03: { category: "Xã hội", name: "Ngữ văn - Toán - Lịch sử", subjects: [S.Van, S.Toan, S.Su], desc: "Du lịch & luật kinh tế" },
  D01: { category: "Đa năng", name: "Toán - Ngữ văn - Tiếng Anh", subjects: [S.Toan, S.Van, S.Anh], desc: "Phổ biến nhất, gần như mọi ngành" },
  D07: { category: "Tự nhiên", name: "Toán - Hóa học - Tiếng Anh", subjects: [S.Toan, S.Hoa, S.Anh], desc: "Hóa học & công nghệ thực phẩm" },
  D09: { category: "Ngoại ngữ", name: "Toán - Lịch sử - Tiếng Anh", subjects: [S.Toan, S.Su, S.Anh], desc: "Ngôn ngữ & kinh tế quốc tế" },
  D14: { category: "Ngoại ngữ", name: "Ngữ văn - Tiếng Anh - Lịch sử", subjects: [S.Van, S.Anh, S.Su], desc: "Ngôn ngữ Anh & du lịch" },
  D15: { category: "Du lịch", name: "Ngữ văn - Địa lý - Tiếng Anh", subjects: [S.Van, S.Dia, S.Anh], desc: "Khách sạn & lữ hành" },
  X01: { category: "GDPT 2018", name: "Toán - Ngữ văn - GDKT&PL", subjects: [S.Toan, S.Van, S.Gdktpl], desc: "Tổ hợp mới, thay mã C14 của 2025" },
  X26: { category: "CNTT & AI", name: "Toán - Tin học - Tiếng Anh", subjects: [S.Toan, S.Tin, S.Anh], desc: "Ưu tiên CNTT & trí tuệ nhân tạo" },
};

/** Phong cách mặc định dự phòng cho nhóm ngành có id lạ. */
export const DEFAULT_FIELD_STYLE = {
  dot: "bg-slate-400",
  chip: "bg-slate-100 text-slate-700 border-slate-200",
  ring: "ring-slate-400",
};

/**
 * Màu nhận diện 9 nhóm ngành đào tạo HUIT — khớp id (0..8) của mô hình research3.
 * CHỈ dùng các họ màu: blue, sky, cyan, indigo, violet, teal, slate, stone, fuchsia.
 * CẤM dùng emerald, amber, rose (dành riêng cho mức độ an toàn trúng tuyển).
 */
export const FIELD_STYLE: Record<number, { dot: string; chip: string; ring: string }> = {
  0: { dot: "bg-blue-600", chip: "bg-blue-50 text-blue-700 border-blue-200", ring: "ring-blue-500" }, // CNTT & Máy tính
  1: { dot: "bg-indigo-600", chip: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-500" }, // Kinh doanh & Marketing
  2: { dot: "bg-teal-600", chip: "bg-teal-50 text-teal-700 border-teal-200", ring: "ring-teal-500" }, // Tài chính & Kế toán
  3: { dot: "bg-sky-600", chip: "bg-sky-50 text-sky-700 border-sky-200", ring: "ring-sky-500" }, // Logistics & Quản lý sản xuất
  4: { dot: "bg-fuchsia-600", chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", ring: "ring-fuchsia-500" }, // Du lịch, Khách sạn & Ẩm thực
  5: { dot: "bg-slate-600", chip: "bg-slate-100 text-slate-700 border-slate-300", ring: "ring-slate-500" }, // Cơ khí - Điện - Tự động hoá
  6: { dot: "bg-violet-600", chip: "bg-violet-50 text-violet-700 border-violet-200", ring: "ring-violet-500" }, // Hoá - Vật liệu - Dệt may
  7: { dot: "bg-cyan-600", chip: "bg-cyan-50 text-cyan-700 border-cyan-200", ring: "ring-cyan-500" }, // Thực phẩm, Sinh học & Môi trường
  8: { dot: "bg-stone-600", chip: "bg-stone-100 text-stone-700 border-stone-300", ring: "ring-stone-500" }, // Luật & Ngôn ngữ
};

export const ADMISSION_SOURCE =
  "Đề án tuyển sinh HUIT 2024 · 2025 · 2026 — điểm chuẩn phương thức thi tốt nghiệp THPT";
