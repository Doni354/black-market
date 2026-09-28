import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { getCurrentUser } from "@/lib/auth/session";
import { POSContainer } from "@/components/pos/POSContainer";

export const metadata: Metadata = {
  title: "POS / Kasir",
  description: "Terminal Point of Sale Black Market untuk transaksi langsung di tempat.",
};

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [products, user] = await Promise.all([
    getProducts({ isActive: true }),
    getCurrentUser(),
  ]);

  return (
    <POSContainer
      products={products}
      cashierName={user?.name || "Kasir"}
    />
  );
}
