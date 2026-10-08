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
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#52706C]">
            Total Pemasukan (Paid)
          </span>
          <span className="rounded-xl bg-[#EAF5F1] border border-[#CDE5DD] p-2 text-[#47957F]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-[#47957F]">
          {formatRupiah(summary.totalRevenue)}
        </p>
        <p className="mt-1 text-xs text-[#7A9C96]">
          Dari {summary.totalOrdersCount} transaksi berhasil
        </p>
      </div>

      {/* Total Expenses */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#52706C]">
            Total Pengeluaran
          </span>
          <span className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </span>
        </div>
        <p className="mt-2 text-2xl font-black text-rose-600">
          {formatRupiah(summary.totalExpenses)}
        </p>
        <p className="mt-1 text-xs text-[#7A9C96]">
          Dari {summary.totalExpensesCount} catatan pengeluaran
        </p>
      </div>

      {/* Net Cash Flow */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#52706C]">
            Net Cash Flow (Arus Bersih)
          </span>
          <span
            className={`rounded-xl border p-2 ${
              isNetPositive
                ? "bg-[#EAF5F1] border-[#CDE5DD] text-[#47957F]"
                : "bg-rose-50 border-rose-200 text-rose-600"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
        <p
          className={`mt-2 text-2xl font-black ${
            isNetPositive ? "text-[#183331]" : "text-rose-600"
          }`}
        >
          {formatRupiah(summary.netCashFlow)}
        </p>
        <p className="mt-1 text-xs text-[#7A9C96]">
          Pemasukan dikurangi seluruh pengeluaran
        </p>
      </div>
    </div>
  );
}
