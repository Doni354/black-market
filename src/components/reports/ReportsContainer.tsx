"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/utils/money";
import { getReportsAction } from "@/lib/actions/reports";
import { useToast } from "@/components/ui/Toast";
import type { ReportSummary, ReportPeriod } from "@/lib/db/reports";

interface ReportsContainerProps {
  initialData: ReportSummary;
}

export function ReportsContainer({ initialData }: ReportsContainerProps) {
  const { toast } = useToast();
  const [data, setData] = useState<ReportSummary>(initialData);
  const [activePeriod, setActivePeriod] = useState<ReportPeriod>(initialData.period);
  const [activeTab, setActiveTab] = useState<"SALES" | "EXPENSES" | "CASHFLOW" | "INVENTORY">("SALES");
  const [loading, setLoading] = useState(false);

  async function handleFilterChange(period: ReportPeriod) {
    setActivePeriod(period);
    setLoading(true);
    try {
      const res = await getReportsAction({ period });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal memperbarui data laporan.");
      }
      setData(res.data);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal memuat laporan.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div id="printable-report" className="space-y-6 pb-20">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Laporan & Analisis Bisnis
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau arus kas, laba kotor, performa penjualan produk, dan pengeluaran stand.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.75A2.25 2.25 0 0015.75 1.5h-7.5A2.25 2.25 0 006 3.75v3.206" />
            </svg>
            Cetak Laporan / PDF
          </button>
        </div>
      </div>

      {/* Period Filter Selector */}
      <div className="flex items-center gap-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 w-fit overflow-x-auto print:hidden">
        {(
          [
            { id: "TODAY", label: "Hari Ini" },
            { id: "7DAYS", label: "7 Hari Terakhir" },
            { id: "THIS_MONTH", label: "Bulan Ini" },
            { id: "ALL", label: "Semua Waktu" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={loading}
            onClick={() => handleFilterChange(item.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activePeriod === item.id
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block border-b border-zinc-800 pb-4 mb-4 text-center">
        <h2 className="text-xl font-bold uppercase tracking-wider text-black">
          Laporan Keuangan & Penjualan Black Market
        </h2>
        <p className="text-xs text-zinc-600 mt-1">
          Periode: {data.dateRangeLabel} • Dicetak pada: {new Date().toLocaleString("id-ID")}
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Total Penjualan Kotor
          </span>
          <p className="text-2xl font-black text-zinc-100 font-mono mt-1">
            {formatRupiah(data.totalSales)}
          </p>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">{data.totalOrders} order</span>
            <span>• Rata-rata: {formatRupiah(data.averageOrderValue)}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Total Pengeluaran Stand
          </span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">
            {formatRupiah(data.totalExpenses)}
          </p>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">{data.expenseCount} transaksi beban</span>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs relative overflow-hidden">
          <div
            className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none ${
              data.netCashFlow >= 0 ? "bg-emerald-600/10" : "bg-red-600/10"
            }`}
          />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Arus Kas Bersih (Net Cash Flow)
          </span>
          <p
            className={`text-2xl font-black font-mono mt-1 ${
              data.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {data.netCashFlow >= 0 ? "+" : ""}
            {formatRupiah(data.netCashFlow)}
          </p>
          <div className="mt-2 text-[11px] text-zinc-400">
            Penjualan dikurangi seluruh pengeluaran
          </div>
        </div>

        {/* Estimated Gross Profit (Laba Kotor Produk) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Estimasi Laba Kotor Produk
          </span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">
            {formatRupiah(data.estimatedGrossProfit)}
          </p>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1">
            <span>Beban HPP:</span>
            <span className="font-mono text-zinc-300">{formatRupiah(data.estimatedHpp)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-800 overflow-x-auto print:hidden">
        {(
          [
            { id: "SALES", label: "Analisis Penjualan" },
            { id: "EXPENSES", label: "Rincian Beban / Pengeluaran" },
            { id: "CASHFLOW", label: "Arus Kas & Laba Rugi" },
            { id: "INVENTORY", label: "Produk & Inventaris" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "border-red-500 text-red-400 bg-red-600/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Sales Analysis */}
      {(activeTab === "SALES" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "SALES" ? "print:block hidden" : "block"}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Distribusi Metode Pembayaran
              </h3>

              {data.paymentBreakdown.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">Belum ada transaksi penjualan.</p>
              ) : (
                <div className="space-y-3">
                  {data.paymentBreakdown.map((pm) => (
                    <div key={pm.method} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-zinc-200">
                          {pm.method} ({pm.count}x)
                        </span>
                        <span className="font-mono text-zinc-300 font-bold">
                          {formatRupiah(pm.total)}{" "}
                          <span className="text-zinc-500 text-[10px]">({pm.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pm.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source Distribution: POS vs Online */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Kanal Penjualan (POS vs Online Pre-Order)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {data.sourceBreakdown.map((src) => (
                  <div
                    key={src.source}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-1"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {src.source === "POS" ? "Langsung di Kasir (POS)" : "Online Pre-Order"}
                    </span>
                    <p className="text-lg font-bold text-zinc-100 font-mono mt-1">
                      {formatRupiah(src.total)}
                    </p>
                    <p className="text-[11px] text-zinc-500">{src.count} pesanan</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Selling Products Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Peringkat Produk Terlaris (Top Selling Products)
            </h3>

            {data.topProducts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Belum ada data penjualan produk.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-zinc-950/60 uppercase tracking-wider text-[10px] text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-center">#</th>
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 text-center">Kategori</th>
                      <th className="px-4 py-3 text-center">Qty Terjual</th>
                      <th className="px-4 py-3 text-right">Total Omset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {data.topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3 text-center font-bold font-mono text-zinc-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-100">
                          {p.productName}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-300">
                            {p.category || "PRODUK"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-zinc-200">
                          {p.quantitySold} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-400">
                          {formatRupiah(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Expenses Breakdown */}
      {(activeTab === "EXPENSES" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "EXPENSES" ? "print:block hidden" : "block"}`}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Rincian Pengeluaran per Kategori
            </h3>

            {data.expenseBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Belum ada data pengeluaran pada periode ini.</p>
            ) : (
              <div className="space-y-4">
                {data.expenseBreakdown.map((exp) => (
                  <div key={exp.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="font-semibold text-zinc-200">{exp.categoryLabel}</span>
                        <span className="text-zinc-500 text-[11px] ml-2">({exp.count} transaksi)</span>
                      </div>
                      <span className="font-mono text-amber-400 font-bold">
                        {formatRupiah(exp.total)}{" "}
                        <span className="text-zinc-500 text-[10px]">({exp.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${exp.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Cash Flow & P&L Statement */}
      {(activeTab === "CASHFLOW" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "CASHFLOW" ? "print:block hidden" : "block"}`}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Ringkasan Laporan Laba Rugi & Arus Kas
            </h3>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-300">
                <span>Total Penerimaan Kas (Pendapatan Penjualan)</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  +{formatRupiah(data.totalSales)}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-300">
                <span>Total Beban Pokok Penjualan (HPP Bahan / Produksi Terjual)</span>
                <span className="font-mono font-semibold text-zinc-400">
                  -{formatRupiah(data.estimatedHpp)}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center font-bold text-zinc-100">
                <span>Estimasi Laba Kotor Produk</span>
                <span className="font-mono text-blue-400 text-sm">
                  {formatRupiah(data.estimatedGrossProfit)}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-300 pt-1">
                <span>Total Seluruh Beban & Biaya Operasional (Expenses)</span>
                <span className="font-mono font-semibold text-amber-400">
                  -{formatRupiah(data.totalExpenses)}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-dashed border-zinc-800 flex justify-between items-center text-sm font-black">
                <span className="text-zinc-100">Arus Kas Bersih (Net Cash Flow)</span>
                <span
                  className={`font-mono text-base ${
                    data.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {data.netCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(data.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory & Stock Status */}
      {(activeTab === "INVENTORY" || typeof window !== "undefined") && (
        <div className={`space-y-6 ${activeTab !== "INVENTORY" ? "print:block hidden" : "block"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold">
                Total Unit Stok Tersedia
              </span>
              <p className="text-2xl font-bold font-mono text-zinc-100 mt-1">
                {data.totalStockUnits} pcs
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold">
                Estimasi Nilai Aset Stok
              </span>
              <p className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {formatRupiah(data.totalStockAssetValue)}
              </p>
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Peringatan Stok Menipis (Sisa ≤ 5)
            </h3>

            {data.lowStockProducts.length === 0 ? (
              <p className="text-xs text-emerald-400 py-3">Semua produk memiliki stok yang aman (&gt; 5 pcs).</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.lowStockProducts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-amber-900/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-zinc-200 truncate max-w-[160px]">
                      {item.name}
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        item.stock <= 0
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {item.stock <= 0 ? "HABIS" : `${item.stock} pcs`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
