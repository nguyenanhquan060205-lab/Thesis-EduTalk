import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
