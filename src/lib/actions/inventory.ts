"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { adjustStock } from "@/lib/db/inventory";
import type { InventoryMovementType, ActionState } from "@/lib/types";

export interface AdjustStockPayload {
  productId: string;
  delta: number;
  type: InventoryMovementType;
  note?: string;
}

/**
 * Server Action: Adjust product stock and record inventory movement.
 */
export async function adjustStockAction(
  payload: AdjustStockPayload
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat mengubah stok inventaris." };
    }

    if (!payload.productId) {
      return { success: false, message: "ID produk tidak valid." };
    }

    if (payload.delta === 0) {
      return { success: false, message: "Jumlah perubahan stok tidak boleh 0." };
    }

    await adjustStock({
      productId: payload.productId,
      delta: payload.delta,
      type: payload.type,
      note: payload.note,
      createdBy: user.name || user.email,
    });

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${payload.productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/pos");
    revalidatePath("/admin/dashboard");

    return { success: true };
  } catch (error) {
    console.error("adjustStockAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal memperbarui stok.",
    };
  }
}
