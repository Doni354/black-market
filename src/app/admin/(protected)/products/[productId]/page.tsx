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
    title: product ? `Edit: ${product.name}` : "Produk Tidak Ditemukan",
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
      <nav className="flex items-center gap-2 text-xs text-zinc-500">
        <Link
          href="/admin/products"
          className="hover:text-zinc-300 transition-colors"
        >
          Produk
        </Link>
        <span>/</span>
        <span className="text-zinc-300 font-medium">Edit: {product.name}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Edit Produk
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ubah informasi, harga, stok, atau status produk ini.
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
