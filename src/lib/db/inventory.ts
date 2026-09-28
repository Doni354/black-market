import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type {
  InventoryMovement,
  InventoryMovementType,
  InventoryReferenceType,
  Product,
} from "@/lib/types";

const COLLECTION = "inventoryMovements";

export interface CreateMovementInput {
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantity: number; // Positive = stock in, Negative = stock out
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  note?: string;
  createdBy: string;
}

export interface AdjustStockInput {
  productId: string;
  delta: number;
  type: InventoryMovementType;
  note?: string;
  createdBy: string;
}

/**
 * Adjust product stock and record an inventory movement atomically.
 */
export async function adjustStock(input: AdjustStockInput): Promise<{
  product: Product;
  movement: InventoryMovement;
}> {
  const { productId, delta, type, note, createdBy } = input;

  if (delta === 0) {
    throw new Error("Perubahan stok (delta) tidak boleh 0.");
  }

  return await adminDb.runTransaction(async (transaction) => {
    const productRef = adminDb.collection("products").doc(productId);
    const productDoc = await transaction.get(productRef);

    if (!productDoc.exists) {
      throw new Error("Produk tidak ditemukan.");
    }

    const currentProduct = { id: productDoc.id, ...productDoc.data() } as Product;
    const currentStock = currentProduct.stock || 0;
    const newStock = currentStock + delta;

    if (newStock < 0) {
      throw new Error(
        `Pengurangan stok melebihi stok yang ada. Stok saat ini: ${currentStock}, Dikurangi: ${Math.abs(
          delta
        )}.`
      );
    }

    // Update product stock
    transaction.update(productRef, {
      stock: newStock,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create inventory movement record
    const movementRef = adminDb.collection(COLLECTION).doc();
    const movementData = {
      productId,
      productName: currentProduct.name,
      type,
      quantity: delta,
      referenceType: "MANUAL" as InventoryReferenceType,
      note: note?.trim() || undefined,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
    };

    transaction.set(movementRef, movementData);

    return {
      product: serializeFirestoreData<Product>({
        ...currentProduct,
        stock: newStock,
        updatedAt: new Date().toISOString(),
      }),
      movement: serializeFirestoreData<InventoryMovement>({
        id: movementRef.id,
        ...movementData,
        createdAt: new Date().toISOString(),
      }),
    };
  });
}

/**
 * Fetch inventory movements, optionally filtered by productId or movement type.
 */
export async function getInventoryMovements(filters?: {
  productId?: string;
  type?: InventoryMovementType;
  limit?: number;
}): Promise<InventoryMovement[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

    if (filters?.productId) {
      query = query.where("productId", "==", filters.productId);
    }

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }

    try {
      query = query.orderBy("createdAt", "desc");
    } catch {
      // Fallback if composite index not yet ready
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) =>
      serializeFirestoreData<InventoryMovement>({
        id: doc.id,
        ...doc.data(),
      })
    );
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return [];
  }
}
