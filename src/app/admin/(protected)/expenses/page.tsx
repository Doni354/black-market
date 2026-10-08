import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getExpenses, getCashFlowSummary } from "@/lib/db/expenses";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { ExpenseSummaryCards } from "@/components/expenses/ExpenseSummaryCards";

export const metadata: Metadata = {
  title: "Pengeluaran & Cash Flow | Noury",
  description: "Catatan biaya operasional, pembelian bahan baku buah & kemasan, dan ringkasan arus kas.",
};

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [user, expenses, summary] = await Promise.all([
    getCurrentUser(),
    getExpenses({ limit: 100 }),
    getCashFlowSummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#183331]">
          Pengeluaran & Arus Kas
        </h1>
        <p className="mt-1 text-sm text-[#52706C]">
          Catat pengeluaran bahan baku buah segar, es batu, cup kemasan, dan pantau arus kas bersih (net cash flow).
        </p>
      </div>

      {/* Cash Flow Summary Cards */}
      <ExpenseSummaryCards summary={summary} />

      {/* Expenses Table */}
      <ExpenseTable
        initialExpenses={expenses}
        userRole={user?.role || "CASHIER"}
      />
    </div>
  );
}
