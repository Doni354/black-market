import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Redeem Order" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Redeem Order"
      description="Scan QR ticket untuk pengambilan pesanan."
      phase="Phase 6"
    />
  );
}
