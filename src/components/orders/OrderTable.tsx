"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge, getOrderStatusVariant, getPaymentStatusVariant } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { attachOrderProofAction } from "@/lib/actions/pos";
import { PaymentVerifyModal } from "./PaymentVerifyModal";
import { CancelOrderModal } from "./CancelOrderModal";
import { CreatePreOrderModal } from "./CreatePreOrderModal";
import type { Order, OrderItem, Product } from "@/lib/types";

interface OrderTableProps {
  initialOrders: Order[];
  products?: Product[];
}

export function OrderTable({ initialOrders, products = [] }: OrderTableProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Selected order for detailed modal view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Pre-Order creation modal
  const [isCreatePreOrderOpen, setIsCreatePreOrderOpen] = useState(false);

  // Payment Verification modal
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);

  // Cancellation modal
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

  // Preview full size proof image
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Uploading proof state
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && order.source !== sourceFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesCustomer = order.customerName?.toLowerCase().includes(query);
        const matchesPhone = order.customerPhone?.includes(query);
        const matchesRedemption = order.redemptionCode?.toLowerCase().includes(query);
        return matchesNumber || matchesCustomer || matchesPhone || matchesRedemption;
      }

      return true;
    });
  }, [orders, search, statusFilter, sourceFilter]);

  // Handle uploading or updating payment proof
  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar (PNG/JPG/WEBP)", "error");
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
        throw new Error(result.error || "Gagal upload bukti gambar");
      }

      const uploadedUrl = result.url;
      const res = await attachOrderProofAction(selectedOrder.id, uploadedUrl);

      if (!res.success) {
        throw new Error(res.message || "Gagal menyimpan lampiran bukti");
      }

      // Update local state reactively
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, proofUrl: uploadedUrl } : o))
      );
      setSelectedOrder((prev) =>
        prev ? { ...prev, proofUrl: uploadedUrl } : null
      );

      toast("Bukti pembayaran berhasil disimpan!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan upload bukti",
        "error"
      );
    } finally {
      setUploadingProof(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  function handleVerificationSuccess(orderId: string, redemptionCode: string) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "READY_FOR_REDEMPTION",
              paymentStatus: "PAID",
              redemptionCode,
            }
          : o
      )
    );
    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            status: "READY_FOR_REDEMPTION",
            paymentStatus: "PAID",
            redemptionCode,
          }
        : prev
    );
  }

  function handleCancellationSuccess(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
    );
    setSelectedOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, status: "CANCELLED" } : prev
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari no. order, customer, tiket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">Semua Status Order</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAID">Paid</option>
            <option value="READY_FOR_REDEMPTION">Ready for Redemption</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="WAITING_VERIFICATION">Waiting Verification</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">Semua Sumber</option>
            <option value="POS">POS (Langsung)</option>
            <option value="ONLINE">Online (Pre-Order)</option>
          </select>

          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
          >
            <span>📑</span>
            <span>Buku Audit & Bukti</span>
          </Link>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreatePreOrderOpen(true)}
            className="gap-1 text-xs font-bold whitespace-nowrap ml-1"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Pre-Order
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">No. Order</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Sumber / Tipe</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Total Tagihan</th>
                <th className="px-4 py-3.5">Metode Bayar</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Bukti</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-base font-medium">Belum ada transaksi</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Transaksi yang dibuat dari POS atau Pre-Order akan muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const dateStr =
                    typeof order.createdAt === "string"
                      ? new Date(order.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—";

                  const canVerify =
                    order.status === "PENDING_PAYMENT" ||
                    order.status === "WAITING_VERIFICATION";

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      {/* Order Number & Ticket Badge */}
                      <td className="px-4 py-3 font-mono font-bold text-zinc-100 whitespace-nowrap">
                        <div>{order.orderNumber}</div>
                        {order.redemptionCode && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-emerald-400">
                            🎫 {order.redemptionCode}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Source & Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-zinc-200">
                          {order.source} • {order.orderType}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 text-xs text-zinc-300">
                        {order.customerName || (
                          <span className="text-zinc-500 italic">Umum / Walk-in</span>
                        )}
                        {order.customerPhone && (
                          <span className="block text-[11px] text-zinc-500 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-bold text-red-400 whitespace-nowrap">
                        {formatRupiah(order.total)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3 text-xs font-medium text-zinc-300 whitespace-nowrap">
                        <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                          {order.paymentMethod || "CASH"}
                        </Badge>
                      </td>

                      {/* Order Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getOrderStatusVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </td>

                      {/* Attachment / Proof Badge */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {order.proofUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(order.proofUrl || null)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-800/80 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40 transition-colors cursor-pointer"
                            title="Klik untuk melihat bukti pembayaran"
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Bukti
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canVerify && (
                            <button
                              type="button"
                              onClick={() => setVerifyingOrder(order)}
                              className="rounded-lg bg-emerald-600/20 border border-emerald-600/40 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors cursor-pointer"
                            >
                              Verifikasi
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            Lihat
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Rincian Pesanan #${selectedOrder?.orderNumber}`}
        description="Detail item yang dibeli, verifikasi, bukti pembayaran, dan cetak struk."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              {selectedOrder &&
                (selectedOrder.status === "PENDING_PAYMENT" ||
                  selectedOrder.status === "WAITING_VERIFICATION") && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setVerifyingOrder(selectedOrder);
                    }}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                  >
                    ✓ Verifikasi Pembayaran
                  </Button>
                )}

              {selectedOrder && selectedOrder.status !== "CANCELLED" && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setCancellingOrder(selectedOrder);
                  }}
                  className="text-xs"
                >
                  Batalkan
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintReceipt}
                className="gap-1.5 text-xs font-semibold"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Cetak Struk
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedOrder(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        }
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4 text-xs text-zinc-300">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div>
                <span className="text-zinc-500">Status Order:</span>
                <div className="mt-1">
                  <Badge variant={getOrderStatusVariant(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Pembayaran:</span>
                <div className="mt-1">
                  <Badge variant={getPaymentStatusVariant(selectedOrder.paymentStatus)}>
                    {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Pelanggan:</span>
                <p className="mt-0.5 font-semibold text-zinc-200">
                  {selectedOrder.customerName || "Umum / Walk-in"}
                </p>
                {selectedOrder.customerPhone && (
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {selectedOrder.customerPhone}
                  </p>
                )}
              </div>
              <div>
                <span className="text-zinc-500">Sumber:</span>
                <p className="mt-0.5 font-semibold text-zinc-200">
                  {selectedOrder.source} ({selectedOrder.orderType})
                </p>
              </div>

              {selectedOrder.redemptionCode && (
                <div className="col-span-2 pt-2 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold">Tiket Redemption QR:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                      🎫 {selectedOrder.redemptionCode}
                    </span>
                    <a
                      href={`/order/${selectedOrder.orderNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-400 hover:text-red-300 font-medium underline flex items-center gap-0.5"
                    >
                      <span>Lihat Tiket</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="col-span-2 pt-1 border-t border-zinc-900">
                  <span className="text-zinc-500">Catatan:</span>
                  <p className="text-zinc-300 mt-0.5">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <p className="font-semibold text-zinc-200 mb-2">Item Pembelian</p>
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/40">
                    {selectedOrder.items && (selectedOrder.items as unknown as OrderItem[]).length > 0 ? (
                      (selectedOrder.items as unknown as OrderItem[]).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium text-zinc-200">
                            {item.productName}
                          </td>
                          <td className="px-3 py-2 text-center text-zinc-400">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-400">
                            {formatRupiah(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-zinc-200">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">
                          Tidak ada data rincian item
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial summary */}
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span>{formatRupiah(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Diskon</span>
                  <span>-{formatRupiah(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-zinc-100 pt-1 border-t border-zinc-900">
                <span>Total</span>
                <span className="text-red-400">{formatRupiah(selectedOrder.total)}</span>
              </div>
              {selectedOrder.paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between text-zinc-500 pt-1">
                    <span>Uang Diterima</span>
                    <span>{formatRupiah(selectedOrder.amountPaid || selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(selectedOrder.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Bukti Pembayaran / Attachment Section */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Bukti Pembayaran / Attachment
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  disabled={uploadingProof}
                  className="hidden"
                  id="proof-upload-input"
                />
                <label
                  htmlFor="proof-upload-input"
                  className={`cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors ${
                    uploadingProof ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {uploadingProof
                    ? "Mengupload..."
                    : selectedOrder.proofUrl
                    ? "Ganti Bukti"
                    : "+ Upload Bukti"}
                </label>
              </div>

              {selectedOrder.proofUrl ? (
                <div className="flex items-center gap-3 pt-1">
                  <div
                    onClick={() => setPreviewProofUrl(selectedOrder.proofUrl || null)}
                    className="relative h-24 w-24 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer group"
                    title="Klik untuk memperbesar"
                  >
                    <Image
                      src={selectedOrder.proofUrl}
                      alt="Bukti pembayaran"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[10px] text-white font-semibold">Lihat</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] text-zinc-400">
                    <p className="font-semibold text-zinc-200">Lampiran tersedia</p>
                    <p className="text-zinc-500">
                      Klik thumbnail di samping untuk melihat bukti transfer / pembayaran ukuran penuh.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500 italic py-1">
                  Belum ada bukti pembayaran dilampirkan. Anda dapat mengunggah screenshot transaksi DANA, QRIS, atau mutasi bank sekarang.
                </p>
              )}
            </div>

            {/* Printable Thermal Receipt (Isolated for window.print()) */}
            <div id="printable-receipt" className="hidden print:block font-mono text-xs text-black">
              {/* Receipt Header */}
              <div className="border-b border-dashed border-zinc-600 pb-3 text-center">
                <h4 className="text-base font-black tracking-wider text-black">
                  BLACK MARKET
                </h4>
                <p className="text-[11px] text-zinc-600">Merchandise & F&B</p>
                <div className="mt-2 text-[11px] text-zinc-700">
                  <p>No: <strong className="text-black">{selectedOrder.orderNumber}</strong></p>
                  <p>
                    {typeof selectedOrder.createdAt === "string"
                      ? new Date(selectedOrder.createdAt).toLocaleString("id-ID")
                      : new Date().toLocaleString("id-ID")}
                  </p>
                  {selectedOrder.customerName && <p>Customer: {selectedOrder.customerName}</p>}
                  {selectedOrder.redemptionCode && (
                    <p>Kode Tiket: <strong>{selectedOrder.redemptionCode}</strong></p>
                  )}
                </div>
              </div>

              {/* Receipt Items */}
              <div className="border-b border-dashed border-zinc-600 py-3 flex flex-col gap-2">
                {selectedOrder.items && (selectedOrder.items as unknown as OrderItem[]).length > 0 ? (
                  (selectedOrder.items as unknown as OrderItem[]).map((item) => (
                    <div key={item.id} className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <p className="text-black font-semibold">{item.productName}</p>
                        <p className="text-[11px] text-zinc-600">
                          {item.quantity} x {formatRupiah(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-semibold text-black">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-600">Total Transaksi</p>
                )}
              </div>

              {/* Receipt Totals */}
              <div className="pt-3 flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedOrder.subtotal)}</span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex items-center justify-between text-zinc-700">
                    <span>Diskon</span>
                    <span>-{formatRupiah(selectedOrder.discount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between font-bold text-sm text-black pt-1 border-t border-zinc-400">
                  <span>TOTAL</span>
                  <span>{formatRupiah(selectedOrder.total)}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-700 pt-1">
                  <span>Metode: {selectedOrder.paymentMethod || "CASH"}</span>
                  <span>Bayar: {formatRupiah(selectedOrder.amountPaid || selectedOrder.total)}</span>
                </div>

                {selectedOrder.paymentMethod === "CASH" && (
                  <div className="flex items-center justify-between text-black font-semibold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(selectedOrder.change || 0)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-dashed border-zinc-600 text-center text-[10px] text-zinc-600">
                <p>Terima kasih telah berbelanja di Black Market!</p>
                <p>Simpan struk ini sebagai bukti pembayaran yang sah.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Proof Image Preview Modal */}
      <Modal
        isOpen={Boolean(previewProofUrl)}
        onClose={() => setPreviewProofUrl(null)}
        title="Bukti Pembayaran / Lampiran"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {previewProofUrl && (
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-400 hover:text-red-300 underline font-medium"
              >
                Buka Gambar Asli ↗
              </a>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewProofUrl(null)}
            >
              Tutup
            </Button>
          </div>
        }
      >
        {previewProofUrl && (
          <div className="relative w-full h-[60vh] max-h-[500px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <Image
              src={previewProofUrl}
              alt="Bukti pembayaran penuh"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
      </Modal>

      {/* Payment Verification Modal */}
      <PaymentVerifyModal
        order={verifyingOrder}
        isOpen={Boolean(verifyingOrder)}
        onClose={() => setVerifyingOrder(null)}
        onSuccess={handleVerificationSuccess}
      />

      {/* Order Cancellation Modal */}
      <CancelOrderModal
        order={cancellingOrder}
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        onSuccess={handleCancellationSuccess}
      />

      {/* Create Pre-Order Modal */}
      <CreatePreOrderModal
        isOpen={isCreatePreOrderOpen}
        onClose={() => setIsCreatePreOrderOpen(false)}
        products={products}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
