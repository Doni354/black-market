import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Inventory"
      description="Monitor stok dan histori perubahan."
      phase="Phase 4"
    />
  );
}
