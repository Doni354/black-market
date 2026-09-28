import type { Metadata } from "next";
import { RedemptionContainer } from "@/components/redemption/RedemptionContainer";

export const metadata: Metadata = {
  title: "Penukaran Tiket (Redeem) | Black Market",
  description: "Scanner dan validasi QR code tiket penukaran pesanan pre-order Black Market.",
};

export const dynamic = "force-dynamic";

export default function RedeemPage() {
  return <RedemptionContainer />;
}
