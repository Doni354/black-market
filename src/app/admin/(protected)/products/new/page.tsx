import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { ProductForm } from "@/components/products/ProductForm";

export const metadata: Metadata = {
  title: "Tambah Menu Baru | Noury",
  description: "Form input menu fruit bowl, cold-pressed juice, infused water, atau healthy food.",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  // Fetch existing products to populate bundle component options
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[#52706C]">
        <Link
          href="/admin/products"
          className="hover:text-[#183331] transition-colors"
        >
          Katalog Menu
        </Link>
        <span>/</span>
        <span className="text-[#183331] font-bold">Tambah Baru</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#183331]">
          Tambah Menu Segar Baru
        </h1>
        <p className="mt-1 text-sm text-[#52706C]">
          Masukkan detail hidangan buah segar, harga jual, estimasi HPP, stok porsi awal, dan foto.
        </p>
      </div>

      {/* Form */}
      <ProductForm availableProducts={products} isEdit={false} />
    </div>
  );
}
