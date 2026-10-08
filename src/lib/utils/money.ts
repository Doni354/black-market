/**
 * Money utilities — Integer Rupiah
 *
 * All prices in Noury are stored as integer Rupiah.
 * Never use floating point for monetary calculations.
 *
 * Example: Rp 15.000 is stored as 15000 (number), not 15000.00
 */

/**
 * Format an integer Rupiah amount for display.
 * @example formatRupiah(15000) → "Rp 15.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate subtotal for a line item.
 * Both price and quantity must be integers.
 */
export function calculateSubtotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

/**
 * Calculate cart total from an array of line items.
 */
export function calculateTotal(
  items: Array<{ unitPrice: number; quantity: number }>,
  discount = 0
): number {
  const subtotal = items.reduce(
    (sum, item) => sum + calculateSubtotal(item.unitPrice, item.quantity),
    0
  );
  return Math.max(0, subtotal - discount);
}

/**
 * Calculate cash change.
 * Returns 0 if amountPaid is less than total (shouldn't happen in UI).
 */
export function calculateChange(amountPaid: number, total: number): number {
  return Math.max(0, amountPaid - total);
}

/**
 * Parse a raw string input to an integer Rupiah amount.
 * Strips non-numeric characters.
 * @example parseRupiah("15.000") → 15000
 */
export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}
