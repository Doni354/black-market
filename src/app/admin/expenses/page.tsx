import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Expenses" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Expenses"
      description="Catat pengeluaran operasional."
      phase="Phase 5"
    />
  );
}
