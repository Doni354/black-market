"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils/money";
import { getReportsAction } from "@/lib/actions/reports";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import type { ReportSummary, ReportPeriod } from "@/lib/db/reports";
import type { Order, OrderItem } from "@/lib/types";

interface ReportsContainerProps {
  initialData: ReportSummary;
}

export function ReportsContainer({ initialData }: ReportsContainerProps) {
  const { toast } = useToast();
  const [data, setData] = useState<ReportSummary>(initialData);
  const [activePeriod, setActivePeriod] = useState<ReportPeriod>(initialData.period);
  const [mainView, setMainView] = useState<"FINANCIAL" | "AUDIT">("FINANCIAL");
  const [financialTab, setFinancialTab] = useState<
    "SALES" | "EXPENSES" | "CASHFLOW" | "INVENTORY"
  >("SALES");
  const [loading, setLoading] = useState(false);

  // Printing state
  const [printTarget, setPrintTarget] = useState<"FINANCIAL" | "AUDIT">("FINANCIAL");

  // Audit filter state
  const [auditSearch, setAuditSearch] = useState("");
  const [auditPaymentFilter, setAuditPaymentFilter] = useState<string>("ALL");
  const [auditOnlyWithProof, setAuditOnlyWithProof] = useState(false);

  // Image modal preview
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

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

  function handleTriggerPrint(target: "FINANCIAL" | "AUDIT") {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Filtered orders for audit tab
  const filteredAuditOrders = useMemo(() => {
    const list = data.allPeriodOrders && data.allPeriodOrders.length > 0 ? data.allPeriodOrders : data.orders;
    return list.filter((order) => {
      if (auditPaymentFilter !== "ALL" && order.paymentMethod !== auditPaymentFilter) {
        return false;
      }
      if (auditOnlyWithProof && !order.proofUrl) {
        return false;
      }
      if (auditSearch.trim()) {
        const query = auditSearch.toLowerCase().trim();
        const matchNumber = order.orderNumber.toLowerCase().includes(query);
        const matchCust = order.customerName?.toLowerCase().includes(query);
        const matchPhone = order.customerPhone?.includes(query);
        const matchItem = order.items?.some((item) =>
          item.productName.toLowerCase().includes(query)
        );
        return matchNumber || matchCust || matchPhone || matchItem;
      }
      return true;
    });
  }, [data, auditSearch, auditPaymentFilter, auditOnlyWithProof]);

  const auditStats = useMemo(() => {
    const ordersToAnalyze = filteredAuditOrders;
    let totalNominal = 0;
    let withProofCount = 0;
    let totalItemsSold = 0;

    for (const o of ordersToAnalyze) {
      totalNominal += Math.round(o.total || 0);
      if (o.proofUrl) withProofCount++;
      if (o.items && Array.isArray(o.items)) {
        for (const it of o.items) {
          totalItemsSold += it.quantity || 1;
        }
      }
    }

    return {
      count: ordersToAnalyze.length,
      totalNominal,
      withProofCount,
      totalItemsSold,
    };
  }, [filteredAuditOrders]);

  const printDateStr = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SCREEN VIEW (Interactive Dashboard & Audit Dossier)                      */}
      {/* ========================================================================= */}
      <div className="space-y-6 pb-20 print:hidden">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <span>Laporan & Audit Bisnis</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#47957F]/10 border border-[#47957F]/30 text-[#3D8383] font-mono font-bold">
                Anti-Kecurangan
              </span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1 max-w-xl">
              Pantau arus kas, laba rugi, performa menu, serta cetak bukti transaksi otentik
              beserta foto bukti transfer/QRIS untuk bahan penilaian stand Noury.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Print Financial Report Button */}
            <button
              type="button"
              onClick={() => handleTriggerPrint("FINANCIAL")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Cetak Laporan Keuangan (PDF)
            </button>

            {/* Print Audit Dossier Button */}
            <button
              type="button"
              onClick={() => handleTriggerPrint("AUDIT")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white font-bold text-xs transition shadow-md shadow-[#47957F]/20 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Cetak Buku Audit & Bukti (PDF)
            </button>
          </div>
        </div>

        {/* Period Filter Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[#F0F6F4] rounded-2xl border border-[#E2ECE8] w-fit overflow-x-auto">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activePeriod === item.id
                    ? "bg-[#47957F] text-white shadow-xs"
                    : "text-[#52706C] hover:text-[#183331]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#52706C] font-mono">
            Periode: <strong className="text-[#183331]">{data.dateRangeLabel}</strong>
          </span>
        </div>

        {/* Main View Mode Switcher: Financial Analysis vs Audit Dossier */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#F0F6F4] border border-[#E2ECE8]">
          <button
            type="button"
            onClick={() => setMainView("FINANCIAL")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              mainView === "FINANCIAL"
                ? "bg-white text-[#183331] shadow-xs border border-[#E2ECE8]"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            <span>Analisis Keuangan & Penjualan</span>
          </button>

          <button
            type="button"
            onClick={() => setMainView("AUDIT")}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              mainView === "AUDIT"
                ? "bg-[#47957F] text-white shadow-xs"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            <span>Buku Audit Transaksi & Bukti Pembayaran</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mainView === "AUDIT" ? "bg-white/20 text-white" : "bg-[#EAF5F1] text-[#3D8383]"}`}>
              {filteredAuditOrders.length}
            </span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: FINANCIAL ANALYSIS                                    */}
        {/* ------------------------------------------------------------- */}
        {mainView === "FINANCIAL" && (
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs relative overflow-hidden transition hover:shadow-md">
                <div className="absolute top-0 right-0 w-28 h-28 bg-[#47957F]/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[11px] font-bold text-[#52706C] uppercase tracking-wider">
                  Total Penjualan Kotor
                </span>
                <p className="text-2xl font-black text-[#183331] font-mono mt-1">
                  {formatRupiah(data.totalSales)}
                </p>
                <div className="mt-2 text-[11px] text-[#52706C] flex items-center gap-1.5">
                  <span className="text-[#47957F] font-bold">{data.totalOrders} order</span>
                  <span>• Rata-rata: {formatRupiah(data.averageOrderValue)}</span>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs relative overflow-hidden transition hover:shadow-md">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[11px] font-bold text-[#52706C] uppercase tracking-wider">
                  Total Pengeluaran Stand
                </span>
                <p className="text-2xl font-black text-amber-700 font-mono mt-1">
                  {formatRupiah(data.totalExpenses)}
                </p>
                <div className="mt-2 text-[11px] text-[#52706C] flex items-center gap-1.5">
                  <span className="text-amber-700 font-bold">{data.expenseCount} transaksi beban</span>
                </div>
              </div>

              {/* Net Cash Flow */}
              <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs relative overflow-hidden transition hover:shadow-md">
                <div
                  className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                    data.netCashFlow >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
                  }`}
                />
                <span className="text-[11px] font-bold text-[#52706C] uppercase tracking-wider">
                  Arus Kas Bersih (Net Cash Flow)
                </span>
                <p
                  className={`text-2xl font-black font-mono mt-1 ${
                    data.netCashFlow >= 0 ? "text-[#3D8383]" : "text-rose-600"
                  }`}
                >
                  {data.netCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(data.netCashFlow)}
                </p>
                <div className="mt-2 text-[11px] text-[#52706C]">
                  Penjualan dikurangi seluruh pengeluaran
                </div>
              </div>

              {/* Estimated Gross Profit (Laba Kotor Produk) */}
              <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs relative overflow-hidden transition hover:shadow-md">
                <div className="absolute top-0 right-0 w-28 h-28 bg-[#CDD272]/20 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[11px] font-bold text-[#52706C] uppercase tracking-wider">
                  Estimasi Laba Kotor Produk
                </span>
                <p className="text-2xl font-black text-[#47957F] font-mono mt-1">
                  {formatRupiah(data.estimatedGrossProfit)}
                </p>
                <div className="mt-2 text-[11px] text-[#52706C] flex items-center gap-1">
                  <span>Beban HPP:</span>
                  <span className="font-mono font-bold text-[#183331]">{formatRupiah(data.estimatedHpp)}</span>
                </div>
              </div>
            </div>

            {/* Sub-Tabs Navigation for Financial Dashboard */}
            <div className="flex border-b border-[#E2ECE8] overflow-x-auto gap-1">
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
                  onClick={() => setFinancialTab(tab.id)}
                  className={`px-4 py-3 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer rounded-t-xl ${
                    financialTab === tab.id
                      ? "border-[#47957F] text-[#47957F] bg-[#EAF5F1]/70"
                      : "border-transparent text-[#52706C] hover:text-[#183331] hover:bg-zinc-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Financial Sub-Tab Content */}
            {financialTab === "SALES" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Method Breakdown */}
                  <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs">
                    <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#47957F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Distribusi Metode Pembayaran
                    </h3>

                    {data.paymentBreakdown.length === 0 ? (
                      <p className="text-xs text-[#7A9C96] py-6 text-center">Belum ada transaksi penjualan.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.paymentBreakdown.map((pm) => (
                          <div key={pm.method} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-[#183331]">
                                {pm.method} ({pm.count}x)
                              </span>
                              <span className="font-mono text-[#183331] font-bold">
                                {formatRupiah(pm.total)}{" "}
                                <span className="text-[#52706C] text-[10px]">({pm.percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-[#EAF5F1] rounded-full h-2.5 overflow-hidden border border-[#E2ECE8]">
                              <div
                                className="bg-gradient-to-r from-[#47957F] to-[#3D8383] h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${pm.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Source Distribution: POS vs Online */}
                  <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs">
                    <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#3D8383]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Kanal Penjualan (POS vs Online Pre-Order)
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      {data.sourceBreakdown.map((src) => (
                        <div
                          key={src.source}
                          className="p-4 rounded-xl bg-[#FAFCFB] border border-[#E2ECE8] flex flex-col gap-1"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#52706C]">
                            {src.source === "POS" ? "Langsung di Kasir (POS)" : "Online Pre-Order"}
                          </span>
                          <p className="text-lg font-bold text-[#183331] font-mono mt-1">
                            {formatRupiah(src.total)}
                          </p>
                          <p className="text-[11px] text-[#7A9C96]">{src.count} pesanan</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Selling Products Table */}
                <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Peringkat Produk Terlaris (Top Selling Products)
                  </h3>

                  {data.topProducts.length === 0 ? (
                    <p className="text-xs text-[#7A9C96] py-6 text-center">Belum ada data penjualan produk.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#254440]">
                        <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] uppercase tracking-wider text-[10px] text-[#52706C] font-bold">
                          <tr>
                            <th className="px-4 py-3 text-center">#</th>
                            <th className="px-4 py-3">Nama Produk</th>
                            <th className="px-4 py-3 text-center">Kategori</th>
                            <th className="px-4 py-3 text-center">Qty Terjual</th>
                            <th className="px-4 py-3 text-right">Total Omset</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2ECE8]">
                          {data.topProducts.map((p, idx) => (
                            <tr key={p.productId} className="hover:bg-[#F3F8F6]/60 transition-colors">
                              <td className="px-4 py-3 text-center font-bold font-mono text-[#7A9C96]">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#183331]">
                                {p.productName}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5F1] text-[10px] font-medium text-[#3D8383] border border-[#E2ECE8]">
                                  {p.category || "PRODUK"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-[#183331]">
                                {p.quantitySold} pcs
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-[#47957F]">
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

            {financialTab === "EXPENSES" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Rincian Pengeluaran per Kategori
                  </h3>

                  {data.expenseBreakdown.length === 0 ? (
                    <p className="text-xs text-[#7A9C96] py-6 text-center">Belum ada data pengeluaran pada periode ini.</p>
                  ) : (
                    <div className="space-y-4">
                      {data.expenseBreakdown.map((exp) => (
                        <div key={exp.category} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <div>
                              <span className="font-semibold text-[#183331]">{exp.categoryLabel}</span>
                              <span className="text-[#7A9C96] text-[11px] ml-2">({exp.count} transaksi)</span>
                            </div>
                            <span className="font-mono text-amber-700 font-bold">
                              {formatRupiah(exp.total)}{" "}
                              <span className="text-[#52706C] text-[10px]">({exp.percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-amber-50 rounded-full h-2.5 overflow-hidden border border-amber-200/60">
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

            {financialTab === "CASHFLOW" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#47957F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Ringkasan Laporan Laba Rugi & Arus Kas
                  </h3>

                  <div className="rounded-xl border border-[#E2ECE8] bg-[#FAFCFB] p-5 space-y-3.5 text-xs">
                    <div className="flex justify-between items-center text-[#254440]">
                      <span>Total Penerimaan Kas (Pendapatan Penjualan)</span>
                      <span className="font-mono font-bold text-[#47957F] text-sm">
                        +{formatRupiah(data.totalSales)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#254440]">
                      <span>Total Beban Pokok Penjualan (HPP Bahan / Produksi Terjual)</span>
                      <span className="font-mono font-semibold text-[#52706C]">
                        -{formatRupiah(data.estimatedHpp)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E2ECE8] flex justify-between items-center font-bold text-[#183331]">
                      <span>Estimasi Laba Kotor Produk</span>
                      <span className="font-mono text-[#3D8383] text-sm">
                        {formatRupiah(data.estimatedGrossProfit)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#254440] pt-1">
                      <span>Total Seluruh Beban & Biaya Operasional (Expenses)</span>
                      <span className="font-mono font-semibold text-amber-700">
                        -{formatRupiah(data.totalExpenses)}
                      </span>
                    </div>

                    <div className="pt-3.5 border-t-2 border-dashed border-[#E2ECE8] flex justify-between items-center text-sm font-black">
                      <span className="text-[#183331]">Arus Kas Bersih (Net Cash Flow)</span>
                      <span
                        className={`font-mono text-base ${
                          data.netCashFlow >= 0 ? "text-[#47957F]" : "text-rose-600"
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

            {financialTab === "INVENTORY" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-[#E2ECE8] shadow-xs">
                    <span className="text-[11px] text-[#52706C] uppercase font-semibold">
                      Total Unit Stok Tersedia
                    </span>
                    <p className="text-2xl font-bold font-mono text-[#183331] mt-1">
                      {data.totalStockUnits} pcs
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#E2ECE8] shadow-xs">
                    <span className="text-[11px] text-[#52706C] uppercase font-semibold">
                      Estimasi Nilai Aset Stok
                    </span>
                    <p className="text-2xl font-bold font-mono text-[#3D8383] mt-1">
                      {formatRupiah(data.totalStockAssetValue)}
                    </p>
                  </div>
                </div>

                {/* Low stock alerts */}
                <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-[#183331] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Peringatan Stok Menipis (Sisa ≤ 5)
                  </h3>

                  {data.lowStockProducts.length === 0 ? (
                    <p className="text-xs text-[#47957F] py-3">Semua produk memiliki stok yang aman (&gt; 5 pcs).</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.lowStockProducts.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#FAFCFB] border border-amber-200/80 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-[#183331] truncate max-w-[160px]">
                            {item.name}
                          </span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              item.stock <= 0
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
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
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: AUDIT DOSSIER & PAYMENT PROOFS                        */}
        {/* ------------------------------------------------------------- */}
        {mainView === "AUDIT" && (
          <div className="space-y-4">
            {/* Audit Summary Banner */}
            <div className="rounded-2xl border border-[#E2ECE8] bg-gradient-to-r from-[#EAF5F1] via-white to-[#CEE4EC]/30 p-5 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
                <div>
                  <span className="text-[10px] text-[#52706C] uppercase font-bold tracking-wider">
                    Total Transaksi
                  </span>
                  <p className="text-xl font-black font-mono text-[#183331] mt-0.5">
                    {auditStats.count} order
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#52706C] uppercase font-bold tracking-wider">
                    Total Omset Riil
                  </span>
                  <p className="text-xl font-black font-mono text-[#47957F] mt-0.5">
                    {formatRupiah(auditStats.totalNominal)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#52706C] uppercase font-bold tracking-wider">
                    Item Terjual
                  </span>
                  <p className="text-xl font-black font-mono text-[#183331] mt-0.5">
                    {auditStats.totalItemsSold} pcs
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#52706C] uppercase font-bold tracking-wider">
                    Bukti Transfer/QRIS
                  </span>
                  <p className="text-xl font-black font-mono text-[#3D8383] mt-0.5">
                    {auditStats.withProofCount} foto bukti
                  </p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari no. order, nama pelanggan, WA, atau produk..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#E2ECE8] bg-white px-3.5 py-2 pl-9 text-xs text-[#183331] placeholder:text-[#7A9C96] focus:outline-none focus:border-[#47957F] focus:ring-1 focus:ring-[#47957F] shadow-xs"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-[#7A9C96]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={auditPaymentFilter}
                  onChange={(e) => setAuditPaymentFilter(e.target.value)}
                  className="rounded-xl border border-[#E2ECE8] bg-white px-3 py-2 text-xs font-semibold text-[#183331] focus:outline-none focus:border-[#47957F] cursor-pointer shadow-xs"
                >
                  <option value="ALL">Semua Metode</option>
                  <option value="QRIS">QRIS</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Tunai (Cash)</option>
                  <option value="COD">COD</option>
                </select>

                <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2ECE8] bg-white text-xs font-semibold text-[#183331] cursor-pointer whitespace-nowrap hover:bg-[#F3F8F6] shadow-xs">
                  <input
                    type="checkbox"
                    checked={auditOnlyWithProof}
                    onChange={(e) => setAuditOnlyWithProof(e.target.checked)}
                    className="rounded text-[#47957F] focus:ring-[#47957F]"
                  />
                  <span>Ada Foto Bukti</span>
                </label>
              </div>
            </div>

            {/* Audit Transactions Table */}
            <div className="rounded-2xl border border-[#E2ECE8] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] text-[#52706C] font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">No. Order & Waktu</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Rincian Item</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Bukti Pembayaran</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2ECE8]">
                    {filteredAuditOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7A9C96]">
                          Tidak ada transaksi yang sesuai kriteria pencarian audit.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditOrders.map((order) => {
                        const dateStr =
                          typeof order.createdAt === "string"
                            ? new Date(order.createdAt).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—";

                        return (
                          <tr key={order.id} className="hover:bg-[#F3F8F6]/60 transition">
                            {/* Order Number & Timestamp */}
                            <td className="py-3.5 px-4 font-mono">
                              <p className="font-bold text-[#47957F]">#{order.orderNumber}</p>
                              <p className="text-[10px] text-[#7A9C96] mt-0.5">{dateStr}</p>
                              {order.source && (
                                <span className="inline-block mt-1 text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#EAF5F1] text-[#3D8383] font-semibold border border-[#E2ECE8]">
                                  {order.source}
                                </span>
                              )}
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-[#183331]">
                                {order.customerName || "Umum / Walk-in"}
                              </p>
                              {order.customerPhone && (
                                <p className="text-[10px] font-mono text-[#52706C] mt-0.5">
                                  {order.customerPhone}
                                </p>
                              )}
                            </td>

                            {/* Items */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1 max-w-xs">
                                {order.items && order.items.length > 0 ? (
                                  order.items.map((it, idx) => (
                                    <div key={idx} className="text-[11px] text-[#254440]">
                                      <span className="font-bold text-[#183331]">{it.quantity}x</span>{" "}
                                      <span>{it.productName}</span>{" "}
                                      <span className="text-[#7A9C96] font-mono text-[10px]">
                                        (@{formatRupiah(it.unitPrice)})
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[#7A9C96] italic">Transaksi Langsung</span>
                                )}
                              </div>
                            </td>

                            {/* Payment Method */}
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-[#EAF5F1] border border-[#E2ECE8] text-[#3D8383] font-mono font-bold text-[11px]">
                                {order.paymentMethod || "CASH"}
                              </span>
                            </td>

                            {/* Total */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-[#183331]">
                              {formatRupiah(order.total)}
                            </td>

                            {/* Proof Image / Cashier Validation */}
                            <td className="py-3.5 px-4 text-center">
                              {order.proofUrl ? (
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewProofUrl(order.proofUrl!)}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#47957F]/40 hover:border-[#47957F] transition cursor-pointer group shadow-xs"
                                    title="Klik untuk memperbesar bukti pembayaran"
                                  >
                                    <Image
                                      src={order.proofUrl}
                                      alt="Bukti Bayar"
                                      fill
                                      className="object-cover group-hover:scale-105 transition"
                                      unoptimized
                                    />
                                    <div className="absolute inset-0 bg-[#183331]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <span className="text-[9px] text-white font-bold">Zoom</span>
                                    </div>
                                  </button>
                                  <span className="text-[9px] text-[#47957F] font-semibold font-mono">
                                    ✓ Bukti Foto
                                  </span>
                                </div>
                              ) : order.paymentMethod === "CASH" || order.paymentMethod === "COD" ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="px-2 py-0.5 rounded-md bg-[#EAF5F1] border border-[#E2ECE8] text-[10px] font-semibold text-[#3D8383]">
                                    Tunai di Kasir
                                  </span>
                                  <span className="text-[9px] text-[#7A9C96] mt-0.5">Validasi Fisik</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#7A9C96] italic">Tanpa Foto</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  order.status === "COMPLETED" || order.status === "REDEEMED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : order.status === "READY_FOR_REDEMPTION"
                                    ? "bg-[#EAF5F1] text-[#3D8383] border border-[#47957F]/30"
                                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PRINT TEMPLATE: FINANCIAL REPORT (Cetak Laporan Keuangan)               */}
      {/* ========================================================================= */}
      <div
        id="printable-financial-report"
        className={`hidden text-black font-sans bg-white p-4 leading-normal ${
          printTarget === "FINANCIAL" ? "print:block" : ""
        }`}
      >
        {/* Header Dokumen Formal */}
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black uppercase tracking-wider text-black">
            NOURY — NO WORRIES (FRESH & HEALTHY LIVING)
          </h2>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mt-0.5">
            LAPORAN KEUANGAN RESMI & KINERJA BISNIS ENTREPRENEURSHIP
          </h3>
          <p className="text-xs text-zinc-600 mt-1">
            Periode Laporan: <strong>{data.dateRangeLabel}</strong> • Dicetak: {printDateStr}
          </p>
        </div>

        {/* I. Ringkasan Eksekutif & KPI */}
        <div className="mb-5">
          <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
            I. Ringkasan Eksekutif & Posisi Keuangan
          </h4>
          <table className="w-full text-xs border border-black border-collapse text-left">
            <tbody>
              <tr className="border-b border-zinc-300">
                <td className="p-2 font-bold bg-zinc-100 w-1/2">Total Penjualan Kotor (Omset)</td>
                <td className="p-2 font-mono font-bold text-right">{formatRupiah(data.totalSales)}</td>
              </tr>
              <tr className="border-b border-zinc-300">
                <td className="p-2 font-bold bg-zinc-100">Beban Pokok Penjualan (HPP Bahan/Produksi)</td>
                <td className="p-2 font-mono text-right">-{formatRupiah(data.estimatedHpp)}</td>
              </tr>
              <tr className="border-b border-zinc-300">
                <td className="p-2 font-bold bg-zinc-100">Estimasi Laba Kotor Produk</td>
                <td className="p-2 font-mono font-bold text-right">{formatRupiah(data.estimatedGrossProfit)}</td>
              </tr>
              <tr className="border-b border-zinc-300">
                <td className="p-2 font-bold bg-zinc-100">Total Seluruh Beban Operasional Stand</td>
                <td className="p-2 font-mono text-right">-{formatRupiah(data.totalExpenses)}</td>
              </tr>
              <tr className="border-b-2 border-black bg-zinc-200">
                <td className="p-2 font-black text-sm">Arus Kas Bersih (Net Cash Flow Stand)</td>
                <td className="p-2 font-mono font-black text-sm text-right">
                  {data.netCashFlow >= 0 ? "+" : ""}
                  {formatRupiah(data.netCashFlow)}
                </td>
              </tr>
              <tr>
                <td className="p-2 bg-zinc-50">Volume Transaksi & Rata-rata Nilai Order</td>
                <td className="p-2 text-right">
                  {data.totalOrders} Transaksi (Rata-rata: {formatRupiah(data.averageOrderValue)})
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* II. Analisis Penjualan & Distribusi Metode Bayar */}
        <div className="mb-5 page-break-inside-avoid">
          <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
            II. Distribusi Metode Pembayaran & Kanal Penjualan
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <table className="w-full text-xs border border-black border-collapse text-left">
              <thead>
                <tr className="bg-zinc-100 border-b border-black">
                  <th className="p-1.5 font-bold">Metode Bayar</th>
                  <th className="p-1.5 text-center font-bold">Frekuensi</th>
                  <th className="p-1.5 text-right font-bold">Total Nominal</th>
                  <th className="p-1.5 text-right font-bold">%</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentBreakdown.map((pm) => (
                  <tr key={pm.method} className="border-b border-zinc-300">
                    <td className="p-1.5 font-semibold">{pm.method}</td>
                    <td className="p-1.5 text-center">{pm.count}x</td>
                    <td className="p-1.5 text-right font-mono">{formatRupiah(pm.total)}</td>
                    <td className="p-1.5 text-right font-mono">{pm.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full text-xs border border-black border-collapse text-left">
              <thead>
                <tr className="bg-zinc-100 border-b border-black">
                  <th className="p-1.5 font-bold">Kanal Penjualan</th>
                  <th className="p-1.5 text-center font-bold">Order</th>
                  <th className="p-1.5 text-right font-bold">Total Omset</th>
                </tr>
              </thead>
              <tbody>
                {data.sourceBreakdown.map((s) => (
                  <tr key={s.source} className="border-b border-zinc-300">
                    <td className="p-1.5 font-semibold">
                      {s.source === "POS" ? "Langsung di Kasir (POS)" : "Online Pre-Order"}
                    </td>
                    <td className="p-1.5 text-center">{s.count} pesanan</td>
                    <td className="p-1.5 text-right font-mono">{formatRupiah(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* III. Peringkat Produk Terlaris */}
        <div className="mb-5 page-break-inside-avoid">
          <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
            III. Peringkat Penjualan Produk (Top Selling Items)
          </h4>
          <table className="w-full text-xs border border-black border-collapse text-left">
            <thead>
              <tr className="bg-zinc-100 border-b border-black">
                <th className="p-1.5 text-center w-8">#</th>
                <th className="p-1.5 font-bold">Nama Produk</th>
                <th className="p-1.5 text-center font-bold">Kategori</th>
                <th className="p-1.5 text-center font-bold">Qty Terjual</th>
                <th className="p-1.5 text-right font-bold">Total Omset</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, idx) => (
                <tr key={p.productId} className="border-b border-zinc-300">
                  <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="p-1.5 font-semibold">{p.productName}</td>
                  <td className="p-1.5 text-center">{p.category || "-"}</td>
                  <td className="p-1.5 text-center font-mono font-bold">{p.quantitySold} pcs</td>
                  <td className="p-1.5 text-right font-mono font-bold">{formatRupiah(p.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* IV. Rincian Pengeluaran Beban per Kategori */}
        <div className="mb-5 page-break-inside-avoid">
          <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
            IV. Rincian Pengeluaran Beban per Kategori
          </h4>
          <table className="w-full text-xs border border-black border-collapse text-left">
            <thead>
              <tr className="bg-zinc-100 border-b border-black">
                <th className="p-1.5 font-bold">Kategori Pengeluaran</th>
                <th className="p-1.5 text-center font-bold">Jumlah Transaksi</th>
                <th className="p-1.5 text-right font-bold">Total Biaya (Rp)</th>
                <th className="p-1.5 text-right font-bold">Porsi (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.expenseBreakdown.map((exp) => (
                <tr key={exp.category} className="border-b border-zinc-300">
                  <td className="p-1.5 font-semibold">{exp.categoryLabel}</td>
                  <td className="p-1.5 text-center">{exp.count} kali</td>
                  <td className="p-1.5 text-right font-mono">{formatRupiah(exp.total)}</td>
                  <td className="p-1.5 text-right font-mono">{exp.percentage}%</td>
                </tr>
              ))}
              <tr className="bg-zinc-100 font-bold border-t border-black">
                <td className="p-1.5">TOTAL BIAYA BEBAN OPERASIONAL</td>
                <td className="p-1.5 text-center">{data.expenseCount} kali</td>
                <td className="p-1.5 text-right font-mono">{formatRupiah(data.totalExpenses)}</td>
                <td className="p-1.5 text-right font-mono">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* V. Posisi Inventaris & Stok Barang */}
        <div className="mb-6 page-break-inside-avoid">
          <h4 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1 mb-2">
            V. Posisi Aset & Sisa Stok Inventaris
          </h4>
          <div className="flex justify-between items-center text-xs p-2 border border-black bg-zinc-50">
            <span>
              Total Unit Tersedia: <strong>{data.totalStockUnits} pcs</strong>
            </span>
            <span>
              Estimasi Nilai Aset Stok: <strong>{formatRupiah(data.totalStockAssetValue)}</strong>
            </span>
          </div>
        </div>

        {/* VI. Kolom Pengesahan Laporan */}
        <div className="pt-4 page-break-inside-avoid border-t-2 border-black">
          <p className="text-[11px] text-zinc-600 italic text-center mb-6">
            Laporan ini digenerate secara otomatis oleh sistem operasional Noury dan dinyatakan sah.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold">Dibuat Oleh,</p>
              <p className="text-[10px] text-zinc-600">Bendahara Stand</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
            <div>
              <p className="font-bold">Diverifikasi Oleh,</p>
              <p className="text-[10px] text-zinc-600">Ketua Stand Noury</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
            <div>
              <p className="font-bold">Dinilai & Disahkan Oleh,</p>
              <p className="text-[10px] text-zinc-600">Dosen Pembimbing / Tim Penilai</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRINT TEMPLATE: TRANSACTION AUDIT DOSSIER (Buku Audit & Bukti Bayar)   */}
      {/* ========================================================================= */}
      <div
        id="printable-audit-report"
        className={`hidden text-black font-sans bg-white p-4 leading-normal ${
          printTarget === "AUDIT" ? "print:block" : ""
        }`}
      >
        {/* Header Buku Audit */}
        <div className="border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black uppercase tracking-wider text-black">
            NOURY — NO WORRIES (FRESH & HEALTHY LIVING)
          </h2>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#3D8383] mt-0.5">
            BUKU LAPORAN AUDIT TRANSAKSI & BUKTI PEMBAYARAN
          </h3>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Dokumen Verifikasi Transaksi Riil & Anti-Kecurangan (Bahan Penilaian Stand & Pertanggungjawaban)
          </p>
          <div className="mt-2 text-xs flex justify-center gap-6 font-semibold">
            <span>Periode: {data.dateRangeLabel}</span>
            <span>Total Transaksi: {auditStats.count} Order</span>
            <span>Total Omset Sah: {formatRupiah(auditStats.totalNominal)}</span>
            <span>Waktu Cetak: {printDateStr}</span>
          </div>
        </div>

        {/* Tabel / Dossier Kartu Transaksi */}
        <div className="space-y-3">
          {filteredAuditOrders.map((order, idx) => {
            const dateStr =
              typeof order.createdAt === "string"
                ? new Date(order.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—";

            return (
              <div
                key={order.id}
                className="border border-black p-3 page-break-inside-avoid text-xs bg-white"
              >
                {/* Header Kartu Transaksi */}
                <div className="flex items-center justify-between border-b border-zinc-300 pb-1.5 mb-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-black">
                      #{idx + 1}. No: {order.orderNumber}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-2">
                      ({dateStr}) • Kanal: {order.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold px-2 py-0.5 bg-zinc-200 border border-zinc-400 rounded text-[11px]">
                      {order.paymentMethod || "CASH"}
                    </span>
                    <span className="font-mono font-bold text-sm text-black">
                      {formatRupiah(order.total)}
                    </span>
                  </div>
                </div>

                {/* Body: Pelanggan, Item, dan Bukti Foto */}
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Info Pelanggan & Catatan */}
                  <div className="col-span-3 border-r border-zinc-200 pr-2">
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Pelanggan:</p>
                    <p className="font-bold text-black">{order.customerName || "Umum / Walk-in"}</p>
                    {order.customerPhone && (
                      <p className="text-[10px] font-mono text-zinc-600">{order.customerPhone}</p>
                    )}
                    {order.redemptionCode && (
                      <p className="text-[10px] font-mono mt-1 text-zinc-700">
                        Tiket: <strong>{order.redemptionCode}</strong>
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-[10px] text-zinc-500 italic mt-1">Ket: {order.notes}</p>
                    )}
                  </div>

                  {/* Rincian Item */}
                  <div className="col-span-5 border-r border-zinc-200 pr-2">
                    <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Item yang Dibeli:</p>
                    <div className="space-y-0.5">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((it, iIdx) => (
                          <div key={iIdx} className="flex justify-between text-[11px]">
                            <span>
                              <strong>{it.quantity}x</strong> {it.productName}
                            </span>
                            <span className="font-mono text-zinc-700">{formatRupiah(it.subtotal)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-500 italic">Transaksi Penjualan</p>
                      )}
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-[10px] text-zinc-600 pt-1 border-t border-zinc-200 mt-1">
                        <span>Diskon:</span>
                        <span>-{formatRupiah(order.discount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Bukti Pembayaran / Validasi Fisik */}
                  <div className="col-span-4 flex items-center justify-center">
                    {order.proofUrl ? (
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.proofUrl}
                          alt={`Bukti #${order.orderNumber}`}
                          className="w-20 h-20 object-contain border border-black bg-zinc-50 rounded"
                        />
                        <div className="text-[10px] leading-tight">
                          <p className="font-bold text-emerald-800">✓ Bukti Transfer/QRIS</p>
                          <p className="text-zinc-600">Terlampir Asli</p>
                          <p className="text-zinc-500 text-[9px] mt-0.5 font-mono">Status: Terverifikasi</p>
                        </div>
                      </div>
                    ) : order.paymentMethod === "CASH" || order.paymentMethod === "COD" ? (
                      <div className="text-center p-2 border border-dashed border-zinc-400 bg-zinc-50 rounded w-full">
                        <p className="font-bold text-[11px] text-zinc-800">VALIDASI TUNAI / KASIR</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">
                          Uang fisik diterima langsung di stand saat transaksi/redemption.
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500 mt-0.5">Petugas: {order.createdBy || "Kasir"}</p>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 italic text-[10px]">
                        Bukti transfer tidak dilampirkan
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pernyataan Integritas & Kolom Tanda Tangan Penilaian */}
        <div className="pt-6 page-break-inside-avoid border-t-2 border-black mt-6">
          <div className="p-3 border border-black bg-zinc-50 text-[11px] text-center mb-6">
            <p className="font-bold uppercase tracking-wider">Pernyataan Integritas & Validitas Transaksi</p>
            <p className="text-zinc-700 mt-0.5">
              Dengan ini menyatakan dengan sebenar-benarnya bahwa seluruh riwayat transaksi pembelian dan bukti pembayaran yang tercantum dalam buku audit ini adalah transaksi riil tanpa ada rekayasa atau kecurangan (anti-fraud).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold">Disusun Oleh (Petugas Transaksi)</p>
              <p className="text-[10px] text-zinc-600">Kasir / Operator Stand</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
            <div>
              <p className="font-bold">Diverifikasi Oleh</p>
              <p className="text-[10px] text-zinc-600">Bendahara & Ketua Stand</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
            <div>
              <p className="font-bold">Disahkan / Dinilai Oleh</p>
              <p className="text-[10px] text-zinc-600">Dosen Pembimbing / Tim Juri Penilai</p>
              <div className="h-16" />
              <p className="border-b border-black w-4/5 mx-auto font-bold">( ........................................ )</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Full Size Preview Modal */}
      {previewProofUrl && (
        <Modal
          isOpen={Boolean(previewProofUrl)}
          onClose={() => setPreviewProofUrl(null)}
          title="Bukti Pembayaran / Transfer"
          size="md"
        >
          <div className="py-2 flex flex-col items-center">
            <div className="relative w-full h-[60vh] max-h-[500px] rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-[#E2ECE8]">
              <Image
                src={previewProofUrl}
                alt="Bukti pembayaran penuh"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-4 flex gap-2 w-full">
              <a
                href={previewProofUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-xs font-semibold text-center text-white transition shadow-xs"
              >
                Buka Resolusi Penuh ↗
              </a>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-white border border-[#E2ECE8] text-xs font-semibold text-center text-[#52706C] hover:text-[#183331] hover:bg-[#F3F8F6] transition shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
