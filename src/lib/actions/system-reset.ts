"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import type { ActionState } from "@/lib/types";

export interface ResetSystemOptions {
  resetOrders?: boolean;
  resetExpenses?: boolean;
  resetInventoryMovements?: boolean;
  resetCustomers?: boolean;
  resetProducts?: boolean;
  resetProductStockToZero?: boolean;
}

/**
 * Helper to delete all documents in a collection in batches of 400.
 */
async function deleteCollectionBatch(collectionName: string): Promise<number> {
  const collectionRef = adminDb.collection(collectionName);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(400).get();
    if (snapshot.empty) break;

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < 400) break;
  }

  return totalDeleted;
}

/**
 * Server Action: Admin Data Reset / System Purge for Go-Live & Production Readiness.
 * Protected: Only users with ADMIN role can execute this.
 * Users collection (credentials) is NEVER deleted to prevent lockout.
 */
export async function resetSystemDataAction(
  options: ResetSystemOptions,
  confirmationText: string
): Promise<ActionState<{ summary: Record<string, number> }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (user.role !== "ADMIN") {
      return { success: false, message: "Akses ditolak. Fitur ini hanya untuk ADMIN." };
    }

    if (confirmationText.trim().toUpperCase() !== "RESET-PROD-NOURY") {
      return {
        success: false,
        message: 'Teks konfirmasi salah. Harap ketik "RESET-PROD-NOURY" dengan tepat.',
      };
    }

    const summary: Record<string, number> = {};

    // 1. Reset Orders, Payments, and Redemptions
    if (options.resetOrders) {
      summary.orders = await deleteCollectionBatch("orders");
      summary.payments = await deleteCollectionBatch("payments");
      summary.redemptions = await deleteCollectionBatch("redemptions");
    }

    // 2. Reset Expenses
    if (options.resetExpenses) {
      summary.expenses = await deleteCollectionBatch("expenses");
    }

    // 3. Reset Inventory Movements
    if (options.resetInventoryMovements) {
      summary.inventoryMovements = await deleteCollectionBatch("inventoryMovements");
    }

    // 4. Reset Customers (stamps, accounts, coupons)
    if (options.resetCustomers) {
      summary.customers = await deleteCollectionBatch("customers");
    }

    // 5. Reset Products or Reset Product Stock
    if (options.resetProducts) {
      summary.products = await deleteCollectionBatch("products");
    } else if (options.resetProductStockToZero) {
      // Keep products, but reset their stock to 0
      const prodSnap = await adminDb.collection("products").get();
      if (!prodSnap.empty) {
        const batch = adminDb.batch();
        prodSnap.docs.forEach((doc) => {
          batch.update(doc.ref, { stock: 0 });
        });
        await batch.commit();
        summary.productsResetStock = prodSnap.size;
      }
    }

    // Revalidate all caches across the app
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/pos/redeem");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/expenses");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/reports");
    revalidatePath("/products");
    revalidatePath("/order");
    revalidatePath("/");

    return {
      success: true,
      message: "Data sistem berhasil dibersihkan! Aplikasi siap digunakan untuk penjualan riil di stand Noury.",
      data: { summary },
    };
  } catch (error) {
    console.error("resetSystemDataAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat mereset data.",
    };
  }
}
