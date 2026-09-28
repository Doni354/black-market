"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createDirectSale, updateOrderProof, type DirectSaleResult } from "@/lib/db/orders";
import type { PaymentMethod, ActionState } from "@/lib/types";

export interface CompleteSalePayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  proofUrl?: string;
}

/**
 * Server Action: Process and finalize a direct sale from the POS terminal.
 */
export async function completeSaleAction(
  payload: CompleteSalePayload
): Promise<ActionState & { result?: DirectSaleResult }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: "Keranjang belanja tidak boleh kosong." };
    }

    const result = await createDirectSale({
      ...payload,
      cashierId: user.id,
    });

    // Revalidate paths affected by the sale
    revalidatePath("/admin/pos");
    revalidatePath("/admin/products");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");

    return { success: true, result };
  } catch (error) {
    console.error("completeSaleAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses penjualan.",
    };
  }
}

/**
 * Server Action: Upload / attach a proof image to an existing order.
 */
export async function attachOrderProofAction(
  orderId: string,
  proofUrl: string
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    await updateOrderProof(orderId, proofUrl);
    revalidatePath("/admin/orders");

    return { success: true };
  } catch (error) {
    console.error("attachOrderProofAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengunggah bukti pembayaran.",
    };
  }
}
