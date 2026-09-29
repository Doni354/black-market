"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/money";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  updateCustomRequestStatusAction,
  convertCustomRequestToPreOrderAction,
} from "@/lib/actions/custom-requests";
import type { CustomMerchRequest, CustomRequestStatus } from "@/lib/types";

interface CustomRequestTableProps {
  initialRequests: CustomMerchRequest[];
}

export function CustomRequestTable({ initialRequests }: CustomRequestTableProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomMerchRequest[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Convert to Pre-Order Modal
  const [convertingRequest, setConvertingRequest] = useState<CustomMerchRequest | null>(null);
  const [unitPrice, setUnitPrice] = useState<string>("15000");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "QRIS" | "BANK_TRANSFER">("COD");
  const [isConverting, setIsConverting] = useState(false);

  // Filtering
  const filteredRequests = requests.filter((r) => {
    const matchTab =
      activeTab === "ALL" ? true : r.status === activeTab;
    const matchSearch =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerPhone.includes(search) ||
      r.requestNumber.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  async function handleStatusChange(id: string, newStatus: CustomRequestStatus) {
    const res = await updateCustomRequestStatusAction(id, newStatus);
    if (!res.success) {
      toast(res.message || "Gagal memperbarui status.", "error");
      return;
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    toast("Status berhasil diperbarui.", "success");
  }

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!convertingRequest) return;

    const price = Number(unitPrice);
    if (!price || price <= 0) {
      toast("Harga satuan harus lebih dari 0.", "warning");
      return;
    }

    setIsConverting(true);
    try {
      const res = await convertCustomRequestToPreOrderAction(
        convertingRequest.id,
        price,
        paymentMethod
      );

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal menerbitkan pre-order.");
      }

      toast(
        `Pre-Order #${res.data.orderNumber} berhasil diterbitkan!`,
        "success"
      );

      setRequests((prev) =>
        prev.map((r) =>
          r.id === convertingRequest.id
            ? {
                ...r,
                status: "APPROVED",
                orderId: res.data!.id,
                orderNumber: res.data!.orderNumber,
                estimatedPrice: price * r.quantity,
              }
            : r
        )
      );

      setConvertingRequest(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setIsConverting(false);
    }
  }

  function getMerchBadge(type: string) {
    switch (type) {
      case "PIN":
        return <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 text-[11px] font-semibold">📌 Pin</span>;
      case "STICKER":
        return <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 text-[11px] font-semibold">🏷️ Sticker</span>;
      case "KEYCHAIN":
        return <span className="px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-300 text-[11px] font-semibold">🔑 Gantungan Kunci</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-semibold">{type}</span>;
    }
  }

  function getStatusBadge(status: CustomRequestStatus) {
    switch (status) {
      case "PENDING":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">MENUNGGU</span>;
      case "CONTACTED":
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">DIHUBUNGI</span>;
      case "APPROVED":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">DI-ACC</span>;
      case "IN_PRODUCTION":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">PRODUKSI</span>;
      case "READY_FOR_PICKUP":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-400 text-[10px] font-bold">SIAP DIAMBIL</span>;
      case "COMPLETED":
        return <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">SELESAI</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">DITOLAK</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">{status}</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Top filter and search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Semua" },
            { id: "PENDING", label: "Menunggu" },
            { id: "APPROVED", label: "Di-ACC" },
            { id: "IN_PRODUCTION", label: "Produksi" },
            { id: "READY_FOR_PICKUP", label: "Siap Ambil" },
            { id: "COMPLETED", label: "Selesai" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20 font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari nama / no WA / ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">ID Request</th>
                <th className="py-3 px-4">Pemesan</th>
                <th className="py-3 px-4">Merchandise</th>
                <th className="py-3 px-4">Jumlah</th>
                <th className="py-3 px-4">Desain</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-zinc-500">
                    Tidak ada request custom merch yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-red-400">
                      #{req.requestNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-100">{req.customerName}</p>
                      <a
                        href={`https://wa.me/${req.customerPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
                          `Halo kak ${req.customerName}, kami dari Black Market mengenai Request Custom Merch #${req.requestNumber} (${req.merchType})...`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                      >
                        <span>💬</span> {req.customerPhone}
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      {getMerchBadge(req.merchType)}
                      {req.notes && (
                        <p className="text-[11px] text-zinc-400 mt-1 max-w-xs truncate" title={req.notes}>
                          {req.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-zinc-200">
                      {req.quantity} pcs
                    </td>
                    <td className="py-3.5 px-4">
                      {req.designUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(req.designUrl!)}
                          className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 hover:border-red-500 transition cursor-pointer"
                        >
                          <Image src={req.designUrl} alt="Design thumbnail" fill className="object-cover" unoptimized />
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic">Tanpa Desain</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(req.status)}</div>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as CustomRequestStatus)}
                          className="text-[10px] bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value="PENDING">Menunggu</option>
                          <option value="CONTACTED">Dihubungi</option>
                          <option value="APPROVED">Di-ACC</option>
                          <option value="IN_PRODUCTION">Produksi</option>
                          <option value="READY_FOR_PICKUP">Siap Diambil</option>
                          <option value="COMPLETED">Selesai</option>
                          <option value="REJECTED">Ditolak</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.orderNumber ? (
                        <Link
                          href={`/order/${req.orderNumber}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-xs font-semibold"
                        >
                          <span>Tiket #{req.orderNumber} ↗</span>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setConvertingRequest(req);
                            setUnitPrice("15000");
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
                        >
                          🛍️ Buat Pre-Order
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Image Modal */}
      {previewImage && (
        <Modal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Preview Desain Custom Merch"
          size="md"
        >
          <div className="py-2 flex flex-col items-center">
            <div className="relative w-full h-80 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <Image src={previewImage} alt="Design full preview" fill className="object-contain" unoptimized />
            </div>
            <div className="mt-4 flex gap-2 w-full">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-center text-zinc-200"
              >
                Unduh Gambar Resolusi Penuh ↗
              </a>
              <Button
                variant="outline"
                onClick={() => setPreviewImage(null)}
                className="flex-1"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert to Pre-Order Modal */}
      {convertingRequest && (
        <Modal
          isOpen={Boolean(convertingRequest)}
          onClose={() => setConvertingRequest(null)}
          title={`Terbitkan Pre-Order: #${convertingRequest.requestNumber}`}
          size="sm"
        >
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
              <p className="text-zinc-400">Pemesan: <strong className="text-white">{convertingRequest.customerName}</strong></p>
              <p className="text-zinc-400">Jenis: <strong className="text-white">{convertingRequest.merchType}</strong></p>
              <p className="text-zinc-400">Jumlah: <strong className="text-white">{convertingRequest.quantity} pcs</strong></p>
            </div>

            <Input
              label="Harga Satuan (Rp)"
              type="number"
              min="1000"
              step="500"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              helperText={`Total nilai: ${formatRupiah(
                (Number(unitPrice) || 0) * convertingRequest.quantity
              )}`}
            />

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Metode Pembayaran Pelanggan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["COD", "QRIS", "BANK_TRANSFER"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      paymentMethod === m
                        ? "bg-red-600/20 border-red-500 text-white font-bold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {m === "COD" ? "💵 COD" : m === "QRIS" ? "📱 QRIS" : "🏦 Transfer"}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              💡 Pre-Order akan diterbitkan dengan metode pengambilan <strong>Fleksibel (Kapan Saja)</strong>. Pelanggan dapat membuka e-tiketnya secara instan.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertingRequest(null)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isConverting}
                className="flex-2 bg-red-600 hover:bg-red-500 font-bold"
              >
                {isConverting ? "Menerbitkan..." : "Terbitkan Pre-Order"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
