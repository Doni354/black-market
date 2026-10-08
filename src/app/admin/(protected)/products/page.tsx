import Link from "next/link";
import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { ProductTable } from "@/components/products/ProductTable";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Produk & Menu Fresh | Noury",
  description: "Kelola daftar menu fresh, buah, smoothies, dan healthy bites Noury.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Produk & Menu Fresh
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Kelola menu fresh fruit bowls, smoothies, infused water, dan healthy meals Noury.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button variant="primary" size="md" className="gap-2 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer">
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
