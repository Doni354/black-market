"use client";

import { formatRupiah } from "@/lib/utils/money";
import type { CashFlowSummary } from "@/lib/db/expenses";

interface ExpenseSummaryCardsProps {
  summary: CashFlowSummary;
}

export function ExpenseSummaryCards({ summary }: ExpenseSummaryCardsProps) {
  const isNetPositive = summary.netCashFlow >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total Revenue */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Pemasukan (Paid)
          </span>
          <span className="rounded-lg bg-emerald-950/60 border border-emerald-800/60 p-1.5 text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-emerald-400">
          {formatRupiah(summary.totalRevenue)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Dari {summary.totalOrdersCount} transaksi berhasil
        </p>
      </div>

      {/* Total Expenses */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Pengeluaran
          </span>
          <span className="rounded-lg bg-red-950/60 border border-red-800/60 p-1.5 text-red-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-red-400">
          {formatRupiah(summary.totalExpenses)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Dari {summary.totalExpensesCount} catatan pengeluaran
        </p>
      </div>

      {/* Net Cash Flow */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Net Cash Flow (Arus Bersih)
          </span>
          <span
            className={`rounded-lg border p-1.5 ${
              isNetPositive
                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                : "bg-red-950/60 border-red-800/60 text-red-400"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <p
          className={`mt-2 text-2xl font-black ${
            isNetPositive ? "text-zinc-100" : "text-red-400"
          }`}
        >
          {formatRupiah(summary.netCashFlow)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Pemasukan dikurangi seluruh pengeluaran
        </p>
      </div>
    </div>
  );
}
