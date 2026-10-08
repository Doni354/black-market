"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/money";
import { useToast } from "@/components/ui/Toast";
import { uploadOrderProofAction } from "@/lib/actions/orders";
import type { Order } from "@/lib/types";

interface OrderTicketProps {
  order: Order;
  qrDataUrl?: string | null;
}

export function OrderTicket({ order, qrDataUrl }: OrderTicketProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null>(order.proofUrl || null);
  const [uploadingProof, setUploadingProof] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran file maksimal 5MB.", "error");
      return;
    }

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/payment-proofs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah foto bukti.");
      }

      setCurrentProofUrl(data.url);
      await uploadOrderProofAction(order.id, data.url);
      toast("Bukti pembayaran berhasil diunggah!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengunggah foto.", "error");
    } finally {
      setUploadingProof(false);
    }
  }

  function handleCopyCode() {
    if (!order.redemptionCode) return;
    navigator.clipboard.writeText(order.redemptionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  const isReady = order.status === "READY_FOR_REDEMPTION";
  const isRedeemed = order.status === "REDEEMED";
  const isPending =
    order.status === "PENDING_PAYMENT" ||
    order.status === "WAITING_VERIFICATION";
  const isCancelled = order.status === "CANCELLED";

  // Formatted dates
  function formatTimestamp(ts: unknown): string {
    if (!ts) return "-";
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
    return "-";
  }

  const orderDate = formatTimestamp(order.createdAt);
  const redeemedTime = formatTimestamp(order.redeemedAt || order.updatedAt);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Ticket Card Container */}
      <div
        id="printable-ticket"
        className="relative bg-white border border-[#DCE8E4] rounded-3xl shadow-xl overflow-hidden print:border print:border-zinc-300 print:shadow-none print:bg-white print:text-black"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#EBF5F1] via-[#F4FAF8] to-white p-5 border-b border-[#DCE8E4] text-center relative print:border-b-zinc-300 print:bg-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-noury-mint/30 text-noury-teal text-xs font-bold mb-2 shadow-xs print:border-zinc-400 print:text-black">
            <span className="w-1.5 h-1.5 rounded-full bg-noury-mint animate-pulse print:hidden" />
            NOURY — NO WORRIES
          </div>
          <h1 className="text-xl font-black tracking-wider text-[#183331] uppercase print:text-black">
            E-Ticket Penukaran Menu
          </h1>
          <p className="text-xs text-noury-teal mt-1 font-mono font-bold print:text-zinc-700">
            #{order.orderNumber}
          </p>
        </div>

        {/* Status Badge */}
        <div className="px-6 pt-5 pb-3">
          {isReady && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 print:border-zinc-300 print:text-black">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold print:bg-zinc-100 print:text-black">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider print:text-black">Tiket Siap Ditukarkan</p>
                  <p className="text-[11px] text-emerald-700 print:text-zinc-600">Tunjukkan QR ke staf di stan</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded font-mono font-bold print:border print:border-zinc-300 print:text-black">READY</span>
            </div>
          )}

          {isRedeemed && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 print:border-zinc-300 print:text-black">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 print:bg-zinc-100 print:text-black">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider print:text-black">Pesanan Sudah Diambil</p>
                  <p className="text-[11px] text-blue-700 print:text-zinc-600">
                    Di-redeem: <strong className="text-blue-900 print:text-black">{redeemedTime} WIB</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-200 px-2 py-0.5 rounded font-mono font-bold print:border print:border-zinc-300 print:text-black">REDEEMED</span>
            </div>
          )}

          {isPending && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Menunggu Pembayaran</p>
                  <p className="text-[11px] text-amber-700">QR terbit otomatis setelah diverifikasi staf</p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded font-mono font-bold">PENDING</span>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Pesanan Dibatalkan</p>
                  <p className="text-[11px] text-red-700">Tiket ini tidak dapat digunakan</p>
                </div>
              </div>
              <span className="text-[10px] bg-red-200 px-2 py-0.5 rounded font-mono font-bold">CANCELLED</span>
            </div>
          )}
        </div>

        {/* QR Code Section */}
        {isReady && qrDataUrl ? (
          <div className="px-6 py-4 flex flex-col items-center text-center">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-[#CCE0DA] inline-block relative">
              <Image
                src={qrDataUrl}
                alt={`QR Code ${order.orderNumber}`}
                width={220}
                height={220}
                className="w-48 h-48 sm:w-56 sm:h-56 block mx-auto"
                unoptimized
                priority
              />
            </div>

            {/* Redemption Code String */}
            <div className="mt-4 flex items-center justify-center gap-2 w-full max-w-xs">
              <div className="bg-[#F4F9F7] border border-[#CCE0DA] rounded-xl px-3 py-1.5 flex-1 font-mono text-xs tracking-wider text-[#183331] text-center truncate">
                {order.redemptionCode || order.orderNumber}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white hover:bg-[#F2F7F5] text-[#183331] border border-[#CCE0DA] transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
                title="Salin Kode"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#7A9C96] mt-2">
              Tunjukkan layar ini kepada staf kasir di stan saat pengambilan menu.
            </p>
          </div>
        ) : isRedeemed ? (
          <div className="px-6 py-8 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 mb-3">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-bold text-[#183331]">Tiket Telah Digunakan</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-medium">
              <span>Waktu Penukaran:</span>
              <strong className="font-mono">{redeemedTime} WIB</strong>
            </div>
            <p className="text-xs text-[#63847F] max-w-xs mt-2 leading-relaxed">
              Pesanan telah diserahkan dan tiket penukaran telah ditutup. Terima kasih telah memesan di Noury — No Worries!
            </p>
          </div>
        ) : (
          <div className="px-6 py-6 text-center">
            <div className="p-6 rounded-2xl bg-[#F7FAFA] border border-[#DCE8E4]">
              <p className="text-xs text-[#63847F]">
                {isPending
                  ? "QR code tiket penukaran akan muncul di sini secara otomatis setelah bukti transfer diverifikasi oleh staf Noury."
                  : "Tiket pesanan tidak aktif."}
              </p>

              {/* Upload Proof if not yet attached */}
              {!currentProofUrl && isPending && (
                <div className="mt-4 pt-3 border-t border-[#DCE8E4]">
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-[#CCE0DA] hover:border-noury-mint bg-white text-xs text-[#183331] font-semibold cursor-pointer transition">
                    <svg className="w-4 h-4 text-[#7A9C96]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{uploadingProof ? "Mengunggah..." : "Upload Bukti Pembayaran Sekarang"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingProof}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Perforated Divider */}
        <div className="relative py-2 flex items-center">
          <div className="absolute -left-3 w-6 h-6 rounded-full bg-[#FAFCFA] border-r border-[#DCE8E4]" />
          <div className="w-full border-t-2 border-dashed border-[#DCE8E4]" />
          <div className="absolute -right-3 w-6 h-6 rounded-full bg-[#FAFCFA] border-l border-[#DCE8E4]" />
        </div>

        {/* Customer & Order Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#7A9C96]">Nama Pemesan</p>
              <p className="font-semibold text-[#183331] mt-0.5">
                {order.customerName || "Pelanggan"}
              </p>
            </div>
            <div>
              <p className="text-[#7A9C96]">No. WhatsApp</p>
              <p className="font-semibold text-[#183331] mt-0.5 font-mono">
                {order.customerPhone || "-"}
              </p>
            </div>
            <div>
              <p className="text-[#7A9C96]">Tanggal Pesan</p>
              <p className="font-medium text-[#4A6864] mt-0.5">{orderDate}</p>
            </div>
            <div>
              <p className="text-[#7A9C96]">Pengambilan</p>
              <p className="font-medium text-[#4A6864] mt-0.5">
                {order.pickupMethod === "BATCH_PICKUP"
                  ? `📦 Pre-Order: ${order.batchInfo || "Jadwal Batch"}`
                  : order.pickupMethod === "FLEXIBLE"
                  ? "📦 Ambil Fleksibel"
                  : "🎪 Stand Market Day"}
              </p>
            </div>
          </div>

          {/* Item Breakdown */}
          <div className="pt-2 border-t border-[#EDF4F1]">
            <p className="text-[11px] font-semibold text-[#63847F] uppercase tracking-wider mb-2.5">
              Daftar Menu ({order.items?.length || 0})
            </p>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#EDF4F1] text-[10px] font-bold text-noury-teal flex items-center justify-center font-mono">
                      {item.quantity}x
                    </span>
                    <span className="text-[#183331] font-medium truncate max-w-[180px]">
                      {item.productName}
                    </span>
                  </div>
                  <span className="font-mono text-[#183331] font-semibold">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="mt-3 pt-3 border-t border-[#EDF4F1] flex items-center justify-between">
              <span className="text-xs font-bold text-[#63847F]">Total Pembayaran</span>
              <span className="text-base font-extrabold text-noury-teal font-mono">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Footer Actions (Hidden on Print) */}
        <div className="p-4 bg-[#F8FBFA] border-t border-[#DCE8E4] flex gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-[#F2F7F5] text-[#183331] border border-[#CCE0DA] text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4 text-[#63847F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.75A2.25 2.25 0 0015.75 1.5h-7.5A2.25 2.25 0 006 3.75v3.206" />
            </svg>
            Cetak / PDF
          </button>

          <Link
            href="/account"
            className="flex-1 py-2.5 px-3 rounded-xl bg-noury-mint hover:bg-noury-teal text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>👤</span>
            <span>Akun Saya</span>
          </Link>

          <Link
            href="/"
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F2F7F5] text-[#183331] border border-[#CCE0DA] text-xs font-semibold transition flex items-center justify-center shadow-xs"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
