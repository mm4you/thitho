import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đấu Trí Arena",
  description: "Hệ thống thi đấu 4 người chơi trực tiếp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}