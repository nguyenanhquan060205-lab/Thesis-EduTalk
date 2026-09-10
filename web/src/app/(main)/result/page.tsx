import React from "react";
import type { Metadata } from "next";
import { ResultReport } from "@/components/features/predict/ResultReport";

export const metadata: Metadata = {
  title: "Báo Cáo Định Hướng Ngành Học & Tuyển Sinh HUIT 2026",
  description: "Báo cáo phân tích chuyên sâu gợi ý ngành học đại học dựa trên pipeline học máy XGBoost (research3) và giải thích minh bạch XAI SHAP tại Trường Đại học Công Thương TP.HCM.",
};

export default function ResultPage() {
  return (
    <div className="relative min-h-screen py-6">
      {/* Quầng sáng ambient dịu mát theo chuẩn HUIT */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ResultReport />
      </main>
    </div>
  );
}
