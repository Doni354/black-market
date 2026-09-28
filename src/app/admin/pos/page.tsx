import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "POS / Kasir" };

export default function PosPage() {
  return (
    <PlaceholderPage
      title="POS / Kasir"
      description="Lakukan transaksi langsung dengan customer."
      phase="Phase 3"
    />
  );
}
