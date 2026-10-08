import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsersAction } from "@/lib/actions/auth";
import { getLoyaltySettings } from "@/lib/db/customer-portal";
import { getPaymentSettings, getBatchSettings } from "@/lib/db/operational-settings";
import { UserRoleManager } from "@/components/settings/UserRoleManager";
import { LoyaltySettingsManager } from "@/components/settings/LoyaltySettingsManager";
import { PaymentSettingsManager } from "@/components/settings/PaymentSettingsManager";
import { BatchSettingsManager } from "@/components/settings/BatchSettingsManager";
import { DataResetManager } from "@/components/settings/DataResetManager";

export const metadata: Metadata = {
  title: "Pengaturan Sistem | Noury",
  description: "Konfigurasi operasional, loyalitas stempel, QRIS, bank transfer, dan jadwal batch pre-order.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [currentUser, users, loyaltySettings, paymentSettings, batchSettings] = await Promise.all([
    getCurrentUser(),
    getUsersAction(),
    getLoyaltySettings(),
    getPaymentSettings(),
    getBatchSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#183331]">
          Pengaturan Sistem Noury
        </h1>
        <p className="mt-1 text-sm text-[#52706C]">
          Kelola pembayaran QRIS & bank, jadwal batch pre-order, program stempel loyalitas KWH, dan hak akses staf.
        </p>
      </div>

      {/* 1. Pengaturan Metode Pembayaran (QRIS & Bank) */}
      <PaymentSettingsManager initialSettings={paymentSettings} />

      {/* 2. Pengaturan Jadwal Batch Pre-Order */}
      <BatchSettingsManager initialSettings={batchSettings} />

      {/* 3. Program Loyalitas & Stempel KWH Manager */}
      <LoyaltySettingsManager initialSettings={loyaltySettings} />

      {/* 4. User Roles Management */}
      <UserRoleManager
        initialUsers={users}
        currentUserId={currentUser?.id || ""}
      />

      {/* 5. Zona Bahaya: Reset Data Sistem Uji Coba (Go-Live) */}
      {currentUser?.role === "ADMIN" && <DataResetManager />}

      {/* App Info Box */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 text-xs text-[#52706C] flex flex-col gap-2 shadow-xs">
        <h3 className="text-sm font-bold text-[#183331]">Informasi Aplikasi Noury — No Worries</h3>
        <p>
          Sistem Point of Sale (POS), Inventaris Menu Segar, Loyalitas Stempel, dan Tiket Pre-Order berbasis Next.js App Router, Firebase Firestore, dan Cloudinary.
        </p>
        <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#EEF5F2] text-[11px]">
          <div>
            <span className="text-[#7A9C96] block">Projek:</span>
            <span className="font-semibold text-[#183331]">Kewirausahaan (KWH)</span>
          </div>
          <div>
            <span className="text-[#7A9C96] block">Mata Uang:</span>
            <span className="font-semibold text-[#183331]">IDR (Rupiah Penuh)</span>
          </div>
          <div>
            <span className="text-[#7A9C96] block">Ukuran Struk:</span>
            <span className="font-semibold text-[#183331]">80mm Thermal</span>
          </div>
          <div>
            <span className="text-[#7A9C96] block">Metode Auth:</span>
            <span className="font-semibold text-[#183331]">Google Sign-in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
