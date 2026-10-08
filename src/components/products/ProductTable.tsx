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
  FRUIT_BOWL: { label: "Fruit Bowl", variant: "success" },
  SMOOTHIE_JUICE: { label: "Smoothie / Juice", variant: "info" },
  INFUSED_WATER: { label: "Infused Water", variant: "info" },
  HEALTHY_FOOD: { label: "Healthy Food", variant: "warning" },
  BUNDLE: { label: "Bundling", variant: "success" },
  FOOD: { label: "Food", variant: "warning" },
  DRINK: { label: "Drink", variant: "info" },
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400"
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
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs cursor-pointer"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="FRUIT_BOWL">Fruit Bowl</option>
            <option value="SMOOTHIE_JUICE">Smoothie & Juice</option>
            <option value="INFUSED_WATER">Infused Water</option>
            <option value="HEALTHY_FOOD">Healthy Food</option>
            <option value="BUNDLE">Bundling</option>
            <option value="FOOD">Food (Lainnya)</option>
            <option value="DRINK">Drink (Lainnya)</option>
            <option value="OTHER">Lainnya</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#47957F] shadow-xs cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Hanya Aktif</option>
            <option value="INACTIVE">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
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
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <p className="text-base font-semibold text-zinc-600">Tidak ada produk ditemukan</p>
                    <p className="mt-1 text-xs text-zinc-400">
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
                      className="transition-colors hover:bg-zinc-50/80"
                    >
                      {/* Product Image & Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[#E2ECE8] bg-[#F4F9F7] text-xs font-bold text-[#7A9C96]">
                              <span className="font-mono text-[10px]">MENU</span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-semibold text-zinc-800 hover:text-[#47957F] transition-colors truncate block"
                            >
                              {p.name}
                            </Link>
                            {p.bundleItems && p.bundleItems.length > 0 && (
                              <span className="text-[11px] text-zinc-400">
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
                            <span className="text-xs text-zinc-500">
                              {p.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Selling Price & Margin */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-zinc-900">
                          {formatRupiah(p.price)}
                        </span>
                        {p.costPrice ? (
                          <p className="text-[11px] text-zinc-400">
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
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                            <span
                              className={`font-semibold ${
                                p.stock === 0
                                  ? "text-red-600 font-bold"
                                  : p.stock < 10
                                  ? "text-amber-700"
                                  : "text-zinc-700"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">
                            Tidak dipantau
                          </span>
                        )}
                      </td>

                      {/* Pre-Order Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.isPreOrderAvailable ? (
                          <span className="inline-flex items-center rounded-md bg-[#47957F]/10 px-2 py-0.5 text-xs font-semibold text-[#3D8383] border border-[#47957F]/20">
                            PO Ready
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
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
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.isActive ? "bg-emerald-500" : "bg-zinc-400"
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
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
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
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
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
