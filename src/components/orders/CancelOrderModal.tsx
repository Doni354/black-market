"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cancelOrderAction } from "@/lib/actions/orders";
import type { Order } from "@/lib/types";

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export function CancelOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CancelOrderModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!order) return null;

  const wasPaid =
    order.status === "READY_FOR_REDEMPTION" ||
    order.status === "COMPLETED" ||
    order.paymentStatus === "PAID";

  async function handleConfirmCancel() {
    if (!order) return;
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await cancelOrderAction(order.id, reason.trim() || undefined);
      if (!res.success) {
        throw new Error(res.message || "Gagal membatalkan pesanan.");
      }

      toast(
        `Pesanan #${order.orderNumber} berhasil dibatalkan${wasPaid ? " dan stok inventaris telah dikembalikan." : "."}`,
        "success"
      );
      onSuccess(order.id);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan pesanan."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batalkan Pesanan #${order.orderNumber}`}
      description="Konfirmasi pembatalan transaksi / pesanan."
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
          >
            Kembali
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={submitting}
            onClick={handleConfirmCancel}
          >
            Ya, Batalkan Pesanan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-xs text-zinc-300">
        <p>
          Anda akan membatalkan pesanan atas nama{" "}
          <strong className="text-zinc-100">{order.customerName || "Umum"}</strong>.
        </p>

        {wasPaid && (
          <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-2.5 text-[11px] text-red-300">
            <strong>Perhatian:</strong> Pesanan ini telah berstatus Paid / Siap Ambil. Membatalkan pesanan akan secara otomatis mengembalikan stok seluruh produk & komponen bundling ke inventaris.
          </div>
        )}

        <Input
          label="Alasan Pembatalan (Opsional)"
          placeholder="Contoh: Customer membatalkan via WA / Salah input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {errorMsg && (
          <div className="rounded-lg border border-red-800/80 bg-red-950/60 p-2 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
      </div>
    </Modal>
  );
}
