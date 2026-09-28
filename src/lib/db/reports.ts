import { adminDb } from "@/lib/firebase/admin";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { Order, Expense, Product, PaymentMethod, ExpenseCategory } from "@/lib/types";

export type ReportPeriod = "TODAY" | "7DAYS" | "THIS_MONTH" | "ALL" | "CUSTOM";

export interface ReportFilters {
  period?: ReportPeriod;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  total: number;
  count: number;
  percentage: number;
}

export interface SourceBreakdown {
  source: "POS" | "ONLINE";
  total: number;
  count: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  category?: string;
}

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  categoryLabel: string;
  total: number;
  count: number;
  percentage: number;
}

export interface ReportSummary {
  period: ReportPeriod;
  dateRangeLabel: string;
  // Sales Metrics
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  paymentBreakdown: PaymentMethodBreakdown[];
  sourceBreakdown: SourceBreakdown[];
  topProducts: TopProductItem[];
  // Expense Metrics
  totalExpenses: number;
  expenseCount: number;
  expenseBreakdown: ExpenseCategoryBreakdown[];
  // Cash Flow & P&L
  netCashFlow: number; // totalSales - totalExpenses
  estimatedHpp: number; // cost of goods sold
  estimatedGrossProfit: number; // totalSales - estimatedHpp
  // Inventory Overview
  totalStockUnits: number;
  totalStockAssetValue: number;
  lowStockProducts: Array<{ id: string; name: string; stock: number }>;
  // Recent transactions in period
  orders: Order[];
  expenses: Expense[];
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD_MATERIAL: "Bahan Baku Makanan / Minuman",
  MERCH_PRODUCTION: "Produksi Merchandise",
  PACKAGING: "Kemasan & Packaging",
  OPERATIONAL: "Operasional Stand",
  PROMOTION: "Promosi & Marketing",
  OTHER: "Lain-lain",
};

