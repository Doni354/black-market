import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { getCurrentUser } from "@/lib/auth/session";
import { POSContainer } from "@/components/pos/POSContainer";

export const metadata: Metadata = {
  title: "POS / Kasir | Noury — No Worries",
  description: "Terminal Point of Sale Noury untuk transaksi langsung di stand bazar KWH.",
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
