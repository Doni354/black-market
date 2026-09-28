"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import type { RedemptionDetails } from "@/lib/db/redemptions";
import type { Order, Redemption } from "@/lib/types";

interface RedemptionReviewProps {
  details: RedemptionDetails;
  onConfirmRedeem: (code: string) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  errorMsg: string | null;
  successResult: { order: Order; redemption: Redemption } | null;
}

export function RedemptionReview({
  details,
  onConfirmRedeem,
  onClose,
  isSubmitting,
  errorMsg,
  successResult,
}: RedemptionReviewProps) {
  const { order, redemption } = details;

  // Local checklist for cashier to tick items while handing over
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const isAlreadyRedeemed =
    redemption.status === "REDEEMED" || order.status === "REDEEMED";
  const isUnpaid = order.paymentStatus !== "PAID";
  const isCancelled =
    redemption.status === "CANCELLED" || order.status === "CANCELLED";

  function formatTimestamp(ts: unknown): string {
    if (!ts) return "sebelumnya";
    if (typeof ts === "string") {
      const d = new Date(ts);
      return isNaN(d.getTime())
        ? ts
        : d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    }
    if (typeof ts === "object") {
      if ("seconds" in ts && typeof (ts as { seconds: number }).seconds === "number") {
        return new Date((ts as { seconds: number }).seconds * 1000).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
      if ("_seconds" in ts && typeof (ts as { _seconds: number })._seconds === "number") {
        return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
    }
    return "sebelumnya";
  }

  const redeemedTime = formatTimestamp(
    redemption.redeemedAt || order.redeemedAt || order.updatedAt
  );

  function toggleCheckItem(id: string) {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  // If successfully redeemed in this interaction
  if (successResult) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Penukaran Berhasil!</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
          Barang untuk pesanan{" "}
          <span className="text-red-400 font-mono font-bold">
            #{successResult.order.orderNumber}
          </span>{" "}
          telah berhasil diserahkan kepada{" "}
          <strong className="text-zinc-200">
            {successResult.order.customerName || "Pelanggan"}
          </strong>
          .
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Scan Tiket Berikutnya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-red-500">
              #{order.orderNumber}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-mono text-zinc-400">
              {redemption.redemptionCode}
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 mt-0.5">
            Konfirmasi Serah Terima Barang
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Warnings */}
        {isAlreadyRedeemed && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-400 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase tracking-wide">
                TIKET SUDAH PERNAH DITUKARKAN!
              </p>
              <p className="text-red-300/90 mt-0.5">
                Tiket ini telah digunakan pada{" "}
                <span className="font-semibold text-white">{redeemedTime}</span>.
                Jangan serahkan barang kembali untuk mencegah double-handover.
              </p>
            </div>
          </div>
        )}

        {isUnpaid && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-400 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase">PESANAN BELUM LUNAS</p>
              <p className="text-amber-300/80 mt-0.5">
                Status pembayaran: {order.paymentStatus}. Tiket belum dapat ditukarkan.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase">PESANAN TELAH DIBATALKAN</p>
              <p className="text-red-300/80 mt-0.5">
                Pesanan ini telah dibatalkan di sistem.
              </p>
            </div>
          </div>
        )}

        {/* Customer Information Card */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-zinc-500">Nama Pelanggan</p>
            <p className="font-bold text-zinc-100 mt-0.5">
              {order.customerName || "Pelanggan"}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">No. WhatsApp</p>
            <p className="font-semibold text-zinc-200 mt-0.5 font-mono">
              {order.customerPhone || "-"}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Status Bayar</p>
            <p className="font-semibold text-emerald-400 mt-0.5">
              {order.paymentStatus} ({order.paymentMethod || "TRANSFER"})
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Total Nilai</p>
            <p className="font-bold text-zinc-200 mt-0.5 font-mono">
              {formatRupiah(order.total)}
            </p>
          </div>
        </div>

        {/* Checklist of Items to Handover */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Barang yang Harus Diserahkan ({order.items?.length || 0})
            </p>
            <span className="text-[11px] text-zinc-500">
              Centang saat mengemas
            </span>
          </div>

          <div className="space-y-2 border border-zinc-800 rounded-xl p-2 bg-zinc-950/60 max-h-56 overflow-y-auto">
            {order.items?.map((item, idx) => {
              const itemId = item.id || `item-${idx}`;
              const isChecked = !!checkedItems[itemId];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCheckItem(itemId)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    isChecked
                      ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                        isChecked
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-zinc-700 bg-zinc-800"
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isChecked ? "line-through text-zinc-400" : "text-zinc-200"}`}>
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {formatRupiah(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 font-mono">
                    {item.quantity} pcs
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition disabled:opacity-50"
        >
          Tutup / Batal
        </button>

        <button
          type="button"
          onClick={() => onConfirmRedeem(redemption.redemptionCode)}
          disabled={isAlreadyRedeemed || isUnpaid || isCancelled || isSubmitting}
          className="flex-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Konfirmasi Serah Terima</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
