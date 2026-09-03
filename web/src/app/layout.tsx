import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"]
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "HUIT EduTalk — Hệ Thống Trợ Lý AI Tuyển Sinh & Tư Vấn Hướng Nghiệp Thông Minh",
  description: "Hệ thống AI tư vấn tuyển sinh và định hướng ngành học thông minh Đại học Công Thương TP.HCM (HUIT), ứng dụng XGBoost và Mô hình Chuyên gia.",
  keywords: ["HUIT", "Tuyển sinh 2026", "EduTalk", "Đại học Công Thương TP.HCM", "Tư vấn hướng nghiệp AI", "XGBoost Tuyển sinh"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className={`${plusJakartaSans.variable} font-sans bg-[#f8fafc] text-slate-900 antialiased min-h-screen selection:bg-blue-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}

