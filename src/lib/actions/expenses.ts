"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createExpense,
  deleteExpense,
  type CreateExpenseInput,
} from "@/lib/db/expenses";
import type { ActionState, ExpenseCategory, PaymentMethod } from "@/lib/types";

export interface CreateExpensePayload {
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
}

/**
 * Server Action: Create an operational expense entry.
 */
export async function createExpenseAction(
  payload: CreateExpensePayload
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (!payload.description || !payload.description.trim()) {
      return { success: false, message: "Deskripsi pengeluaran tidak boleh kosong." };
    }

    if (!payload.amount || payload.amount <= 0) {
      return { success: false, message: "Nominal pengeluaran harus lebih besar dari Rp 0." };
    }

    const input: CreateExpenseInput = {
      category: payload.category,
      description: payload.description.trim(),
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      proofUrl: payload.proofUrl?.trim() || undefined,
      createdBy: user.id,
    };

    await createExpense(input);

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");

    return { success: true, message: "Pengeluaran berhasil dicatat." };
  } catch (error) {
    console.error("createExpenseAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mencatat pengeluaran.",
    };
  }
}

/**
 * Server Action: Delete an expense entry (Admin only).
 */
export async function deleteExpenseAction(
  expenseId: string
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    if (user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat menghapus catatan pengeluaran." };
    }

    await deleteExpense(expenseId);

    revalidatePath("/admin/expenses");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/reports");

    return { success: true, message: "Catatan pengeluaran berhasil dihapus." };
  } catch (error) {
    console.error("deleteExpenseAction error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghapus pengeluaran.",
    };
  }
}
