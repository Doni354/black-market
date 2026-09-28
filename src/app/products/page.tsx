import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { HomeClient } from "@/components/home/HomeClient";

export const metadata: Metadata = {
  title: "Katalog Produk | Black Market",
  description: "Katalog resmi makanan, minuman, merchandise, dan paket bundling Black Market.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts({ isActive: true });

  return <HomeClient products={products} />;
}
