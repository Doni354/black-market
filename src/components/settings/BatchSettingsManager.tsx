"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateBatchSettingsAction } from "@/lib/actions/operational-settings";
import type { BatchSettings } from "@/lib/types/operational-settings";

interface BatchSettingsManagerProps {
  initialSettings: BatchSettings;
}

export function BatchSettingsManager({ initialSettings }: BatchSettingsManagerProps) {
  const { toast } = useToast();

  const [isBatchEnabled, setIsBatchEnabled] = useState(initialSettings.isBatchEnabled);
  const [activeBatchName, setActiveBatchName] = useState(initialSettings.activeBatchName || "Batch 1 (Minggu Ini)");
  const [batchPickupSchedule, setBatchPickupSchedule] = useState(
    initialSettings.batchPickupSchedule || "Jumat, 10 Oktober 2026 • 11.30 - 15.00 WIB"
  );
  const [batchPickupLocation, setBatchPickupLocation] = useState(
    initialSettings.batchPickupLocation || "Stand Noury KWH - Area Bazar Kampus"
  );
  const [batchNotes, setBatchNotes] = useState(
    initialSettings.batchNotes || "Menu diracik segar pada hari H batch pengambilan."
  );

  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateBatchSettingsAction({
        isBatchEnabled,
        activeBatchName: activeBatchName.trim(),
        batchPickupSchedule: batchPickupSchedule.trim(),
        batchPickupLocation: batchPickupLocation.trim(),
        batchNotes: batchNotes.trim(),
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      toast("Jadwal Batch Pre-Order berhasil disimpan!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal menyimpan jadwal batch.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF5F2] pb-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#CDD272]/30 text-[#384a14] border border-[#CDD272] text-[11px] font-bold mb-1">
            <span>📦</span>
            <span>MANAJEMEN BATCH PRE-ORDER</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#183331]">
            Jadwal Batch Pengambilan Menu
          </h2>
          <p className="text-xs text-[#52706C] mt-0.5">
            Gantikan opsi fleksibel dengan batch terstruktur (misal: Batch per minggu) untuk mengatur jadwal produksi dan penyerahan pesanan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#183331]">
            <input
              type="checkbox"
              checked={isBatchEnabled}
              onChange={(e) => setIsBatchEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-[#D5E6E1] text-[#47957F] focus:ring-[#47957F]"
            />
            <span>{isBatchEnabled ? "Opsi Batch Aktif" : "Opsi Batch Nonaktif"}</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Nama Batch Aktif
            </label>
            <input
              type="text"
              value={activeBatchName}
              onChange={(e) => setActiveBatchName(e.target.value)}
              placeholder="Contoh: Batch 1 (Minggu Ini)"
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Label batch yang akan dipilih customer saat checkout.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Hari & Waktu Pengambilan Batch
            </label>
            <input
              type="text"
              value={batchPickupSchedule}
              onChange={(e) => setBatchPickupSchedule(e.target.value)}
              placeholder="Contoh: Jumat, 10 Oktober 2026 • 11.30 - 15.00 WIB"
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Waktu pengambilan yang tertera di form pesanan dan tiket QR.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Lokasi / Titik Penyerahan
            </label>
            <input
              type="text"
              value={batchPickupLocation}
              onChange={(e) => setBatchPickupLocation(e.target.value)}
              placeholder="Contoh: Stand Noury KWH - Area Bazar Kampus"
              required
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Catatan untuk Pemesan Batch
            </label>
            <input
              type="text"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Contoh: Menu diracik segar pada pagi hari pengambilan."
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Jadwal Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}
