"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import type { RedemptionDetails } from "@/lib/db/redemptions";
import type { Order, Redemption } from "@/lib/types";

interface RedemptionReviewProps {
  details: RedemptionDetails;
  onConfirmRedeem: (
    code: string,
    options?: {
      settleCod?: boolean;
      settleMethod?: "CASH" | "QRIS";
      amountPaid?: number;
    }
  ) => Promise<void>;
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
  const isCodUnpaid = order.paymentMethod === "COD" && order.paymentStatus !== "PAID";
  const isNonCodUnpaid = order.paymentMethod !== "COD" && order.paymentStatus !== "PAID";
  const isCancelled =
    redemption.status === "CANCELLED" || order.status === "CANCELLED";

  const [settleMethod, setSettleMethod] = useState<"CASH" | "QRIS">("CASH");
  const [amountPaidInput, setAmountPaidInput] = useState<string>(String(order.total));

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
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-[#47957F]/10 border border-[#47957F]/30 text-[#3D8383] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Penukaran Berhasil!</h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
          Pesanan{" "}
          <span className="text-[#3D8383] font-mono font-bold">
            #{successResult.order.orderNumber}
          </span>{" "}
          telah berhasil diserahkan kepada{" "}
          <strong className="text-zinc-800">
            {successResult.order.customerName || "Pelanggan"}
          </strong>
          .
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#47957F]/20 cursor-pointer"
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
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#3D8383]">
              #{order.orderNumber}
            </span>
            <span className="text-zinc-400">•</span>
            <span className="text-xs font-mono text-zinc-500">
              {redemption.redemptionCode}
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-900 mt-0.5">
            Konfirmasi Serah Terima Pesanan
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Warnings */}
        {isAlreadyRedeemed && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase tracking-wide text-red-900">
                TIKET SUDAH PERNAH DITUKARKAN!
              </p>
              <p className="text-red-700 mt-0.5">
                Tiket ini telah digunakan pada{" "}
                <span className="font-semibold text-red-950">{redeemedTime}</span>.
                Jangan serahkan pesanan kembali untuk mencegah duplikasi serah terima.
              </p>
            </div>
          </div>
        )}

        {/* COD Settlement Panel (Legacy safety check if any old order exists) */}
        {isCodUnpaid && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Tagihan Belum Lunas — Pelunasan di Stan
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Wajib tagih pembayaran sebelum pesanan diserahkan ke pelanggan.
                  </p>
                </div>
              </div>
              <span className="text-base font-extrabold text-amber-900 font-mono">
                {formatRupiah(order.total)}
              </span>
            </div>

            {order.proofUrl && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-emerald-300">
                <span className="text-sm">📷</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-emerald-800">Pembeli Mengunggah Bukti Bayar:</p>
                  <a
                    href={order.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 underline truncate block"
                  >
                    Buka Foto Bukti Transfer/QRIS ↗
                  </a>
                </div>
              </div>
            )}

            {/* Settle Method Toggle */}
            <div className="pt-2 border-t border-amber-200">
              <label className="text-[11px] font-semibold text-zinc-700 block mb-1.5">
                Metode Pembayaran Pelunasan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod("CASH")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    settleMethod === "CASH"
                      ? "bg-amber-100 border-amber-400 text-amber-900 font-bold"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  💵 Tunai (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod("QRIS")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    settleMethod === "QRIS"
                      ? "bg-amber-100 border-amber-400 text-amber-900 font-bold"
                      : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  📱 QRIS Stan
                </button>
              </div>

              {settleMethod === "CASH" && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Uang Diterima (Rp)</label>
                    <input
                      type="number"
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-800 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Kembalian (Rp)</label>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-mono font-bold text-emerald-700">
                      {formatRupiah(Math.max(0, (Number(amountPaidInput) || 0) - order.total))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isNonCodUnpaid && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase text-amber-900">PESANAN BELUM LUNAS</p>
              <p className="text-amber-700 mt-0.5">
                Status pembayaran: {order.paymentStatus}. Tiket transfer belum dapat ditukarkan sampai pembayaran diverifikasi.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div className="text-xs">
              <p className="font-bold uppercase text-red-900">PESANAN TELAH DIBATALKAN</p>
              <p className="text-red-700 mt-0.5">
                Pesanan ini telah dibatalkan di sistem.
              </p>
            </div>
          </div>
        )}

        {/* Customer Information Card */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-zinc-500">Nama Pelanggan</p>
            <p className="font-bold text-zinc-900 mt-0.5">
              {order.customerName || "Pelanggan"}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">No. WhatsApp</p>
            <p className="font-semibold text-zinc-800 mt-0.5 font-mono">
              {order.customerPhone || "-"}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Status Bayar</p>
            <p className="font-semibold text-emerald-700 mt-0.5">
              {order.paymentStatus} ({order.paymentMethod || "TRANSFER"})
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Total Nilai</p>
            <p className="font-bold text-[#3D8383] mt-0.5 font-mono">
              {formatRupiah(order.total)}
            </p>
          </div>
        </div>

        {/* Checklist of Items to Handover */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Menu yang Harus Diserahkan ({order.items?.length || 0})
            </p>
            <span className="text-[11px] text-zinc-400">
              Centang saat mengemas
            </span>
          </div>

          <div className="space-y-2 border border-zinc-200 rounded-xl p-2 bg-zinc-50/70 max-h-56 overflow-y-auto">
            {order.items?.map((item, idx) => {
              const itemId = item.id || `item-${idx}`;
              const isChecked = !!checkedItems[itemId];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCheckItem(itemId)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition cursor-pointer ${
                    isChecked
                      ? "bg-[#47957F]/10 border border-[#47957F]/30 text-[#3D8383]"
                      : "bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                        isChecked
                          ? "bg-[#47957F] border-[#47957F] text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isChecked ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                        {item.productName}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {formatRupiah(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono">
                    {item.quantity} pcs
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 transition disabled:opacity-50 cursor-pointer"
        >
          Tutup / Batal
        </button>

        <button
          type="button"
          onClick={() =>
            onConfirmRedeem(redemption.redemptionCode, {
              settleCod: isCodUnpaid,
              settleMethod,
              amountPaid: settleMethod === "CASH" ? Number(amountPaidInput) || order.total : order.total,
            })
          }
          disabled={isAlreadyRedeemed || isNonCodUnpaid || isCancelled || isSubmitting}
          className={`flex-2 py-2.5 px-4 rounded-xl text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
            isCodUnpaid
              ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
              : "bg-[#47957F] hover:bg-[#3D8383] shadow-[#47957F]/20"
          } disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed`}
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
              <span>
                {isCodUnpaid
                  ? "Terima Pembayaran & Serahkan Pesanan"
                  : "Konfirmasi Serah Terima"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
