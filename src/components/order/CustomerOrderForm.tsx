"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils/money";
import { createCustomerOrderAction } from "@/lib/actions/orders";
import { getPaymentSettingsAction, getBatchSettingsAction } from "@/lib/actions/operational-settings";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { useToast } from "@/components/ui/Toast";
import type { Product, PaymentMethod, CustomerCoupon } from "@/lib/types";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  type PaymentSettings,
  type BatchSettings,
} from "@/lib/types/operational-settings";

interface CustomerOrderFormProps {
  products: Product[];
}

export function CustomerOrderForm({ products }: CustomerOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, account, signInWithGoogle, refreshAccount } = useCustomerAuth();

  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [pickupMethod, setPickupMethod] = useState<"MARKET_DAY" | "BATCH_PICKUP">("MARKET_DAY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CustomerCoupon | null>(null);

  // Operational Settings (Payment QRIS/Bank & Batch Pre-Order)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [batchSettings, setBatchSettings] = useState<BatchSettings>(DEFAULT_BATCH_SETTINGS);

  // Load operational settings
  useEffect(() => {
    getPaymentSettingsAction().then((res) => {
      if (res.success && res.data) {
        setPaymentSettings(res.data);
      }
    });
    getBatchSettingsAction().then((res) => {
      if (res.success && res.data) {
        setBatchSettings(res.data);
      }
    });
  }, []);

  // Auto-fill logged-in customer data
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.displayName || account?.name || "");
      if (!customerEmail) setCustomerEmail(user.email || "");
      if (!customerPhone && account?.phone) setCustomerPhone(account.phone);
    }
  }, [user, account, customerName, customerEmail, customerPhone]);

  // Available unused vouchers
  const availableCoupons = useMemo(() => {
    if (!account?.claimedCoupons) return [];
    return account.claimedCoupons.filter((c) => !c.isUsed);
  }, [account]);

  // Cart operations
  function handleAddProduct(product: Product) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(product.id) || 0;
      next.set(product.id, current + 1);
      return next;
    });
  }

  function handleUpdateQty(productId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) || 0;
      const updated = current + delta;
      if (updated <= 0) {
        next.delete(productId);
      } else {
        next.set(productId, updated);
      }
      return next;
    });
  }

  const cartList = useMemo(() => {
    return Array.from(cart.entries())
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return {
          productId,
          quantity,
          product,
          subtotal: product ? product.price * quantity : 0,
        };
      })
      .filter((i) => Boolean(i.product));
  }, [cart, products]);

  const totalQuantity = useMemo(
    () => cartList.reduce((sum, item) => sum + item.quantity, 0),
    [cartList]
  );

  const rawTotalPrice = useMemo(
    () => cartList.reduce((sum, item) => sum + item.subtotal, 0),
    [cartList]
  );

  const discountAmount = useMemo(() => {
    if (!selectedCoupon) return 0;
    return Math.min(rawTotalPrice, selectedCoupon.discountAmount);
  }, [selectedCoupon, rawTotalPrice]);

  const finalTotalPrice = Math.max(0, rawTotalPrice - discountAmount);

  // File upload to Cloudinary
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti transfer harus berupa gambar.", "error");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/payment-proofs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah bukti");
      }

      setProofUrl(data.url);
      toast("Bukti transfer berhasil diunggah!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal mengunggah gambar.",
        "error"
      );
    } finally {
      setUploadingProof(false);
    }
  }

  // Handle Order Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast("Anda wajib masuk akun Google terlebih dahulu untuk Pre-Order.", "warning");
      return;
    }

    if (cartList.length === 0) {
      toast("Pilih minimal satu menu untuk memesan.", "warning");
      return;
    }

    if (!customerName.trim()) {
      toast("Nama pemesan wajib diisi.", "warning");
      return;
    }

    if (!customerPhone.trim()) {
      toast("Nomor WhatsApp wajib diisi untuk tiket QR.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCustomerOrderAction({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        notes: customerNotes.trim() || undefined,
        pickupMethod,
        batchInfo:
          pickupMethod === "BATCH_PICKUP"
            ? `${batchSettings.activeBatchName} • ${batchSettings.batchPickupSchedule}`
            : undefined,
        paymentMethod,
        proofUrl: proofUrl || undefined,
        couponCode: selectedCoupon?.code,
        discount: discountAmount,
        customerId: user.uid,
        items: cartList.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      if (!res.success || !res.result) {
        throw new Error(res.message || "Gagal membuat pre-order.");
      }

      await refreshAccount();
      toast(
        `Pre-Order #${res.result.order.orderNumber} berhasil dibuat! 🎉`,
        "success"
      );

      // Redirect immediately to order ticket page
      router.push(`/order/${res.result.order.orderNumber}`);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memesan.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE8E4] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-noury-mint/15 border border-noury-mint/30 text-noury-teal text-xs font-bold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-noury-mint animate-pulse" />
            NOURY PRE-ORDER SEHAT
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#183331] uppercase">
            Form Pemesanan Menu Segar
          </h1>
          <p className="text-xs text-[#52706C] mt-1">
            Pesan lebih awal menu pilihanmu dan ambil langsung di stan Noury dengan tiket QR.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs text-[#52706C] hover:text-noury-teal transition flex items-center gap-1 self-start sm:self-auto font-medium"
        >
          ← Kembali ke Beranda
        </Link>
      </div>

      {/* Mandatory Login Banner if not signed in */}
      {!user ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Wajib Masuk Akun Google untuk Melakukan Pre-Order
              </h3>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Akun diperlukan agar tiket QR pesanan Anda tersimpan rapi dan dapat ditukarkan di stan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-zinc-900 font-bold text-xs shadow-xs hover:bg-zinc-50 shrink-0 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk dengan Google</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-noury-mint/30 bg-[#F0F7F4] p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-[#183331] font-bold">{user.displayName || user.email}</span>
          </div>
          <span className="text-noury-teal font-mono font-bold">
            {account?.stampsCount || 0}★ Stempel Terkumpul
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product Selection & Order Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Item Selection */}
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#183331] uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-noury-mint text-white text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                Pilih Menu Segar
              </h2>
              <span className="text-xs text-[#63847F]">
                {totalQuantity} menu dipilih
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {products.map((p) => {
                const qty = cart.get(p.id) || 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#DCE8E4] bg-[#FBFDFC] hover:border-noury-mint/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#EDF4F1] flex-shrink-0">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {p.type === "FRUIT_BOWL" ? "🍉" : p.type === "SMOOTHIE_JUICE" ? "🥤" : "🥗"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#183331] line-clamp-1">
                          {p.name}
                        </p>
                        <p className="text-[11px] font-mono text-noury-teal font-bold">
                          {formatRupiah(p.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-[#EDF6F3] border border-noury-mint/30 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p.id, -1)}
                            className="w-6 h-6 rounded bg-noury-mint text-white text-xs font-bold hover:bg-noury-teal transition cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-mono text-xs font-bold text-[#183331]">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(p.id, 1)}
                            className="w-6 h-6 rounded bg-noury-mint text-white text-xs font-bold hover:bg-noury-teal transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="px-3 py-1.5 rounded-lg bg-noury-mint/15 border border-noury-mint/30 text-noury-teal hover:bg-noury-mint hover:text-white text-xs font-bold transition cursor-pointer"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Information */}
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[#183331] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-noury-mint text-white text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              Informasi Pemesan
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="cust-name"
                  className="block text-[#183331] font-semibold mb-1"
                >
                  Nama Lengkap Pemesan <span className="text-red-500">*</span>
                </label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#D0E2DD] rounded-xl px-3.5 py-2.5 text-[#183331] text-xs focus:outline-none focus:border-noury-mint focus:ring-1 focus:ring-noury-mint"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-phone"
                  className="block text-[#183331] font-semibold mb-1"
                >
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  id="cust-phone"
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-[#D0E2DD] rounded-xl px-3.5 py-2.5 text-[#183331] text-xs focus:outline-none focus:border-noury-mint focus:ring-1 focus:ring-noury-mint"
                />
                <p className="text-[10px] text-[#63847F] mt-1">
                  Tiket QR penukaran akan dihubungkan ke nomor ini.
                </p>
              </div>

              <div>
                <label
                  htmlFor="cust-email"
                  className="block text-[#183331] font-semibold mb-1"
                >
                  Email (Opsional)
                </label>
                <input
                  id="cust-email"
                  type="email"
                  placeholder="budi@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-white border border-[#D0E2DD] rounded-xl px-3.5 py-2.5 text-[#183331] text-xs focus:outline-none focus:border-noury-mint focus:ring-1 focus:ring-noury-mint"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-notes"
                  className="block text-[#183331] font-semibold mb-1"
                >
                  Catatan Pesanan (Opsional)
                </label>
                <textarea
                  id="cust-notes"
                  rows={2}
                  placeholder="Contoh: Less sugar / Ambil jam 13.00 siang"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full bg-white border border-[#D0E2DD] rounded-xl px-3.5 py-2.5 text-[#183331] text-xs focus:outline-none focus:border-noury-mint focus:ring-1 focus:ring-noury-mint"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Summary Box */}
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[#183331] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-noury-mint text-white text-[11px] flex items-center justify-center font-bold">
                3
              </span>
              Ringkasan Tagihan
            </h2>

            {cartList.length === 0 ? (
              <p className="text-xs text-[#7A9C96] py-6 text-center italic">
                Belum ada menu yang dipilih.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-[#EBF2EF] border-b border-[#EBF2EF] pb-2">
                  {cartList.map((item) => (
                    <div
                      key={item.productId}
                      className="py-2 flex justify-between items-center text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-[#EDF4F1] text-[10px] font-bold text-noury-teal flex items-center justify-center font-mono">
                          {item.quantity}x
                        </span>
                        <span className="text-[#183331] font-medium">
                          {item.product?.name}
                        </span>
                      </div>
                      <span className="font-mono text-[#183331] font-semibold">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Voucher Discount */}
                {selectedCoupon && (
                  <div className="flex justify-between items-center text-xs font-bold text-noury-teal">
                    <span>Diskon ({selectedCoupon.code})</span>
                    <span>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-black pt-1">
                  <span className="text-[#52706C]">Total Tagihan</span>
                  <span className="text-lg font-mono text-noury-teal">
                    {formatRupiah(finalTotalPrice)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Voucher selection if user has any */}
          {user && availableCoupons.length > 0 && (
            <div className="rounded-2xl border border-[#DCE8E4] bg-white p-4 space-y-2.5 shadow-xs">
              <p className="text-xs font-bold text-noury-teal uppercase tracking-wider">
                🎟️ Pakai Voucher Diskon
              </p>
              <div className="space-y-1.5">
                {availableCoupons.map((coupon) => {
                  const isSelected = selectedCoupon?.id === coupon.id;
                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => setSelectedCoupon(isSelected ? null : coupon)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? "border-noury-teal bg-noury-teal/10 text-[#183331]"
                          : "border-[#DCE8E4] bg-[#FBFDFC] text-[#4A6864] hover:border-noury-mint/50"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-[#183331]">{coupon.title}</p>
                        <p className="text-[10px] text-[#63847F]">{coupon.code}</p>
                      </div>
                      <span className="font-mono font-bold text-noury-teal">
                        {isSelected ? "Dipakai ✓" : `-${formatRupiah(coupon.discountAmount)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Method & Proof Upload */}
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-5 space-y-4 shadow-xs">
            {/* Pickup Location / Batch */}
            <div>
              <label className="text-xs font-semibold text-[#183331] block mb-2">
                Waktu & Lokasi Pengambilan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupMethod("MARKET_DAY")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupMethod === "MARKET_DAY"
                      ? "bg-noury-mint/15 border-noury-mint text-[#183331]"
                      : "bg-white border-[#DCE8E4] text-[#4A6864] hover:bg-[#F4F9F7]"
                  }`}
                >
                  <p className="text-xs font-bold">🎪 Stand Market Day</p>
                  <p className="text-[10px] text-[#63847F] mt-0.5">Ambil di stan hari H</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPickupMethod("BATCH_PICKUP")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupMethod === "BATCH_PICKUP"
                      ? "bg-noury-mint/15 border-noury-mint text-[#183331]"
                      : "bg-white border-[#DCE8E4] text-[#4A6864] hover:bg-[#F4F9F7]"
                  }`}
                >
                  <p className="text-xs font-bold">📦 {batchSettings.activeBatchName}</p>
                  <p className="text-[10px] text-[#63847F] mt-0.5">{batchSettings.batchPickupSchedule}</p>
                </button>
              </div>

              {pickupMethod === "BATCH_PICKUP" && (
                <p className="mt-2 text-[10px] text-[#47957F] bg-[#EDF6F3] p-2 rounded-lg border border-[#D0E5DF]">
                  📍 <strong>Titik Ambil:</strong> {batchSettings.batchPickupLocation}
                </p>
              )}
            </div>

            <h2 className="text-sm font-bold text-[#183331] uppercase tracking-wider flex items-center gap-2 pt-2 border-t border-[#DCE8E4]">
              <span className="w-5 h-5 rounded-full bg-noury-mint text-white text-[11px] flex items-center justify-center font-bold">
                4
              </span>
              Metode Pembayaran (Transfer di Muka)
            </h2>

            {/* Only QRIS & Bank Transfer (NO COD) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "bg-noury-mint/15 border-noury-mint text-noury-teal"
                    : "bg-white border-[#DCE8E4] text-[#4A6864] hover:bg-[#F4F9F7]"
                }`}
              >
                <span>📱 QRIS</span>
                <span className="text-[10px] font-normal text-[#63847F] text-center">E-Wallet / Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "bg-noury-mint/15 border-noury-mint text-noury-teal"
                    : "bg-white border-[#DCE8E4] text-[#4A6864] hover:bg-[#F4F9F7]"
                }`}
              >
                <span>🏦 Transfer Bank</span>
                <span className="text-[10px] font-normal text-[#63847F] text-center">
                  {paymentSettings.bankName || "BCA"}
                </span>
              </button>
            </div>

            {/* Dynamic Destination instructions */}
            {paymentMethod === "QRIS" ? (
              <div className="rounded-xl border border-[#DCE8E4] bg-[#F7FAFA] p-3.5 text-center space-y-2">
                <p className="font-bold text-xs text-[#183331]">
                  📱 Scan QRIS: {paymentSettings.qrisMerchantName}
                </p>
                {paymentSettings.qrisImageUrl ? (
                  <div className="relative h-44 w-44 mx-auto rounded-lg overflow-hidden border border-[#DCE8E4] bg-white shadow-xs">
                    <Image
                      src={paymentSettings.qrisImageUrl}
                      alt="QRIS Barcode"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-[#CCE0DA] text-[11px] text-[#63847F]">
                    Barcode QRIS aktif. Silakan gunakan scanner e-wallet Anda.
                  </div>
                )}
                <p className="text-[10px] text-[#63847F]">
                  Dapat di-scan via GoPay, OVO, Dana, ShopeePay, LinkAja, BCA, Mandiri, dll.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#DCE8E4] bg-[#F7FAFA] p-3.5 space-y-2 text-xs">
                <p className="font-semibold text-[#183331]">Rekening Tujuan Pembayaran:</p>
                <div className="font-mono text-[#4A6864] space-y-1">
                  <p>Bank: <strong className="text-[#183331]">{paymentSettings.bankName}</strong></p>
                  <p>No. Rekening: <strong className="text-noury-teal">{paymentSettings.bankAccountNumber}</strong></p>
                  <p>Atas Nama: <strong className="text-[#183331]">{paymentSettings.bankAccountHolder}</strong></p>
                </div>
                {paymentSettings.paymentInstructions && (
                  <p className="text-[10px] text-[#7A9C96] pt-1 border-t border-[#DCE8E4]">
                    {paymentSettings.paymentInstructions}
                  </p>
                )}
              </div>
            )}

            {/* Bukti Transfer Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#183331]">
                Unggah Bukti Transfer / Screenshot (Opsional)
              </label>

              {proofUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-noury-mint/15 border border-noury-mint/40">
                  <Image
                    src={proofUrl}
                    alt="Bukti Transfer"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover border border-noury-mint"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-noury-teal">Bukti berhasil diunggah</p>
                    <p className="text-[11px] text-[#52706C] truncate">Siap diverifikasi tim Noury</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofUrl(null)}
                    className="text-xs text-red-500 hover:underline cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-[#C0D7D0] hover:border-noury-mint bg-[#F9FBFA] cursor-pointer transition">
                  <svg className="w-6 h-6 text-[#7A9C96] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-[#52706C]">
                    {uploadingProof ? "Sedang mengunggah..." : "Klik untuk upload gambar bukti"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingProof}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || cartList.length === 0 || !user}
              className="w-full py-3.5 px-4 rounded-xl bg-noury-mint hover:bg-noury-teal text-white font-bold text-sm shadow-md transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Memproses Pre-Order...</span>
                </>
              ) : !user ? (
                <span>Masuk Akun Google untuk Memesan</span>
              ) : (
                <>
                  <span>Kirim Pre-Order ({formatRupiah(finalTotalPrice)})</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
