export interface PaymentSettings {
  qrisImageUrl?: string;
  qrisMerchantName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  paymentInstructions?: string;
}

export interface BatchSettings {
  isBatchEnabled: boolean;
  activeBatchName: string;
  batchPickupSchedule: string;
  batchPickupLocation: string;
  batchNotes?: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  qrisImageUrl: "",
  qrisMerchantName: "NOURY FRESH & HEALTHY",
  bankName: "BCA",
  bankAccountNumber: "1234567890",
  bankAccountHolder: "NOURY — FRESH & HEALTHY BAR",
  paymentInstructions: "Sertakan bukti transfer / screenshot setelah melakukan pembayaran.",
};

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  isBatchEnabled: true,
  activeBatchName: "Batch 1 (Minggu Ini)",
  batchPickupSchedule: "Jumat, 10 Oktober 2026 • 11.30 - 15.00 WIB",
  batchPickupLocation: "Stand Noury KWH - Area Bazar Kampus",
  batchNotes: "Menu disiapkan fresh pada hari pengambilan batch.",
};
