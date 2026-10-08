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
      <div className="flex flex-col gap-4 text-xs text-[#183331]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="No. Order (NOURY-XXXXXX) atau WhatsApp"
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
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Results */}
        {foundOrders && foundOrders.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="font-bold text-[#183331]">
              Ditemukan {foundOrders.length} Pesanan:
            </p>
            {foundOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#E2ECE8] bg-[#FAFCFB] p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-[#183331]">
                    {order.orderNumber}
                  </span>
                  <Badge variant={getOrderStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                <div className="text-[#52706C] text-[11px]">
                  <span>Pemesan: <strong className="text-[#183331]">{order.customerName}</strong></span>
                  <span className="ml-2 font-semibold text-[#47957F]">• {formatRupiah(order.total)}</span>
                </div>

                {/* Redemption Ticket Badge */}
                {order.redemptionCode ? (
                  <div className="mt-1 flex flex-col items-center justify-center rounded-xl border border-[#CDE5DD] bg-[#EAF5F1] p-3 text-center">
                    <span className="text-[10px] text-[#2A5E56] font-extrabold uppercase tracking-wider">
                      Tiket Penukaran Noury
                    </span>
                    <span className="mt-0.5 font-mono text-base font-black text-[#183331]">
                      🎫 {order.redemptionCode}
                    </span>
                    <p className="mt-1 text-[10px] text-[#52706C]">
                      Tunjukkan kode ini kepada kasir saat pengambilan pesanan di stan Noury.
                    </p>
                    <Link
                      href={`/order/${order.orderNumber}`}
                      target="_blank"
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white font-bold text-xs transition shadow-xs"
                    >
                      <span>Buka E-Ticket QR Lengkap</span>
                      <span>↗</span>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-1 rounded-xl border border-[#E2ECE8] bg-white p-2.5 text-[11px] text-[#52706C]">
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
