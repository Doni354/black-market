import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { CustomerOrderForm } from "@/components/order/CustomerOrderForm";

export const metadata: Metadata = {
  title: "Pemesanan Pre-Order | Black Market",
  description: "Form pemesanan tiket pre-order Black Market untuk pengambilan saat Market Day.",
};

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const products = await getProducts({ isActive: true, isPreOrderAvailable: true });

  return (
    <main className="min-h-screen bg-black text-zinc-100 py-8 px-4 sm:px-6 relative selection:bg-red-600 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <CustomerOrderForm products={products} />
      </div>
    </main>
  );
}
