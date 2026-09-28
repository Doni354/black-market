"use client";

import { CartItem, type CartItemData } from "./CartItem";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils/money";

interface CartProps {
  items: CartItemData[];
  discount: number;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export function Cart({
  items,
  discount,
  onUpdateQty,
  onRemove,
  onClearCart,
  onCheckout,
}: CartProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl backdrop-blur-md">
      {/* Cart Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-100">Pesanan Kasir</h2>
          {totalItemsCount > 0 && (
            <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-800/40">
              {totalItemsCount} item
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center text-zinc-500">
            <svg
              className="h-12 w-12 text-zinc-700 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
              />
            </svg>
            <p className="text-sm font-medium text-zinc-400">
              Keranjang masih kosong
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Pilih produk di katalog untuk ditambahkan ke pesanan.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer & Checkout */}
      {items.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex flex-col gap-1.5 mb-4 text-xs text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-200">
                {formatRupiah(subtotal)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Diskon</span>
                <span>-{formatRupiah(discount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 text-base font-bold text-zinc-100">
              <span>Total Tagihan</span>
              <span className="text-lg font-black text-red-400">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onCheckout}
            className="w-full text-base font-bold py-3.5 shadow-lg shadow-red-950/40"
          >
            Bayar Sekarang ({formatRupiah(total)})
          </Button>
        </div>
      )}
    </div>
  );
}
