import type { Metadata } from "next";
import { CustomerPortal } from "@/components/customer/CustomerPortal";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Akun Saya & Kartu Stempel | Noury — No Worries",
  description: "Kelola akun loyalitas Noury, kumpulkan stempel sehat, gunakan voucher diskon, dan lihat tiket pesanan Anda.",
};

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[#FAFCFA] text-[#183331] flex flex-col">
      {/* Simple Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#DCE8E4] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            {/* Direct Frameless Logo */}
            <Image
              src="/icons/Logo.svg"
              alt="Noury"
              width={120}
              height={36}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-[#52706C] hover:text-noury-teal px-2 py-1 transition"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 sm:py-6">
        <CustomerPortal />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5EFEB] py-6 text-center text-xs text-[#7A9C96]">
        <p>© 2026 Noury • No Worries. Mahasiswa Kewirausahaan (KWH).</p>
      </footer>
    </div>
  );
}
