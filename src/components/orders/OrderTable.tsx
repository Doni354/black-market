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
import { updateProductionStatusAction } from "@/lib/actions/orders";
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
  const [pickupFilter, setPickupFilter] = useState("ALL");
  const [updatingProduction, setUpdatingProduction] = useState(false);

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
      if (pickupFilter !== "ALL" && (order.pickupMethod || "MARKET_DAY") !== pickupFilter) return false;

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
  }, [orders, search, statusFilter, sourceFilter, pickupFilter]);

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
      formData.append("folder", "noury/payment-proofs");

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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
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
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#47957F] cursor-pointer shadow-xs"
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
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#47957F] cursor-pointer shadow-xs"
          >
            <option value="ALL">Semua Sumber</option>
            <option value="POS">POS (Langsung)</option>
            <option value="ONLINE">Online (Pre-Order)</option>
          </select>

          <select
            value={pickupFilter}
            onChange={(e) => setPickupFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#47957F] cursor-pointer shadow-xs"
          >
            <option value="ALL">Semua Pengambilan</option>
            <option value="BATCH_PICKUP">Batch Pre-Order</option>
            <option value="MARKET_DAY">Stand Market Day</option>
          </select>

          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-xs"
          >
            <span>Buku Audit & Bukti</span>
          </Link>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreatePreOrderOpen(true)}
            className="gap-1 text-xs font-bold whitespace-nowrap ml-1 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Pre-Order
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
              <tr>
                <th className="px-4 py-3.5">No. Order</th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Sumber & Pengambilan</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Total Tagihan</th>
                <th className="px-4 py-3.5">Metode Bayar</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Bukti</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                    <p className="text-base font-semibold text-zinc-600">Belum ada transaksi</p>
                    <p className="mt-1 text-xs text-zinc-400">
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
                      className="transition-colors hover:bg-zinc-50/80"
                    >
                      {/* Order Number & Ticket Badge */}
                      <td className="px-4 py-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        <div>{order.orderNumber}</div>
                        {order.redemptionCode && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-[#47957F]/10 border border-[#47957F]/20 px-1.5 py-0.2 text-[10px] text-[#3D8383] font-semibold">
                            {order.redemptionCode}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Source & Type & Pickup */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-zinc-700 block">
                          {order.source} • {order.orderType}
                        </span>
                        {order.pickupMethod === "BATCH_PICKUP" ? (
                          <span
                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#CDD272]/25 border border-[#CDD272]/60 px-1.5 py-0.5 text-[10px] font-bold text-[#565C17]"
                            title={order.batchInfo || "Batch Pre-Order"}
                          >
                            Batch
                          </span>
                        ) : order.source === "POS" ? (
                          <span className="mt-0.5 inline-block text-[10px] text-zinc-400">
                            Kasir Stand
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#47957F]">
                            Market Day
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 text-xs text-zinc-800">
                        {order.customerName || (
                          <span className="text-zinc-400 italic">Umum / Walk-in</span>
                        )}
                        {order.customerPhone && (
                          <span className="block text-[11px] text-zinc-400 font-mono">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 font-bold text-[#3D8383] whitespace-nowrap">
                        {formatRupiah(order.total)}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3 text-xs font-medium text-zinc-700 whitespace-nowrap">
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
                            className="inline-flex items-center gap-1 rounded-md border border-[#47957F]/30 bg-[#47957F]/10 px-2 py-0.5 text-[11px] font-semibold text-[#3D8383] hover:bg-[#47957F]/20 transition-colors cursor-pointer"
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
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canVerify && (
                            <button
                              type="button"
                              onClick={() => setVerifyingOrder(order)}
                              className="rounded-lg bg-emerald-50 border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Verifikasi
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
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
          <div className="flex flex-col gap-4 text-xs text-zinc-700">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
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
                <p className="mt-0.5 font-semibold text-zinc-800">
                  {selectedOrder.customerName || "Umum / Walk-in"}
                </p>
                {selectedOrder.customerPhone && (
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {selectedOrder.customerPhone}
                  </p>
                )}
              </div>
              <div>
                <span className="text-zinc-500">Sumber:</span>
                <p className="mt-0.5 font-semibold text-zinc-800">
                  {selectedOrder.source} ({selectedOrder.orderType})
                </p>
              </div>

              {selectedOrder.redemptionCode && (
                <div className="col-span-2 pt-2 border-t border-zinc-200 flex items-center justify-between">
                  <span className="text-zinc-600 font-semibold">Tiket Redemption QR:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#3D8383] bg-[#47957F]/10 border border-[#47957F]/30 px-2.5 py-1 rounded-md">
                      {selectedOrder.redemptionCode}
                    </span>
                    <a
                      href={`/order/${selectedOrder.orderNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#47957F] hover:text-[#3D8383] font-semibold underline flex items-center gap-0.5"
                    >
                      <span>Lihat Tiket</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="col-span-2 pt-1 border-t border-zinc-200">
                  <span className="text-zinc-500">Catatan:</span>
                  <p className="text-zinc-700 mt-0.5">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Pickup Method and Batch details */}
              <div className="col-span-2 pt-2 border-t border-zinc-200">
                <span className="text-zinc-500 block mb-1">Metode & Jadwal Pengambilan:</span>
                {selectedOrder.pickupMethod === "BATCH_PICKUP" ? (
                  <div className="rounded-xl bg-[#EAF5F1] border border-[#CDE5DD] p-2.5 text-xs text-[#1E4B43]">
                    <div className="flex items-center gap-1.5 font-bold text-[#2A5E56]">
                      <span>Ambil Sesuai Batch Pre-Order</span>
                    </div>
                    {selectedOrder.batchInfo && (
                      <p className="mt-1 font-semibold text-[#183331]">{selectedOrder.batchInfo}</p>
                    )}
                  </div>
                ) : selectedOrder.source === "POS" ? (
                  <div className="rounded-xl bg-zinc-100 border border-zinc-200 p-2 text-xs text-zinc-700">
                    Transaksi Langsung di Stand POS (Takeaway)
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#EAF5F1]/60 border border-[#D0E7E0] p-2 text-xs text-[#2A5E56] font-medium">
                    Diambil Langsung di Stand Hari Market Day
                  </div>
                )}
              </div>

              {/* Production Status Toggle for Pre-Orders */}
              {selectedOrder.orderType === "PRE_ORDER" && (
                <div className="col-span-2 pt-2 border-t border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 block">Status Pengerjaan:</span>
                    <span className="font-semibold text-xs text-zinc-800">
                      {selectedOrder.productionStatus === "READY"
                        ? "Siap Diambil Pelanggan"
                        : "Sedang Disiapkan"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={updatingProduction}
                    onClick={async () => {
                      const nextStatus = selectedOrder.productionStatus === "READY" ? "IN_PRODUCTION" : "READY";
                      setUpdatingProduction(true);
                      const res = await updateProductionStatusAction(selectedOrder.id, nextStatus);
                      setUpdatingProduction(false);
                      if (res.success) {
                        toast(res.message || "Status pengerjaan diperbarui", "success");
                        setSelectedOrder((prev) => (prev ? { ...prev, productionStatus: nextStatus } : null));
                        setOrders((prev) =>
                          prev.map((o) => (o.id === selectedOrder.id ? { ...o, productionStatus: nextStatus } : o))
                        );
                      } else {
                        toast(res.message || "Gagal mengubah status", "error");
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#47957F] text-[#47957F] hover:bg-[#EAF5F1] transition cursor-pointer"
                  >
                    {selectedOrder.productionStatus === "READY"
                      ? "Ubah ke: Sedang Disiapkan"
                      : "Tandai: Siap Diambil"}
                  </button>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <p className="font-semibold text-zinc-800 mb-2">Item Pembelian</p>
              <div className="rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {selectedOrder.items && (selectedOrder.items as unknown as OrderItem[]).length > 0 ? (
                      (selectedOrder.items as unknown as OrderItem[]).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-medium text-zinc-800">
                            {item.productName}
                          </td>
                          <td className="px-3 py-2 text-center text-zinc-500">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-500">
                            {formatRupiah(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-zinc-800">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-zinc-400">
                          Tidak ada data rincian item
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial summary */}
            <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{formatRupiah(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-[#3D8383] font-semibold">
                  <span>
                    Diskon {selectedOrder.couponCode ? `(Kupon ${selectedOrder.couponCode})` : ""}
                  </span>
                  <span>-{formatRupiah(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Total</span>
                <span className="text-[#3D8383] text-base">{formatRupiah(selectedOrder.total)}</span>
              </div>
              {selectedOrder.paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between text-zinc-500 pt-1">
                    <span>Uang Diterima</span>
                    <span>{formatRupiah(selectedOrder.amountPaid || selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(selectedOrder.change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Bukti Pembayaran / Attachment Section */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
                  className={`cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors shadow-xs ${
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
                    className="relative h-24 w-24 rounded-lg overflow-hidden border border-zinc-200 cursor-pointer group bg-white shadow-xs"
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
                  <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
                    <p className="font-semibold text-zinc-800">Lampiran tersedia</p>
                    <p className="text-zinc-500">
                      Klik thumbnail di samping untuk melihat bukti transfer / pembayaran ukuran penuh.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400 italic py-1">
                  Belum ada bukti pembayaran dilampirkan. Anda dapat mengunggah screenshot transaksi DANA, QRIS, atau mutasi bank sekarang.
                </p>
              )}
            </div>

            {/* Printable Thermal Receipt (Isolated for window.print()) */}
            <div id="printable-receipt" className="hidden print:block font-mono text-xs text-black">
              {/* Receipt Header */}
              <div className="border-b border-dashed border-zinc-600 pb-3 text-center">
                <h4 className="text-base font-black tracking-wider text-black">
                  NOURY
                </h4>
                <p className="text-[11px] font-semibold text-zinc-800">No Worries — Fresh & Healthy Living</p>
                <p className="text-[10px] text-zinc-600">Fruit, Water & Healthy Bites</p>
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
                <p>Terima kasih telah berbelanja di Noury!</p>
                <p>Stay fresh, stay healthy! Simpan struk ini sebagai bukti pembayaran yang sah.</p>
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
