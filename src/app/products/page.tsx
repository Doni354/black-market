import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { HomeClient } from "@/components/home/HomeClient";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Katalog Produk | Black Market",
  description: "Katalog resmi makanan, minuman, merchandise, dan paket bundling Black Market.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let products: Product[] = [];
  try {
    products = await getProducts({ isActive: true });
  } catch (err) {
    console.error("ProductsPage error loading products:", err);
  }

  return <HomeClient products={products} />;
}
