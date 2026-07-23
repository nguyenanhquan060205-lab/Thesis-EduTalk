import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HUIT EduTalk | Hệ thống Tuyển sinh thông minh",
  description: "Hệ thống AI tư vấn tuyển sinh thông minh kết hợp XGBoost và luật chuyên gia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col pt-24 relative`}>

        {/* Global Noise Overlay for Awwwards Texture */}
        <div className="fixed inset-0 bg-noise pointer-events-none mix-blend-overlay opacity-[0.35] z-0"></div>

        <Navbar />

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-12 animate-fade-in-up relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200 py-12 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto px-6 text-center text-slate-500">
            <p className="font-black text-slate-800 mb-2">Trường Đại học Công Thương TP.HCM (HUIT)</p>
            <p className="text-sm font-medium">Hệ thống AI Tư vấn Hướng nghiệp - Phát triển bởi Nhóm Nghiên cứu K14</p>
          </div>
        </footer>

        {/* Global Chat Widget */}
        <div className="relative z-50">
          <ChatWidget />
        </div>
      </body>
    </html>
  );
}
