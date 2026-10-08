import type { Metadata } from "next";
import { getReportData } from "@/lib/db/reports";
import { ReportsContainer } from "@/components/reports/ReportsContainer";

export const metadata: Metadata = {
  title: "Laporan Bisnis & Keuangan | Noury",
  description: "Laporan penjualan, pengeluaran stand, laba rugi, dan inventaris Noury.",
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const initialData = await getReportData({ period: "TODAY" });

  return <ReportsContainer initialData={initialData} />;
}
