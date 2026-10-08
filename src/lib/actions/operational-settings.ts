"use server";

import { revalidatePath } from "next/cache";
import {
  getPaymentSettings,
  updatePaymentSettings,
  getBatchSettings,
  updateBatchSettings,
  type PaymentSettings,
  type BatchSettings,
} from "@/lib/db/operational-settings";
import type { ActionState } from "@/lib/types";

export async function getPaymentSettingsAction(): Promise<ActionState<PaymentSettings>> {
  try {
    const settings = await getPaymentSettings();
    return { success: true, data: settings };
  } catch (err) {
    console.error("getPaymentSettingsAction error:", err);
    return { success: false, message: "Gagal memuat pengaturan pembayaran." };
  }
}

export async function updatePaymentSettingsAction(
  input: Partial<PaymentSettings>
): Promise<ActionState<PaymentSettings>> {
  try {
    const settings = await updatePaymentSettings(input);
    revalidatePath("/admin/settings");
    revalidatePath("/order");
    revalidatePath("/");
    return {
      success: true,
      message: "Pengaturan pembayaran QRIS & Bank berhasil disimpan.",
      data: settings,
    };
  } catch (err) {
    console.error("updatePaymentSettingsAction error:", err);
    return { success: false, message: "Gagal menyimpan pengaturan pembayaran." };
  }
}

export async function getBatchSettingsAction(): Promise<ActionState<BatchSettings>> {
  try {
    const settings = await getBatchSettings();
    return { success: true, data: settings };
  } catch (err) {
    console.error("getBatchSettingsAction error:", err);
    return { success: false, message: "Gagal memuat pengaturan batch pre-order." };
  }
}

export async function updateBatchSettingsAction(
  input: Partial<BatchSettings>
): Promise<ActionState<BatchSettings>> {
  try {
    const settings = await updateBatchSettings(input);
    revalidatePath("/admin/settings");
    revalidatePath("/order");
    revalidatePath("/");
    return {
      success: true,
      message: "Pengaturan jadwal batch pre-order berhasil disimpan.",
      data: settings,
    };
  } catch (err) {
    console.error("updateBatchSettingsAction error:", err);
    return { success: false, message: "Gagal menyimpan pengaturan batch pre-order." };
  }
}
