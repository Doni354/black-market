/**
 * Black Market — TypeScript Type Definitions
 *
 * Source of truth: BLACK_MARKET_APP_SPEC.md
 * All monetary values are integers (Rupiah), never floats.
 */

// Flexible Timestamp type — works with both firebase client SDK and firebase-admin
// In practice, Firestore returns an object with toDate() method
export type FirestoreTimestamp = {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
};

// ============================================================
// USER
// ============================================================

export type UserRole = "ADMIN" | "CASHIER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============================================================
// PRODUCT
// ============================================================

export type ProductType = "FOOD" | "DRINK" | "MERCH" | "BUNDLE" | "OTHER";

export interface BundleItem {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: ProductType;
  category?: string;
  /** Integer Rupiah — e.g. 15000 for Rp 15.000 */
  price: number;
  /** Integer Rupiah — used for margin/HPP calculation */
  costPrice?: number;
  stock: number;
  trackInventory: boolean;
  isPreOrderAvailable: boolean;
  isActive: boolean;
  imageUrl?: string;
  /** Only for BUNDLE type */
  bundleItems?: BundleItem[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============================================================
// ORDER
// ============================================================

export type OrderSource = "POS" | "ONLINE";
export type OrderType = "DIRECT" | "PRE_ORDER";
export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "WAITING_VERIFICATION"
  | "PAID"
  | "READY_FOR_REDEMPTION"
  | "REDEEMED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CASH" | "QRIS" | "BANK_TRANSFER" | "OTHER";

export interface Order {
  id: string;
  /** Format: BM-000001 */
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  source: OrderSource;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  /** Integer Rupiah */
  subtotal: number;
  /** Integer Rupiah */
  discount: number;
  /** Integer Rupiah */
  total: number;
  /** Integer Rupiah — for CASH payments */
  amountPaid?: number;
  /** Integer Rupiah — change = amountPaid - total */
  change?: number;
  pickupMethod?: "MARKET_DAY";
  /** Secure token for QR — not sequential */
  redemptionCode?: string;
  redemptionQrUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============================================================
// ORDER ITEM (subcollection: orders/{orderId}/items/{itemId})
// ============================================================

export interface OrderItem {
  id: string;
  productId: string;
  /** Snapshot of product name at time of purchase */
  productName: string;
  quantity: number;
  /** Snapshot of price at time of purchase — Integer Rupiah */
  unitPrice: number;
  /** Integer Rupiah */
  subtotal: number;
  /** Integer Rupiah */
  costPrice?: number;
  type: ProductType;
}

// ============================================================
// PAYMENT
// ============================================================

export type PaymentRecordStatus = "PENDING" | "PAID" | "REJECTED";

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  /** Integer Rupiah */
  amount: number;
  status: PaymentRecordStatus;
  /** Cloudinary URL — private asset */
  proofUrl?: string;
  verifiedBy?: string;
  verifiedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// ============================================================
// INVENTORY MOVEMENT
// ============================================================

export type InventoryMovementType =
  | "INITIAL"
  | "PURCHASE"
  | "SALE"
  | "PRE_ORDER"
  | "ADJUSTMENT"
  | "CANCELLED_ORDER"
  | "RETURN";

export type InventoryReferenceType = "ORDER" | "EXPENSE" | "MANUAL";

export interface InventoryMovement {
  id: string;
  productId: string;
  /** Snapshot of product name */
  productName: string;
  type: InventoryMovementType;
  /**
   * Delta quantity:
   * - Positive = stock in (e.g. INITIAL +50, PURCHASE +10)
   * - Negative = stock out (e.g. SALE -3, PRE_ORDER -5)
   */
  quantity: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  note?: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
}

// ============================================================
// EXPENSE
// ============================================================

export type ExpenseCategory =
  | "FOOD_MATERIAL"
  | "MERCH_PRODUCTION"
  | "PACKAGING"
  | "OPERATIONAL"
  | "PROMOTION"
  | "OTHER";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  /** Integer Rupiah */
  amount: number;
  paymentMethod: PaymentMethod;
  /** Cloudinary URL — private asset */
  proofUrl?: string;
  createdBy: string;
  createdAt: FirestoreTimestamp;
}

// ============================================================
// CUSTOMER
// ============================================================

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalOrders: number;
  /** Integer Rupiah */
  totalSpent: number;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ============================================================
// REDEMPTION
// ============================================================

export type RedemptionStatus = "READY" | "REDEEMED" | "CANCELLED";

export interface Redemption {
  id: string;
  orderId: string;
  /** Secure token — not sequential */
  redemptionCode: string;
  status: RedemptionStatus;
  redeemedBy?: string;
  redeemedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// ============================================================
// UI / FORM HELPERS
// ============================================================

/** Generic action state for Server Actions with useActionState */
export interface ActionState<T = null> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}
