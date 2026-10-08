"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { AdjustmentModal } from "./AdjustmentModal";
import type { Product } from "@/lib/types";

interface StockTableProps {
  initialProducts: Product[];
}

export function StockTable({ initialProducts }: StockTableProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SAFE" | "LOW" | "OUT">("ALL");

  // Selected product for adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Stock status filter
      if (statusFilter === "SAFE" && (!p.trackInventory || p.stock < 10)) {
        return false;
      }
      if (statusFilter === "LOW" && (!p.trackInventory || p.stock <= 0 || p.stock >= 10)) {
        return false;
      }
      if (statusFilter === "OUT" && (!p.trackInventory || p.stock > 0)) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCategory = p.category?.toLowerCase().includes(query);
        return matchesName || matchesCategory;
      }

      return true;
    });
  }, [products, search, statusFilter]);

  function handleAdjustmentSuccess(updatedProduct: Product) {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari menu atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 pl-9 text-sm text-[#183331] placeholder:text-[#8AA59F] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-[#7A9C96]"
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
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-[#47957F] text-white shadow-xs"
                : "bg-white border border-[#D5E4DF] text-[#52706C] hover:bg-[#F8FAF9]"
            }`}
          >
            Semua ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("SAFE")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "SAFE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white border border-[#D5E4DF] text-[#52706C] hover:bg-[#F8FAF9]"
            }`}
          >
            Aman (≥10)
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("LOW")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "LOW"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white border border-[#D5E4DF] text-[#52706C] hover:bg-[#F8FAF9]"
            }`}
          >
            Menipis (&lt;10)
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("OUT")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === "OUT"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white border border-[#D5E4DF] text-[#52706C] hover:bg-[#F8FAF9]"
            }`}
          >
            Habis (0)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2ECE8] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#183331]">
            <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] text-[11px] uppercase tracking-wider text-[#52706C]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Menu / Produk</th>
                <th className="px-4 py-3.5 font-semibold">Tipe</th>
                <th className="px-4 py-3.5 font-semibold">Pantau Stok</th>
                <th className="px-4 py-3.5 text-center font-semibold">Stok Fisik</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 text-right font-semibold">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F3]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#7A9C96]">
                    <p className="text-base font-bold text-[#183331]">Tidak ada produk ditemukan</p>
                    <p className="mt-1 text-xs text-[#52706C]">
                      Coba ubah kata kunci pencarian atau filter status stok.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isTracked = p.trackInventory;
                  const isOut = isTracked && p.stock <= 0;
                  const isLow = isTracked && p.stock > 0 && p.stock < 10;

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-[#F8FAF9]"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-[#D5E4DF] bg-[#F4F9F7]">
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#D5E4DF] bg-[#EAF5F1] text-base">
                              🥗
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-semibold text-[#183331] truncate block">
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="text-[11px] text-[#7A9C96]">
                                {p.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-lg bg-[#FAFCFB] px-2 py-0.5 text-[11px] font-semibold text-[#254440] border border-[#D5E4DF]">
                          {p.type}
                        </span>
                      </td>

                      {/* Track Inventory */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isTracked ? (
                          <span className="text-xs text-[#47957F] font-bold">
                            ✓ Dipantau
                          </span>
                        ) : (
                          <span className="text-xs text-[#7A9C96]">
                            Tanpa Batas
                          </span>
                        )}
                      </td>

                      {/* Stock Count */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono font-bold">
                        {isTracked ? (
                          <span
                            className={`text-base ${
                              isOut
                                ? "text-rose-600"
                                : isLow
                                ? "text-amber-500"
                                : "text-[#47957F]"
                            }`}
                          >
                            {p.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-[#7A9C96]">∞</span>
                        )}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!isTracked ? (
                          <Badge variant="muted">Unlimited</Badge>
                        ) : isOut ? (
                          <Badge variant="danger">Habis</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Menipis</Badge>
                        ) : (
                          <Badge variant="success">Aman</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            className="rounded-xl bg-[#EAF5F1] px-3 py-1 text-xs font-bold text-[#2A5E56] border border-[#CDE5DD] hover:bg-[#DDF0E8] transition-colors cursor-pointer"
                          >
                            Adjust Stok
                          </button>

                          <Link
                            href={`/admin/inventory/${p.id}`}
                            className="rounded-xl bg-[#FAFCFB] px-3 py-1 text-xs font-semibold text-[#52706C] border border-[#E2ECE8] hover:bg-[#F0F5F3] hover:text-[#183331] transition-colors"
                          >
                            Riwayat
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      <AdjustmentModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}
