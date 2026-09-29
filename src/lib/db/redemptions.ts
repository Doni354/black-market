import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Order, Redemption } from "@/lib/types";

export interface RedemptionDetails {
  redemption: Redemption;
  order: Order;
}

export interface ExecuteRedemptionOptions {
  settleCod?: boolean;
  settleMethod?: "CASH" | "QRIS";
  amountPaid?: number;
}

/**
 * Fetch redemption and associated order details by redemption code or order number.
 */
export async function getRedemptionByCode(
  rawCode: string
): Promise<RedemptionDetails | null> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    // 1. Try matching redemptionCode
    const snap = await adminDb
      .collection("redemptions")
      .where("redemptionCode", "==", cleanCode)
      .limit(1)
      .get();

    if (!snap.empty) {
      const redDoc = snap.docs[0];
      const redData = redDoc.data();

      const orderDoc = await adminDb
        .collection("orders")
        .doc(redData.orderId)
        .get();

      if (!orderDoc.exists) return null;

      return {
        redemption: serializeFirestoreData<Redemption>({
          id: redDoc.id,
          ...redData,
        }),
        order: serializeFirestoreData<Order>({
          id: orderDoc.id,
          ...orderDoc.data(),
        }),
      };
    }

    // 2. Fallback: try matching orderNumber
    const orderSnap = await adminDb
      .collection("orders")
      .where("orderNumber", "==", cleanCode)
      .limit(1)
      .get();

    if (!orderSnap.empty) {
      const orderDoc = orderSnap.docs[0];
      const orderData = orderDoc.data();

      // Find or create redemption for this order if it is COD
      const redByOrderSnap = await adminDb
        .collection("redemptions")
        .where("orderId", "==", orderDoc.id)
        .limit(1)
        .get();

      if (!redByOrderSnap.empty) {
        const redDoc = redByOrderSnap.docs[0];
        return {
          redemption: serializeFirestoreData<Redemption>({
            id: redDoc.id,
            ...redDoc.data(),
          }),
          order: serializeFirestoreData<Order>({
            id: orderDoc.id,
            ...orderData,
          }),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("getRedemptionByCode error:", error);
    return null;
  }
}

/**
 * Execute redemption atomically in a Firestore transaction.
 * Supports standard pre-paid redemption and on-the-spot COD settlement.
 * Ensures single-use verification (cannot double-redeem).
 */
export async function executeRedemption(
  rawCode: string,
  cashierId: string,
  options?: ExecuteRedemptionOptions
): Promise<{ order: Order; redemption: Redemption }> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Kode redemption tidak boleh kosong.");
  }

  return await adminDb.runTransaction(async (transaction) => {
    // 1. Find redemption doc by code or orderNumber
    let redQuery = await adminDb
      .collection("redemptions")
      .where("redemptionCode", "==", cleanCode)
      .limit(1)
      .get();

    if (redQuery.empty) {
      // Check if it's orderNumber
      const orderMatch = await adminDb
        .collection("orders")
        .where("orderNumber", "==", cleanCode)
        .limit(1)
        .get();

      if (!orderMatch.empty) {
        const orderId = orderMatch.docs[0].id;
        redQuery = await adminDb
          .collection("redemptions")
          .where("orderId", "==", orderId)
          .limit(1)
          .get();
      }
    }

    if (redQuery.empty) {
      throw new Error(`Kode tiket "${cleanCode}" tidak valid atau tidak ditemukan.`);
    }

    const redDocSnapshot = redQuery.docs[0];
    const redRef = redDocSnapshot.ref;
    const redDoc = await transaction.get(redRef);
    const redData = redDoc.data() as Redemption;

    // 2. Validate redemption status
    if (redData.status === "REDEEMED") {
      const redeemedTime = redData.redeemedAt
        ? new Date(
            typeof redData.redeemedAt === "object" && "_seconds" in redData.redeemedAt
              ? (redData.redeemedAt as { _seconds: number })._seconds * 1000
              : String(redData.redeemedAt)
          ).toLocaleString("id-ID")
        : "sebelumnya";
      throw new Error(
        `Tiket ini SUDAH PERNAH DITUKARKAN pada ${redeemedTime}. Tiket tidak dapat digunakan ulang.`
      );
    }

    if (redData.status === "CANCELLED") {
      throw new Error("Tiket penukaran ini telah dibatalkan.");
    }

    // 3. Fetch & validate order
    const orderRef = adminDb.collection("orders").doc(redData.orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error("Data pesanan terkait tidak ditemukan.");
    }

    const orderData = orderDoc.data() as Order;

    const isCodSettlement =
      orderData.paymentMethod === "COD" &&
      orderData.paymentStatus !== "PAID" &&
      options?.settleCod;

    if (orderData.paymentStatus !== "PAID" && !isCodSettlement) {
      throw new Error(
        `Pesanan belum lunas (Status Pembayaran: ${orderData.paymentStatus}). Wajib lakukan pelunasan terlebih dahulu.`
      );
    }

    if (orderData.status === "REDEEMED") {
      throw new Error("Pesanan ini sudah berstatus diambil (Redeemed).");
    }

    if (orderData.status === "CANCELLED") {
      throw new Error("Pesanan ini telah dibatalkan.");
    }

    // If settling COD now, deduct stocks & update payment document
    if (isCodSettlement) {
      const items = orderData.items || [];
      const productIds = items.map((i) => i.productId);
      const productDocs = await Promise.all(
        productIds.map((id) => transaction.get(adminDb.collection("products").doc(id)))
      );

      const productMap = new Map<string, any>();
      for (const pDoc of productDocs) {
        if (pDoc.exists) {
          productMap.set(pDoc.id, { id: pDoc.id, ...pDoc.data() });
        }
      }

      // Stock deduction map
      const stockDeductionMap = new Map<string, number>();
      for (const item of items) {
        const prod = productMap.get(item.productId);
        if (!prod) continue;
        const qty = item.quantity;
        if (prod.type === "BUNDLE" && prod.bundleItems) {
          for (const bItem of prod.bundleItems) {
            const compProd = productMap.get(bItem.productId);
            if (compProd && compProd.trackInventory) {
              const needed = bItem.quantity * qty;
              stockDeductionMap.set(compProd.id, (stockDeductionMap.get(compProd.id) || 0) + needed);
            }
          }
        } else if (prod.trackInventory) {
          stockDeductionMap.set(prod.id, (stockDeductionMap.get(prod.id) || 0) + qty);
        }
      }

      for (const [productId, deduction] of stockDeductionMap.entries()) {
        const prodRef = adminDb.collection("products").doc(productId);
        const prod = productMap.get(productId);
        transaction.update(prodRef, {
          stock: FieldValue.increment(-deduction),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const movementRef = adminDb.collection("inventoryMovements").doc();
        transaction.set(movementRef, {
          productId,
          productName: prod?.name || "Product",
          type: "SALE",
          quantity: -deduction,
          referenceType: "ORDER",
          referenceId: orderData.orderNumber,
          note: `COD Stand Settlement #${orderData.orderNumber}`,
          createdBy: cashierId,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Update payment doc
      const paymentsSnap = await adminDb
        .collection("payments")
        .where("orderId", "==", orderRef.id)
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        transaction.update(paymentsSnap.docs[0].ref, {
          status: "PAID",
          method: options?.settleMethod || "CASH",
          verifiedBy: cashierId,
          verifiedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 4. ATOMIC UPDATE
    transaction.update(redRef, {
      status: "REDEEMED",
      redeemedBy: cashierId,
      redeemedAt: FieldValue.serverTimestamp(),
    });

    const orderUpdate: Record<string, unknown> = {
      status: "REDEEMED",
      redeemedAt: FieldValue.serverTimestamp(),
      redeemedBy: cashierId,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isCodSettlement) {
      orderUpdate.paymentStatus = "PAID";
      orderUpdate.paymentMethod = options?.settleMethod || "CASH";
      if (options?.amountPaid) {
        orderUpdate.amountPaid = options.amountPaid;
        orderUpdate.change = Math.max(0, options.amountPaid - orderData.total);
      }
    }

    transaction.update(orderRef, orderUpdate);

    return {
      order: serializeFirestoreData<Order>({
        ...orderData,
        ...orderUpdate,
        redeemedAt: new Date().toISOString(),
        redeemedBy: cashierId,
      }),
      redemption: serializeFirestoreData<Redemption>({
        ...redData,
        status: "REDEEMED",
        redeemedBy: cashierId,
        redeemedAt: new Date().toISOString(),
      }),
    };
  });
}
