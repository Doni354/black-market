import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Laporan penjualan dan keuangan."
      phase="Phase 7"
    />
  );
}
