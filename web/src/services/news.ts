import api from "@/lib/api";

/**
 * Tin tuyển sinh lấy từ backend, do `crawler_service.py` cào về từ
 * https://ts.huit.edu.vn/tin-tuyen-sinh — trang tin chính thức của trường.
 *
 * Mọi bài đều có `sourceUrl` trỏ về bản gốc để người đọc kiểm chứng được.
 * Không tự viết thêm nội dung nào ở tầng frontend.
 */
export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  image: string | null;
  /** Ngày đăng trên trang gốc, dạng dd/mm/yyyy */
  date: string;
  category: string;
  sourceUrl: string;
  /** Chỉ có ở API chi tiết */
  content_html?: string;
  ai_summary?: string;
  isHot?: boolean;
  createdAt?: string;
}

/** Backend lúc trả mảng trần, lúc bọc trong { data: [...] } */
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export const NewsService = {
  list: async (limit = 20): Promise<NewsArticle[]> => {
    const { data } = await api.get(`/api/v1/news/?limit=${limit}`);
    return unwrap<NewsArticle[]>(data) ?? [];
  },

  detail: async (id: string): Promise<NewsArticle> => {
    const { data } = await api.get(`/api/v1/news/${id}`);
    return unwrap<NewsArticle>(data);
  },
};
