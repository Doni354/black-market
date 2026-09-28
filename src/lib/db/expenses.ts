import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/lib/types";

export interface CreateExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
  createdBy: string;
}

export interface ExpenseFilters {
  category?: string;
  search?: string;
  limit?: number;
}

/**
 * Create a new operational expense record.
 */
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const cleanAmount = Math.max(0, Math.round(input.amount));
  if (cleanAmount <= 0) {
    throw new Error("Nominal pengeluaran harus lebih besar dari Rp 0.");
  }

  if (!input.description?.trim()) {
    throw new Error("Deskripsi pengeluaran tidak boleh kosong.");
  }

  const docRef = adminDb.collection("expenses").doc();
  const expenseData: Record<string, unknown> = {
    category: input.category,
    description: input.description.trim(),
    amount: cleanAmount,
    paymentMethod: input.paymentMethod,
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.proofUrl?.trim()) {
    expenseData.proofUrl = input.proofUrl.trim();
  }

  await docRef.set(expenseData);

  const savedDoc = await docRef.get();
  return serializeFirestoreData<Expense>({
    id: docRef.id,
    ...savedDoc.data(),
  });
}

/**
 * Fetch all expenses with optional filtering.
 */
export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("expenses");

    if (filters?.category && filters.category !== "ALL") {
      query = query.where("category", "==", filters.category);
    }

    try {
      query = query.orderBy("createdAt", "desc");
    } catch {
      // Fallback if index not yet generated
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    let expenses = snapshot.docs.map((doc) => {
      return serializeFirestoreData<Expense>({
        id: doc.id,
        ...doc.data(),
      });
    });

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.toLowerCase().trim();
      expenses = expenses.filter(
        (e) =>
          e.description.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term)
      );
    }

    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

/**
 * Delete an expense by ID.
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  await adminDb.collection("expenses").doc(expenseId).delete();
}

export interface CashFlowSummary {
  totalRevenue: number;
  totalExpenses: number;
  netCashFlow: number;
  totalOrdersCount: number;
  totalExpensesCount: number;
}

/**
 * Calculate aggregated cash flow (Total Revenue from PAID orders minus Total Expenses).
 */
export async function getCashFlowSummary(): Promise<CashFlowSummary> {
  try {
    // 1. Fetch all paid orders
    const ordersSnap = await adminDb
      .collection("orders")
      .where("paymentStatus", "==", "PAID")
      .get();

    let totalRevenue = 0;
    ordersSnap.forEach((doc) => {
      const data = doc.data();
      totalRevenue += Number(data.total) || 0;
    });

    // 2. Fetch all expenses
    const expensesSnap = await adminDb.collection("expenses").get();
    let totalExpenses = 0;
    expensesSnap.forEach((doc) => {
      const data = doc.data();
      totalExpenses += Number(data.amount) || 0;
    });

    const netCashFlow = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalExpenses,
      netCashFlow,
      totalOrdersCount: ordersSnap.size,
      totalExpensesCount: expensesSnap.size,
    };
  } catch (error) {
    console.error("Error computing cash flow summary:", error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      totalOrdersCount: 0,
      totalExpensesCount: 0,
    };
  }
}
