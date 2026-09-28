import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Konfigurasi sistem."
      phase="Phase 8"
    />
  );
}
