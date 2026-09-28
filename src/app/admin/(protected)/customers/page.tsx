import type { Metadata } from "next";
import { getCustomers } from "@/lib/db/customers";
import { CustomerTable } from "@/components/customers/CustomerTable";

export const metadata: Metadata = {
  title: "Data Pelanggan",
  description: "Daftar pelanggan, riwayat pemesanan, dan kontak WhatsApp.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers(100);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Data Pelanggan
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Daftar customer yang tercatat dari pemesanan Pre-Order dan kasir, lengkap dengan kontak WhatsApp dan riwayat belanja.
        </p>
      </div>

      {/* Customer Directory Table */}
      <CustomerTable initialCustomers={customers} />
    </div>
  );
}
