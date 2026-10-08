"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { resetSystemDataAction } from "@/lib/actions/system-reset";

const CONFIRMATION_PHRASE = "RESET-PROD-NOURY";

export function DataResetManager() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Options
  const [resetOrders, setResetOrders] = useState(true);
  const [resetExpenses, setResetExpenses] = useState(true);
  const [resetInventoryMovements, setResetInventoryMovements] = useState(true);
  const [resetCustomers, setResetCustomers] = useState(true);
  const [resetProductStockToZero, setResetProductStockToZero] = useState(true);
  const [resetProducts, setResetProducts] = useState(false);

  const isAnySelected =
    resetOrders ||
    resetExpenses ||
    resetInventoryMovements ||
    resetCustomers ||
    resetProductStockToZero ||
    resetProducts;

  async function handleExecuteReset() {
    if (confirmationInput.trim().toUpperCase() !== CONFIRMATION_PHRASE) {
      toast(`Ketik "${CONFIRMATION_PHRASE}" untuk mengonfirmasi.`, "warning");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await resetSystemDataAction(
        {
          resetOrders,
          resetExpenses,
          resetInventoryMovements,
          resetCustomers,
          resetProductStockToZero,
          resetProducts,
        },
        confirmationInput
      );

      if (!res.success) {
        throw new Error(res.message || "Gagal mereset data.");
      }

      toast(res.message || "Semua data uji coba berhasil dihapus!", "success");
      setIsOpen(false);
      setConfirmationInput("");

      // Reload window after short delay so updated empty counts reflect everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan pembersihan data.",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            ZONA BAHAYA • PERSIAPAN PRODUCTION
          </div>
          <h2 className="text-base font-black text-zinc-900">
            Reset Data Sistem (Go-Live Stand Noury)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gunakan fitur ini untuk menghapus seluruh data transaksi uji coba (testing) sebelum stand KWH mulai beroperasi dan menerima pesanan sungguhan.
          </p>
        </div>

        <button
          type="button"
          disabled={!isAnySelected}
          onClick={() => setIsOpen(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          Bersihkan Data Uji Coba
        </button>
      </div>

      {/* Checkbox Options */}
      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetOrders}
            onChange={(e) => setResetOrders(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-zinc-900 block">
              1. Riwayat Pesanan & Tiket QR (Orders & Payments)
            </span>
            <span className="text-[11px] text-zinc-500">
              Menghapus semua pesanan POS, Pre-Order, bukti transfer, dan tiket redemption uji coba.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetExpenses}
            onChange={(e) => setResetExpenses(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-zinc-900 block">
              2. Pencatatan Pengeluaran Stand (Expenses)
            </span>
            <span className="text-[11px] text-zinc-500">
              Menghapus seluruh catatan beban operasional & belanja bahan testing.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetInventoryMovements}
            onChange={(e) => setResetInventoryMovements(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-zinc-900 block">
              3. Riwayat Mutasi Stok (Inventory Movements)
            </span>
            <span className="text-[11px] text-zinc-500">
              Menghapus log penambahan, penjualan, dan penyesuaian stok testing.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetCustomers}
            onChange={(e) => setResetCustomers(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-zinc-900 block">
              4. Data Pelanggan & Stempel Testing (Customers)
            </span>
            <span className="text-[11px] text-zinc-500">
              Menghapus data pelanggan testing, kartu stempel, dan kupon reward yang pernah diklaim.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetProductStockToZero}
            disabled={resetProducts}
            onChange={(e) => setResetProductStockToZero(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-zinc-900 block">
              5. Reset Stok Produk ke 0 (Katalog Menu Tetap Aman)
            </span>
            <span className="text-[11px] text-zinc-500">
              Mengosongkan sisa stok menu ke 0 untuk input stok fisik riil, tanpa menghapus foto/menu produk.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 transition cursor-pointer">
          <input
            type="checkbox"
            checked={resetProducts}
            onChange={(e) => {
              setResetProducts(e.target.checked);
              if (e.target.checked) setResetProductStockToZero(false);
            }}
            className="mt-0.5 h-4 w-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
          />
          <div>
            <span className="font-bold text-rose-900 block">
              6. Hapus Total Seluruh Produk & Menu (Opsional)
            </span>
            <span className="text-[11px] text-rose-700">
              Peringatan: Centang ini HANYA jika Anda ingin menghapus semua menu dan membuatnya dari nol kembali.
            </span>
          </div>
        </label>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
        <span>
          <strong>Keamanan Akun:</strong> Akun login Staf & Admin Noury <strong>TIDAK AKAN terhapus</strong>, sehingga sesi Anda tetap aktif dan aman.
        </span>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => !isDeleting && setIsOpen(false)}
        title="Konfirmasi Pembersihan Data Uji Coba"
        description="Tindakan ini permanen dan tidak dapat dibatalkan."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setIsOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={
                isDeleting ||
                confirmationInput.trim().toUpperCase() !== CONFIRMATION_PHRASE
              }
              onClick={handleExecuteReset}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? "Membersihkan Data..." : "Ya, Hapus Data Sekarang"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-xs text-zinc-700">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <p className="font-bold">Perhatian Sebelum Menghapus:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {resetOrders && <li>Seluruh riwayat transaksi POS & Pre-Order akan dihapus.</li>}
              {resetExpenses && <li>Seluruh pencatatan pengeluaran stand akan dihapus.</li>}
              {resetInventoryMovements && <li>Seluruh log pergerakan stok inventaris akan dibersihkan.</li>}
              {resetCustomers && <li>Seluruh data pelanggan & stempel loyalitas testing akan dihapus.</li>}
              {resetProducts ? (
                <li className="font-bold text-rose-900">Seluruh menu makanan/minuman akan dihapus permanen!</li>
              ) : resetProductStockToZero ? (
                <li>Stok semua produk akan diatur ke angka 0.</li>
              ) : null}
            </ul>
          </div>

          <div>
            <label
              htmlFor="confirmation-input"
              className="block font-bold text-zinc-900 mb-1"
            >
              Ketik <span className="font-mono text-rose-700 select-all font-black">{CONFIRMATION_PHRASE}</span> di bawah untuk melanjutkan:
            </label>
            <input
              id="confirmation-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={`Ketik ${CONFIRMATION_PHRASE}`}
              disabled={isDeleting}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-mono tracking-wider text-zinc-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
