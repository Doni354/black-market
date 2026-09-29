import type { Metadata } from "next";
import { getCustomRequests } from "@/lib/db/custom-requests";
import { CustomRequestTable } from "@/components/custom-requests/CustomRequestTable";

export const metadata: Metadata = {
  title: "Request Custom Merchandise",
  description: "Kelola request custom merchandise (Pin, Sticker, Gantungan Kunci) dari pelanggan Black Market.",
};

export const dynamic = "force-dynamic";

export default async function CustomRequestsPage() {
  const requests = await getCustomRequests();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Request Custom Merchandise
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold">
            Pin, Sticker & Gantungan Kunci
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Daftar pengajuan desain custom dari pemesan. Review mockup, diskusikan via WhatsApp, dan terbitkan langsung menjadi pre-order.
        </p>
      </div>

      {/* Table */}
      <CustomRequestTable initialRequests={requests} />
    </div>
  );
}
