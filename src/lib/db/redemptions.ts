import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Order, Redemption } from "@/lib/types";

export interface RedemptionDetails {
  redemption: Redemption;
  order: Order;
}

/**
 * Fetch redemption and associated order details by redemption code.
 */
export async function getRedemptionByCode(
  rawCode: string
): Promise<RedemptionDetails | null> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) return null;

  try {
    const snap = await adminDb
      .collection("redemptions")
      .where("redemptionCode", "==", cleanCode)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const redDoc = snap.docs[0];
    const redData = redDoc.data();

    // Fetch related order
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
  } catch (error) {
    console.error("getRedemptionByCode error:", error);
    return null;
  }
}

/**
 * Execute redemption atomically in a Firestore transaction.
 * Ensures single-use verification (cannot double-redeem).
 */
export async function executeRedemption(
  rawCode: string,
  cashierId: string
): Promise<{ order: Order; redemption: Redemption }> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Kode redemption tidak boleh kosong.");
  }

  return await adminDb.runTransaction(async (transaction) => {
    // 1. Find redemption doc
    const redQuery = await adminDb
      .collection("redemptions")
      .where("redemptionCode", "==", cleanCode)
      .limit(1)
      .get();

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

    if (orderData.paymentStatus !== "PAID") {
      throw new Error(
        `Pesanan belum lunas (Status Pembayaran: ${orderData.paymentStatus}).`
      );
    }

    if (orderData.status === "REDEEMED") {
      throw new Error("Pesanan ini sudah berstatus diambil (Redeemed).");
    }

    if (orderData.status === "CANCELLED") {
      throw new Error("Pesanan ini telah dibatalkan.");
    }

    // 4. ATOMIC UPDATE
    transaction.update(redRef, {
      status: "REDEEMED",
      redeemedBy: cashierId,
      redeemedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(orderRef, {
      status: "REDEEMED",
      redeemedAt: FieldValue.serverTimestamp(),
      redeemedBy: cashierId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      order: serializeFirestoreData<Order>({
        ...orderData,
        status: "REDEEMED",
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
