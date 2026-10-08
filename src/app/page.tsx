import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { HomeClient } from "@/components/home/HomeClient";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Noury — No Worries | Fresh & Healthy Living",
  description:
    "Playful path toward freshness and healthy living: fruit bowls, cold-pressed smoothies & juices, fresh infused water, and healthy food. Noury — No Worries.",
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
