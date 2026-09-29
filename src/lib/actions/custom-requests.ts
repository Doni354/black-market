"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createCustomRequest,
  getCustomRequests,
  updateCustomRequestStatus,
  convertCustomRequestToPreOrder,
  type CreateCustomRequestInput,
} from "@/lib/db/custom-requests";
import type { ActionState, CustomMerchRequest, CustomRequestStatus, Order } from "@/lib/types";

/**
 * Public Server Action: Submit a custom merch request from customer
 */
export async function submitCustomRequestAction(
  input: CreateCustomRequestInput
): Promise<ActionState<CustomMerchRequest>> {
  try {
    if (!input.customerName?.trim()) {
      return { success: false, message: "Nama lengkap wajib diisi." };
    }
    if (!input.customerPhone?.trim()) {
      return { success: false, message: "Nomor WhatsApp wajib diisi." };
    }
    const hasType =
      (input.merchTypes && input.merchTypes.length > 0) || Boolean(input.merchType);
    if (!hasType) {
      return { success: false, message: "Pilih minimal satu jenis merchandise (Pin, Sticker, atau Gantungan Kunci)." };
    }

    const result = await createCustomRequest(input);

    revalidatePath("/admin/custom-requests");

    return {
      success: true,
      message: `Request custom merch #${result.requestNumber} berhasil dikirim! Tim kami akan menghubungi via WhatsApp.`,
      data: result,
    };
  } catch (error) {
    console.error("submitCustomRequestAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengirim request custom merch.",
    };
  }
}

/**
 * Admin Server Action: Update request status
 */
export async function updateCustomRequestStatusAction(
  id: string,
  status: CustomRequestStatus,
  adminNotes?: string
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    await updateCustomRequestStatus(id, status, adminNotes);

    revalidatePath("/admin/custom-requests");

    return {
      success: true,
      message: "Status request custom merch berhasil diperbarui.",
    };
  } catch (error) {
    console.error("updateCustomRequestStatusAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal memperbarui status.",
    };
  }
}

/**
 * Admin Server Action: Convert request into an official pre-order
 */
export async function convertCustomRequestToPreOrderAction(
  requestId: string,
  unitPrice: number,
  paymentMethod: "COD" | "QRIS" | "BANK_TRANSFER"
): Promise<ActionState<Order>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (!unitPrice || unitPrice <= 0) {
      return { success: false, message: "Harga satuan produk harus lebih dari 0." };
    }

    const order = await convertCustomRequestToPreOrder(
      requestId,
      unitPrice,
      paymentMethod,
      user.id
    );

    revalidatePath("/admin/custom-requests");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Pre-Order #${order.orderNumber} untuk custom merch berhasil diterbitkan!`,
      data: order,
    };
  } catch (error) {
    console.error("convertCustomRequestToPreOrderAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menerbitkan pre-order.",
    };
  }
}
