/**
 * Order number generator for Black Market
 *
 * Generates readable, unique order numbers like:
 * BM-260928-AB12
 * Or BM-XXXXXX
 */

export function generateOrderNumber(prefix = "BM"): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  // 4 character uppercase alphanumeric random suffix
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${datePart}-${randomPart}`;
}
