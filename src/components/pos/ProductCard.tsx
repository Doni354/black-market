"use client";

import Image from "next/image";
import { formatRupiah } from "@/lib/utils/money";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  quantityInCart?: number;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({
  product,
  quantityInCart = 0,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = product.trackInventory && product.stock <= 0;

  return (
    <div
      onClick={() => {
        if (!isOutOfStock) {
          onAddToCart(product);
        }
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 select-none ${
        isOutOfStock
          ? "border-zinc-800/60 bg-zinc-900/30 opacity-60 cursor-not-allowed"
          : "border-zinc-800 bg-zinc-900/80 hover:border-red-600/60 hover:bg-zinc-850 active:scale-[0.98] cursor-pointer shadow-md hover:shadow-red-950/20"
      }`}
    >
      {/* In-cart count badge */}
      {quantityInCart > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white shadow-lg shadow-red-950/50">
          {quantityInCart}
        </div>
      )}

      {/* Image / Thumbnail Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-950">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="eager"
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900/80 text-zinc-600 font-bold text-lg">
            BM
          </div>
        )}

        {/* Stock Tag on image */}
        {product.trackInventory && (
          <div className="absolute bottom-2 left-2 z-10">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md shadow-xs ${
                product.stock === 0
                  ? "bg-red-950/90 text-red-300 border border-red-800/80"
                  : product.stock < 10
                  ? "bg-yellow-950/90 text-yellow-300 border border-yellow-800/80"
                  : "bg-zinc-950/80 text-zinc-300 border border-zinc-800"
              }`}
            >
              {product.stock === 0 ? "Stok Habis" : `Sisa ${product.stock}`}
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex flex-col p-3.5">
        <div className="flex items-start justify-between gap-1">
          <p className="line-clamp-2 text-sm font-semibold text-zinc-100 group-hover:text-red-400 transition-colors">
            {product.name}
          </p>
        </div>

        {product.category && (
          <p className="text-[11px] text-zinc-500 mt-0.5">{product.category}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-red-400">
            {formatRupiah(product.price)}
          </span>

          <button
            type="button"
            disabled={isOutOfStock}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
              isOutOfStock
                ? "bg-zinc-800 text-zinc-600"
                : "bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-950/40"
            }`}
            aria-label={`Tambah ${product.name} ke keranjang`}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
