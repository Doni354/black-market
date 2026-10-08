import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { generateOrderNumber } from "@/lib/utils/orderNumber";
import { generateRedemptionCode } from "@/lib/utils/redemptionCode";
import { findOrCreateCustomer } from "@/lib/db/customers";
import {
  markCustomerCouponUsed,
  addCustomerStamp,
  addCustomerStampByPhone,
} from "@/lib/db/customer-portal";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type {
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
} from "@/lib/types";

export interface DirectSaleInput {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  discount?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  proofUrl?: string;
  cashierId: string;
}

export interface DirectSaleResult {
  order: Order;
  items: OrderItem[];
  payment: Payment;
}

/**
 * Complete a direct POS sale atomically.
 *
 * Runs inside a Firestore transaction:
 * 1. Validates all products and components
 * 2. Checks inventory availability
 * 3. Decrements inventory in products collection
 * 4. Creates InventoryMovement records
 * 5. Creates Order document with line item snapshots
 * 6. Creates Payment document
 */
export async function createDirectSale(
  input: DirectSaleInput
): Promise<DirectSaleResult> {
  const {
    items: cartItems,
    paymentMethod,
    amountPaid = 0,
    discount = 0,
    customerName,
    customerPhone,
    notes,
    cashierId,
  } = input;

  if (!cartItems || cartItems.length === 0) {
    throw new Error("Keranjang belanja kosong.");
  }

  // Execute in a single atomic Firestore transaction
  const result = await adminDb.runTransaction(async (transaction) => {
    // Collect all unique product IDs needed (both direct and bundle components)
    const directProductIds = cartItems.map((item) => item.productId);
    const directProductRefs = directProductIds.map((id) =>
      adminDb.collection("products").doc(id)
    );

    // Read all direct products
    const directProductDocs = await Promise.all(
      directProductRefs.map((ref) => transaction.get(ref))
    );

    // Map products by ID
    const productMap = new Map<string, Product>();
    for (const doc of directProductDocs) {
      if (!doc.exists) {
        throw new Error(`Produk dengan ID ${doc.id} tidak ditemukan.`);
      }
      const p = { id: doc.id, ...doc.data() } as Product;
      if (!p.isActive) {
        throw new Error(`Produk "${p.name}" sedang tidak aktif.`);
      }
      productMap.set(doc.id, p);
    }

    // Check if any products are bundles and need component products read
    const componentProductIds = new Set<string>();
    for (const item of cartItems) {
      const prod = productMap.get(item.productId)!;
      if (prod.type === "BUNDLE" && prod.bundleItems) {
        for (const bItem of prod.bundleItems) {
          if (!productMap.has(bItem.productId)) {
            componentProductIds.add(bItem.productId);
          }
        }
      }
    }

    // Read any component products not yet loaded
    if (componentProductIds.size > 0) {
      const compRefs = Array.from(componentProductIds).map((id) =>
        adminDb.collection("products").doc(id)
      );
      const compDocs = await Promise.all(compRefs.map((ref) => transaction.get(ref)));
      for (const doc of compDocs) {
        if (!doc.exists) {
          throw new Error(`Komponen produk paket ${doc.id} tidak ditemukan.`);
        }
        productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
      }
    }

    // Track total stock required per product ID
    const stockDeductionMap = new Map<string, number>();

    // Calculate server-side total and build order items snapshot
    let subtotal = 0;
    const orderItemsSnapshot: OrderItem[] = [];

    for (const cartItem of cartItems) {
      const prod = productMap.get(cartItem.productId)!;
      const qty = Math.max(1, Math.round(cartItem.quantity));
      const itemSubtotal = prod.price * qty;
      subtotal += itemSubtotal;

      const itemSnapshot: Record<string, unknown> = {
        id: adminDb.collection("orders").doc().id, // unique item ID
        productId: prod.id,
        productName: prod.name,
        quantity: qty,
        unitPrice: prod.price,
        subtotal: itemSubtotal,
        type: prod.type,
      };
      if (prod.costPrice !== undefined) {
        itemSnapshot.costPrice = prod.costPrice;
      }
      orderItemsSnapshot.push(itemSnapshot as unknown as OrderItem);

      // Handle stock deduction logic
      if (prod.type === "BUNDLE" && prod.bundleItems && prod.bundleItems.length > 0) {
        // Deduct component stocks
        for (const bItem of prod.bundleItems) {
          const compProd = productMap.get(bItem.productId);
          if (compProd && compProd.trackInventory) {
            const needed = bItem.quantity * qty;
            const currentNeeded = stockDeductionMap.get(compProd.id) || 0;
            stockDeductionMap.set(compProd.id, currentNeeded + needed);
          }
        }
      } else if (prod.trackInventory) {
        // Direct product deduction
        const currentNeeded = stockDeductionMap.get(prod.id) || 0;
        stockDeductionMap.set(prod.id, currentNeeded + qty);
      }
    }

    // Validate inventory availability
    for (const [productId, requiredQty] of stockDeductionMap.entries()) {
      const prod = productMap.get(productId)!;
      if (prod.stock < requiredQty) {
        throw new Error(
          `Stok tidak mencukupi untuk "${prod.name}". Tersedia: ${prod.stock}, Dibutuhkan: ${requiredQty}.`
        );
      }
    }

    // Calculate final total
    const cleanDiscount = Math.max(0, Math.round(discount));
    const total = Math.max(0, subtotal - cleanDiscount);

    // Validate cash payment amount
    if (paymentMethod === "CASH" && amountPaid < total) {
      throw new Error(
        `Jumlah uang yang diterima (Rp ${amountPaid}) kurang dari total tagihan (Rp ${total}).`
      );
    }

    const change = paymentMethod === "CASH" ? Math.max(0, amountPaid - total) : 0;
    const orderNumber = generateOrderNumber();

    // 1. Deduct stocks & record InventoryMovement in transaction
    for (const [productId, deduction] of stockDeductionMap.entries()) {
      const prodRef = adminDb.collection("products").doc(productId);
      const prod = productMap.get(productId)!;

      // Update product stock
      transaction.update(prodRef, {
        stock: FieldValue.increment(-deduction),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create Inventory Movement doc
      const movementRef = adminDb.collection("inventoryMovements").doc();
      transaction.set(movementRef, {
        productId,
        productName: prod.name,
        type: "SALE",
        quantity: -deduction,
        referenceType: "ORDER",
        referenceId: orderNumber,
        note: `POS Direct Sale #${orderNumber}`,
        createdBy: cashierId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 2. Create Order document (omitting undefined values)
    const orderRef = adminDb.collection("orders").doc();
    const orderData: Record<string, unknown> = {
      orderNumber,
      source: "POS",
      orderType: "DIRECT",
      status: "COMPLETED",
      paymentStatus: "PAID",
      paymentMethod,
      subtotal,
      discount: cleanDiscount,
      total,
      amountPaid: paymentMethod === "CASH" ? amountPaid : total,
      change,
      items: orderItemsSnapshot,
      createdBy: cashierId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (customerName?.trim()) {
      orderData.customerName = customerName.trim();
    }
    if (customerPhone?.trim()) {
      orderData.customerPhone = customerPhone.trim();
    }
    if (notes?.trim()) {
      orderData.notes = notes.trim();
    }
    if (input.proofUrl?.trim()) {
      orderData.proofUrl = input.proofUrl.trim();
    }

    transaction.set(orderRef, orderData);

    // 3. Create Payment document
    const paymentRef = adminDb.collection("payments").doc();
    const paymentData: Record<string, unknown> = {
      orderId: orderRef.id,
      method: paymentMethod,
      amount: total,
      status: "PAID",
      verifiedBy: cashierId,
      verifiedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };
    if (input.proofUrl?.trim()) {
      paymentData.proofUrl = input.proofUrl.trim();
    }
    transaction.set(paymentRef, paymentData);

    // Return plain serialized objects
    return {
      order: serializeFirestoreData<Order>({
        id: orderRef.id,
        ...orderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      items: orderItemsSnapshot,
      payment: serializeFirestoreData<Payment>({
        id: paymentRef.id,
        ...paymentData,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }),
    };
  });

  if (customerPhone?.trim()) {
    try {
      await addCustomerStampByPhone(customerPhone.trim(), result.order.total);
    } catch (e) {
      console.warn("Could not award loyalty stamp for POS sale:", e);
    }
  }

  return result;
}

/**
 * Fetch orders with optional filters.
 */
export async function getOrders(filters?: {
  status?: string;
  source?: string;
  search?: string;
  limit?: number;
}): Promise<Order[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("orders");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }

    if (filters?.source) {
      query = query.where("source", "==", filters.source);
    }

    try {
      query = query.orderBy("createdAt", "desc");
    } catch {
      // Fallback if composite index not yet generated
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    let orders = snapshot.docs.map((doc) => {
      return serializeFirestoreData<Order>({
        id: doc.id,
        ...doc.data(),
      });
    });

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.toLowerCase().trim();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName?.toLowerCase().includes(term) ||
          o.customerPhone?.includes(term)
      );
    }

    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

/**
 * Fetch a single order by ID.
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const doc = await adminDb.collection("orders").doc(orderId).get();
    if (!doc.exists) return null;

    return serializeFirestoreData<Order>({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    return null;
  }
}

/**
 * Fetch a single order by human-readable Order Number (e.g. NOURY-000001).
 */
export async function getOrderByOrderNumber(
  orderNumber: string
): Promise<Order | null> {
  try {
    const cleanNumber = orderNumber.trim().toUpperCase();
    if (!cleanNumber) return null;

    const snap = await adminDb
      .collection("orders")
      .where("orderNumber", "==", cleanNumber)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return serializeFirestoreData<Order>({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error(`Error fetching order by number ${orderNumber}:`, error);
    return null;
  }
}

/**
 * Update or attach a payment proof URL to an order and its payment record.
 */
export async function updateOrderProof(
  orderId: string,
  proofUrl: string
): Promise<void> {
  const orderRef = adminDb.collection("orders").doc(orderId);
  await orderRef.update({
    proofUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Also update corresponding payment document if exists
  const paymentsSnap = await adminDb
    .collection("payments")
    .where("orderId", "==", orderId)
    .limit(1)
    .get();

  if (!paymentsSnap.empty) {
    await paymentsSnap.docs[0].ref.update({
      proofUrl,
    });
  }
}

export interface CreatePreOrderInput {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  pickupMethod?: "MARKET_DAY" | "BATCH_PICKUP" | "FLEXIBLE";
  batchInfo?: string;
  source: OrderSource;
  proofUrl?: string;
  createdBy: string;
  couponCode?: string;
  discount?: number;
  customerId?: string;
}

export interface CreatePreOrderResult {
  order: Order;
  items: OrderItem[];
  payment: Payment;
}

/**
 * Create a new Pre-Order.
 * NOTE: For Transfer/QRIS, stock is deducted upon payment verification.
 * For COD, customer immediately receives an active Bill Pass / Ticket, and stock/payment is finalized upon redemption at the stand.
 */
export async function createPreOrder(
  input: CreatePreOrderInput
): Promise<CreatePreOrderResult> {
  if (!input.items || input.items.length === 0) {
    throw new Error("Daftar pesanan tidak boleh kosong.");
  }

  const cleanCustomerName = input.customerName.trim();
  if (!cleanCustomerName) {
    throw new Error("Nama pemesan tidak boleh kosong.");
  }

  // 1. Fetch products
  const productIds = input.items.map((i) => i.productId);
  const productDocs = await Promise.all(
    productIds.map((id) => adminDb.collection("products").doc(id).get())
  );

  const productMap = new Map<string, Product>();
  for (const doc of productDocs) {
    if (doc.exists) {
      productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
    }
  }

  let subtotal = 0;
  const orderItemsSnapshot: OrderItem[] = [];

  for (const item of input.items) {
    const prod = productMap.get(item.productId);
    if (!prod) {
      throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
    }
    if (!prod.isActive) {
      throw new Error(`Produk "${prod.name}" saat ini sedang tidak aktif.`);
    }

    const qty = Math.max(1, Math.round(item.quantity));
    const itemSubtotal = prod.price * qty;
    subtotal += itemSubtotal;

    orderItemsSnapshot.push({
      id: adminDb.collection("orders").doc().id,
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      unitPrice: prod.price,
      subtotal: itemSubtotal,
      type: prod.type,
      costPrice: prod.costPrice,
    });
  }

  const discount = Math.max(0, input.discount || 0);
  const total = Math.max(0, subtotal - discount);
  const orderNumber = generateOrderNumber();
  const isCod = input.paymentMethod === "COD";
  const redemptionCode = isCod ? generateRedemptionCode() : undefined;
  const status: OrderStatus = isCod
    ? "READY_FOR_REDEMPTION"
    : input.proofUrl
    ? "WAITING_VERIFICATION"
    : "PENDING_PAYMENT";
  const paymentStatus: PaymentStatus = "PENDING";

  // 2. Create Order document
  const orderRef = adminDb.collection("orders").doc();
  const orderData: Record<string, unknown> = {
    orderNumber,
    customerName: cleanCustomerName,
    source: input.source,
    orderType: "PRE_ORDER",
    status,
    paymentStatus,
    paymentMethod: input.paymentMethod,
    subtotal,
    discount,
    total,
    pickupMethod: input.pickupMethod || "MARKET_DAY",
    batchInfo: input.batchInfo?.trim() || undefined,
    productionStatus: "IN_PRODUCTION",
    items: orderItemsSnapshot,
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.couponCode?.trim()) {
    orderData.couponCode = input.couponCode.trim();
  }
  if (input.customerId?.trim()) {
    orderData.customerId = input.customerId.trim();
  }
  if (redemptionCode) {
    orderData.redemptionCode = redemptionCode;
  }
  if (input.customerPhone?.trim()) {
    orderData.customerPhone = input.customerPhone.trim();
  }
  if (input.customerEmail?.trim()) {
    orderData.customerEmail = input.customerEmail.trim();
  }
  if (input.notes?.trim()) {
    orderData.notes = input.notes.trim();
  }
  if (input.proofUrl?.trim()) {
    orderData.proofUrl = input.proofUrl.trim();
  }

  await orderRef.set(orderData);

  // For COD, create active redemption pass immediately
  if (isCod && redemptionCode) {
    const redemptionRef = adminDb.collection("redemptions").doc();
    await redemptionRef.set({
      orderId: orderRef.id,
      redemptionCode,
      status: "READY",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // 3. Create Payment document
  const paymentRef = adminDb.collection("payments").doc();
  const paymentData: Record<string, unknown> = {
    orderId: orderRef.id,
    method: input.paymentMethod,
    amount: total,
    status: "PENDING",
    createdAt: FieldValue.serverTimestamp(),
  };

  if (input.proofUrl?.trim()) {
    paymentData.proofUrl = input.proofUrl.trim();
  }

  await paymentRef.set(paymentData);

  // 4. Update customer record and loyalty rewards
  if (input.customerId?.trim()) {
    try {
      if (input.couponCode?.trim()) {
        await markCustomerCouponUsed(input.customerId.trim(), input.couponCode.trim());
      }
      await addCustomerStamp(input.customerId.trim(), subtotal);
    } catch (e) {
      console.warn("Could not process customer coupon or stamp:", e);
    }
  }

  if (input.customerPhone?.trim()) {
    try {
      await findOrCreateCustomer({
        name: cleanCustomerName,
        phone: input.customerPhone.trim(),
        email: input.customerEmail?.trim(),
        spentDelta: total,
      });
    } catch (e) {
      console.warn("Could not upsert customer record:", e);
    }
  }

  const savedOrderDoc = await orderRef.get();
  const savedPaymentDoc = await paymentRef.get();

  return {
    order: serializeFirestoreData<Order>({
      id: orderRef.id,
      ...savedOrderDoc.data(),
    }),
    items: orderItemsSnapshot,
    payment: serializeFirestoreData<Payment>({
      id: paymentRef.id,
      ...savedPaymentDoc.data(),
    }),
  };
}

/**
 * Verify pre-order payment atomically:
 * 1. Checks stock availability
 * 2. Deducts inventory stock (and bundle components)
 * 3. Records inventoryMovements (type: PRE_ORDER)
 * 4. Generates redemptionCode and creates redemption document
 * 5. Updates order to READY_FOR_REDEMPTION and PAID
 * 6. Updates payment record to PAID
 */
export async function verifyOrderPayment(
  orderId: string,
  cashierId: string,
  proofUrl?: string
): Promise<{ order: Order; redemptionCode: string }> {
  const result = await adminDb.runTransaction(async (transaction) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
    }

    const orderData = orderDoc.data() as Order;

    if (
      orderData.status !== "PENDING_PAYMENT" &&
      orderData.status !== "WAITING_VERIFICATION"
    ) {
      throw new Error(
        `Pesanan tidak dapat diverifikasi karena berstatus "${orderData.status}".`
      );
    }

    const items = (orderData.items || []) as OrderItem[];
    if (items.length === 0) {
      throw new Error("Pesanan tidak memiliki item pembelian.");
    }

    // Collect all product IDs needed
    const primaryProductIds = items.map((i) => i.productId);
    const primaryProductDocs = await Promise.all(
      primaryProductIds.map((id) =>
        transaction.get(adminDb.collection("products").doc(id))
      )
    );

    const productMap = new Map<string, Product>();
    for (const doc of primaryProductDocs) {
      if (doc.exists) {
        productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
      }
    }

    // Check bundle component product IDs if any
    const componentIdsToFetch: string[] = [];
    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (prod && prod.type === "BUNDLE" && prod.bundleItems) {
        for (const bItem of prod.bundleItems) {
          if (!productMap.has(bItem.productId)) {
            componentIdsToFetch.push(bItem.productId);
          }
        }
      }
    }

    if (componentIdsToFetch.length > 0) {
      const compDocs = await Promise.all(
        componentIdsToFetch.map((id) =>
          transaction.get(adminDb.collection("products").doc(id))
        )
      );
      for (const doc of compDocs) {
        if (doc.exists) {
          productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
        }
      }
    }

    // Calculate required stock deductions
    const stockDeductionMap = new Map<string, number>();

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;

      const qty = item.quantity;
      if (prod.type === "BUNDLE" && prod.bundleItems && prod.bundleItems.length > 0) {
        for (const bItem of prod.bundleItems) {
          const compProd = productMap.get(bItem.productId);
          if (compProd && compProd.trackInventory) {
            const needed = bItem.quantity * qty;
            const current = stockDeductionMap.get(compProd.id) || 0;
            stockDeductionMap.set(compProd.id, current + needed);
          }
        }
      } else if (prod.trackInventory) {
        const current = stockDeductionMap.get(prod.id) || 0;
        stockDeductionMap.set(prod.id, current + qty);
      }
    }

    // Validate stock sufficiency
    for (const [productId, requiredQty] of stockDeductionMap.entries()) {
      const prod = productMap.get(productId);
      if (prod && prod.stock < requiredQty) {
        throw new Error(
          `Stok tidak mencukupi untuk "${prod.name}". Tersedia: ${prod.stock}, Dibutuhkan: ${requiredQty}.`
        );
      }
    }

    // Deduct stock & create inventoryMovements
    for (const [productId, deduction] of stockDeductionMap.entries()) {
      const prodRef = adminDb.collection("products").doc(productId);
      const prod = productMap.get(productId)!;

      transaction.update(prodRef, {
        stock: FieldValue.increment(-deduction),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const movementRef = adminDb.collection("inventoryMovements").doc();
      transaction.set(movementRef, {
        productId,
        productName: prod.name,
        type: "PRE_ORDER",
        quantity: -deduction,
        referenceType: "ORDER",
        referenceId: orderData.orderNumber,
        note: `Pre-Order Confirmed #${orderData.orderNumber}`,
        createdBy: cashierId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // Generate secure redemption code
    const redemptionCode = generateRedemptionCode();

    // Create redemption document
    const redemptionRef = adminDb.collection("redemptions").doc();
    transaction.set(redemptionRef, {
      orderId,
      redemptionCode,
      status: "READY",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update order
    const orderUpdate: Record<string, unknown> = {
      status: "READY_FOR_REDEMPTION",
      paymentStatus: "PAID",
      redemptionCode,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (proofUrl?.trim()) {
      orderUpdate.proofUrl = proofUrl.trim();
    }
    transaction.update(orderRef, orderUpdate);

    // Update payment document
    const paymentsSnap = await adminDb
      .collection("payments")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (!paymentsSnap.empty) {
      const paymentUpdate: Record<string, unknown> = {
        status: "PAID",
        verifiedBy: cashierId,
        verifiedAt: FieldValue.serverTimestamp(),
      };
      if (proofUrl?.trim()) {
        paymentUpdate.proofUrl = proofUrl.trim();
      }
      transaction.update(paymentsSnap.docs[0].ref, paymentUpdate);
    }

    return {
      order: serializeFirestoreData<Order>({
        ...orderData,
        status: "READY_FOR_REDEMPTION",
        paymentStatus: "PAID",
        redemptionCode,
        proofUrl: proofUrl?.trim() || orderData.proofUrl,
      }),
      redemptionCode,
    };
  });

  if (result.order.customerId) {
    try {
      await addCustomerStamp(result.order.customerId, result.order.subtotal);
    } catch (e) {
      console.warn("Could not award loyalty stamp for verified pre-order:", e);
    }
  } else if (result.order.customerPhone) {
    try {
      await addCustomerStampByPhone(result.order.customerPhone, result.order.subtotal);
    } catch (e) {
      console.warn("Could not award loyalty stamp by phone:", e);
    }
  }

  return result;
}

/**
 * Cancel an order atomically:
 * If the order was already paid or stock was deducted, it restores inventory stock (type: CANCELLED_ORDER).
 */
export async function cancelOrder(
  orderId: string,
  cashierId: string,
  reason?: string
): Promise<void> {
  await adminDb.runTransaction(async (transaction) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
    }

    const orderData = orderDoc.data() as Order;
    if (orderData.status === "CANCELLED") {
      throw new Error("Pesanan ini sudah dibatalkan sebelumnya.");
    }

    const wasStockDeducted =
      orderData.status === "READY_FOR_REDEMPTION" ||
      orderData.status === "COMPLETED" ||
      orderData.paymentStatus === "PAID";

    if (wasStockDeducted) {
      const items = (orderData.items || []) as OrderItem[];

      // Reconstruct component deductions to restore
      const primaryProductIds = items.map((i) => i.productId);
      const primaryProductDocs = await Promise.all(
        primaryProductIds.map((id) =>
          transaction.get(adminDb.collection("products").doc(id))
        )
      );

      const productMap = new Map<string, Product>();
      for (const doc of primaryProductDocs) {
        if (doc.exists) {
          productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
        }
      }

      // Check bundle component products
      const componentIdsToFetch: string[] = [];
      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (prod && prod.type === "BUNDLE" && prod.bundleItems) {
          for (const bItem of prod.bundleItems) {
            if (!productMap.has(bItem.productId)) {
              componentIdsToFetch.push(bItem.productId);
            }
          }
        }
      }

      if (componentIdsToFetch.length > 0) {
        const compDocs = await Promise.all(
          componentIdsToFetch.map((id) =>
            transaction.get(adminDb.collection("products").doc(id))
          )
        );
        for (const doc of compDocs) {
          if (doc.exists) {
            productMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
          }
        }
      }

      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) continue;

        const qty = item.quantity;
        if (prod.type === "BUNDLE" && prod.bundleItems && prod.bundleItems.length > 0) {
          for (const bItem of prod.bundleItems) {
            const compProd = productMap.get(bItem.productId);
            if (compProd && compProd.trackInventory) {
              const restoredQty = bItem.quantity * qty;
              const prodRef = adminDb.collection("products").doc(compProd.id);
              transaction.update(prodRef, {
                stock: FieldValue.increment(restoredQty),
                updatedAt: FieldValue.serverTimestamp(),
              });
              const movementRef = adminDb.collection("inventoryMovements").doc();
              transaction.set(movementRef, {
                productId: compProd.id,
                productName: compProd.name,
                type: "CANCELLED_ORDER",
                quantity: restoredQty,
                referenceType: "ORDER",
                referenceId: orderData.orderNumber,
                note: `Rollback pembatalan #${orderData.orderNumber}: ${reason || ""}`,
                createdBy: cashierId,
                createdAt: FieldValue.serverTimestamp(),
              });
            }
          }
        } else if (prod.trackInventory) {
          const prodRef = adminDb.collection("products").doc(prod.id);
          transaction.update(prodRef, {
            stock: FieldValue.increment(qty),
            updatedAt: FieldValue.serverTimestamp(),
          });
          const movementRef = adminDb.collection("inventoryMovements").doc();
          transaction.set(movementRef, {
            productId: prod.id,
            productName: prod.name,
            type: "CANCELLED_ORDER",
            quantity: qty,
            referenceType: "ORDER",
            referenceId: orderData.orderNumber,
            note: `Rollback pembatalan #${orderData.orderNumber}: ${reason || ""}`,
            createdBy: cashierId,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Cancel redemption if exists
    if (orderData.redemptionCode) {
      const redSnap = await adminDb
        .collection("redemptions")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();
      if (!redSnap.empty) {
        transaction.update(redSnap.docs[0].ref, {
          status: "CANCELLED",
        });
      }
    }

    // Update order status
    const cancellationNote = reason ? ` | Batal: ${reason}` : " | Dibatalkan";
    transaction.update(orderRef, {
      status: "CANCELLED",
      notes: (orderData.notes || "") + cancellationNote,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update payment record
    const paymentSnap = await adminDb
      .collection("payments")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (!paymentSnap.empty) {
      transaction.update(paymentSnap.docs[0].ref, {
        status: "REJECTED",
      });
    }
  });
}

