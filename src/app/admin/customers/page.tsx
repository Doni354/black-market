import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Kelola data customer."
      phase="Phase 5"
    />
  );
}
