import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type {
  Product,
  ProductType,
  CreateProductInput,
  UpdateProductInput,
} from "@/lib/types";

const COLLECTION = "products";

export interface ProductFilters {
  type?: ProductType;
  isActive?: boolean;
  isPreOrderAvailable?: boolean;
  search?: string;
}

/**
 * Fetch all products, optionally filtered by type, active status, or search query.
 * Results are ordered by createdAt descending.
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION);

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }

    if (typeof filters?.isActive === "boolean") {
      query = query.where("isActive", "==", filters.isActive);
    }

    if (typeof filters?.isPreOrderAvailable === "boolean") {
      query = query.where("isPreOrderAvailable", "==", filters.isPreOrderAvailable);
    }

    // Attempt to order by createdAt descending
    try {
      query = query.orderBy("createdAt", "desc");
    } catch {
      // If index is missing or query cannot be ordered with where, fallback without sort
    }

    const snapshot = await query.get();

    let products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return serializeFirestoreData<Product>({
        id: doc.id,
        ...data,
      });
    });

    // In-memory text search filter if provided
    if (filters?.search && filters.search.trim()) {
      const term = filters.search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    return products;
  } catch (error) {
    console.error("Error fetching products from Firestore:", error);
    return [];
  }
}

/**
 * Fetch a single product by ID.
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;

    return serializeFirestoreData<Product>({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
}

/**
 * Create a new product.
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const docRef = adminDb.collection(COLLECTION).doc();

  const productData = {
    ...input,
    price: Math.round(Number(input.price) || 0),
    costPrice: input.costPrice ? Math.round(Number(input.costPrice)) : undefined,
    stock: Math.round(Number(input.stock) || 0),
    trackInventory: Boolean(input.trackInventory),
    isPreOrderAvailable: Boolean(input.isPreOrderAvailable),
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    bundleItems: input.type === "BUNDLE" ? input.bundleItems || [] : [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(productData);

  const createdDoc = await docRef.get();
  return serializeFirestoreData<Product>({
    id: docRef.id,
    ...createdDoc.data(),
  });
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const docRef = adminDb.collection(COLLECTION).doc(id);

  const updates: Record<string, unknown> = {
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.price !== undefined) {
    updates.price = Math.round(Number(input.price) || 0);
  }
  if (input.costPrice !== undefined) {
    updates.costPrice = input.costPrice ? Math.round(Number(input.costPrice)) : undefined;
  }
  if (input.stock !== undefined) {
    updates.stock = Math.round(Number(input.stock) || 0);
  }
  if (input.type && input.type !== "BUNDLE") {
    updates.bundleItems = [];
  }

  await docRef.update(updates);

  const updatedDoc = await docRef.get();
  return serializeFirestoreData<Product>({
    id: docRef.id,
    ...updatedDoc.data(),
  });
}

/**
 * Toggle product active status (active <-> inactive).
 */
export async function toggleProductActive(
  id: string,
  currentStatus: boolean
): Promise<boolean> {
  const newStatus = !currentStatus;
  await adminDb.collection(COLLECTION).doc(id).update({
    isActive: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return newStatus;
}

/**
 * Delete a product permanently.
 */
export async function deleteProduct(id: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).delete();
}
