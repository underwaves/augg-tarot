import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Magical Pastel Tarot - ระบบจัดการและติดตามคิวเปิดไพ่ทาโรต์",
  description: "ระบบบริหารจัดการคิวและติดตามคิวลูกค้าสำหรับร้านเปิดไพ่ทาโรต์ออนไลน์ ภายใต้ธีม Magical Pastel",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FFD9E8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased selection:bg-pastel-lavender selection:text-pastel-deep">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
