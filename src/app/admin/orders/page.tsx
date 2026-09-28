import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Orders"
      description="Lihat dan kelola semua pesanan."
      phase="Phase 3 & 5"
    />
  );
}
