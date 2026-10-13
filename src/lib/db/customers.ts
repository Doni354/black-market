import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Customer } from "@/lib/types";

export interface UpsertCustomerInput {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  spentDelta?: number;
}

/**
 * Find existing customer by id, phone, or email (or create new) and record order metrics.
 */
export async function findOrCreateCustomer(
  input: UpsertCustomerInput
): Promise<Customer> {
  const cleanPhone = input.phone?.trim() || "";
  const cleanEmail = input.email?.trim().toLowerCase() || "";
  const cleanName = input.name.trim();

  let customerDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  // 1. Try by ID if provided
  if (input.id?.trim()) {
    const snap = await adminDb.collection("customers").doc(input.id.trim()).get();
    if (snap.exists) {
      customerDoc = snap;
    }
  }

  // 2. Try by phone if not found yet
  if (!customerDoc && cleanPhone) {
    const snap = await adminDb
      .collection("customers")
      .where("phone", "==", cleanPhone)
      .limit(1)
      .get();
    if (!snap.empty) {
      customerDoc = snap.docs[0];
    }
  }

  // 3. Try by email if not found yet
  if (!customerDoc && cleanEmail && !cleanEmail.includes("-")) {
    const snap = await adminDb
      .collection("customers")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();
    if (!snap.empty) {
      customerDoc = snap.docs[0];
    }
  }

  if (customerDoc && customerDoc.exists) {
    const existing = customerDoc.data() || {};
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.spentDelta && input.spentDelta > 0) {
      updateData.totalOrders = FieldValue.increment(1);
      updateData.totalSpent = FieldValue.increment(input.spentDelta);
    }
    if (cleanEmail && !existing.email) {
      updateData.email = cleanEmail;
    }
    if (cleanPhone && !existing.phone) {
      updateData.phone = cleanPhone;
    }
    if (cleanName && (!existing.name || existing.name === "Sobat Noury")) {
      updateData.name = cleanName;
    }

    await customerDoc.ref.update(updateData);
    const updated = await customerDoc.ref.get();
    return serializeFirestoreData<Customer>({
      id: customerDoc.id,
      ...updated.data(),
    });
  }

  // Create new customer only if no existing match was found
  const newRef = adminDb.collection("customers").doc();
  const customerData: Record<string, unknown> = {
    name: cleanName,
    totalOrders: input.spentDelta && input.spentDelta > 0 ? 1 : 0,
    totalSpent: Math.max(0, input.spentDelta || 0),
    stampsCount: 0,
    claimedCoupons: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (cleanPhone) customerData.phone = cleanPhone;
  if (cleanEmail) customerData.email = cleanEmail;
  if (input.notes?.trim()) customerData.notes = input.notes.trim();

  await newRef.set(customerData);
  const created = await newRef.get();
  return serializeFirestoreData<Customer>({
    id: newRef.id,
    ...created.data(),
  });
}

/**
 * Get all customers for customer directory / management.
 * Reconciles customer order metrics dynamically with real orders.
 */
export async function getCustomers(limitCount = 100): Promise<Customer[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("customers");
    try {
      query = query.orderBy("updatedAt", "desc");
    } catch {
      // index fallback
    }

    const [custSnap, orderSnap] = await Promise.all([
      query.limit(limitCount).get(),
      adminDb.collection("orders").get(),
    ]);

    const orders = orderSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));

    // Calculate actual valid orders per customer to ensure 100% data fidelity
    const rawCustomers = custSnap.docs.map((doc) => {
      const cData = doc.data();
      const custId = doc.id;

      const custOrders = orders.filter((o) => {
        const matchId = o.customerId === custId;
        const matchPhone =
          cData.phone &&
          typeof o.customerPhone === "string" &&
          cData.phone.replace(/\D/g, "") === o.customerPhone.replace(/\D/g, "") &&
          cData.phone.replace(/\D/g, "").length >= 7;
        const matchEmail =
          cData.email &&
          typeof o.customerEmail === "string" &&
          cData.email.trim().toLowerCase() === o.customerEmail.trim().toLowerCase();
        return matchId || matchPhone || matchEmail;
      });

      const validOrders = custOrders.filter(
        (o) => o.status !== "CANCELLED" && o.paymentStatus !== "CANCELLED"
      );

      const actualTotalOrders = validOrders.length;
      const actualTotalSpent = validOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      );

      // Self-heal customer document if drift is detected
      if (
        (cData.totalOrders !== actualTotalOrders || cData.totalSpent !== actualTotalSpent) &&
        custOrders.length > 0
      ) {
        doc.ref
          .update({
            totalOrders: actualTotalOrders,
            totalSpent: actualTotalSpent,
            updatedAt: FieldValue.serverTimestamp(),
          })
          .catch((err) => console.warn(`Could not auto-heal customer ${custId}:`, err));
      }

      return serializeFirestoreData<Customer>({
        id: doc.id,
        ...cData,
        totalOrders: actualTotalOrders,
        totalSpent: actualTotalSpent,
      });
    });

    // Deduplicate any secondary duplicate docs by email or phone
    const uniqueMap = new Map<string, Customer>();
    for (const cust of rawCustomers) {
      const key =
        cust.email?.toLowerCase().trim() ||
        cust.phone?.replace(/\D/g, "") ||
        cust.id;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, cust);
      } else {
        const existing = uniqueMap.get(key)!;
        // Prioritize 28-character Google Auth UID
        if (cust.id.length === 28 && existing.id.length !== 28) {
          uniqueMap.set(key, {
            ...cust,
            phone: cust.phone || existing.phone,
            totalOrders: Math.max(cust.totalOrders, existing.totalOrders),
            totalSpent: Math.max(cust.totalSpent, existing.totalSpent),
          });
        }
      }
    }

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}
