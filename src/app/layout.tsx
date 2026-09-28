import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Black Market",
    default: "Black Market",
  },
  description: "Black Market — Merchandise & F&B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
