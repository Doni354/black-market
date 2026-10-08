"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { formatRupiah, parseRupiah } from "@/lib/utils/money";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  adminAdjustCustomerStampsAction,
  adminIssueCustomerCouponAction,
} from "@/lib/actions/customer";
import type { Customer, CustomerCoupon } from "@/lib/types";

interface CustomerTableProps {
  initialCustomers: Customer[];
}

export function CustomerTable({ initialCustomers }: CustomerTableProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");

  // Customer Management Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isManagingStamps, setIsManagingStamps] = useState(false);
  const [isIssuingCoupon, setIsIssuingCoupon] = useState(false);

  // New Coupon Form State
  const [couponTitle, setCouponTitle] = useState("Voucher Spesial KWH");
  const [couponDiscountInput, setCouponDiscountInput] = useState("5000");
  const [couponMinOrderInput, setCouponMinOrderInput] = useState("20000");

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const query = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [customers, search]);

  // Adjust Stamps Handler
  async function handleAdjustStamps(delta: number) {
    if (!selectedCustomer) return;
    setIsManagingStamps(true);
    try {
      const res = await adminAdjustCustomerStampsAction(selectedCustomer.id, delta);
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal menyesuaikan stempel.");
      }

      const updated = res.data;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, stampsCount: updated.stampsCount }
            : c
        )
      );
      setSelectedCustomer((prev) =>
        prev ? { ...prev, stampsCount: updated.stampsCount } : null
      );
      toast(res.message || "Stempel berhasil disesuaikan!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal menyesuaikan stempel.",
        "error"
      );
    } finally {
      setIsManagingStamps(false);
    }
  }

  // Issue Coupon Handler
  async function handleIssueCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;

    const discountAmount = parseRupiah(couponDiscountInput);
    const minOrder = parseRupiah(couponMinOrderInput);

    if (discountAmount <= 0) {
      toast("Nominal diskon harus lebih dari Rp 0", "warning");
      return;
    }

    setIsIssuingCoupon(true);
    try {
      const res = await adminIssueCustomerCouponAction(selectedCustomer.id, {
        title: couponTitle.trim() || "Voucher Diskon Noury",
        description: `Diskon Rp ${discountAmount.toLocaleString("id-ID")} untuk pesanan menu sehat Noury.`,
        discountAmount,
        minOrder,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal memberikan voucher.");
      }

      const updated = res.data;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? { ...c, claimedCoupons: updated.claimedCoupons }
            : c
        )
      );
      setSelectedCustomer((prev) =>
        prev ? { ...prev, claimedCoupons: updated.claimedCoupons } : null
      );
      toast(res.message || "Voucher berhasil diterbitkan!", "success");
      setCouponTitle("Voucher Spesial KWH");
      setCouponDiscountInput("5000");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal memberikan voucher.",
        "error"
      );
    } finally {
      setIsIssuingCoupon(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <input
          type="text"
          placeholder="Cari nama, WhatsApp, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 pl-9 text-sm text-[#183331] placeholder:text-[#8AA59F] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-[#7A9C96]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E2ECE8] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#183331]">
            <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] text-[11px] uppercase tracking-wider text-[#52706C]">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Nama Pelanggan</th>
                <th className="px-4 py-3.5 font-semibold">Kontak / WhatsApp</th>
                <th className="px-4 py-3.5 text-center font-semibold">Stempel Loyalitas</th>
                <th className="px-4 py-3.5 text-center font-semibold">Voucher Aktif</th>
                <th className="px-4 py-3.5 text-center font-semibold">Total Order</th>
                <th className="px-4 py-3.5 text-right font-semibold">Total Belanja</th>
                <th className="px-4 py-3.5 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F3]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#7A9C96]">
                    <p className="text-base font-bold text-[#183331]">Belum ada data pelanggan</p>
                    <p className="mt-1 text-xs text-[#52706C]">
                      Customer yang login via Google, melakukan Pre-Order, atau transaksi dengan nomor HP akan tercatat di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const activeCouponsCount = (cust.claimedCoupons || []).filter(
                    (c) => !c.isUsed
                  ).length;
                  const stamps = cust.stampsCount || 0;

                  return (
                    <tr
                      key={cust.id}
                      className="transition-colors hover:bg-[#F8FAF9]"
                    >
                      {/* Name & Email / Avatar */}
                      <td className="px-4 py-3 font-semibold text-[#183331] whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {cust.photoURL ? (
                            <Image
                              src={cust.photoURL}
                              alt={cust.name}
                              width={28}
                              height={28}
                              className="rounded-full object-cover border border-[#E2ECE8]"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#EAF5F1] text-[#2A5E56] font-bold text-xs flex items-center justify-center border border-[#CDE5DD]">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div>{cust.name}</div>
                            {cust.email && (
                              <span className="block text-[11px] text-[#7A9C96] font-normal">
                                {cust.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp Phone */}
                      <td className="px-4 py-3 text-xs font-mono text-[#52706C] whitespace-nowrap">
                        {cust.phone ? (
                          <a
                            href={`https://wa.me/${cust.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#47957F] hover:text-[#3D8383] hover:underline font-bold"
                          >
                            <span>📱 {cust.phone}</span>
                          </a>
                        ) : (
                          <span className="text-[#A0BCB6]">—</span>
                        )}
                      </td>

                      {/* Stamps Count */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <span>⭐</span>
                          <span>{stamps}</span>
                        </span>
                      </td>

                      {/* Active Coupons Count */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {activeCouponsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF5F1] border border-[#CDE5DD] px-2.5 py-0.5 text-xs font-bold text-[#2A5E56]">
                            <span>🎁</span>
                            <span>{activeCouponsCount} Kupon</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">0 Kupon</span>
                        )}
                      </td>

                      {/* Total Orders */}
                      <td className="px-4 py-3 text-center text-xs font-semibold whitespace-nowrap">
                        <span className="rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 px-2.5 py-0.5 font-bold">
                          {cust.totalOrders}x
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-3 text-right font-bold text-[#47957F] whitespace-nowrap">
                        {formatRupiah(cust.totalSpent)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(cust)}
                          className="px-3 py-1 text-xs font-bold rounded-xl bg-white border border-[#47957F] text-[#47957F] hover:bg-[#EAF5F1] transition shadow-xs cursor-pointer"
                        >
                          Kelola & Voucher
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Management Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Kelola Pelanggan: ${selectedCustomer.name}`}
          description="Atur stempel loyalitas, lihat daftar kupon, atau terbitkan voucher diskon baru."
          size="lg"
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedCustomer(null)}
            >
              Tutup
            </Button>
          }
        >
          <div className="flex flex-col gap-5 text-xs text-[#183331]">
            {/* Customer Summary Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAFCFB] border border-[#E2ECE8]">
              <div className="flex items-center gap-3">
                {selectedCustomer.photoURL ? (
                  <Image
                    src={selectedCustomer.photoURL}
                    alt={selectedCustomer.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover border border-[#E2ECE8]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#EAF5F1] text-[#2A5E56] font-bold text-sm flex items-center justify-center border border-[#CDE5DD]">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-[#183331]">
                    {selectedCustomer.name}
                  </h4>
                  <p className="text-[11px] text-[#52706C]">
                    {selectedCustomer.email || "Tanpa Email"} •{" "}
                    {selectedCustomer.phone || "Tanpa No. WhatsApp"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-[#7A9C96] block uppercase tracking-wider font-semibold">
                    Total Order
                  </span>
                  <span className="font-bold text-xs text-[#183331]">
                    {selectedCustomer.totalOrders} kali
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A9C96] block uppercase tracking-wider font-semibold">
                    Total Belanja
                  </span>
                  <span className="font-black text-xs text-[#47957F]">
                    {formatRupiah(selectedCustomer.totalSpent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Loyalty Stamps Management */}
            <div className="p-4 rounded-2xl bg-[#EAF5F1]/70 border border-[#CDE5DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[#183331] text-sm">
                  <span>⭐ Stempel Loyalitas Saat Ini:</span>
                  <span className="text-base text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {selectedCustomer.stampsCount || 0} Stempel
                  </span>
                </div>
                <p className="text-[11px] text-[#52706C] mt-1">
                  Stempel dapat diklaim oleh pelanggan melalui akunnya menjadi voucher jika telah mencapai batas yang ditentukan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isManagingStamps || (selectedCustomer.stampsCount || 0) <= 0}
                  onClick={() => handleAdjustStamps(-1)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#CDE5DD] hover:bg-red-50 text-red-600 font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                >
                  -1 Stempel
                </button>
                <button
                  type="button"
                  disabled={isManagingStamps}
                  onClick={() => handleAdjustStamps(1)}
                  className="px-3 py-1.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  +1 Stempel
                </button>
              </div>
            </div>

            {/* Claimed / Active Coupons */}
            <div>
              <h5 className="font-bold text-xs text-[#183331] uppercase tracking-wider mb-2">
                Daftar Kupon Pelanggan
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(!selectedCustomer.claimedCoupons || selectedCustomer.claimedCoupons.length === 0) ? (
                  <p className="text-xs text-zinc-400 italic p-3 rounded-xl border border-dashed border-zinc-200 text-center">
                    Belum ada kupon yang diberikan atau diklaim oleh pelanggan ini.
                  </p>
                ) : (
                  selectedCustomer.claimedCoupons.map((coupon: CustomerCoupon) => (
                    <div
                      key={coupon.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        coupon.isUsed
                          ? "bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60"
                          : "bg-white border-[#CDE5DD] text-[#183331] shadow-2xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#2A5E56] bg-[#EAF5F1] px-1.5 py-0.5 rounded">
                            {coupon.code}
                          </span>
                          <span className="font-semibold text-xs">{coupon.title}</span>
                          {coupon.isUsed && (
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-200 px-1.5 py-0.2 rounded">
                              Sudah Dipakai
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#52706C] mt-0.5">
                          Diskon: {formatRupiah(coupon.discountAmount)} • Min. Order: {formatRupiah(coupon.minOrder || 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Form: Issue Manual Coupon */}
            <form onSubmit={handleIssueCoupon} className="p-4 rounded-2xl bg-white border border-[#E2ECE8] space-y-3">
              <h5 className="font-bold text-xs text-[#183331] uppercase tracking-wider">
                Terbitkan Voucher Diskon Manual
              </h5>
              <p className="text-[11px] text-[#52706C]">
                Sebagai pengelola stand KWH, Anda dapat memberikan kupon promosi khusus langsung kepada pelanggan ini.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-[#52706C] mb-1">
                    Judul Voucher
                  </label>
                  <input
                    type="text"
                    value={couponTitle}
                    onChange={(e) => setCouponTitle(e.target.value)}
                    placeholder="Contoh: Voucher KWH"
                    className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 text-xs text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#52706C] mb-1">
                    Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    value={couponDiscountInput}
                    onChange={(e) => setCouponDiscountInput(e.target.value)}
                    placeholder="5000"
                    step={1000}
                    className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 text-xs text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#52706C] mb-1">
                    Min. Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    value={couponMinOrderInput}
                    onChange={(e) => setCouponMinOrderInput(e.target.value)}
                    placeholder="20000"
                    step={1000}
                    className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 text-xs text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isIssuingCoupon}
                className="w-full py-2.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer shadow-xs"
              >
                {isIssuingCoupon ? "Menerbitkan..." : "Kirimkan Voucher ke Akun Pelanggan"}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
