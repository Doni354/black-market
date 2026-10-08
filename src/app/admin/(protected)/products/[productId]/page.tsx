import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductById, getProducts } from "@/lib/db/products";
import { ProductForm } from "@/components/products/ProductForm";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);

  return {
    title: product ? `Edit: ${product.name} | Noury` : "Produk Tidak Ditemukan",
  };
}

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps) {
  const { productId } = await params;

  const [product, allProducts] = await Promise.all([
    getProductById(productId),
    getProducts(),
  ]);

  if (!product) {
    notFound();
  }

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
        <span className="text-[#183331] font-bold">Edit: {product.name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#183331]">
          Edit Menu: {product.name}
        </h1>
        <p className="mt-1 text-sm text-[#52706C]">
          Ubah informasi menu, harga, persediaan porsi, atau status penjualan di sistem.
        </p>
      </div>

      {/* Form */}
      <ProductForm
        initialData={product}
        availableProducts={allProducts}
        isEdit={true}
      />
    </div>
  );
}
