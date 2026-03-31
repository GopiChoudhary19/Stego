import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stego — Save Time, Eat & Go",
  description: "Smart food pre-ordering platform. Order meals before arriving at restaurants to skip the wait.",
  keywords: "food ordering, pre-order, restaurant, skip wait, pickup",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
