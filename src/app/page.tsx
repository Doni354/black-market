import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { HomeClient } from "@/components/home/HomeClient";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Black Market — Merchandise & F&B Official Store",
  description:
    "Katalog resmi Black Market. Pre-order merchandise eksklusif, minuman, dan makanan favorit dengan tiket penukaran instan di Market Day.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];
  try {
    products = await getProducts({ isActive: true });
  } catch (err) {
    console.error("HomePage error loading products:", err);
  }

  return <HomeClient products={products} />;
}
