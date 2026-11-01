import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Đoán Mật Mã Số 1v1 - Đấu Trường Trực Tuyến Realtime",
  description:
    "Thử thách trí tuệ với game đoán mật mã số 4 chữ số 1v1 thời gian thực. Đấu xếp hạng, leo rank, tích lũy điểm và mở khóa danh hiệu hấp dẫn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
