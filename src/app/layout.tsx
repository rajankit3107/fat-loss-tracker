import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fat Loss Tracker — 100kg → 85kg",
  description: "Daily fat loss tracking app - log meals, training, steps, sleep & more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#fafafa]">{children}</body>
    </html>
  );
}
