import { adminDb } from "@/lib/firebase/admin";
import {
  type PaymentSettings,
  type BatchSettings,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
} from "@/lib/types/operational-settings";

export type { PaymentSettings, BatchSettings };
export { DEFAULT_PAYMENT_SETTINGS, DEFAULT_BATCH_SETTINGS };

/**
 * Fetch Payment Settings (QRIS & Bank Transfer).
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const snap = await adminDb.collection("settings").doc("payment").get();
    if (!snap.exists) {
      return DEFAULT_PAYMENT_SETTINGS;
    }
    const data = snap.data();
    return {
      qrisImageUrl: data?.qrisImageUrl ?? DEFAULT_PAYMENT_SETTINGS.qrisImageUrl,
      qrisMerchantName: data?.qrisMerchantName ?? DEFAULT_PAYMENT_SETTINGS.qrisMerchantName,
      bankName: data?.bankName ?? DEFAULT_PAYMENT_SETTINGS.bankName,
      bankAccountNumber: data?.bankAccountNumber ?? DEFAULT_PAYMENT_SETTINGS.bankAccountNumber,
      bankAccountHolder: data?.bankAccountHolder ?? DEFAULT_PAYMENT_SETTINGS.bankAccountHolder,
      paymentInstructions: data?.paymentInstructions ?? DEFAULT_PAYMENT_SETTINGS.paymentInstructions,
    };
  } catch (err) {
    console.error("Error fetching payment settings:", err);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

/**
 * Update Payment Settings.
 */
export async function updatePaymentSettings(
  input: Partial<PaymentSettings>
): Promise<PaymentSettings> {
  const docRef = adminDb.collection("settings").doc("payment");
  const current = await getPaymentSettings();
  const updated: PaymentSettings = {
    ...current,
    ...input,
  };
  await docRef.set(updated, { merge: true });
  return updated;
}

/**
 * Fetch Pre-Order Batch Pickup Settings.
 */
export async function getBatchSettings(): Promise<BatchSettings> {
  try {
    const snap = await adminDb.collection("settings").doc("batch").get();
    if (!snap.exists) {
      return DEFAULT_BATCH_SETTINGS;
    }
    const data = snap.data();
    return {
      isBatchEnabled: data?.isBatchEnabled ?? DEFAULT_BATCH_SETTINGS.isBatchEnabled,
      activeBatchName: data?.activeBatchName ?? DEFAULT_BATCH_SETTINGS.activeBatchName,
      batchPickupSchedule: data?.batchPickupSchedule ?? DEFAULT_BATCH_SETTINGS.batchPickupSchedule,
      batchPickupLocation: data?.batchPickupLocation ?? DEFAULT_BATCH_SETTINGS.batchPickupLocation,
      batchNotes: data?.batchNotes ?? DEFAULT_BATCH_SETTINGS.batchNotes,
    };
  } catch (err) {
    console.error("Error fetching batch settings:", err);
    return DEFAULT_BATCH_SETTINGS;
  }
}

/**
 * Update Pre-Order Batch Pickup Settings.
 */
export async function updateBatchSettings(
  input: Partial<BatchSettings>
): Promise<BatchSettings> {
  const docRef = adminDb.collection("settings").doc("batch");
  const current = await getBatchSettings();
  const updated: BatchSettings = {
    ...current,
    ...input,
  };
  await docRef.set(updated, { merge: true });
  return updated;
}
