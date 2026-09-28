"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import {
  toggleProductActiveAction,
  deleteProductAction,
} from "@/lib/actions/products";
import type { Product, ProductType } from "@/lib/types";

interface ProductTableProps {
  initialProducts: Product[];
}

const TYPE_LABELS: Record<ProductType, { label: string; variant: "default" | "info" | "warning" | "success" }> = {
  FOOD: { label: "Food", variant: "warning" },
  DRINK: { label: "Drink", variant: "info" },
  MERCH: { label: "Merch", variant: "default" },
  BUNDLE: { label: "Bundle", variant: "success" },
  OTHER: { label: "Other", variant: "default" },
};

export function ProductTable({ initialProducts }: ProductTableProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Type filter
      if (selectedType !== "ALL" && item.type !== selectedType) {
        return false;
      }

      // Status filter
      if (statusFilter === "ACTIVE" && !item.isActive) return false;
      if (statusFilter === "INACTIVE" && item.isActive) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        return matchesName || matchesCategory;
      }

      return true;
    });
  }, [products, search, selectedType, statusFilter]);

  // Toggle active/inactive
  async function handleToggleStatus(product: Product) {
    setTogglingId(product.id);
    try {
      const res = await toggleProductActiveAction(product.id, product.isActive);
      if (!res.success) {
        throw new Error(res.message);
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, isActive: !p.isActive } : p
        )
      );

      toast(
        `Produk "${product.name}" sekarang ${!product.isActive ? "Aktif" : "Nonaktif"}`,
        "info"
      );
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal mengubah status produk",
        "error"
      );
    } finally {
      setTogglingId(null);
    }
  }

  // Delete product
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await deleteProductAction(deleteTarget.id);
      if (!res.success) {
        throw new Error(res.message);
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast(`Produk "${deleteTarget.name}" berhasil dihapus`, "success");
      setDeleteTarget(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal menghapus produk",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Cari nama atau kategori..."
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

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="FOOD">Makanan (Food)</option>
            <option value="DRINK">Minuman (Drink)</option>
            <option value="MERCH">Merchandise</option>
            <option value="BUNDLE">Bundling</option>
            <option value="OTHER">Lainnya</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">Produk</th>
                <th className="px-4 py-3.5">Tipe & Kategori</th>
                <th className="px-4 py-3.5">Harga Jual</th>
                <th className="px-4 py-3.5">Stok</th>
                <th className="px-4 py-3.5">PO Available</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-base font-medium">Tidak ada produk ditemukan</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Coba ubah kata kunci pencarian atau filter yang dipilih.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const typeMeta = TYPE_LABELS[p.type] || {
                    label: p.type,
                    variant: "default",
                  };

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      {/* Product Image & Name */}
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
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-medium text-zinc-100 hover:text-red-400 transition-colors truncate block"
                            >
                              {p.name}
                            </Link>
                            {p.bundleItems && p.bundleItems.length > 0 && (
                              <span className="text-[11px] text-zinc-500">
                                {p.bundleItems.length} komponen dalam bundle
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type & Category */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={typeMeta.variant}>
                            {typeMeta.label}
                          </Badge>
                          {p.category && (
                            <span className="text-xs text-zinc-400">
                              {p.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Selling Price & Margin */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-zinc-100">
                          {formatRupiah(p.price)}
                        </span>
                        {p.costPrice ? (
                          <p className="text-[11px] text-zinc-500">
                            HPP: {formatRupiah(p.costPrice)}
                          </p>
                        ) : null}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.trackInventory ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                p.stock === 0
                                  ? "bg-red-500"
                                  : p.stock < 10
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                p.stock === 0
                                  ? "text-red-400 font-bold"
                                  : p.stock < 10
                                  ? "text-yellow-400"
                                  : "text-zinc-200"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Tidak dipantau
                          </span>
                        )}
                      </td>

                      {/* Pre-Order Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.isPreOrderAvailable ? (
                          <span className="inline-flex items-center rounded-md bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-800/40">
                            PO Ready
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={togglingId === p.id}
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                            p.isActive
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.isActive ? "bg-emerald-400" : "bg-zinc-500"
                            }`}
                          />
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                            title="Edit Produk"
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
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors cursor-pointer"
                            title="Hapus Produk"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus produk "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              Hapus Permanen
            </Button>
          </>
        }
      />
    </div>
  );
}
