import api from "@/lib/api";

/**
 * Lịch sử tư vấn ngành — MongoDB collection `prediction_history`,
 * được ghi bởi `POST /api/v1/survey/submit`.
 *
 * Lưu ý: `POST /api/v1/predict/recommend` chạy cùng mô hình nhưng KHÔNG ghi gì.
 * Muốn người dùng thấy lại lần tư vấn của mình thì phải gọi `/survey/submit`.
 */
export interface HistoryMajor {
  rank: number;
  code: string;
  name: string;
  field: string;
  admission?: {
    level: "an_toan" | "co_kha_nang" | "rui_ro_cao" | null;
    latest: number;
  } | null;
}

export interface HistoryEntry {
  id: string;
  mode: "explore" | "guided";
  predicted_major: string;
  majors: HistoryMajor[];
  fields: { id: number; name: string; probability: number }[];
  input: {
    subjectGroup: string;
    scores: number[] | null;
    goal: string;
    gender: string;
    fieldId: number | null;
    interests: number[];
  };
  /** ISO 8601 */
  createdAt: string;
}

export const HistoryService = {
  list: async (uid: string): Promise<HistoryEntry[]> => {
    const { data } = await api.get(`/api/v1/survey/history/${uid}`);
    return (data?.data ?? []) as HistoryEntry[];
  },
};

/** Tổng điểm 3 môn của một lần tư vấn, null nếu lần đó chưa nhập điểm. */
export function totalScoreOf(e: HistoryEntry): number | null {
  const s = e.input?.scores;
  if (!Array.isArray(s) || s.length === 0) return null;
  return +s.reduce((a, b) => a + b, 0).toFixed(2);
}

/** Ngành xuất hiện nhiều nhất ở vị trí #1 qua các lần tư vấn. */
export function favouriteMajor(list: HistoryEntry[]): string | null {
  const dem = new Map<string, number>();
  for (const e of list) {
    const ten = e.majors?.[0]?.name ?? e.predicted_major;
    if (ten) dem.set(ten, (dem.get(ten) ?? 0) + 1);
  }
  let top: string | null = null;
  let max = 0;
  for (const [k, v] of dem) if (v > max) [top, max] = [k, v];
  return top;
}

/** Tổ hợp người dùng dùng nhiều nhất khi làm khảo sát. */
export function favouriteBlock(list: HistoryEntry[]): string | null {
  const dem = new Map<string, number>();
  for (const e of list) {
    const b = e.input?.subjectGroup;
    if (b) dem.set(b, (dem.get(b) ?? 0) + 1);
  }
  let top: string | null = null;
  let max = 0;
  for (const [k, v] of dem) if (v > max) [top, max] = [k, v];
  return top;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
