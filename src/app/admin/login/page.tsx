import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login Kasir & Admin | Black Market",
  description: "Portal login operasional dan kasir Black Market.",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user && user.status === "ACTIVE") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm sm:max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-xl shadow-red-950/50">
            <span className="text-xl font-black text-white tracking-wider">BM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100">
            Black Market
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Portal Operasional & Kasir (POS)
          </p>
        </div>

        {/* Login Form with Suspense for useSearchParams */}
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back to Public Home */}
        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Kembali ke Katalog Publik
          </Link>
        </div>
      </div>
    </div>
  );
}
