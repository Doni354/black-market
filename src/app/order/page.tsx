import type { Metadata } from "next";
import { getProducts } from "@/lib/db/products";
import { CustomerOrderForm } from "@/components/order/CustomerOrderForm";

export const metadata: Metadata = {
  title: "Pemesanan Pre-Order | Noury — No Worries",
  description: "Form pemesanan tiket pre-order menu segar Noury untuk penukaran instan di stan.",
};

export const dynamic = "force-dynamic";

export default async function OrderPage() {
  const products = await getProducts({ isActive: true, isPreOrderAvailable: true });

  return (
    <main className="min-h-screen bg-[#FAFCFA] text-[#183331] py-8 px-4 sm:px-6 relative selection:bg-[#47957F] selection:text-white">
      {/* Background soft glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-noury-mint/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <CustomerOrderForm products={products} />
      </div>
    </main>
  );
}
