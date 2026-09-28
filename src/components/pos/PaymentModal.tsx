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
  onConfirmPayment,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState<string>(total.toString());
  const [customerName, setCustomerName] = useState("");
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
      formData.append("folder", "black-market/payment-proofs");

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
            className="font-bold px-5"
          >
            Selesaikan Transaksi
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Total Tagihan Banner */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400">
            Total Tagihan
          </span>
          <p className="text-2xl font-black text-red-500">
            {formatRupiah(total)}
          </p>
        </div>

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
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
                  ? "border-red-600 bg-red-600/10 text-red-400 shadow-sm shadow-red-950/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              💵 Tunai / Cash
            </button>

            <button
              type="button"
              onClick={() => setMethod("QRIS")}
              className={`rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                method === "QRIS"
                  ? "border-red-600 bg-red-600/10 text-red-400 shadow-sm shadow-red-950/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              📱 QRIS
            </button>

            <button
              type="button"
              onClick={() => setMethod("BANK_TRANSFER")}
              className={`rounded-xl border py-2.5 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                method === "BANK_TRANSFER"
                  ? "border-red-600 bg-red-600/10 text-red-400 shadow-sm shadow-red-950/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              🏦 Transfer Bank
            </button>
          </div>
        </div>

        {/* CASH Fast Keypad & Change */}
        {method === "CASH" && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
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
                  className="rounded-lg border border-red-800/60 bg-red-950/40 px-2.5 py-1 text-xs font-bold text-red-300 hover:bg-red-900/40 transition-colors cursor-pointer"
                >
                  Uang Pas
                </button>
                {QUICK_SET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashInput(amt.toString())}
                    className="rounded-lg border border-zinc-700 bg-zinc-850 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-red-500 hover:text-white transition-colors cursor-pointer"
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
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:border-emerald-600 hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  >
                    +{addAmt >= 1000 ? `${addAmt / 1000}k` : addAmt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashInput("0")}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Change / Kembalian Calculation */}
            <div
              className={`mt-1.5 flex items-center justify-between rounded-lg border px-3 py-2 ${
                isCashInsufficient
                  ? "border-red-800/80 bg-red-950/40 text-red-400"
                  : "border-emerald-800/80 bg-emerald-950/40 text-emerald-300"
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
          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-xl font-bold text-zinc-200">
              QR
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">
                Arahkan customer untuk scan QRIS kasir / EDC
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pastikan nominal yang ditransfer:{" "}
                <strong className="text-red-400 font-bold">
                  {formatRupiah(total)}
                </strong>
              </p>
            </div>

            <label className="mt-1 flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={qrisConfirmed}
                onChange={(e) => setQrisConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
              />
              <span>Saya telah memverifikasi pembayaran QRIS berhasil</span>
            </label>
          </div>
        )}

        {/* Bank Transfer Details */}
        {method === "BANK_TRANSFER" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-200 mb-0.5">
              Transfer ke Rekening Black Market
            </p>
            <p>
              Kasir mengonfirmasi bahwa mutasi rekening telah diterima senilai{" "}
              <strong className="text-red-400">{formatRupiah(total)}</strong>.
            </p>
          </div>
        )}

        {/* Bukti Pembayaran / Attachment (Opsional) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Bukti Pembayaran / Attachment (Opsional)
            </label>
            {proofUrl && (
              <button
                type="button"
                onClick={() => setProofUrl("")}
                className="text-[11px] text-red-400 hover:text-red-300"
              >
                Hapus Foto
              </button>
            )}
          </div>

          {proofUrl ? (
            <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-zinc-700">
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
                className="text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
              />
              {uploadingProof && (
                <span className="text-[11px] text-red-400">Mengupload...</span>
              )}
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">
            Screenshot transfer DANA, QRIS, atau mutasi bank bisa dilampirkan.
          </p>
        </div>

        {/* Customer Name & Notes (Compact) */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Input
            label="Nama Pelanggan (Opsional)"
            placeholder="Contoh: Doni"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <Input
            label="Catatan (Opsional)"
            placeholder="Contoh: Bungkus, tanpa es"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg border border-red-800/80 bg-red-950/60 p-2.5 text-xs text-red-300">
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
}
