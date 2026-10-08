"use server";

import {
  syncCustomerProfile,
  updateCustomerPhone,
  claimStampReward,
  getCustomerOrders,
  type SyncCustomerInput,
} from "@/lib/db/customer-portal";
import type { ActionState, CustomerAccount, Order } from "@/lib/types";

/**
 * Server Action: Sync Google-authenticated customer profile.
 */
export async function syncCustomerAction(
  input: SyncCustomerInput
): Promise<ActionState<CustomerAccount>> {
  try {
    if (!input.uid) {
      return { success: false, message: "User ID tidak valid." };
    }

    const account = await syncCustomerProfile(input);
    return {
      success: true,
      data: account,
    };
  } catch (err) {
    console.error("syncCustomerAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menyelaraskan akun.",
    };
  }
}

/**
 * Server Action: Update WhatsApp phone number for customer.
 */
export async function updateCustomerPhoneAction(
  uid: string,
  phone: string
): Promise<ActionState<CustomerAccount>> {
  try {
    if (!uid) {
      return { success: false, message: "User ID tidak valid." };
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      return { success: false, message: "Nomor WhatsApp tidak boleh kosong." };
    }

    const account = await updateCustomerPhone(uid, cleanPhone);
    return {
      success: true,
      message: "Nomor WhatsApp berhasil diperbarui.",
      data: account,
    };
  } catch (err) {
    console.error("updateCustomerPhoneAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menyimpan nomor WhatsApp.",
    };
  }
}

/**
 * Server Action: Claim 5-stamp loyalty reward voucher.
 */
export async function claimStampRewardAction(
  uid: string
): Promise<ActionState<CustomerAccount>> {
  try {
    if (!uid) {
      return { success: false, message: "User ID tidak valid." };
    }

    const account = await claimStampReward(uid);
    return {
      success: true,
      message: "Selamat! Voucher Reward 5 Stempel berhasil ditambahkan ke akunmu.",
      data: account,
    };
  } catch (err) {
    console.error("claimStampRewardAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal mengklaim reward.",
    };
  }
}

/**
 * Server Action: Fetch all customer orders for active tickets & history.
 */
export async function getCustomerOrdersAction(
  uid: string,
  phone?: string
): Promise<ActionState<Order[]>> {
  try {
    if (!uid) {
      return { success: false, message: "User ID tidak valid." };
    }

    const orders = await getCustomerOrders(uid, phone);
    return {
      success: true,
      data: orders,
    };
  } catch (err) {
    console.error("getCustomerOrdersAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memuat pesanan.",
      data: [],
    };
  }
}

/**
 * Server Action: Get Loyalty Settings (for customer portal and admin).
 */
export async function getLoyaltySettingsAction() {
  try {
    const { getLoyaltySettings } = await import("@/lib/db/customer-portal");
    const settings = await getLoyaltySettings();
    return { success: true, data: settings };
  } catch (err) {
    console.error("getLoyaltySettingsAction error:", err);
    return {
      success: false,
      message: "Gagal memuat pengaturan stempel.",
    };
  }
}

/**
 * Server Action: Update Loyalty Settings (Admin only).
 */
export async function updateLoyaltySettingsAction(input: {
  isLoyaltyEnabled?: boolean;
  stampsRequired?: number;
  minSpendPerStamp?: number;
  stampRewardDiscount?: number;
  stampRewardMinOrder?: number;
}) {
  try {
    const { updateLoyaltySettings } = await import("@/lib/db/customer-portal");
    const settings = await updateLoyaltySettings(input);
    return {
      success: true,
      message: "Pengaturan stempel & loyalitas berhasil disimpan.",
      data: settings,
    };
  } catch (err) {
    console.error("updateLoyaltySettingsAction error:", err);
    return {
      success: false,
      message: "Gagal menyimpan pengaturan stempel.",
    };
  }
}

/**
 * Server Action: Admin adjusts customer's stamps manually.
 */
export async function adminAdjustCustomerStampsAction(
  customerId: string,
  delta: number
): Promise<ActionState<CustomerAccount>> {
  try {
    const { adjustCustomerStamps } = await import("@/lib/db/customer-portal");
    const updated = await adjustCustomerStamps(customerId, delta);
    return {
      success: true,
      message: `Stempel pelanggan berhasil disesuaikan (${delta > 0 ? `+${delta}` : delta}).`,
      data: updated,
    };
  } catch (err) {
    console.error("adminAdjustCustomerStampsAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menyesuaikan stempel pelanggan.",
    };
  }
}

/**
 * Server Action: Admin issues a discount coupon directly to a customer.
 */
export async function adminIssueCustomerCouponAction(
  customerId: string,
  coupon: {
    title: string;
    description: string;
    discountAmount: number;
    minOrder: number;
    code?: string;
  }
): Promise<ActionState<CustomerAccount>> {
  try {
    const { adminIssueCouponToCustomer } = await import("@/lib/db/customer-portal");
    const code = coupon.code?.trim().toUpperCase() || `NOURY${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = await adminIssueCouponToCustomer(customerId, {
      code,
      title: coupon.title.trim(),
      description: coupon.description.trim(),
      discountAmount: Math.max(0, coupon.discountAmount),
      minOrder: Math.max(0, coupon.minOrder),
    });
    return {
      success: true,
      message: `Voucher diskon ${code} berhasil diberikan kepada pelanggan!`,
      data: updated,
    };
  } catch (err) {
    console.error("adminIssueCustomerCouponAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memberikan voucher.",
    };
  }
}
