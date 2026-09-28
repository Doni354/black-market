"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { adjustStockAction } from "@/lib/actions/inventory";
import type { Product, InventoryMovementType } from "@/lib/types";

interface AdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
}

export function AdjustmentModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: AdjustmentModalProps) {
  const { toast } = useToast();
  const [actionType, setActionType] = useState<"ADD" | "SUBTRACT" | "SET">("ADD");
  const [quantityInput, setQuantityInput] = useState<string>("10");
  const [movementType, setMovementType] = useState<InventoryMovementType>("PURCHASE");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!product) return null;

  const currentStock = product.stock || 0;
  const inputNum = Math.abs(parseInt(quantityInput, 10) || 0);

  // Calculate delta based on mode
  let delta = 0;
  let resultingStock = currentStock;

  if (actionType === "ADD") {
    delta = inputNum;
    resultingStock = currentStock + inputNum;
  } else if (actionType === "SUBTRACT") {
    delta = -inputNum;
    resultingStock = Math.max(0, currentStock - inputNum);
  } else if (actionType === "SET") {
    delta = inputNum - currentStock;
    resultingStock = inputNum;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!product) return;

    if (delta === 0) {
      setError("Jumlah perubahan stok tidak boleh menghasilkan 0 delta.");
      return;
    }

    if (resultingStock < 0) {
      setError("Stok akhir tidak boleh kurang dari 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await adjustStockAction({
        productId: product.id,
        delta,
        type: movementType,
        note: note.trim() || undefined,
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      toast(`Stok "${product.name}" berhasil disesuaikan!`, "success");
      onSuccess({
        ...product,
        stock: resultingStock,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal menyesuaikan stok."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Penyesuaian Stok: ${product.name}`}
      description="Perbarui jumlah stok dan catat riwayat alasan perubahan inventaris."
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            disabled={delta === 0 || resultingStock < 0}
            onClick={handleSubmit}
            className="font-bold px-5"
          >
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActionType("ADD");
              setMovementType("PURCHASE");
            }}
            className={`rounded-xl border py-2.5 px-2 text-center font-semibold transition-all cursor-pointer ${
              actionType === "ADD"
                ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            + Tambah Stok
          </button>

          <button
            type="button"
            onClick={() => {
              setActionType("SUBTRACT");
              setMovementType("ADJUSTMENT");
            }}
            className={`rounded-xl border py-2.5 px-2 text-center font-semibold transition-all cursor-pointer ${
              actionType === "SUBTRACT"
                ? "border-red-600 bg-red-950/40 text-red-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            - Kurangi Stok
          </button>

          <button
            type="button"
            onClick={() => {
              setActionType("SET");
              setMovementType("ADJUSTMENT");
              setQuantityInput(currentStock.toString());
            }}
            className={`rounded-xl border py-2.5 px-2 text-center font-semibold transition-all cursor-pointer ${
              actionType === "SET"
                ? "border-yellow-600 bg-yellow-950/40 text-yellow-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            = Tetapkan Total
          </button>
        </div>

        {/* Input quantity */}
        <div>
          <Input
            label={
              actionType === "SET"
                ? "Total Stok Baru"
                : actionType === "ADD"
                ? "Jumlah Penambahan (+)"
                : "Jumlah Pengurangan (-)"
            }
            type="number"
            min={actionType === "SET" ? 0 : 1}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Stock preview banner */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div>
            <span className="text-zinc-500">Stok Saat Ini:</span>
            <p className="text-sm font-bold text-zinc-300">{currentStock}</p>
          </div>
          <span className="text-lg text-zinc-600">➔</span>
          <div className="text-right">
            <span className="text-zinc-500">Stok Akhir Menjadi:</span>
            <p
              className={`text-base font-black ${
                resultingStock === 0
                  ? "text-red-400"
                  : resultingStock < 10
                  ? "text-yellow-400"
                  : "text-emerald-400"
              }`}
            >
              {resultingStock} ({delta >= 0 ? `+${delta}` : delta})
            </p>
          </div>
        </div>

        {/* Reason / Movement Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Kategori Alasan
          </label>
          <select
            value={movementType}
            onChange={(e) =>
              setMovementType(e.target.value as InventoryMovementType)
            }
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {actionType === "ADD" && (
              <>
                <option value="PURCHASE">Pembelian / Restock Baru</option>
                <option value="INITIAL">Stok Awal</option>
                <option value="RETURN">Retur dari Pelanggan</option>
                <option value="ADJUSTMENT">Koreksi Opname (+)</option>
              </>
            )}
            {actionType === "SUBTRACT" && (
              <>
                <option value="ADJUSTMENT">Kerusakan / Rusak / Expired</option>
                <option value="ADJUSTMENT">Barang Hilang / Selisih Opname</option>
                <option value="SALE">Koreksi Penjualan Manual</option>
              </>
            )}
            {actionType === "SET" && (
              <option value="ADJUSTMENT">Penyesuaian Fisik (Stock Opname)</option>
            )}
          </select>
        </div>

        {/* Notes */}
        <div>
          <Input
            label="Catatan / Keterangan (Opsional)"
            placeholder="Contoh: Belanja bahan di pasar, restock t-shirt 20 pcs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Error alert */}
        {error && (
          <div className="rounded-lg border border-red-800/80 bg-red-950/60 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
