import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login Staf & Admin | Noury — No Worries",
  description: "Portal login operasional, kasir (POS), dan manajemen Noury.",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("AdminLoginPage error checking user:", err);
  }

  if (user && user.status === "ACTIVE") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFCFA] text-[#183331] p-4 relative selection:bg-[#47957F] selection:text-white">
      {/* Background soft glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-noury-mint/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl border border-[#DCE8E4] bg-white p-6 sm:p-8 shadow-xl">
        {/* Direct Frameless Brand Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/icons/Logo.svg"
            alt="Noury"
            width={160}
            height={56}
            priority
            className="h-14 w-auto object-contain mb-2"
          />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#183331]">
            Noury — No Worries
          </h1>
          <p className="text-xs text-[#52706C] mt-0.5">
            Portal Operasional, Kasir (POS) & Staf KWH
          </p>
        </div>

        {/* Login Form with Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-noury-mint border-t-transparent" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to Public Home */}
        <div className="mt-6 border-t border-[#EDF4F1] pt-4 text-center">
          <Link
            href="/"
            className="text-xs text-[#52706C] hover:text-noury-teal transition-colors font-medium"
          >
            ← Kembali ke Katalog Menu Publik
          </Link>
        </div>
      </div>
    </div>
  );
}
