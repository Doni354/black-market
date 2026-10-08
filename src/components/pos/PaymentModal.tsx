"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, parseRupiah } from "@/lib/utils/money";
import type { PaymentMethod } from "@/lib/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  discount: number;
  onConfirmPayment: (details: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    proofUrl?: string;
  }) => Promise<void>;
}

// Cash buttons
const QUICK_SET_OPTIONS = [10000, 20000, 50000, 100000];
const QUICK_ADD_OPTIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

export function PaymentModal({
  isOpen,
  onClose,
  total,
  subtotal = total,
  discount = 0,
  onConfirmPayment,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState<string>(total.toString());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [qrisConfirmed, setQrisConfirmed] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const amountPaid = method === "CASH" ? parseRupiah(cashInput) : total;
  const change = Math.max(0, amountPaid - total);
  const isCashInsufficient = method === "CASH" && amountPaid < total;

  // Handle cash increment buttons
  function handleAddCash(addAmount: number) {
    const current = parseRupiah(cashInput);
    const next = current + addAmount;
    setCashInput(next.toString());
  }

  // Handle proof image upload
  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 5MB", "error");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/payment-proofs");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal upload bukti");
      }

      setProofUrl(result.url);
      toast("Bukti pembayaran berhasil diupload", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal upload bukti pembayaran",
        "error"
      );
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleConfirm() {
    setErrorMessage("");

    if (method === "CASH" && isCashInsufficient) {
      setErrorMessage("Nominal uang yang diterima kurang dari total tagihan.");
      return;
    }

    if (method === "QRIS" && !qrisConfirmed) {
      setErrorMessage("Silakan konfirmasi bahwa dana QRIS telah diterima.");
      return;
    }

    setLoading(true);
    try {
      await onConfirmPayment({
        paymentMethod: method,
        amountPaid,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        proofUrl: proofUrl || undefined,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memproses pembayaran."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Transaksi"
      description="Pilih metode pembayaran dan masukkan rincian transaksi."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || uploadingProof}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            disabled={
              isCashInsufficient ||
              (method === "QRIS" && !qrisConfirmed) ||
              uploadingProof
            }
            onClick={handleConfirm}
            className="font-bold px-5 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            Selesaikan Transaksi
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Total Tagihan Banner */}
        <div className="rounded-xl border border-[#47957F]/20 bg-[#47957F]/5 p-3.5 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3D8383]">
            Total Tagihan
          </span>
          <p className="text-2xl font-black text-zinc-900 mt-0.5">
            {formatRupiah(total)}
          </p>
          {discount > 0 && (
            <p className="text-xs text-[#2A5E56] font-semibold mt-1">
              (Subtotal: {formatRupiah(subtotal)} • Diskon Kupon: -{formatRupiah(discount)})
            </p>
          )}
        </div>

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setMethod("CASH");
                setCashInput(total.toString());
              }}
              className={`rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                method === "CASH"
                  ? "border-[#47957F] bg-[#47957F]/10 text-[#3D8383] shadow-sm font-bold"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              Tunai / Cash
            </button>

            <button
              type="button"
              onClick={() => setMethod("QRIS")}
              className={`rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                method === "QRIS"
                  ? "border-[#47957F] bg-[#47957F]/10 text-[#3D8383] shadow-sm font-bold"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              QRIS
            </button>

            <button
              type="button"
              onClick={() => setMethod("BANK_TRANSFER")}
              className={`rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                method === "BANK_TRANSFER"
                  ? "border-[#47957F] bg-[#47957F]/10 text-[#3D8383] shadow-sm font-bold"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              Transfer Bank
            </button>
          </div>
        </div>

        {/* CASH Fast Keypad & Change */}
        {method === "CASH" && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
            <Input
              label="Uang Diterima (Rp)"
              type="number"
              min={0}
              step={1000}
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              placeholder={total.toString()}
              helperText={amountPaid > 0 ? formatRupiah(amountPaid) : undefined}
            />

            {/* Quick Set Row */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-zinc-500 mr-1">Nominal:</span>
                <button
                  type="button"
                  onClick={() => setCashInput(total.toString())}
                  className="rounded-lg border border-[#47957F]/40 bg-[#47957F]/10 px-2.5 py-1 text-xs font-bold text-[#3D8383] hover:bg-[#47957F]/20 transition-colors cursor-pointer"
                >
                  Uang Pas
                </button>
                {QUICK_SET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashInput(amt.toString())}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:border-[#47957F] hover:text-[#3D8383] transition-colors cursor-pointer shadow-xs"
                  >
                    {amt / 1000}k
                  </button>
                ))}
              </div>

              {/* Quick Increment Row (+1k, +2k, +5k, +10k, +20k, +50k) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-zinc-500 mr-1">Tambah:</span>
                {QUICK_ADD_OPTIONS.map((addAmt) => (
                  <button
                    key={addAmt}
                    type="button"
                    onClick={() => handleAddCash(addAmt)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#47957F] hover:border-[#47957F] hover:bg-[#47957F]/5 transition-colors cursor-pointer shadow-xs"
                  >
                    +{addAmt >= 1000 ? `${addAmt / 1000}k` : addAmt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashInput("0")}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Change / Kembalian Calculation */}
            <div
              className={`mt-1.5 flex items-center justify-between rounded-lg border px-3 py-2 ${
                isCashInsufficient
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <span className="text-xs font-semibold">
                {isCashInsufficient ? "Uang Kurang:" : "Kembalian:"}
              </span>
              <span className="text-base font-black">
                {isCashInsufficient
                  ? formatRupiah(total - amountPaid)
                  : formatRupiah(change)}
              </span>
            </div>
          </div>
        )}

        {/* QRIS Details */}
        {method === "QRIS" && (
          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-zinc-200 text-lg font-bold text-[#3D8383] shadow-xs">
              QR
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-800">
                Arahkan customer untuk scan QRIS Noury
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Pastikan nominal yang ditransfer:{" "}
                <strong className="text-[#3D8383] font-bold">
                  {formatRupiah(total)}
                </strong>
              </p>
            </div>

            <label className="mt-1 flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={qrisConfirmed}
                onChange={(e) => setQrisConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-[#47957F] focus:ring-[#47957F]"
              />
              <span>Saya telah memverifikasi pembayaran QRIS berhasil</span>
            </label>
          </div>
        )}

        {/* Bank Transfer Details */}
        {method === "BANK_TRANSFER" && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-800 mb-0.5">
              Transfer ke Rekening Noury
            </p>
            <p>
              Kasir mengonfirmasi bahwa mutasi rekening telah diterima senilai{" "}
              <strong className="text-[#3D8383]">{formatRupiah(total)}</strong>.
            </p>
          </div>
        )}

        {/* Bukti Pembayaran / Attachment (Opsional) */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Bukti Pembayaran / Attachment (Opsional)
            </label>
            {proofUrl && (
              <button
                type="button"
                onClick={() => setProofUrl("")}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium"
              >
                Hapus Foto
              </button>
            )}
          </div>

          {proofUrl ? (
            <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-zinc-200">
              <Image
                src={proofUrl}
                alt="Bukti pembayaran"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                disabled={uploadingProof || loading}
                className="text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              />
              {uploadingProof && (
                <span className="text-[11px] text-[#47957F]">Mengupload...</span>
              )}
            </div>
          )}
          <p className="text-[10px] text-zinc-400 mt-1">
            Screenshot transfer atau bukti QRIS/bank bisa dilampirkan.
          </p>
        </div>

        {/* Customer Name, WhatsApp & Notes (Compact) */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Input
            label="Nama Pelanggan (Opsional)"
            placeholder="Contoh: Doni"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <Input
            label="No. WhatsApp (Stempel Loyalitas)"
            placeholder="Contoh: 081234567890"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        <Input
          label="Catatan (Opsional)"
          placeholder="Contoh: Bungkus, tanpa es"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
