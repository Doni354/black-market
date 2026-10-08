"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import { useToast } from "@/components/ui/Toast";
import { updateLoyaltySettingsAction } from "@/lib/actions/customer";
import type { LoyaltySettings } from "@/lib/db/customer-portal";

interface LoyaltySettingsManagerProps {
  initialSettings: LoyaltySettings;
}

export function LoyaltySettingsManager({ initialSettings }: LoyaltySettingsManagerProps) {
  const { toast } = useToast();

  const [isLoyaltyEnabled, setIsLoyaltyEnabled] = useState(initialSettings.isLoyaltyEnabled);
  const [stampsRequired, setStampsRequired] = useState(initialSettings.stampsRequired);
  const [minSpendPerStamp, setMinSpendPerStamp] = useState(initialSettings.minSpendPerStamp);
  const [stampRewardDiscount, setStampRewardDiscount] = useState(initialSettings.stampRewardDiscount);
  const [stampRewardMinOrder, setStampRewardMinOrder] = useState(initialSettings.stampRewardMinOrder);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateLoyaltySettingsAction({
        isLoyaltyEnabled,
        stampsRequired: Number(stampsRequired),
        minSpendPerStamp: Number(minSpendPerStamp),
        stampRewardDiscount: Number(stampRewardDiscount),
        stampRewardMinOrder: Number(stampRewardMinOrder),
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      toast("Pengaturan program stempel KWH berhasil disimpan!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF5F2] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#EAF5F1] text-[#3D8383] text-[11px] font-bold mb-1 border border-[#CDE5DC]">
            <span>🥑</span>
            <span>PROGRAM LOYALITAS MAHASISWA KWH</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#183331]">
            Konfigurasi Kartu Stempel & Diskon Noury
          </h2>
          <p className="text-xs text-[#52706C] mt-0.5">
            Atur batas stempel dan diskon agar sesuai dengan batas anggaran proyek kewirausahaan mahasiswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#183331]">
            <input
              type="checkbox"
              checked={isLoyaltyEnabled}
              onChange={(e) => setIsLoyaltyEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-[#D5E6E1] text-[#47957F] focus:ring-[#47957F]"
            />
            <span>{isLoyaltyEnabled ? "Program Aktif" : "Program Nonaktif"}</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stamps Required */}
          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Jumlah Stempel untuk Dapat Reward
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={stampsRequired}
              onChange={(e) => setStampsRequired(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Berapa kali pembeli harus pesan untuk mendapatkan reward (default: 5 stempel).
            </p>
          </div>

          {/* Min Spend Per Stamp */}
          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Minimal Belanja per Stempel (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={minSpendPerStamp}
              onChange={(e) => setMinSpendPerStamp(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Customer hanya mendapat 1 stempel jika total belanja minimal {formatRupiah(minSpendPerStamp)}.
            </p>
          </div>

          {/* Stamp Reward Discount Amount */}
          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Potongan Diskon Voucher Reward (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={stampRewardDiscount}
              onChange={(e) => setStampRewardDiscount(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Nominal potongan diskon saat voucher reward stempel diklaim (default: Rp 5.000).
            </p>
          </div>

          {/* Min Order for using the reward voucher */}
          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Minimal Belanja untuk Memakai Voucher (Rp)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={stampRewardMinOrder}
              onChange={(e) => setStampRewardMinOrder(Number(e.target.value))}
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Syarat minimal belanja customer untuk dapat memakai voucher reward ini (default: Rp 20.000).
            </p>
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="rounded-xl border border-[#D5E6E1] bg-[#F9FBFA] p-3.5 text-xs text-[#183331] space-y-1">
          <p className="font-bold text-[#183331] flex items-center gap-1.5">
            <span>📊</span>
            <span>Simulasi Keuangan Loyalitas KWH:</span>
          </p>
          <p className="text-[#52706C] text-[11px]">
            Customer harus membelanjakan minimal{" "}
            <strong className="text-[#183331]">
              {formatRupiah(stampsRequired * minSpendPerStamp)}
            </strong>{" "}
            ({stampsRequired}x transaksi @ {formatRupiah(minSpendPerStamp)}) untuk memperoleh voucher diskon sebesar{" "}
            <strong className="text-[#47957F]">{formatRupiah(stampRewardDiscount)}</strong>.
          </p>
          <p className="text-[10px] text-[#7A9C96]">
            Maksimum rasio diskon terhadap omzet:{" "}
            <strong>
              {((stampRewardDiscount / (stampsRequired * minSpendPerStamp + stampRewardMinOrder)) * 100).toFixed(1)}%
            </strong>{" "}
            (Sangat aman untuk margin keuntungan produk mahasiswa KWH).
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan Stempel"}
          </button>
        </div>
      </form>
    </div>
  );
}
