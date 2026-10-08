import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { getInventoryMovements } from "@/lib/db/inventory";
import { StockTable } from "@/components/inventory/StockTable";
import { MovementHistory } from "@/components/inventory/MovementHistory";

export const metadata: Metadata = {
  title: "Inventaris & Stok",
  description: "Pantau ketersediaan stok fisik barang, status menipis, dan histori mutasi barang.",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [products, recentMovements] = await Promise.all([
    getProducts(),
    getInventoryMovements({ limit: 50 }),
  ]);

  const trackedProducts = products.filter((p) => p.trackInventory);
  const outOfStockCount = trackedProducts.filter((p) => p.stock <= 0).length;
  const lowStockCount = trackedProducts.filter(
    (p) => p.stock > 0 && p.stock < 10
  ).length;
  const safeStockCount = trackedProducts.filter((p) => p.stock >= 10).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Inventaris & Stok Menu
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Monitor stok real-time, lakukan penyesuaian manual (opname/restock), dan telusuri riwayat mutasi.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Tracked */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs uppercase font-semibold text-zinc-500">
            Menu Dipantau
          </span>
          <p className="mt-2 text-2xl font-black text-zinc-900">
            {trackedProducts.length}
          </p>
          <span className="text-[11px] text-zinc-400">
            dari {products.length} total menu
          </span>
        </div>

        {/* Safe Stock */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs uppercase font-semibold text-emerald-700">
            Stok Aman (≥10)
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {safeStockCount}
          </p>
          <span className="text-[11px] text-zinc-400">Kondisi persediaan baik</span>
        </div>

        {/* Low Stock */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs uppercase font-semibold text-amber-700">
            Stok Menipis (&lt;10)
          </span>
          <p className="mt-2 text-2xl font-black text-amber-700">
            {lowStockCount}
          </p>
          <span className="text-[11px] text-zinc-400">Perlu restock segera</span>
        </div>

        {/* Out of Stock */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <span className="text-xs uppercase font-semibold text-red-600">
            Stok Habis (0)
          </span>
          <p className="mt-2 text-2xl font-black text-red-600">
            {outOfStockCount}
          </p>
          <span className="text-[11px] text-zinc-400">Tidak dapat dijual di POS</span>
        </div>
      </div>

      {/* Stock Table Section */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 mb-3">
          Tabel Ketersediaan Stok
        </h2>
        <StockTable initialProducts={products} />
      </div>

      {/* Global Movement History Section */}
      <div className="mt-4 pt-6 border-t border-zinc-200">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-zinc-900">
            Riwayat Mutasi Stok Terbaru
          </h2>
          <p className="text-xs text-zinc-500">
            Log seluruh pergerakan barang dari penjualan kasir, restock, maupun penyesuaian manual.
          </p>
        </div>
        <MovementHistory movements={recentMovements} />
      </div>
    </div>
  );
}
