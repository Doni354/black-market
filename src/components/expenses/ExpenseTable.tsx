"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import { ExpenseFormModal } from "./ExpenseFormModal";
import type { Expense, ExpenseCategory } from "@/lib/types";

interface ExpenseTableProps {
  initialExpenses: Expense[];
  userRole?: string;
}

const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  FOOD_MATERIAL: { label: "Bahan Baku", variant: "warning" },
  MERCH_PRODUCTION: { label: "Produksi Merch", variant: "info" },
  PACKAGING: { label: "Packaging", variant: "default" },
  OPERATIONAL: { label: "Operasional", variant: "danger" },
  PROMOTION: { label: "Promosi", variant: "success" },
  OTHER: { label: "Lain-lain", variant: "default" },
};

export function ExpenseTable({ initialExpenses, userRole }: ExpenseTableProps) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        return matchesDesc || matchesCategory;
      }

      return true;
    });
  }, [expenses, search, categoryFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  async function handleDelete(id: string) {
    setLoadingDelete(true);
    try {
      const res = await deleteExpenseAction(id);
      if (!res.success) {
        throw new Error(res.message || "Gagal menghapus pengeluaran.");
      }

      setExpenses((prev) => prev.filter((item) => item.id !== id));
      toast("Catatan pengeluaran berhasil dihapus.", "success");
      setDeletingId(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus",
        "error"
      );
    } finally {
      setLoadingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Search, Category Filter, and Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Cari keperluan pengeluaran..."
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="FOOD_MATERIAL">Bahan Baku</option>
            <option value="MERCH_PRODUCTION">Produksi Merch</option>
            <option value="PACKAGING">Packaging</option>
            <option value="OPERATIONAL">Operasional</option>
            <option value="PROMOTION">Promosi</option>
            <option value="OTHER">Lain-lain</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-zinc-500 block">Total Ditampilkan</span>
            <span className="text-sm font-bold text-red-400">{formatRupiah(totalFilteredAmount)}</span>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            className="gap-1.5 font-bold whitespace-nowrap"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Catat Pengeluaran
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Deskripsi / Keperluan</th>
                <th className="px-4 py-3.5">Sumber Dana</th>
                <th className="px-4 py-3.5">Jumlah</th>
                <th className="px-4 py-3.5 text-center">Nota / Bukti</th>
                {userRole === "ADMIN" && (
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={userRole === "ADMIN" ? 7 : 6} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-base font-medium">Belum ada catatan pengeluaran</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Klik tombol &ldquo;+ Catat Pengeluaran&rdquo; untuk mencatat biaya operasional atau bahan baku.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const dateStr =
                    typeof expense.createdAt === "string"
                      ? new Date(expense.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—";

                  const catMeta =
                    CATEGORY_LABELS[expense.category] || {
                      label: expense.category,
                      variant: "default",
                    };

                  return (
                    <tr
                      key={expense.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={catMeta.variant}>{catMeta.label}</Badge>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 font-medium text-zinc-200">
                        {expense.description}
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        <span className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                          {expense.paymentMethod}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-bold text-red-400 whitespace-nowrap">
                        {formatRupiah(expense.amount)}
                      </td>

                      {/* Proof / Receipt */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {expense.proofUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(expense.proofUrl || null)}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                          >
                            <svg className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Lihat Nota
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      {userRole === "ADMIN" && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDeletingId(expense.id)}
                            className="text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <ExpenseFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          // Trigger route refresh / local state update
          window.location.reload();
        }}
      />

      {/* Proof Preview Modal */}
      <Modal
        isOpen={Boolean(previewProofUrl)}
        onClose={() => setPreviewProofUrl(null)}
        title="Nota / Bukti Pengeluaran"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {previewProofUrl && (
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-red-400 hover:text-red-300 underline font-medium"
              >
                Buka Gambar Asli ↗
              </a>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewProofUrl(null)}
            >
              Tutup
            </Button>
          </div>
        }
      >
        {previewProofUrl && (
          <div className="relative w-full h-[60vh] max-h-[500px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <Image
              src={previewProofUrl}
              alt="Bukti nota pengeluaran"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Hapus Catatan Pengeluaran"
        description="Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Tindakan ini tidak dapat dibatalkan."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={loadingDelete}
              onClick={() => setDeletingId(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={loadingDelete}
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
