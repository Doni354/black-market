"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils/money";
import type { DirectSaleResult } from "@/lib/db/orders";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DirectSaleResult | null;
  cashierName: string;
}

export function ReceiptModal({
  isOpen,
  onClose,
  result,
  cashierName,
}: ReceiptModalProps) {
  if (!result) return null;

  const { order, items } = result;

  function handlePrint() {
    window.print();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaksi Berhasil!"
      description="Pesanan telah dicatat dan stok inventaris telah diperbarui."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Struk
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="font-bold px-5 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            Transaksi Baru
          </Button>
        </>
      }
    >
      {/* Printable Receipt Container */}
      <div id="printable-receipt" className="rounded-xl border border-zinc-200 bg-white p-5 font-mono text-xs text-zinc-700 shadow-xs">
        {/* Receipt Header */}
        <div className="border-b border-dashed border-zinc-300 pb-3 text-center">
          <h4 className="text-base font-black tracking-wider text-zinc-900">
            NOURY
          </h4>
          <p className="text-[11px] font-semibold text-[#47957F]">No Worries — Fresh & Healthy Living</p>
          <p className="text-[10px] text-zinc-400">Fruit, Water & Healthy Bites</p>
          <div className="mt-2 text-[11px] text-zinc-600">
            <p>No: <strong className="text-zinc-900">{order.orderNumber}</strong></p>
            <p>{new Date().toLocaleString("id-ID")}</p>
            <p>Kasir: {cashierName}</p>
            {order.customerName && <p>Customer: {order.customerName}</p>}
            {order.customerPhone && (
              <p className="text-[10px] text-[#47957F] font-semibold">
                WhatsApp: {order.customerPhone} (Stempel Bertambah ⭐)
              </p>
            )}
          </div>
        </div>

        {/* Receipt Items */}
        <div className="border-b border-dashed border-zinc-300 py-3 flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <p className="text-zinc-800 font-semibold">{item.productName}</p>
                <p className="text-[11px] text-zinc-500">
                  {item.quantity} x {formatRupiah(item.unitPrice)}
                </p>
              </div>
              <span className="font-semibold text-zinc-800">
                {formatRupiah(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Receipt Totals */}
        <div className="pt-3 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-zinc-500">
            <span>Subtotal</span>
            <span className="text-zinc-800 font-medium">{formatRupiah(order.subtotal)}</span>
          </div>

          {order.discount > 0 && (
            <div className="flex items-center justify-between text-[#3D8383] font-semibold">
              <span>Diskon</span>
              <span>-{formatRupiah(order.discount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between font-bold text-sm text-zinc-900 pt-1 border-t border-zinc-200">
            <span>TOTAL</span>
            <span className="text-[#3D8383] text-base">{formatRupiah(order.total)}</span>
          </div>

          <div className="flex items-center justify-between text-zinc-500 pt-1">
            <span>Metode: {order.paymentMethod}</span>
            <span>Bayar: {formatRupiah(order.amountPaid || order.total)}</span>
          </div>

          {order.paymentMethod === "CASH" && (
            <div className="flex items-center justify-between text-emerald-700 font-semibold">
              <span>Kembalian</span>
              <span>{formatRupiah(order.change || 0)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 text-center text-[10px] text-zinc-400">
          <p>Terima kasih telah berbelanja di Noury!</p>
          <p>Stay fresh, stay healthy! Simpan struk ini sebagai bukti pembayaran.</p>
        </div>
      </div>
    </Modal>
  );
}
