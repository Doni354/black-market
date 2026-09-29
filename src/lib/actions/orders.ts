"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createPreOrder,
  verifyOrderPayment,
  cancelOrder,
  updateOrderProof,
  type CreatePreOrderResult,
} from "@/lib/db/orders";
import type { ActionState, PaymentMethod, Order } from "@/lib/types";

export interface CreatePreOrderPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  pickupMethod?: "MARKET_DAY" | "FLEXIBLE";
  proofUrl?: string;
}

/**
 * Server Action: Create a manual pre-order from admin/POS.
 */
export async function createPreOrderAction(
  payload: CreatePreOrderPayload
): Promise<ActionState & { result?: CreatePreOrderResult }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: "Pilih minimal satu produk untuk pesanan." };
    }

    if (!payload.customerName?.trim()) {
      return { success: false, message: "Nama pelanggan wajib diisi." };
    }

    const result = await createPreOrder({
      ...payload,
      source: "POS",
      createdBy: user.id,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message: `Pre-Order #${result.order.orderNumber} berhasil dibuat.`,
      result,
    };
  } catch (error) {
    console.error("createPreOrderAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal membuat pre-order.",
    };
  }
}

/**
 * Public Server Action: Create pre-order from customer-facing website.
 * No user session required.
 */
export async function createCustomerOrderAction(
  payload: CreatePreOrderPayload
): Promise<ActionState & { result?: CreatePreOrderResult }> {
  try {
    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: "Pilih minimal satu produk untuk pesanan." };
    }

    if (!payload.customerName?.trim()) {
      return { success: false, message: "Nama pelanggan wajib diisi." };
    }

    if (!payload.customerPhone?.trim()) {
      return { success: false, message: "Nomor WhatsApp wajib diisi untuk konfirmasi tiket." };
    }

    const result = await createPreOrder({
      ...payload,
      source: "ONLINE",
      createdBy: "ONLINE_CUSTOMER",
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");

    return {
      success: true,
      message: `Pre-Order #${result.order.orderNumber} berhasil dibuat!`,
      result,
    };
  } catch (error) {
    console.error("createCustomerOrderAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memproses pesanan.",
    };
  }
}

/**
 * Server Action: Verify customer payment proof for a pre-order.
 * Transitions order to READY_FOR_REDEMPTION, deducts inventory atomically, and generates QR redemption code.
 */
export async function verifyOrderPaymentAction(
  orderId: string,
  proofUrl?: string
): Promise<ActionState & { redemptionCode?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const { order, redemptionCode } = await verifyOrderPayment(
      orderId,
      user.id,
      proofUrl
    );

    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/pos");

    return {
      success: true,
      message: `Pembayaran pesanan #${order.orderNumber} berhasil diverifikasi! Tiket QR siap diambil.`,
      redemptionCode,
    };
  } catch (error) {
    console.error("verifyOrderPaymentAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memverifikasi pembayaran pesanan.",
    };
  }
}

/**
 * Server Action: Cancel an order and rollback inventory if stock was deducted.
 */
export async function cancelOrderAction(
  orderId: string,
  reason?: string
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    await cancelOrder(orderId, user.id, reason);

    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/pos");

    return {
      success: true,
      message: "Pesanan berhasil dibatalkan dan stok dikembalikan jika sebelumnya telah diproses.",
    };
  } catch (error) {
    console.error("cancelOrderAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal membatalkan pesanan.",
    };
  }
}

/**
 * Public Action: Search customer order by Order Number or Phone for ticket tracking.
 */
export async function lookupCustomerOrderAction(
  searchQuery: string
): Promise<ActionState & { orders?: Order[] }> {
  try {
    const q = searchQuery.trim();
    if (!q) {
      return { success: false, message: "Masukkan nomor pesanan atau no. WhatsApp." };
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    const { serializeFirestoreData } = await import("@/lib/utils/serialization");

    let querySnap = await adminDb
      .collection("orders")
      .where("orderNumber", "==", q.toUpperCase())
      .limit(1)
      .get();

    if (querySnap.empty) {
      querySnap = await adminDb
        .collection("orders")
        .where("customerPhone", "==", q)
        .limit(5)
        .get();
    }

    if (querySnap.empty) {
      return {
        success: false,
        message: "Pesanan dengan nomor atau kontak tersebut tidak ditemukan.",
      };
    }

    const foundOrders = querySnap.docs.map((doc) =>
      serializeFirestoreData<Order>({
        id: doc.id,
        ...doc.data(),
      })
    );

    return {
      success: true,
      orders: foundOrders,
    };
  } catch (err) {
    console.error("lookupCustomerOrderAction error:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat mencari pesanan.",
    };
  }
}

/**
 * Public Action: Attach or update payment proof on an existing order.
 * Used when a COD or Transfer customer submits/uploads a payment receipt on their ticket page.
 */
export async function uploadOrderProofAction(
  orderId: string,
  proofUrl: string
): Promise<ActionState> {
  try {
    if (!orderId || !proofUrl) {
      return { success: false, message: "ID pesanan dan bukti bayar wajib diisi." };
    }

    await updateOrderProof(orderId, proofUrl);

    revalidatePath("/admin/orders");
    revalidatePath("/admin/pos/redeem");

    return {
      success: true,
      message: "Bukti pembayaran berhasil diunggah!",
    };
  } catch (error) {
    console.error("uploadOrderProofAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengunggah bukti.",
    };
  }
}

/**
 * Admin Action: Update production status for custom merch / pre-orders.
 */
export async function updateProductionStatusAction(
  orderId: string,
  productionStatus: "NOT_STARTED" | "IN_PRODUCTION" | "READY"
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const { adminDb } = await import("@/lib/firebase/admin");
    const { FieldValue } = await import("firebase-admin/firestore");

    const updateData: Record<string, unknown> = {
      productionStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (productionStatus === "READY") {
      updateData.readyForPickupAt = FieldValue.serverTimestamp();
    }

    await adminDb.collection("orders").doc(orderId).update(updateData);

    revalidatePath("/admin/orders");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Status pengerjaan berhasil diperbarui menjadi ${
        productionStatus === "READY" ? "Siap Diambil" : "Sedang Dikerjakan"
      }.`,
    };
  } catch (error) {
    console.error("updateProductionStatusAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal memperbarui status produksi.",
    };
  }
}


