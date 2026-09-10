import React from "react";
import type { Metadata } from "next";
import { PredictWizard } from "@/components/features/predict/PredictWizard";

export const metadata: Metadata = {
  title: "Khảo Sát Chọn Ngành Học AI — Tuyển Sinh HUIT 2026",
  description: "Cổng khảo sát định hướng ngành học thông minh Đại học Công Thương TP.HCM (HUIT), ứng dụng pipeline học máy XGBoost (research3) và giải thích minh bạch XAI SHAP.",
};

export default function PredictPage() {
  return (
    <div className="relative min-h-screen py-8">
      {/* Quầng sáng ambient dịu mát theo chuẩn HUIT (không chói, không đổi màu ngoài hệ thống) */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        <PredictWizard />
      </main>
    </div>
  );
}
