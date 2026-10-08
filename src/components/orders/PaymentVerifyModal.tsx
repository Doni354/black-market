"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { verifyOrderPaymentAction } from "@/lib/actions/orders";
import type { Order } from "@/lib/types";

interface PaymentVerifyModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, redemptionCode: string) => void;
}

export function PaymentVerifyModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: PaymentVerifyModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadedProofUrl, setUploadedProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!order) return null;

  const currentProof = uploadedProofUrl || order.proofUrl;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar", "error");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/payment-proofs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal upload gambar");
      }

      setUploadedProofUrl(data.url);
      toast("Bukti pembayaran berhasil diunggah", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan upload",
        "error"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmVerification() {
    if (!order) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await verifyOrderPaymentAction(order.id, currentProof || undefined);
      if (!res.success || !res.redemptionCode) {
        throw new Error(res.message || "Gagal memverifikasi pembayaran.");
      }

      toast(
        `Pembayaran #${order.orderNumber} berhasil diverifikasi! Tiket QR siap.`,
        "success"
      );
      onSuccess(order.id, res.redemptionCode);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verifikasi Pembayaran #${order.orderNumber}`}
      description="Periksa bukti transfer customer sebelum menyetujui pesanan pre-order."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || uploading}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={submitting}
            disabled={uploading}
            onClick={handleConfirmVerification}
            className="font-bold px-5 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            ✓ Setujui Pembayaran & Buat QR
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 text-xs text-zinc-700">
        {/* Order Brief Box */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-zinc-500">
            <span>Pemesan:</span>
            <span className="font-semibold text-zinc-800">
              {order.customerName || "—"} ({order.customerPhone || "No HP —"})
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>Metode Bayar:</span>
            <span className="font-semibold text-zinc-800">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-zinc-200 font-bold text-sm">
            <span>Total Tagihan:</span>
            <span className="text-[#3D8383]">{formatRupiah(order.total)}</span>
          </div>
        </div>

        {/* Proof of Payment View / Upload */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Bukti Pembayaran / Screenshot Transfer
          </span>

          {currentProof ? (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                <Image
                  src={currentProof}
                  alt="Bukti pembayaran"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <a
                href={currentProof}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#47957F] font-semibold hover:underline"
              >
                Buka Bukti Ukuran Penuh ↗
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 rounded-lg text-center gap-2 bg-white">
              <p className="text-zinc-500 text-[11px]">
                Customer belum melampirkan foto bukti pembayaran.
              </p>
              <label className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
                {uploading ? "Mengupload..." : "+ Unggah Bukti Manual"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Important notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          <p className="font-bold flex items-center gap-1 mb-0.5">
            ⚠️ Perhatian Penting
          </p>
          <p>
            Setelah pembayaran disetujui, stok produk otomatis akan terpotong dari inventaris dan tiket QR redemption akan langsung aktif untuk penukaran.
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {errorMsg}
          </div>
        )}
      </div>
    </Modal>
  );
}
