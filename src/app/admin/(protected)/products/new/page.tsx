import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { ProductForm } from "@/components/products/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Produk Baru",
  description: "Form input produk makanan, minuman, merchandise, atau bundling baru.",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  // Fetch existing products to populate bundle component options
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link
          href="/admin/products"
          className="hover:text-zinc-300 transition-colors"
        >
          Produk
        </Link>
        <span>/</span>
        <span className="text-zinc-300 font-medium">Tambah Baru</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Tambah Produk Baru
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Masukkan detail produk, harga jual dalam Rupiah, stok awal, dan foto.
        </p>
      </div>

      {/* Form */}
      <ProductForm availableProducts={products} isEdit={false} />
    </div>
  );
}
