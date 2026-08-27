import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đường Lên Đỉnh Tri Thức - Hệ Thống Gameshow Đấu Trí",
  description: "Hệ thống thi đấu 4 người chơi trực tiếp chuẩn format Olympia với bảng điều khiển MC và màn hình máy chiếu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen bg-gradient-to-br from-[#060b18] via-[#0d1b3a] to-[#080d1f] text-slate-100">
        {children}
      </body>
    </html>
  );
}
