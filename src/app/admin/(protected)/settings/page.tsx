import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsersAction } from "@/lib/actions/auth";
import { UserRoleManager } from "@/components/settings/UserRoleManager";

export const metadata: Metadata = {
  title: "Pengaturan Sistem",
  description: "Konfigurasi operasional dan manajemen hak akses pengguna.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currentUser, users] = await Promise.all([
    getCurrentUser(),
    getUsersAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Pengaturan Sistem
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Kelola hak akses pengguna, otorisasi staf kasir, dan preferensi aplikasi.
        </p>
      </div>

      {/* User Roles Management */}
      <UserRoleManager
        initialUsers={users}
        currentUserId={currentUser?.id || ""}
      />

      {/* App Info Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 text-xs text-zinc-400 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-zinc-200">Informasi Aplikasi Black Market</h3>
        <p>
          Sistem Point of Sale (POS), Inventaris, dan Tiket Pre-Order dibangun dengan Next.js App Router, Firebase Firestore, dan Cloudinary.
        </p>
        <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
          <div>
            <span className="text-zinc-500 block">Versi:</span>
            <span className="font-semibold text-zinc-300">v1.0.0-phase5</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Mata Uang:</span>
            <span className="font-semibold text-zinc-300">IDR (Rupiah Penuh)</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Ukuran Struk:</span>
            <span className="font-semibold text-zinc-300">80mm Thermal</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Metode Auth:</span>
            <span className="font-semibold text-zinc-300">Google Sign-in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
