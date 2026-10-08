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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs text-[#183331]">
        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActionType("ADD");
              setMovementType("PURCHASE");
            }}
            className={`rounded-xl border py-2.5 px-2 text-center font-bold transition-all cursor-pointer ${
              actionType === "ADD"
                ? "border-[#47957F] bg-[#EAF5F1] text-[#2A5E56] shadow-xs"
                : "border-[#E2ECE8] bg-white text-[#52706C] hover:bg-[#F8FAF9]"
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
            className={`rounded-xl border py-2.5 px-2 text-center font-bold transition-all cursor-pointer ${
              actionType === "SUBTRACT"
                ? "border-rose-300 bg-rose-50 text-rose-700 shadow-xs"
                : "border-[#E2ECE8] bg-white text-[#52706C] hover:bg-[#F8FAF9]"
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
            className={`rounded-xl border py-2.5 px-2 text-center font-bold transition-all cursor-pointer ${
              actionType === "SET"
                ? "border-amber-300 bg-amber-50 text-amber-800 shadow-xs"
                : "border-[#E2ECE8] bg-white text-[#52706C] hover:bg-[#F8FAF9]"
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
        <div className="flex items-center justify-between rounded-2xl border border-[#D5E4DF] bg-[#FAFCFB] p-3.5">
          <div>
            <span className="text-[11px] font-semibold text-[#7A9C96]">Stok Saat Ini:</span>
            <p className="text-sm font-bold text-[#183331]">{currentStock}</p>
          </div>
          <span className="text-base text-[#7A9C96]">➔</span>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-[#7A9C96]">Stok Akhir Menjadi:</span>
            <p
              className={`text-base font-black ${
                resultingStock === 0
                  ? "text-rose-600"
                  : resultingStock < 10
                  ? "text-amber-500"
                  : "text-[#47957F]"
              }`}
            >
              {resultingStock} ({delta >= 0 ? `+${delta}` : delta})
            </p>
          </div>
        </div>

        {/* Reason / Movement Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#52706C]">
            Kategori Alasan
          </label>
          <select
            value={movementType}
            onChange={(e) =>
              setMovementType(e.target.value as InventoryMovementType)
            }
            className="rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 text-xs text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F] cursor-pointer"
          >
            {actionType === "ADD" && (
              <>
                <option value="PURCHASE">Pembelian Bahan / Restock Baru</option>
                <option value="INITIAL">Stok Awal</option>
                <option value="RETURN">Retur dari Pelanggan</option>
                <option value="ADJUSTMENT">Koreksi Opname (+)</option>
              </>
            )}
            {actionType === "SUBTRACT" && (
              <>
                <option value="ADJUSTMENT">Buah Rusak / Terbuang / Expired</option>
                <option value="ADJUSTMENT">Barang Tumpah / Selisih Opname</option>
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
            placeholder="Contoh: Belanja buah di pasar, restock botol 30 pcs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Error alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
