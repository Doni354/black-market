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
            placeholder="Cari produk atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Semua ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("SAFE")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "SAFE"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Aman (≥10)
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("LOW")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "LOW"
                ? "bg-yellow-600 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Menipis (&lt;10)
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("OUT")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === "OUT"
                ? "bg-red-700 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Habis (0)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">Produk</th>
                <th className="px-4 py-3.5">Tipe</th>
                <th className="px-4 py-3.5">Pantau Stok</th>
                <th className="px-4 py-3.5 text-center">Stok Fisik</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-base font-medium">Tidak ada produk ditemukan</p>
                    <p className="mt-1 text-xs text-zinc-600">
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
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-600">
                              BM
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-semibold text-zinc-100 truncate block">
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="text-[11px] text-zinc-500">
                                {p.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-xs text-zinc-300 border border-zinc-700">
                          {p.type}
                        </span>
                      </td>

                      {/* Track Inventory */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isTracked ? (
                          <span className="text-xs text-emerald-400 font-medium">
                            ✓ Dipantau
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">
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
                                ? "text-red-400"
                                : isLow
                                ? "text-yellow-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {p.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">∞</span>
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
                            className="rounded-lg bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-800/40 hover:bg-red-600/20 transition-colors cursor-pointer"
                          >
                            Adjust Stok
                          </button>

                          <Link
                            href={`/admin/inventory/${p.id}`}
                            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
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
