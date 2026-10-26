import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// self-hosted by Next.js at build time: no render-blocking request to Google Fonts
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Stego — Save Time, Eat & Go",
  description: "Smart food pre-ordering platform. Order meals before arriving at restaurants to skip the wait.",
  keywords: "food ordering, pre-order, restaurant, skip wait, pickup",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
