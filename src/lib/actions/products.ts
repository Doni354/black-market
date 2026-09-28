"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
} from "@/lib/db/products";
import type { CreateProductInput, UpdateProductInput, ActionState } from "@/lib/types";

/**
 * Server Action: Create a new product.
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<ActionState & { productId?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat membuat produk." };
    }

    if (!input.name || !input.name.trim()) {
      return { success: false, message: "Nama produk wajib diisi." };
    }

    if (input.price === undefined || Number(input.price) < 0) {
      return { success: false, message: "Harga produk harus angka positif." };
    }

    const product = await createProduct(input);

    revalidatePath("/admin/products");
    revalidatePath("/admin/pos");

    return { success: true, productId: product.id };
  } catch (error) {
    console.error("createProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menambahkan produk.",
    };
  }
}

/**
 * Server Action: Update an existing product.
 */
export async function updateProductAction(
  id: string,
  input: UpdateProductInput
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat mengubah produk." };
    }

    if (!id) {
      return { success: false, message: "ID produk tidak valid." };
    }

    if (input.name !== undefined && !input.name.trim()) {
      return { success: false, message: "Nama produk tidak boleh kosong." };
    }

    if (input.price !== undefined && Number(input.price) < 0) {
      return { success: false, message: "Harga produk harus angka positif." };
    }

    await updateProduct(id, input);

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/admin/pos");

    return { success: true };
  } catch (error) {
    console.error("updateProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal memperbarui produk.",
    };
  }
}

/**
 * Server Action: Toggle active/inactive status.
 */
export async function toggleProductActiveAction(
  id: string,
  currentStatus: boolean
): Promise<ActionState & { newStatus?: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat mengubah status produk." };
    }

    const newStatus = await toggleProductActive(id, currentStatus);

    revalidatePath("/admin/products");
    revalidatePath("/admin/pos");

    return { success: true, newStatus };
  } catch (error) {
    console.error("toggleProductActiveAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengubah status produk.",
    };
  }
}

/**
 * Server Action: Delete a product permanently.
 */
export async function deleteProductAction(id: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat menghapus produk." };
    }

    await deleteProduct(id);

    revalidatePath("/admin/products");
    revalidatePath("/admin/pos");

    return { success: true };
  } catch (error) {
    console.error("deleteProductAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghapus produk.",
    };
  }
}