/**
 * Helper to convert Firestore Timestamp / ISO to JS Date
 */
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && "_seconds" in val && typeof (val as { _seconds: number })._seconds === "number") {
    return new Date((val as { _seconds: number })._seconds * 1000);
  }
  if (typeof val === "object" && "seconds" in val && typeof (val as { seconds: number }).seconds === "number") {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Aggregate sales, expenses, cash flow, and stock report data from Firestore.
 */
export async function getReportData(filters?: ReportFilters): Promise<ReportSummary> {
  const period = filters?.period || "TODAY";
  const now = new Date();

  // Compute filter start and end dates
  let startBoundary: Date | null = null;
  let endBoundary: Date | null = null;
  let dateRangeLabel = "Hari Ini";

  if (period === "TODAY") {
    startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    dateRangeLabel = now.toLocaleDateString("id-ID", { dateStyle: "long" });
  } else if (period === "7DAYS") {
    startBoundary = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startBoundary.setHours(0, 0, 0, 0);
    dateRangeLabel = "7 Hari Terakhir";
  } else if (period === "THIS_MONTH") {
    startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    dateRangeLabel = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  } else if (period === "CUSTOM" && filters?.startDate) {
    startBoundary = new Date(filters.startDate);
    if (filters.endDate) {
      endBoundary = new Date(filters.endDate);
      endBoundary.setHours(23, 59, 59, 999);
    }
    dateRangeLabel = `${startBoundary.toLocaleDateString("id-ID")} - ${endBoundary ? endBoundary.toLocaleDateString("id-ID") : "Sekarang"}`;
  } else {
    dateRangeLabel = "Semua Waktu";
  }

  // 1. Fetch Orders
  const ordersSnap = await adminDb.collection("orders").get();
  const allOrders = ordersSnap.docs.map((doc) =>
    serializeFirestoreData<Order>({ id: doc.id, ...doc.data() })
  );

  // 2. Fetch Expenses
  const expensesSnap = await adminDb.collection("expenses").get();
  const allExpenses = expensesSnap.docs.map((doc) =>
    serializeFirestoreData<Expense>({ id: doc.id, ...doc.data() })
  );

  // 3. Fetch Products for inventory metrics
  const productsSnap = await adminDb.collection("products").get();
  const allProducts = productsSnap.docs.map((doc) =>
    serializeFirestoreData<Product>({ id: doc.id, ...doc.data() })
  );

  // Filter orders by date range and paid status
  const validOrders = allOrders.filter((order) => {
    // Only count orders that have been paid or completed
    const isPaid =
      order.paymentStatus === "PAID" ||
      order.status === "PAID" ||
      order.status === "READY_FOR_REDEMPTION" ||
      order.status === "REDEEMED" ||
      order.status === "COMPLETED";

    if (!isPaid) return false;

    const orderDate = toDate(order.createdAt);
    if (!orderDate) return true;

    if (startBoundary && orderDate < startBoundary) return false;
    if (endBoundary && orderDate > endBoundary) return false;

    return true;
  });

  // Filter expenses by date range
  const validExpenses = allExpenses.filter((expense) => {
    const expenseDate = toDate(expense.createdAt);
    if (!expenseDate) return true;

    if (startBoundary && expenseDate < startBoundary) return false;
    if (endBoundary && expenseDate > endBoundary) return false;

    return true;
  });

  // Calculate Sales Metrics
  let totalSales = 0;
  let estimatedHpp = 0;
  const paymentMethodMap = new Map<PaymentMethod, { total: number; count: number }>();
  const sourceMap = new Map<"POS" | "ONLINE", { total: number; count: number }>([
    ["POS", { total: 0, count: 0 }],
    ["ONLINE", { total: 0, count: 0 }],
  ]);
  const productSalesMap = new Map<string, TopProductItem>();

  for (const order of validOrders) {
    const orderTotal = Math.round(order.total || 0);
    totalSales += orderTotal;

    // Payment method breakdown
    const method: PaymentMethod = order.paymentMethod || "CASH";
    const currMethod = paymentMethodMap.get(method) || { total: 0, count: 0 };
    paymentMethodMap.set(method, {
      total: currMethod.total + orderTotal,
      count: currMethod.count + 1,
    });

    // Source breakdown
    const src: "POS" | "ONLINE" = order.source === "ONLINE" ? "ONLINE" : "POS";
    const currSrc = sourceMap.get(src) || { total: 0, count: 0 };
    sourceMap.set(src, {
      total: currSrc.total + orderTotal,
      count: currSrc.count + 1,
    });

    // Items breakdown & HPP calculation
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.quantity || 1;
        const sub = Math.round(item.subtotal || 0);
        const cost = Math.round(item.costPrice || 0);

        estimatedHpp += cost * qty;

        const pId = item.productId || item.productName;
        const existing = productSalesMap.get(pId) || {
          productId: pId,
          productName: item.productName || "Produk",
          quantitySold: 0,
          totalRevenue: 0,
          category: item.type,
        };

        existing.quantitySold += qty;
        existing.totalRevenue += sub;
        productSalesMap.set(pId, existing);
      }
    }
  }

  // Format Payment breakdown with percentage
  const paymentBreakdown: PaymentMethodBreakdown[] = Array.from(paymentMethodMap.entries()).map(
    ([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      percentage: totalSales > 0 ? Math.round((data.total / totalSales) * 100) : 0,
    })
  );

  // Format Source breakdown
  const sourceBreakdown: SourceBreakdown[] = [
    {
      source: "POS",
      total: sourceMap.get("POS")?.total || 0,
      count: sourceMap.get("POS")?.count || 0,
    },
    {
      source: "ONLINE",
      total: sourceMap.get("ONLINE")?.total || 0,
      count: sourceMap.get("ONLINE")?.count || 0,
    },
  ];

  // Top products sorted by quantity sold
  const topProducts = Array.from(productSalesMap.values()).sort(
    (a, b) => b.quantitySold - a.quantitySold
  );

  // Calculate Expense Metrics
  let totalExpenses = 0;
  const expenseCatMap = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const exp of validExpenses) {
    const amt = Math.round(exp.amount || 0);
    totalExpenses += amt;

    const cat = exp.category || "OTHER";
    const curr = expenseCatMap.get(cat) || { total: 0, count: 0 };
    expenseCatMap.set(cat, {
      total: curr.total + amt,
      count: curr.count + 1,
    });
  }

  const expenseBreakdown: ExpenseCategoryBreakdown[] = Array.from(expenseCatMap.entries()).map(
    ([category, data]) => ({
      category,
      categoryLabel: EXPENSE_CATEGORY_LABELS[category] || category,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0,
    })
  );

  // Sort expense breakdown by total descending
  expenseBreakdown.sort((a, b) => b.total - a.total);

  // Inventory Metrics
  let totalStockUnits = 0;
  let totalStockAssetValue = 0;
  const lowStockProducts: Array<{ id: string; name: string; stock: number }> = [];

  for (const prod of allProducts) {
    if (prod.isActive && prod.trackInventory) {
      totalStockUnits += prod.stock || 0;
      totalStockAssetValue += (prod.stock || 0) * (prod.costPrice || prod.price || 0);

      if (prod.stock <= 5) {
        lowStockProducts.push({
          id: prod.id,
          name: prod.name,
          stock: prod.stock,
        });
      }
    }
  }

  // Sort low stock ascending
  lowStockProducts.sort((a, b) => a.stock - b.stock);

  // Net Cash Flow and Gross Profit
  const netCashFlow = totalSales - totalExpenses;
  const estimatedGrossProfit = totalSales - estimatedHpp;
  const averageOrderValue = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;

  return {
    period,
    dateRangeLabel,
    totalSales,
    totalOrders: validOrders.length,
    averageOrderValue,
    paymentBreakdown,
    sourceBreakdown,
    topProducts,
    totalExpenses,
    expenseCount: validExpenses.length,
    expenseBreakdown,
    netCashFlow,
    estimatedHpp,
    estimatedGrossProfit,
    totalStockUnits,
    totalStockAssetValue,
    lowStockProducts,
    orders: validOrders.slice(0, 50),
    expenses: validExpenses.slice(0, 50),
  };
}
