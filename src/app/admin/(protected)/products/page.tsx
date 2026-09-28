import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { ProductTable } from "@/components/products/ProductTable";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Produk & Katalog",
  description: "Kelola daftar produk, harga, stok, dan paket bundling Black Market.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Produk & Katalog
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Kelola menu makanan, minuman, merchandise, dan paket bundling.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button variant="primary" size="md" className="gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Produk
          </Button>
        </Link>
      </div>

      {/* Product Table */}
      <ProductTable initialProducts={products} />
    </div>
  );
}
