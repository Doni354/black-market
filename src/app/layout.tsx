import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { CustomerAuthProvider } from "@/lib/auth/customer-context";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const viewport: Viewport = {
  themeColor: "#3D8383",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    template: "%s | Noury - No Worries",
    default: "Noury — No Worries",
  },
  description:
    "Noury — No Worries. Playful path toward freshness and healthy living: fruit, water, food, refreshing lifestyle.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noury",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full bg-[#FAFCFA] text-[#183331] selection:bg-[#47957F] selection:text-white">
        <CustomerAuthProvider>
          <ToastProvider>
            {children}
            <PwaRegister />
          </ToastProvider>
        </CustomerAuthProvider>
      </body>
    </html>
  );
}
