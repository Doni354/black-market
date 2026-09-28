import crypto from "crypto";

/**
 * Generate a secure, non-sequential redemption token for Pre-Order QR tickets.
 * Format: 20-character url-safe string (e.g. "RDM-7F8A-9C1D-3E5B")
 */
export function generateRedemptionCode(): string {
  const bytes = crypto.randomBytes(8).toString("hex").toUpperCase();
  // e.g. RDM-A1B2-C3D4-E5F6
  return `RDM-${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}-${bytes.slice(12, 16)}`;
}
