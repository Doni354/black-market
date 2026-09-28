import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Customer } from "@/lib/types";

export interface UpsertCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  spentDelta?: number;
}

/**
 * Find existing customer by phone (or create new) and record order metrics.
 */
export async function findOrCreateCustomer(
  input: UpsertCustomerInput
): Promise<Customer> {
  const cleanPhone = input.phone?.trim() || "";
  const cleanName = input.name.trim();

  let customerDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  if (cleanPhone) {
    const snap = await adminDb
      .collection("customers")
      .where("phone", "==", cleanPhone)
      .limit(1)
      .get();
    if (!snap.empty) {
      customerDoc = snap.docs[0];
    }
  }

  if (customerDoc && customerDoc.exists) {
    const updateData: Record<string, unknown> = {
      totalOrders: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (input.spentDelta && input.spentDelta > 0) {
      updateData.totalSpent = FieldValue.increment(input.spentDelta);
    }
    if (input.email?.trim()) {
      updateData.email = input.email.trim();
    }
    if (cleanName) {
      updateData.name = cleanName;
    }

    await customerDoc.ref.update(updateData);
    const updated = await customerDoc.ref.get();
    return serializeFirestoreData<Customer>({
      id: customerDoc.id,
      ...updated.data(),
    });
  }

  // Create new customer
  const newRef = adminDb.collection("customers").doc();
  const customerData: Record<string, unknown> = {
    name: cleanName,
    totalOrders: 1,
    totalSpent: Math.max(0, input.spentDelta || 0),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (cleanPhone) customerData.phone = cleanPhone;
  if (input.email?.trim()) customerData.email = input.email.trim();
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
 */
export async function getCustomers(limitCount = 100): Promise<Customer[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("customers");
    try {
      query = query.orderBy("updatedAt", "desc");
    } catch {
      // index fallback
    }

    const snap = await query.limit(limitCount).get();
    return snap.docs.map((doc) =>
      serializeFirestoreData<Customer>({
        id: doc.id,
        ...doc.data(),
      })
    );
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}
