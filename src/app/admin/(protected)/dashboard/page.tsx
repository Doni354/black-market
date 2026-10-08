import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getCashFlowSummary } from "@/lib/db/expenses";
import { getOrders } from "@/lib/db/orders";
import { getProducts } from "@/lib/db/products";
import { formatRupiah } from "@/lib/utils/money";
import { Badge, getOrderStatusVariant } from "@/components/ui/Badge";
import type { Order } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard Operasional | Noury — No Worries",
  description: "Ringkasan operasional penjualan, pre-order, dan arus kas Noury.",
};

export const dynamic = "force-dynamic";

interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  href?: string;
  color?: "default" | "success" | "danger";
}

function StatCard({ label, value, description, href, color = "default" }: StatCardProps) {
  const content = (
    <div
      className={`rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs transition-all ${
        href ? "hover:border-[#47957F]/60 hover:shadow-sm group cursor-pointer" : ""
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#52706C] group-hover:text-[#3D8383] transition-colors">
        {label}
      </p>
      <p
        className={`mt-2 text-xl sm:text-2xl font-black ${
          color === "success"
            ? "text-[#47957F]"
            : color === "danger"
            ? "text-rose-600"
            : "text-[#183331]"
        }`}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-[#7A9C96]">{description}</p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface QuickActionProps {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

function QuickAction({ label, description, href, icon, badge }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl border border-[#E2ECE8] bg-white p-3.5 sm:p-4 transition-all hover:border-[#47957F]/60 hover:bg-[#F6FAF8] group shadow-xs"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EAF5F1] text-[#3D8383] group-hover:bg-[#47957F] group-hover:text-white group-hover:scale-105 transition-all">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#183331] group-hover:text-[#3D8383] truncate transition-colors">
            {label}
          </p>
          {badge && (
            <span className="rounded-full bg-[#CDD272]/30 px-2 py-0.5 text-[10px] font-extrabold text-[#384a14] border border-[#CDD272]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[#52706C] truncate mt-0.5">{description}</p>
      </div>
      <svg
        className="h-4 w-4 flex-shrink-0 text-[#A0BCB6] group-hover:text-[#3D8383] group-hover:translate-x-0.5 transition-all"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default async function DashboardPage() {
  const [user, summary, allOrders, products] = await Promise.all([
    getCurrentUser(),
    getCashFlowSummary(),
    getOrders({ limit: 50 }),
    getProducts(),
  ]);

  const pendingVerificationCount = allOrders.filter((o) => o.status === "WAITING_VERIFICATION").length;
  const readyForRedemptionCount = allOrders.filter((o) => o.status === "READY_FOR_REDEMPTION").length;
  const lowStockCount = products.filter((p) => p.trackInventory && p.stock < 10).length;
  const recentOrders = allOrders.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#183331]">Dashboard Operasional</h1>
          <p className="mt-1 text-sm text-[#52706C]">
            Selamat datang, <strong className="text-[#183331]">{user?.name}</strong> ({user?.role}). Berikut ringkasan aktivitas booth Noury — No Worries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pos"
            className="inline-flex items-center gap-2 rounded-xl bg-[#47957F] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#3D8383] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buka Kasir POS
          </Link>
        </div>
      </div>

      {/* Operational Alerts Banner */}
      {(pendingVerificationCount > 0 || readyForRedemptionCount > 0 || lowStockCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {pendingVerificationCount > 0 && (
            <Link
              href="/admin/orders"
              className="flex-1 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 text-amber-900 hover:bg-amber-100/70 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span><strong>{pendingVerificationCount}</strong> Pesanan perlu verifikasi bukti bayar</span>
              </div>
              <span className="text-xs font-bold underline">Periksa →</span>
            </Link>
          )}

          {readyForRedemptionCount > 0 && (
            <Link
              href="/admin/pos/redeem"
              className="flex-1 flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 text-emerald-900 hover:bg-emerald-100/70 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <span>🎫</span>
                <span><strong>{readyForRedemptionCount}</strong> Tiket siap diambil di stan</span>
              </div>
              <span className="text-xs font-bold underline">Scan QR →</span>
            </Link>
          )}

          {lowStockCount > 0 && (
            <Link
              href="/admin/inventory"
              className="flex-1 flex items-center justify-between rounded-2xl border border-orange-300 bg-orange-50/80 p-3.5 text-orange-900 hover:bg-orange-100/70 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <span>⚠️</span>
                <span><strong>{lowStockCount}</strong> Menu/Bahan stok menipis (&lt;10)</span>
              </div>
              <span className="text-xs font-bold underline">Restock →</span>
            </Link>
          )}
        </div>
      )}

      {/* Financial & Operational KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Pemasukan"
          value={formatRupiah(summary.totalRevenue)}
          description={`${summary.totalOrdersCount} transaksi berhasil`}
          href="/admin/orders"
          color="success"
        />
        <StatCard
          label="Total Transaksi"
          value={`${summary.totalOrdersCount}`}
          description="POS langsung & Pre-Order"
          href="/admin/orders"
        />
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiah(summary.totalExpenses)}
          description={`${summary.totalExpensesCount} belanja bahan & operasional`}
          href="/admin/expenses"
          color="danger"
        />
        <StatCard
          label="Net Cash Flow"
          value={formatRupiah(summary.netCashFlow)}
          description="Pemasukan bersih dikurangi pengeluaran"
          href="/admin/expenses"
          color={summary.netCashFlow >= 0 ? "default" : "danger"}
        />
      </div>

      {/* Action Hub */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#52706C]">
          Aksi Cepat & Navigasi Operasional
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/admin/pos"
            label="Buka Kasir POS"
            description="Penjualan langsung fruit bowls, juices & salad"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/pos/redeem"
            label="Scan QR Penukaran"
            description="Validasi tiket QR pengambilan pelanggan"
            badge={readyForRedemptionCount > 0 ? `${readyForRedemptionCount} Siap` : undefined}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h3v3h-3v-3zM16.5 19.5h3v-3h-3v3zM19.5 13.5h.008v.008H19.5V13.5zM13.5 19.5h.008v.008H13.5V19.5z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/orders"
            label="Pesanan & Verifikasi"
            description="Verifikasi bukti transfer pre-order online"
            badge={pendingVerificationCount > 0 ? `${pendingVerificationCount} Perlu ACC` : undefined}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/reports"
            label="Laporan & Analitik"
            description="Pantau omset, margin, HPP & ekspor PDF"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/expenses"
            label="Catat Pengeluaran"
            description="Buah segar, es batu, cup, kemasan & operasional"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <QuickAction
            href="/admin/inventory"
            label="Cek Stok & Mutasi"
            description="Penyesuaian stok buah & audit porsi"
            badge={lowStockCount > 0 ? `${lowStockCount} Menipis` : undefined}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent 5 Transactions */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#183331]">5 Transaksi Terbaru</h2>
            <p className="text-xs text-[#52706C]">Aktivitas pesanan terkini yang masuk ke sistem.</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#47957F] hover:text-[#3D8383] transition-colors"
          >
            Lihat Semua Pesanan →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-center py-8 text-xs text-[#7A9C96]">Belum ada transaksi tercatat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#183331]">
              <thead className="border-b border-[#E2ECE8] text-[11px] uppercase tracking-wider text-[#52706C] bg-[#FAFCFB]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No. Order</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Tipe / Sumber</th>
                  <th className="py-2.5 px-3 font-semibold">Total</th>
                  <th className="py-2.5 px-3 font-semibold">Metode</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F5F3]">
                {recentOrders.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-[#F8FAF9] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#183331]">
                      <Link href={`/admin/orders`} className="hover:underline hover:text-[#47957F]">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-[#33504C] font-medium">
                      {order.customerName || "Pelanggan Langsung"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-lg bg-[#F0F7F5] border border-[#D1E2DD] px-2 py-0.5 text-[10px] font-semibold text-[#244642]">
                        {order.source} • {order.orderType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#244642]">
                      {formatRupiah(order.total)}
                    </td>
                    <td className="py-3 px-3 text-[#52706C]">
                      {order.paymentMethod}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
