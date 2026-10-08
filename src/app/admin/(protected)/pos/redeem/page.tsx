import type { Metadata } from "next";
import { RedemptionContainer } from "@/components/redemption/RedemptionContainer";

export const metadata: Metadata = {
  title: "Penukaran Tiket (Redeem) | Noury",
  description: "Scanner dan validasi QR code tiket penukaran pesanan pre-order Noury.",
};

export const dynamic = "force-dynamic";

export default function RedeemPage() {
  return <RedemptionContainer />;
}
