import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { CustomerAccount, CustomerCoupon, Order } from "@/lib/types";

export interface SyncCustomerInput {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface LoyaltySettings {
  isLoyaltyEnabled: boolean;
  stampsRequired: number;
  minSpendPerStamp: number;
  stampRewardDiscount: number;
  stampRewardMinOrder: number;
}

const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  isLoyaltyEnabled: true,
  stampsRequired: 5,
  minSpendPerStamp: 15000,
  stampRewardDiscount: 5000,
  stampRewardMinOrder: 20000,
};

/**
 * Fetch Admin Configurable Loyalty & Stamp Settings.
 */
export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  try {
    const snap = await adminDb.collection("settings").doc("loyalty").get();
    if (!snap.exists) {
      return DEFAULT_LOYALTY_SETTINGS;
    }
    const data = snap.data();
    return {
      isLoyaltyEnabled: data?.isLoyaltyEnabled ?? DEFAULT_LOYALTY_SETTINGS.isLoyaltyEnabled,
      stampsRequired: data?.stampsRequired ?? DEFAULT_LOYALTY_SETTINGS.stampsRequired,
      minSpendPerStamp: data?.minSpendPerStamp ?? DEFAULT_LOYALTY_SETTINGS.minSpendPerStamp,
      stampRewardDiscount: data?.stampRewardDiscount ?? DEFAULT_LOYALTY_SETTINGS.stampRewardDiscount,
      stampRewardMinOrder: data?.stampRewardMinOrder ?? DEFAULT_LOYALTY_SETTINGS.stampRewardMinOrder,
    };
  } catch (err) {
    console.error("Error reading loyalty settings:", err);
    return DEFAULT_LOYALTY_SETTINGS;
  }
}

/**
 * Update Admin Configurable Loyalty & Stamp Settings.
 */
