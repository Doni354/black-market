"use client";

import { useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import { updatePaymentSettingsAction } from "@/lib/actions/operational-settings";
import type { PaymentSettings } from "@/lib/types/operational-settings";

interface PaymentSettingsManagerProps {
  initialSettings: PaymentSettings;
}

export function PaymentSettingsManager({ initialSettings }: PaymentSettingsManagerProps) {
  const { toast } = useToast();

  const [qrisImageUrl, setQrisImageUrl] = useState(initialSettings.qrisImageUrl || "");
  const [qrisMerchantName, setQrisMerchantName] = useState(initialSettings.qrisMerchantName || "NOURY FRESH & HEALTHY");
  const [bankName, setBankName] = useState(initialSettings.bankName || "BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState(initialSettings.bankAccountNumber || "1234567890");
  const [bankAccountHolder, setBankAccountHolder] = useState(initialSettings.bankAccountHolder || "NOURY — FRESH & HEALTHY BAR");
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialSettings.paymentInstructions || "Sertakan bukti transfer / screenshot setelah melakukan pembayaran."
  );

  const [uploadingQris, setUploadingQris] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File QRIS harus berupa gambar.", "error");
      return;
    }

    setUploadingQris(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/qris");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal upload gambar QRIS.");
      }

      setQrisImageUrl(data.url);
      toast("Gambar QRIS berhasil diunggah! Jangan lupa klik 'Simpan Pengaturan Pembayaran'.", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan upload gambar.",
        "error"
      );
    } finally {
      setUploadingQris(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updatePaymentSettingsAction({
        qrisImageUrl,
        qrisMerchantName: qrisMerchantName.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
        paymentInstructions: paymentInstructions.trim(),
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      toast("Pengaturan pembayaran QRIS & Bank berhasil disimpan!", "success");
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
      <div className="border-b border-[#EEF5F2] pb-4 mb-5">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#EAF5F1] text-[#3D8383] text-[11px] font-bold mb-1 border border-[#CDE5DC]">
          <span>METODE PEMBAYARAN NOURY</span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#183331]">
          Pengaturan QRIS & Rekening Bank
        </h2>
        <p className="text-xs text-[#52706C] mt-0.5">
          Atur gambar barcode QRIS dan informasi rekening tujuan transfer yang akan muncul di halaman checkout customer.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: QRIS Barcode */}
        <div className="rounded-xl border border-[#E2ECE8] bg-[#F9FBFA] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#3D8383] flex items-center gap-2">
            1. Barcode QRIS Resmi
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#B8CCC6] bg-white">
              {qrisImageUrl ? (
                <div className="space-y-2 text-center">
                  <div className="relative h-44 w-44 rounded-lg overflow-hidden border border-[#D5E6E1] mx-auto shadow-xs">
                    <Image
                      src={qrisImageUrl}
                      alt="QRIS Barcode"
                      fill
                      className="object-contain bg-white"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrisImageUrl("")}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus / Ganti Gambar
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 w-full cursor-pointer hover:border-[#47957F] transition text-center">
                  <svg className="w-8 h-8 text-[#7A9C96] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#183331]">
                    {uploadingQris ? "Mengunggah QRIS..." : "Upload Gambar Barcode QRIS"}
                  </span>
                  <span className="text-[10px] text-[#7A9C96] mt-1">PNG, JPG atau WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingQris}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="sm:col-span-8 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#183331] mb-1">
                  Nama Merchant QRIS
                </label>
                <input
                  type="text"
                  value={qrisMerchantName}
                  onChange={(e) => setQrisMerchantName(e.target.value)}
                  placeholder="Contoh: NOURY FRESH & HEALTHY BAR"
                  className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
                />
                <p className="text-[10px] text-[#7A9C96] mt-1">
                  Nama merchant yang tertera pada scanner e-wallet pembeli (GoPay, OVO, Dana, ShopeePay, BCA).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#183331] mb-1">
                  URL Gambar QRIS Langsung (Opsional jika di-hosting terpisah)
                </label>
                <input
                  type="url"
                  value={qrisImageUrl}
                  onChange={(e) => setQrisImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Bank Transfer Details */}
        <div className="rounded-xl border border-[#E2ECE8] bg-[#F9FBFA] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#47957F] flex items-center gap-2">
            2. Rekening Bank Transfer
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#183331] mb-1">
                Nama Bank
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Contoh: BCA / Mandiri / BNI"
                required
                className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#183331] mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="Contoh: 1234567890"
                required
                className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs font-mono text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#183331] mb-1">
                Atas Nama (Rekening)
              </label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Contoh: NOURY — FRESH & HEALTHY BAR"
                required
                className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#183331] mb-1">
              Catatan / Instruksi Pembayaran Transfer
            </label>
            <input
              type="text"
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Contoh: Sertakan nomor order di berita transfer..."
              className="w-full rounded-xl border border-[#D5E6E1] bg-white px-3.5 py-2.5 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || uploadingQris}
            className="px-5 py-2.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan Pembayaran"}
          </button>
        </div>
      </form>
    </div>
  );
}
