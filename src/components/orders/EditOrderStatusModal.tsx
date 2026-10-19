"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge, getOrderStatusVariant, getPaymentStatusVariant } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";

interface EditOrderStatusModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

interface StatusOption {
  value: OrderStatus;
  label: string;
  badgeText: string;
  badgeVariant: "success" | "warning" | "danger" | "info" | "muted" | "default";
  description: string;
  recommendedFor?: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "COMPLETED",
    label: "Completed (Selesai)",
    badgeText: "COMPLETED",
    badgeVariant: "success",
    description: "Barang sudah diserahkan ke pelanggan & transaksi selesai.",
    recommendedFor: "Kemarin lupa scan QR saat penyerahan barang",
  },
  {
    value: "REDEEMED",
    label: "Redeemed (Sudah Diambil)",
    badgeText: "REDEEMED",
    badgeVariant: "success",
    description: "Tiket penukaran telah diserahkan & diambil oleh pelanggan.",
  },
  {
    value: "READY_FOR_REDEMPTION",
    label: "Ready for Redemption (Siap Diambil)",
    badgeText: "READY_FOR_REDEMPTION",
    badgeVariant: "info",
    description: "Kembalikan ke status aktif / siap ditukarkan tiket QR-nya di stand.",
  },
  {
    value: "PAID",
    label: "Paid (Lunas)",
    badgeText: "PAID",
    badgeVariant: "success",
    description: "Pembayaran terverifikasi lunas, siap diproses atau dipersiapkan.",
  },
  {
    value: "WAITING_VERIFICATION",
    label: "Waiting Verification",
    badgeText: "WAITING_VERIFICATION",
    badgeVariant: "warning",
    description: "Menunggu verifikasi pembayaran manual oleh staf/kasir.",
  },
  {
    value: "PENDING_PAYMENT",
    label: "Pending Payment",
    badgeText: "PENDING_PAYMENT",
    badgeVariant: "warning",
    description: "Menunggu pembayaran dari pelanggan.",
  },
  {
    value: "CANCELLED",
    label: "Cancelled (Dibatalkan)",
    badgeText: "CANCELLED",
    badgeVariant: "danger",
    description: "Batalkan pesanan & kembalikan stok item ke inventaris secara otomatis.",
  },
];

const QUICK_REASONS = [
  "Lupa scan QR code saat penyerahan barang",
  "Barang sudah diserahkan kemarin ke pembeli",
  "Kembalikan ke status Siap Diambil",
  "Koreksi salah input status sebelumnya",
];

