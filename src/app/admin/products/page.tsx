import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Products"
      description="Kelola produk, harga, dan stok."
      phase="Phase 2"
    />
  );
}
