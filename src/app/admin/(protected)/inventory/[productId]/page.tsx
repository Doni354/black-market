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
    title: product ? `Riwayat Stok: ${product.name} | Noury` : "Produk Tidak Ditemukan",
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
      <nav className="flex items-center gap-2 text-xs text-[#52706C]">
        <Link
          href="/admin/inventory"
          className="hover:text-[#183331] transition-colors"
        >
          Inventaris
        </Link>
        <span>/</span>
        <span className="text-[#183331] font-bold">Riwayat Stok: {product.name}</span>
      </nav>

      {/* Product Summary Header Card */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#183331]">
              {product.name}
            </h1>
            <Badge variant="default">{product.type}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#52706C]">
            Harga Jual: <strong className="text-[#183331]">{formatRupiah(product.price)}</strong>
            {product.category && ` • Kategori: ${product.category}`}
          </p>
        </div>

        {/* Current Stock Banner */}
        <div className="rounded-xl border border-[#D5E4DF] bg-[#FAFCFB] px-5 py-3 text-center sm:text-right">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7A9C96]">
            Stok Saat Ini
          </span>
          <p
            className={`text-3xl font-black ${
              !isTracked
                ? "text-[#7A9C96]"
                : isOut
                ? "text-rose-600"
                : isLow
                ? "text-amber-500"
                : "text-[#47957F]"
            }`}
          >
            {isTracked ? product.stock : "∞"}
          </p>
          <span className="text-[11px] text-[#7A9C96]">
            {isTracked ? "Porsi fisik tersedia" : "Tanpa batas"}
          </span>
        </div>
      </div>

      {/* Movement History Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#183331]">
            Histori Keluar-Masuk Menu ({movements.length})
          </h2>
          <Link
            href="/admin/inventory"
            className="text-xs font-bold text-[#47957F] hover:text-[#3D8383] transition-colors"
          >
            ← Kembali ke Semua Inventaris
          </Link>
        </div>

        <MovementHistory movements={movements} />
      </div>
    </div>
  );
}
