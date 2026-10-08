"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  cart: Map<string, number>;
  onAddToCart: (product: Product) => void;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "Semua", value: "ALL" },
  { label: "Fruit Bowl", value: "FRUIT_BOWL" },
  { label: "Smoothies & Juice", value: "SMOOTHIE_JUICE" },
  { label: "Infused Water", value: "INFUSED_WATER" },
  { label: "Healthy Food", value: "HEALTHY_FOOD" },
  { label: "Bundling", value: "BUNDLE" },
  { label: "Lainnya", value: "OTHER" },
];

export function ProductGrid({ products, cart, onAddToCart }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Must be active
      if (!p.isActive) return false;

      // Filter by category / type
      if (selectedCategory !== "ALL" && p.type !== selectedCategory) {
        return false;
      }

      // Filter by search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCat = p.category?.toLowerCase().includes(query);
        return matchesName || matchesCat;
      }

      return true;
    });
  }, [products, selectedCategory, search]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Category Filter */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari fruit bowl, smoothies, salad, infused water..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[#D5E6E1] bg-white px-4 py-2.5 pl-10 text-sm text-[#183331] placeholder:text-[#91A8A3] focus:outline-none focus:ring-2 focus:ring-[#47957F]/25 focus:border-[#47957F] shadow-xs"
          />
          <svg
            className="absolute left-3.5 top-3 h-4 w-4 text-[#7A9C96]"
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
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs text-[#7A9C96] hover:text-[#183331] p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setSelectedCategory(cat.value)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.value
                  ? "bg-[#47957F] text-white shadow-xs font-bold"
                  : "bg-white border border-[#D5E6E1] text-[#52706C] hover:bg-[#F2F8F5] hover:text-[#183331]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Product Cards */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5E6E1] bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-bold text-[#183331]">
            Tidak ada produk yang sesuai
          </p>
          <p className="mt-1 text-xs text-[#7A9C96]">
            {search
              ? "Coba kata kunci pencarian lain"
              : "Belum ada produk aktif di kategori ini"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cart.get(product.id) || 0}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
