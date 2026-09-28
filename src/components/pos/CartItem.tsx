"use client";

import { formatRupiah } from "@/lib/utils/money";
import type { Product } from "@/lib/types";

export interface CartItemData {
  product: Product;
  quantity: number;
}

interface CartItemProps {
  item: CartItemData;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  const { product, quantity } = item;
  const lineSubtotal = product.price * quantity;
  const isStockLimited =
    product.trackInventory && quantity >= product.stock;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700">
      {/* Product Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {product.name}
        </p>
        <p className="text-xs text-zinc-400">
          {formatRupiah(product.price)}
          {product.trackInventory && (
            <span className="text-zinc-500 ml-1.5">
              (stok: {product.stock})
            </span>
          )}
        </p>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-950 p-0.5">
          <button
            type="button"
            onClick={() => onUpdateQty(product.id, -1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer font-bold text-sm"
            aria-label="Kurangi jumlah"
          >
            -
          </button>
          <span className="w-7 text-center text-xs font-bold text-zinc-100">
            {quantity}
          </span>
          <button
            type="button"
            disabled={isStockLimited}
            onClick={() => onUpdateQty(product.id, 1)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer font-bold text-sm ${
              isStockLimited
                ? "text-zinc-600 cursor-not-allowed"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            aria-label="Tambah jumlah"
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <div className="w-20 text-right">
          <span className="text-xs font-bold text-red-400">
            {formatRupiah(lineSubtotal)}
          </span>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          title="Hapus dari keranjang"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
