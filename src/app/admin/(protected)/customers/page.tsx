import type { Metadata } from "next";
import { getCustomers } from "@/lib/db/customers";
import { CustomerTable } from "@/components/customers/CustomerTable";

export const metadata: Metadata = {
  title: "Data Pelanggan | Noury",
  description: "Daftar pelanggan, stempel loyalitas, riwayat pemesanan, dan kontak WhatsApp.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers(100);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#183331]">
          Data Pelanggan
        </h1>
        <p className="mt-1 text-sm text-[#52706C]">
          Daftar pelanggan yang terdaftar melalui akun Google, pre-order, atau kasir POS beserta riwayat transaksinya.
        </p>
      </div>

      {/* Customer Directory Table */}
      <CustomerTable initialCustomers={customers} />
    </div>
  );
}