export function EditOrderStatusModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: EditOrderStatusModalProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("COMPLETED");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>("PAID");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state when order changes or modal opens
  useEffect(() => {
    if (order) {
      // Default to COMPLETED if currently READY_FOR_REDEMPTION, otherwise keep current status
      const defaultStatus: OrderStatus =
        order.status === "READY_FOR_REDEMPTION" ? "COMPLETED" : order.status;
      setSelectedStatus(defaultStatus);
      setSelectedPaymentStatus(
        defaultStatus === "COMPLETED" || defaultStatus === "REDEEMED"
          ? "PAID"
          : order.paymentStatus || "PAID"
      );
      setReason(
        order.status === "READY_FOR_REDEMPTION"
          ? "Lupa scan QR code saat penyerahan barang"
          : ""
      );
      setErrorMsg("");
    }
  }, [order, isOpen]);

  if (!order) return null;

  function handleSelectStatus(status: OrderStatus) {
    setSelectedStatus(status);
    // Smart auto-update payment status
    if (status === "COMPLETED" || status === "REDEEMED") {
      setSelectedPaymentStatus("PAID");
    } else if (status === "CANCELLED") {
      setSelectedPaymentStatus("CANCELLED");
    } else if (status === "READY_FOR_REDEMPTION") {
      if (selectedPaymentStatus === "CANCELLED") {
        setSelectedPaymentStatus("PAID");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    if (selectedStatus === order.status && selectedPaymentStatus === order.paymentStatus) {
      toast("Tidak ada perubahan status yang dipilih.", "warning");
      onClose();
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await updateOrderStatusAction(
        order.id,
        selectedStatus,
        selectedPaymentStatus,
        reason.trim() || undefined
      );

      if (!res.success || !res.order) {
        throw new Error(res.message || "Gagal mengubah status pesanan.");
      }

      toast(
        res.message || `Status pesanan #${order.orderNumber} berhasil diperbarui!`,
        "success"
      );
      onSuccess(res.order);
      onClose();
    } catch (err) {
      console.error("EditOrderStatusModal error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  }

  const isCurrentStatus = selectedStatus === order.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ubah Status Pesanan #${order.orderNumber}`}
      description="Ubah status pesanan dan tiket redemption secara manual (misal: barang sudah diserahkan tapi lupa scan QR, atau revert status)."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#47957F] hover:bg-[#3D8383] text-white font-bold"
          >
            {submitting ? "Menyimpan..." : "Simpan Perubahan Status"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs text-zinc-700">
        {/* Error message banner */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Order Summary Card */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 text-sm">#{order.orderNumber}</span>
              <span className="text-zinc-400">•</span>
              <span className="font-medium text-zinc-700">{order.customerName || "Pelanggan Umum"}</span>
              {order.customerPhone && (
                <span className="text-[11px] text-zinc-500 font-mono">({order.customerPhone})</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>Total: <strong className="text-zinc-800 font-semibold">{formatRupiah(order.total)}</strong></span>
              <span>•</span>
              <span>Metode: <strong className="text-zinc-800">{order.paymentMethod || "CASH"}</strong></span>
              {order.redemptionCode && (
                <>
                  <span>•</span>
                  <span>Kode Tiket: <strong className="font-mono text-[#3D8383]">{order.redemptionCode}</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">Status Saat Ini</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={getOrderStatusVariant(order.status)}>
                  {order.status}
                </Badge>
                <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Status Selection Cards */}
        <div>
          <label className="block text-xs font-bold text-zinc-800 mb-2">
            Pilih Status Pesanan Baru:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.value;
              const isCurrent = order.status === opt.value;

              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelectStatus(opt.value)}
                  className={`relative p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-[#47957F] bg-[#EAF5F1]/50 shadow-xs ring-2 ring-[#47957F]/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-[#47957F] bg-[#47957F]"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-zinc-800 text-xs">{opt.label}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                          Saat Ini
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed pl-5.5">
                      {opt.description}
                    </p>
                  </div>

                  {opt.recommendedFor && (
                    <div className="mt-2 pl-5.5">
                      <span className="inline-block text-[10px] font-semibold text-[#245D5D] bg-[#EBF5F8] border border-[#CEE4EC] px-2 py-0.5 rounded-md">
                        💡 Rekomendasi: {opt.recommendedFor}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Contextual Feedback Banner */}
        <div className="rounded-xl border p-3 text-[11px] transition-colors leading-relaxed">
          {selectedStatus === "COMPLETED" || selectedStatus === "REDEEMED" ? (
            <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50/60 border-emerald-200 -m-3 p-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-emerald-900">Pesanan Ditandai Selesai / Diambil</p>
                <p className="text-emerald-700 mt-0.5">
                  Tiket QR penukaran akan otomatis berstatus <strong>REDEEMED</strong> sehingga tiket tidak dapat digunakan ulang, dan pesanan tercatat lunas serta selesai.
                </p>
              </div>
            </div>
          ) : selectedStatus === "READY_FOR_REDEMPTION" ? (
            <div className="flex items-start gap-2 text-[#183331] bg-[#EAF5F1] border-[#CDE5DD] -m-3 p-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0 text-[#47957F] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div>
                <p className="font-semibold text-[#2A5E56]">Tiket QR Diaktifkan Kembali (READY)</p>
                <p className="text-[#3D8383] mt-0.5">
                  Status tiket QR direset menjadi <strong>READY</strong>. Tiket siap discan ulang oleh staf di stand atau dilihat pelanggan di tautan tiket mereka.
                </p>
              </div>
            </div>
          ) : selectedStatus === "CANCELLED" ? (
            <div className="flex items-start gap-2 text-rose-800 bg-rose-50 border-rose-200 -m-3 p-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-rose-900">Pembatalan Pesanan & Rollback Stok</p>
                <p className="text-rose-700 mt-0.5">
                  Jika pesanan sebelumnya sudah memotong stok produk/komponen bundle, sistem akan mengembalikan stok inventaris secara otomatis.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-zinc-600 bg-zinc-50 border-zinc-200 -m-3 p-3 rounded-xl">
              <svg className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-zinc-800">Status Pesanan Diubah ke {selectedStatus}</p>
                <p className="text-zinc-500 mt-0.5">
                  Perubahan status ini akan tercatat dalam sistem dan laporan penjualan Noury.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Status Option */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-800">
              Status Pembayaran (Payment Status)
            </label>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Sesuaikan status pembayaran jika diperlukan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs cursor-pointer"
            >
              <option value="PAID">PAID (Lunas)</option>
              <option value="PENDING">PENDING (Menunggu)</option>
              <option value="UNPAID">UNPAID (Belum Bayar)</option>
              <option value="CANCELLED">CANCELLED (Batal)</option>
              <option value="REFUNDED">REFUNDED (Refund)</option>
            </select>
            <Badge variant={getPaymentStatusVariant(selectedPaymentStatus)}>
              {selectedPaymentStatus}
            </Badge>
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-zinc-800">
              Alasan / Catatan Perubahan (Opsional):
            </label>
            <span className="text-[10px] text-zinc-400">Tersimpan di catatan pesanan</span>
          </div>

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Lupa scan QR saat penyerahan barang"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs"
          />

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] text-zinc-400 py-0.5">Pilihan cepat:</span>
            {QUICK_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  reason === preset
                    ? "bg-[#47957F]/10 border-[#47957F]/30 text-[#2A5E56] font-semibold"
                    : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-600"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