export async function updateLoyaltySettings(
  input: Partial<LoyaltySettings>
): Promise<LoyaltySettings> {
  const docRef = adminDb.collection("settings").doc("loyalty");
  const current = await getLoyaltySettings();
  const updated: LoyaltySettings = {
    ...current,
    ...input,
  };
  await docRef.set(
    {
      ...updated,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return updated;
}

/**
 * Synchronize Google-authenticated customer profile with Firestore.
 * NOTE: For university KWH project, coupons are NOT given away automatically!
 * claimedCoupons starts empty ([]).
 */
export async function syncCustomerProfile(
  input: SyncCustomerInput
): Promise<CustomerAccount> {
  const { uid, email = "", displayName = "", photoURL = "" } = input;
  const docRef = adminDb.collection("customers").doc(uid);
  const snap = await docRef.get();

  if (!snap.exists) {
    const initialData = {
      name: displayName || "Sobat Noury",
      email: email || "",
      photoURL: photoURL || "",
      phone: "",
      stampsCount: 0,
      totalOrders: 0,
      totalSpent: 0,
      claimedCoupons: [], // Empty initially - no free handouts
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(initialData);
    const createdSnap = await docRef.get();
    return serializeFirestoreData<CustomerAccount>({
      id: uid,
      ...createdSnap.data(),
    });
  }

  // Document exists, update profile info if needed
  const existingData = snap.data() || {};
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (photoURL && existingData.photoURL !== photoURL) {
    updates.photoURL = photoURL;
  }
  if (displayName && (!existingData.name || existingData.name === "Sobat Noury")) {
    updates.name = displayName;
  }
  if (email && !existingData.email) {
    updates.email = email;
  }

  if (existingData.stampsCount === undefined) {
    updates.stampsCount = 0;
  }
  if (!existingData.claimedCoupons) {
    updates.claimedCoupons = [];
  }

  await docRef.update(updates);
  const updatedSnap = await docRef.get();

  return serializeFirestoreData<CustomerAccount>({
    id: uid,
    ...updatedSnap.data(),
  });
}

/**
 * Update customer WhatsApp phone number.
 */
export async function updateCustomerPhone(
  uid: string,
  phone: string
): Promise<CustomerAccount> {
  const cleanPhone = phone.trim();
  const docRef = adminDb.collection("customers").doc(uid);

  await docRef.update({
    phone: cleanPhone,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await docRef.get();
  return serializeFirestoreData<CustomerAccount>({
    id: uid,
    ...updatedSnap.data(),
  });
}

/**
 * Claim stamp reward voucher according to Admin configurable loyalty rules.
 */
export async function claimStampReward(uid: string): Promise<CustomerAccount> {
  const [settings, snap] = await Promise.all([
    getLoyaltySettings(),
    adminDb.collection("customers").doc(uid).get(),
  ]);

  if (!snap.exists) {
    throw new Error("Akun pelanggan tidak ditemukan.");
  }

  if (!settings.isLoyaltyEnabled) {
    throw new Error("Program penukaran stempel saat ini sedang dinonaktifkan oleh pengelola.");
  }

  const data = snap.data() as CustomerAccount;
  const currentStamps = data.stampsCount || 0;

  if (currentStamps < settings.stampsRequired) {
    throw new Error(
      `Stempel Anda belum mencukupi. Butuh minimal ${settings.stampsRequired} stempel untuk klaim voucher.`
    );
  }

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const newCoupon: CustomerCoupon = {
    id: `REWARD_${Date.now()}`,
    code: `NOURY${randomDigits}`,
    title: `Reward ${settings.stampsRequired} Stempel Noury`,
    description: `Potongan diskon Rp ${settings.stampRewardDiscount.toLocaleString("id-ID")} untuk pesanan menu sehat Noury.`,
    discountAmount: settings.stampRewardDiscount,
    minOrder: settings.stampRewardMinOrder,
    isUsed: false,
  };

  const updatedCoupons = [...(data.claimedCoupons || []), newCoupon];

  const docRef = adminDb.collection("customers").doc(uid);
  await docRef.update({
    stampsCount: currentStamps - settings.stampsRequired,
    claimedCoupons: updatedCoupons,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await docRef.get();
  return serializeFirestoreData<CustomerAccount>({
    id: uid,
    ...updatedSnap.data(),
  });
}

/**
 * Admin action: Issue a voucher directly to a customer.
 */
export async function adminIssueCouponToCustomer(
  uid: string,
  coupon: Omit<CustomerCoupon, "id" | "isUsed">
): Promise<CustomerAccount> {
  const docRef = adminDb.collection("customers").doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("Pelanggan tidak ditemukan.");
  }

  const data = snap.data() as CustomerAccount;
  const newCoupon: CustomerCoupon = {
    ...coupon,
    id: `COUPON_${Date.now()}`,
    isUsed: false,
  };

  const updatedCoupons = [...(data.claimedCoupons || []), newCoupon];
  await docRef.update({
    claimedCoupons: updatedCoupons,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await docRef.get();
  return serializeFirestoreData<CustomerAccount>({
    id: uid,
    ...updatedSnap.data(),
  });
}

/**
 * Fetch all orders placed by this customer (by customerId or customerPhone).
 */
export async function getCustomerOrders(
  uid: string,
  phone?: string
): Promise<Order[]> {
  const ordersMap = new Map<string, Order>();

  // 1. Query by customerId
  try {
    const snapById = await adminDb
      .collection("orders")
      .where("customerId", "==", uid)
      .get();

    for (const doc of snapById.docs) {
      ordersMap.set(
        doc.id,
        serializeFirestoreData<Order>({
          id: doc.id,
          ...doc.data(),
        })
      );
    }
  } catch (err) {
    console.error("Error querying orders by customerId:", err);
  }

  // 2. Query by phone if available
  if (phone && phone.trim()) {
    try {
      const snapByPhone = await adminDb
        .collection("orders")
        .where("customerPhone", "==", phone.trim())
        .get();

      for (const doc of snapByPhone.docs) {
        if (!ordersMap.has(doc.id)) {
          ordersMap.set(
            doc.id,
            serializeFirestoreData<Order>({
              id: doc.id,
              ...doc.data(),
            })
          );
        }
      }
    } catch (err) {
      console.error("Error querying orders by customerPhone:", err);
    }
  }

  // Sort orders descending by createdAt
  const orders = Array.from(ordersMap.values()).sort((a, b) => {
    const aTime = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
    const bTime = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return orders;
}

/**
 * Mark a coupon as used for a customer.
 */
export async function markCustomerCouponUsed(
  uid: string,
  couponCode: string
): Promise<void> {
  const docRef = adminDb.collection("customers").doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) return;

  const data = snap.data() as CustomerAccount;
  const coupons = data.claimedCoupons || [];

  let changed = false;
  const updatedCoupons = coupons.map((c) => {
    if (c.code === couponCode && !c.isUsed) {
      changed = true;
      return {
        ...c,
        isUsed: true,
      };
    }
    return c;
  });

  if (changed) {
    await docRef.update({
      claimedCoupons: updatedCoupons,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Increment stamps count for a customer after an order IF order amount meets minSpendPerStamp and loyalty is enabled.
 */
export async function addCustomerStamp(uid: string, orderSubtotal = 0): Promise<void> {
  const settings = await getLoyaltySettings();
  if (!settings.isLoyaltyEnabled) return;

  const docRef = adminDb.collection("customers").doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) return;

  const updates: Record<string, unknown> = {
    totalOrders: FieldValue.increment(1),
    totalSpent: FieldValue.increment(orderSubtotal),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (orderSubtotal >= settings.minSpendPerStamp) {
    updates.stampsCount = FieldValue.increment(1);
  }

  await docRef.update(updates);
}

/**
 * Increment stamps count and record customer activity via phone number (e.g. for POS sales).
 */
export async function addCustomerStampByPhone(phone: string, orderSubtotal = 0): Promise<void> {
  const cleanPhone = phone.trim();
  if (!cleanPhone) return;

  const settings = await getLoyaltySettings();
  if (!settings.isLoyaltyEnabled) return;

  const snap = await adminDb
    .collection("customers")
    .where("phone", "==", cleanPhone)
    .limit(1)
    .get();

  if (!snap.empty) {
    const updates: Record<string, unknown> = {
      totalOrders: FieldValue.increment(1),
      totalSpent: FieldValue.increment(orderSubtotal),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (orderSubtotal >= settings.minSpendPerStamp) {
      updates.stampsCount = FieldValue.increment(1);
    }

    await snap.docs[0].ref.update(updates);
  }
}

/**
 * Admin action: Manually adjust customer's stamp count.
 */
export async function adjustCustomerStamps(
  uid: string,
  delta: number
): Promise<CustomerAccount> {
  const docRef = adminDb.collection("customers").doc(uid);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error("Pelanggan tidak ditemukan.");
  }
  const data = snap.data() as CustomerAccount;
  const currentStamps = data.stampsCount || 0;
  const newStamps = Math.max(0, currentStamps + delta);
  await docRef.update({
    stampsCount: newStamps,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updatedSnap = await docRef.get();
  return serializeFirestoreData<CustomerAccount>({
    id: uid,
    ...updatedSnap.data(),
  });
}
