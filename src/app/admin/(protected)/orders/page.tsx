import type { Metadata } from "next";
import { getOrders } from "@/lib/db/orders";
import { getProducts } from "@/lib/db/products";
import { OrderTable } from "@/components/orders/OrderTable";

export const metadata: Metadata = {
  title: "Daftar Pesanan & Pre-Order",
  description: "Daftar seluruh transaksi POS langsung dan pesanan Pre-Order Black Market.",
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, products] = await Promise.all([
    getOrders({ limit: 100 }),
    getProducts({ isActive: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Daftar Pesanan & Transaksi
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Seluruh histori transaksi POS langsung dan pesanan Pre-Order beserta verifikasi pembayaran.
        </p>
      </div>

      {/* Orders Table */}
      <OrderTable initialOrders={orders} products={products} />
    </div>
  );
}
