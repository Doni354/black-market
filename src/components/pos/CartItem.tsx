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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 transition-colors hover:border-zinc-300">
      {/* Product Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800">
          {product.name}
        </p>
        <p className="text-xs text-zinc-500">
          {formatRupiah(product.price)}
          {product.trackInventory && (
            <span className="text-zinc-400 ml-1.5">
              (stok: {product.stock})
            </span>
          )}
        </p>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => onUpdateQty(product.id, -1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer font-bold text-sm"
            aria-label="Kurangi jumlah"
          >
            -
          </button>
          <span className="w-7 text-center text-xs font-bold text-zinc-800">
            {quantity}
          </span>
          <button
            type="button"
            disabled={isStockLimited}
            onClick={() => onUpdateQty(product.id, 1)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer font-bold text-sm ${
              isStockLimited
                ? "text-zinc-300 cursor-not-allowed"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            aria-label="Tambah jumlah"
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <div className="w-20 text-right">
          <span className="text-xs font-bold text-[#3D8383]">
            {formatRupiah(lineSubtotal)}
          </span>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="p-1 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
          title="Hapus dari keranjang"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
