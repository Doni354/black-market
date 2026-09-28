"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getRedemptionByCode,
  executeRedemption,
  type RedemptionDetails,
} from "@/lib/db/redemptions";
import type { ActionState, Order, Redemption } from "@/lib/types";

/**
 * Server Action: Look up redemption and order details by redemption code.
 * Used for pre-scan preview before confirming handover of items.
 */
export async function lookupRedemptionAction(
  rawCode: string
): Promise<ActionState<RedemptionDetails>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const cleanCode = rawCode?.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Kode redemption tidak boleh kosong." };
    }

    const details = await getRedemptionByCode(cleanCode);
    if (!details) {
      return {
        success: false,
        message: `Tiket dengan kode "${cleanCode}" tidak ditemukan atau tidak valid.`,
      };
    }

    return {
      success: true,
      data: details,
    };
  } catch (error) {
    console.error("lookupRedemptionAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memeriksa kode tiket.",
    };
  }
}

/**
 * Server Action: Execute redemption atomically.
 * Transitions order and redemption to REDEEMED status.
 * Single-use only; prevents race conditions / double redemptions.
 */
export async function redeemOrderAction(
  rawCode: string
): Promise<ActionState<{ order: Order; redemption: Redemption }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const cleanCode = rawCode?.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Kode redemption tidak boleh kosong." };
    }

    const result = await executeRedemption(cleanCode, user.id);

    // Revalidate affected routes
    revalidatePath("/admin/pos");
    revalidatePath("/admin/pos/redeem");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");
    if (result.order.orderNumber) {
      revalidatePath(`/order/${result.order.orderNumber}`);
    }

    return {
      success: true,
      message: `Pesanan #${result.order.orderNumber} (${result.order.customerName || "Pelanggan"}) berhasil diserahkan!`,
      data: result,
    };
  } catch (error) {
    console.error("redeemOrderAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal memproses penukaran tiket.",
    };
  }
}
