import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { getOrderByOrderNumber } from "@/lib/db/orders";
import { OrderTicket } from "@/components/redemption/OrderTicket";

interface PageProps {
  params: Promise<{
    orderNumber: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `E-Ticket #${orderNumber.toUpperCase()} | Noury — No Worries`,
    description: `Tiket penukaran pesanan #${orderNumber.toUpperCase()} di Noury.`,
  };
}

export const dynamic = "force-dynamic";

export default async function OrderTicketPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const cleanOrderNumber = decodeURIComponent(orderNumber).trim().toUpperCase();

  const order = await getOrderByOrderNumber(cleanOrderNumber);

  if (!order) {
    return (
      <main className="min-h-screen bg-[#FAFCFA] text-[#183331] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center p-8 bg-white border border-[#DCE8E4] rounded-3xl shadow-md">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#183331]">Tiket Tidak Ditemukan</h1>
          <p className="text-xs text-[#63847F] mt-2 mb-6">
            Nomor pesanan <span className="text-noury-teal font-mono font-semibold">#{cleanOrderNumber}</span> tidak terdaftar di sistem Noury.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-noury-mint hover:bg-noury-teal text-white text-xs font-semibold shadow-xs transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Generate QR code data URL if redemptionCode is available
  let qrDataUrl: string | null = null;
  if (order.status === "READY_FOR_REDEMPTION" && order.redemptionCode) {
    try {
      qrDataUrl = await QRCode.toDataURL(order.redemptionCode, {
        width: 320,
        margin: 2,
        color: {
          dark: "#142928",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
    } catch (err) {
      console.error("Failed to generate QR Data URL:", err);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFCFA] text-[#183331] py-8 px-4 flex flex-col items-center justify-center relative selection:bg-noury-mint selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-noury-mint/5 rounded-full blur-3xl pointer-events-none" />

      {/* Ticket Container */}
      <div className="w-full z-10">
        <OrderTicket order={order} qrDataUrl={qrDataUrl} />
      </div>
    </main>
  );
}
