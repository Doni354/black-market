import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductById } from "@/lib/db/products";
import { getInventoryMovements } from "@/lib/db/inventory";
import { MovementHistory } from "@/components/inventory/MovementHistory";
import { Badge } from "@/components/ui/Badge";
import { formatRupiah } from "@/lib/utils/money";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);

  return {
    title: product ? `Riwayat Stok: ${product.name}` : "Produk Tidak Ditemukan",
  };
}

export const dynamic = "force-dynamic";

export default async function ProductStockHistoryPage({ params }: PageProps) {
  const { productId } = await params;

  const [product, movements] = await Promise.all([
    getProductById(productId),
    getInventoryMovements({ productId, limit: 100 }),
  ]);

  if (!product) {
    notFound();
  }

  const isTracked = product.trackInventory;
  const isOut = isTracked && product.stock <= 0;
  const isLow = isTracked && product.stock > 0 && product.stock < 10;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link
          href="/admin/inventory"
          className="hover:text-zinc-300 transition-colors"
        >
          Inventaris
        </Link>
        <span>/</span>
        <span className="text-zinc-300 font-medium">Riwayat Stok: {product.name}</span>
      </nav>

      {/* Product Summary Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              {product.name}
            </h1>
            <Badge variant="default">{product.type}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Harga Jual: <strong className="text-zinc-200">{formatRupiah(product.price)}</strong>
            {product.category && ` • Kategori: ${product.category}`}
          </p>
        </div>

        {/* Current Stock Banner */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3 text-center sm:text-right">
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Stok Saat Ini
          </span>
          <p
            className={`text-3xl font-black ${
              !isTracked
                ? "text-zinc-400"
                : isOut
                ? "text-red-400"
                : isLow
                ? "text-yellow-400"
                : "text-emerald-400"
            }`}
          >
            {isTracked ? product.stock : "∞"}
          </p>
          <span className="text-[11px] text-zinc-500">
            {isTracked ? "Unit fisik tersedia" : "Tidak dipantau"}
          </span>
        </div>
      </div>

      {/* Movement History Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            Histori Keluar-Masuk Barang ({movements.length})
          </h2>
          <Link
            href="/admin/inventory"
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            ← Kembali ke Semua Inventaris
          </Link>
        </div>

        <MovementHistory movements={movements} />
      </div>
    </div>
  );
}
