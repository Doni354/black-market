"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, getOrderStatusVariant } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/utils/money";
import { lookupCustomerOrderAction } from "@/lib/actions/orders";
import type { Order } from "@/lib/types";

interface TicketTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TicketTrackerModal({ isOpen, onClose }: TicketTrackerModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [foundOrders, setFoundOrders] = useState<Order[] | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setErrorMsg("");
    setFoundOrders(null);
    setLoading(true);

    try {
      const res = await lookupCustomerOrderAction(query.trim());
      if (!res.success || !res.orders) {
        setErrorMsg(res.message || "Pesanan tidak ditemukan.");
      } else {
        setFoundOrders(res.orders as Order[]);
      }
    } catch {
      setErrorMsg("Gagal melakukan pencarian pesanan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cek Status & Tiket Pesanan"
      description="Lacak status pesanan pre-order atau lihat kode penukaran QR Anda."
      size="md"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="flex flex-col gap-4 text-xs text-zinc-300">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="No. Order (BM-XXXXXX) atau WhatsApp"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="font-bold self-end mb-1"
          >
            Cari
          </Button>
        </form>

        {errorMsg && (
          <div className="rounded-xl border border-red-800/80 bg-red-950/40 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Results */}
        {foundOrders && foundOrders.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-zinc-300">
              Ditemukan {foundOrders.length} Pesanan:
            </p>
            {foundOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-zinc-100">
                    {order.orderNumber}
                  </span>
                  <Badge variant={getOrderStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                <div className="text-zinc-400 text-[11px]">
                  <span>Pemesan: <strong className="text-zinc-200">{order.customerName}</strong></span>
                  <span className="ml-2">• {formatRupiah(order.total)}</span>
                </div>

                {/* Redemption Ticket Badge */}
                {order.redemptionCode ? (
                  <div className="mt-1 flex flex-col items-center justify-center rounded-lg border border-emerald-800/80 bg-emerald-950/40 p-3 text-center">
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      Tiket Penukaran Market Day
                    </span>
                    <span className="mt-0.5 font-mono text-base font-black text-emerald-300">
                      🎫 {order.redemptionCode}
                    </span>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Tunjukkan kode ini kepada kasir saat pengambilan pesanan di stan Black Market.
                    </p>
                    <Link
                      href={`/order/${order.orderNumber}`}
                      target="_blank"
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                    >
                      <span>Buka E-Ticket QR Lengkap</span>
                      <span>↗</span>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-[11px] text-zinc-400">
                    {order.status === "WAITING_VERIFICATION"
                      ? "⏳ Bukti pembayaran Anda sedang diverifikasi admin. Tiket QR akan segera diterbitkan."
                      : "⚠️ Pembayaran belum selesai atau belum diverifikasi."}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
