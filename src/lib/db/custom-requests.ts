import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import { createPreOrder } from "@/lib/db/orders";
import type {
  CustomMerchRequest,
  CustomMerchType,
  CustomRequestStatus,
  Order,
} from "@/lib/types";

export interface CreateCustomRequestInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  merchType: CustomMerchType;
  quantity: number;
  designUrl?: string;
  notes?: string;
}

/**
 * Generate sequential-like Custom Merch Request ID (e.g. CMR-0001)
 */
function generateRequestNumber(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ts = Date.now().toString().slice(-4);
  return `CMR-${ts}${rand.toString().slice(0, 2)}`;
}

/**
 * Public: Customer submits a custom merch design request
 */
export async function createCustomRequest(
  input: CreateCustomRequestInput
): Promise<CustomMerchRequest> {
  const cleanName = input.customerName?.trim();
  const cleanPhone = input.customerPhone?.trim();

  if (!cleanName) throw new Error("Nama pemesan wajib diisi.");
  if (!cleanPhone) throw new Error("Nomor WhatsApp wajib diisi.");
  if (!input.merchType) throw new Error("Jenis merchandise wajib dipilih.");

  const requestNumber = generateRequestNumber();
  const requestRef = adminDb.collection("customMerchRequests").doc();

  const data: Record<string, unknown> = {
    requestNumber,
    customerName: cleanName,
    customerPhone: cleanPhone,
    merchType: input.merchType,
    quantity: Math.max(1, Number(input.quantity) || 1),
    status: "PENDING" as CustomRequestStatus,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.customerEmail?.trim()) {
    data.customerEmail = input.customerEmail.trim();
  }
  if (input.designUrl?.trim()) {
    data.designUrl = input.designUrl.trim();
  }
  if (input.notes?.trim()) {
    data.notes = input.notes.trim();
  }

  await requestRef.set(data);

  return serializeFirestoreData<CustomMerchRequest>({
    id: requestRef.id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Admin: Fetch all custom merch requests
 */
export async function getCustomRequests(
  status?: CustomRequestStatus
): Promise<CustomMerchRequest[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb
      .collection("customMerchRequests")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.get();

    return snap.docs.map((doc) =>
      serializeFirestoreData<CustomMerchRequest>({
        id: doc.id,
        ...doc.data(),
      })
    );
  } catch (error) {
    console.error("getCustomRequests error:", error);
    return [];
  }
}

/**
 * Admin: Update custom merch request status
 */
export async function updateCustomRequestStatus(
  id: string,
  status: CustomRequestStatus,
  adminNotes?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes.trim();
  }

  await adminDb.collection("customMerchRequests").doc(id).update(updateData);
}

/**
 * Admin: Convert a Custom Merch Request into an official Pre-Order
 */
export async function convertCustomRequestToPreOrder(
  requestId: string,
  unitPrice: number,
  paymentMethod: "COD" | "QRIS" | "BANK_TRANSFER",
  cashierId: string
): Promise<Order> {
  const doc = await adminDb.collection("customMerchRequests").doc(requestId).get();
  if (!doc.exists) {
    throw new Error("Request custom merch tidak ditemukan.");
  }

  const reqData = doc.data() as CustomMerchRequest;

  // 1. Create a specialized product or order item for this custom merch
  const merchLabels: Record<CustomMerchType, string> = {
    PIN: "Custom Pin (Pin Peniti)",
    STICKER: "Custom Sticker (Die-cut Vinyl)",
    KEYCHAIN: "Custom Gantungan Kunci (Akrilik)",
  };

  const productName = `${merchLabels[reqData.merchType] || "Custom Merch"} — ${reqData.customerName}`;

  // Find or create product doc for custom merch
  const prodRef = adminDb.collection("products").doc();
  await prodRef.set({
    name: productName,
    category: "MERCHANDISE",
    type: "SINGLE",
    price: unitPrice,
    stock: reqData.quantity,
    trackInventory: false,
    isActive: true,
    imageUrl: reqData.designUrl || null,
    description: `Pesanan Custom ${reqData.merchType}: ${reqData.notes || "-"}`,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Create the pre-order with flexible pickup
  const preOrderResult = await createPreOrder({
    customerName: reqData.customerName,
    customerPhone: reqData.customerPhone,
    customerEmail: reqData.customerEmail,
    items: [
      {
        productId: prodRef.id,
        quantity: reqData.quantity,
      },
    ],
    paymentMethod,
    pickupMethod: "FLEXIBLE",
    notes: `Custom Merch Request #${reqData.requestNumber}: ${reqData.notes || "-"}`,
    source: "ONLINE",
    createdBy: cashierId,
  });

  // 3. Update the custom request with order reference and status
  await adminDb.collection("customMerchRequests").doc(requestId).update({
    status: "APPROVED",
    orderId: preOrderResult.order.id,
    orderNumber: preOrderResult.order.orderNumber,
    estimatedPrice: unitPrice * reqData.quantity,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return preOrderResult.order;
}
