"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Cpu, 
  BarChart3, 
  Calculator,
  Truck,
  Utensils, 
  Cog,
  FlaskConical, 
  Dna,
  Scale, 
  Layers, 
  ArrowRight 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PredictService } from "@/services/predict";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

const FACULTY_ICONS: Record<number, LucideIcon> = {
  0: Cpu,          // CNTT & Máy tính
  1: BarChart3,     // Kinh doanh & Marketing
  2: Calculator,   // Tài chính & Kế toán
  3: Truck,        // Logistics & Quản lý sản xuất
  4: Utensils,     // Du lịch, Khách sạn & Ẩm thực
  5: Cog,          // Cơ khí - Điện - Tự động hoá
  6: FlaskConical, // Hoá - Vật liệu - Dệt may
  7: Dna,          // Thực phẩm, Sinh học & Môi trường
  8: Scale,        // Luật & Ngôn ngữ
};

interface FacultyItem {
  id: number;
  name: string;
  icon: LucideIcon;
  count: number;
  highlight: string;
  scoreAvg: string | null;
}

export function FacultyGrid() {
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);

  useEffect(() => {
    PredictService.catalog()
      .then((d) =>
        setFaculties(
          d.fields.map((f) => {
            const diem = f.majors
              .map((m) => m.cutoffs?.["2026"])
              .filter((v): v is number => typeof v === "number");
            return {
              id: f.id,
              name: f.name,
              icon: FACULTY_ICONS[f.id] ?? Layers,
              count: f.majors.length,
              highlight: f.majors.map((m) => m.name).slice(0, 4).join(", "),
              scoreAvg: diem.length
                ? `${Math.min(...diem).toFixed(1)} - ${Math.max(...diem).toFixed(1)}đ`
                : null,
            };
          })
        )
      )
      .catch(() => setFaculties([]));
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-xs font-black text-[#0054A6] dark:text-sky-400 uppercase tracking-wider">
            Danh Mục Đào Tạo Chính Quy
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            9 Nhóm Ngành Trọng Điểm Tại HUIT
          </h2>
        </div>

        <Link
          href="/majors"
          className="inline-flex items-center gap-1.5 text-xs font-black text-[#0054A6] dark:text-sky-400 hover:underline shrink-0 group"
        >
          <span>Xem toàn bộ 39 chuyên ngành</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {faculties.map((fac) => {
          const Icon = fac.icon;
          return (
            <Link
              key={fac.id}
              href={`/majors?faculty=${encodeURIComponent(fac.name)}`}
              // h-full ở đây mới là thứ cho SpotlightCard bên trong cao bằng nhau:
              // ô lưới có kéo giãn, nhưng Link lại cao theo nội dung nên `h-full`
              // của thẻ con không có gì để bám → thẻ nào tiêu đề 2 dòng là lệch đáy.
              className="group block h-full"
            >
              <SpotlightCard
                className="h-full p-6 hover:border-[#0054A6]/60 dark:hover:border-sky-500/50"
                contentClassName="flex h-full flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-sky-950/40 group-hover:bg-[#0054A6] text-[#0054A6] dark:text-sky-400 group-hover:text-white flex items-center justify-center font-black transition-all shadow-xs group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-blue-50 dark:bg-sky-950/40 text-[#0054A6] dark:text-sky-400 border border-blue-200 dark:border-sky-800">
                      {fac.count} ngành
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#0054A6] dark:group-hover:text-sky-400 transition-colors leading-snug">
                    {fac.name}
                  </h3>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                    {fac.highlight}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500 font-bold">Điểm chuẩn 2026:</span>
                  <span className="font-black text-[#0054A6] dark:text-sky-400 bg-blue-50/70 dark:bg-sky-950/50 px-2 py-0.5 rounded">
                    {fac.scoreAvg ?? "Đang cập nhật"}
                  </span>
                </div>
              </SpotlightCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
