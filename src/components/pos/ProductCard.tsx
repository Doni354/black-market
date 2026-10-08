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
          ? "border-[#E2ECE8] bg-[#F4F9F7] opacity-60 cursor-not-allowed"
          : "border-[#E2ECE8] bg-white hover:border-[#47957F]/60 hover:shadow-md active:scale-[0.98] cursor-pointer shadow-xs"
      }`}
    >
      {/* In-cart count badge */}
      {quantityInCart > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#47957F] text-xs font-black text-white shadow-md shadow-[#47957F]/40">
          {quantityInCart}
        </div>
      )}

      {/* Image / Thumbnail Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#F2F8F5]">
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
          <div className="flex h-full w-full items-center justify-center bg-[#EAF5F1] text-[#3D8383] font-bold text-xs uppercase tracking-wider">
            Noury Fresh
          </div>
        )}

        {/* Stock Tag on image */}
        {product.trackInventory && (
          <div className="absolute bottom-2 left-2 z-10">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-xs ${
                product.stock === 0
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : product.stock < 10
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-white/90 text-[#244642] border border-[#D1E2DD]"
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
          <p className="line-clamp-2 text-sm font-bold text-[#183331] group-hover:text-[#47957F] transition-colors">
            {product.name}
          </p>
        </div>

        {product.category && (
          <p className="text-[11px] text-[#7A9C96] mt-0.5">{product.category}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-black text-[#183331]">
            {formatRupiah(product.price)}
          </span>

          <button
            type="button"
            disabled={isOutOfStock}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
              isOutOfStock
                ? "bg-[#E2ECE8] text-[#91A8A3]"
                : "bg-[#47957F] text-white hover:bg-[#3D8383] shadow-xs"
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
