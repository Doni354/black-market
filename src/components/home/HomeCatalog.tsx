"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/money";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createCustomerOrderAction } from "@/lib/actions/orders";
import { getPaymentSettingsAction, getBatchSettingsAction } from "@/lib/actions/operational-settings";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import type { Product, PaymentMethod, CustomerCoupon } from "@/lib/types";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  type PaymentSettings,
  type BatchSettings,
} from "@/lib/types/operational-settings";

interface HomeCatalogProps {
  products: Product[];
  onOpenTracker?: () => void;
}

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "✨ Semua Menu" },
  { key: "FRUIT_BOWL", label: "🍉 Fruit Bowls" },
  { key: "SMOOTHIE_JUICE", label: "🥤 Smoothies & Juices" },
  { key: "INFUSED_WATER", label: "💧 Infused Water" },
  { key: "HEALTHY_FOOD", label: "🥗 Healthy Eats" },
  { key: "BUNDLE", label: "🎁 Fresh Bundles" },
];

export function HomeCatalog({ products }: HomeCatalogProps) {
  const { toast } = useToast();
  const { user, account, signInWithGoogle, refreshAccount } = useCustomerAuth();

  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  // Customer Pre-Order Cart: Map<productId, quantity>
  const [cart, setCart] = useState<Map<string, number>>(new Map());

  // Customer Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [pickupMethod, setPickupMethod] = useState<"MARKET_DAY" | "BATCH_PICKUP">("MARKET_DAY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);

  // Operational Settings (Payment QRIS/Bank & Batch Pre-Order)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [batchSettings, setBatchSettings] = useState<BatchSettings>(DEFAULT_BATCH_SETTINGS);

  // Selected coupon for discount
  const [selectedCoupon, setSelectedCoupon] = useState<CustomerCoupon | null>(null);

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

  // Auto-fill customer data when logged in
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.displayName || account?.name || "");
      if (!customerEmail) setCustomerEmail(user.email || "");
      if (!customerPhone && account?.phone) setCustomerPhone(account.phone);
    }
  }, [user, account, customerName, customerEmail, customerPhone]);

  // Available unused coupons for this customer
  const availableCoupons = useMemo(() => {
    if (!account?.claimedCoupons) return [];
    return account.claimedCoupons.filter((c) => !c.isUsed);
  }, [account]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedCategory !== "ALL" && p.type !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, search]);

  function handleAddToCart(productId: string) {
    setCart((prev) => {
      const next = new Map(prev);
      const current = next.get(productId) || 0;
      next.set(productId, current + 1);
      return next;
    });
    toast("Item ditambahkan ke pesanan", "success");
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
    return Array.from(cart.entries()).map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId)!;
      return {
        productId,
        quantity,
        product,
        subtotal: product ? product.price * quantity : 0,
      };
    }).filter((i) => Boolean(i.product));
  }, [cart, products]);

  const totalQuantity = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartList]);

  const rawTotalPrice = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartList]);

  const discountAmount = useMemo(() => {
    if (!selectedCoupon) return 0;
    return Math.min(rawTotalPrice, selectedCoupon.discountAmount);
  }, [selectedCoupon, rawTotalPrice]);

  const finalTotalPrice = Math.max(0, rawTotalPrice - discountAmount);

  // Require authentication to checkout
  function handleOpenCheckout() {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCheckoutOpen(true);
  }

  async function handleGoogleLoginForCheckout() {
    try {
      await signInWithGoogle();
      setIsAuthModalOpen(false);
      setIsCheckoutOpen(true);
      toast("Berhasil masuk! Melanjutkan pemesanan...", "success");
    } catch {
      toast("Gagal masuk dengan Google. Silakan coba lagi.", "error");
    }
  }

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
        throw new Error(data.error || "Gagal upload gambar");
      }

      setProofUrl(data.url);
      toast("Bukti pembayaran berhasil diunggah!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan upload.",
        "error"
      );
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast("Anda wajib masuk akun Google terlebih dahulu.", "warning");
      setIsCheckoutOpen(false);
      setIsAuthModalOpen(true);
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
        throw new Error(res.message || "Gagal memproses pesanan.");
      }

      setSuccessOrderNumber(res.result.order.orderNumber);
      setCart(new Map());
      setSelectedCoupon(null);
      setIsCheckoutOpen(false);
      await refreshAccount();
      toast("Pre-Order Noury Anda berhasil dibuat! 🎉", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan pemesanan.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Hero Banner — Clean Light Noury Concept */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D5E6E1] bg-gradient-to-b from-[#EBF5F1] via-[#F6FAF8] to-white p-6 sm:p-8 text-center shadow-md">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-noury-mint/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-noury-teal/20 bg-white/80 px-3.5 py-1 text-[11px] font-bold text-noury-teal mb-3 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-noury-mint opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-noury-mint" />
          </span>
          Pre-Order Menu Segar & Sehat Dibuka!
        </div>

        {/* Direct Frameless Logo Presentation */}
        <div className="flex flex-col items-center justify-center my-2">
          <Image
            src="/icons/Logo.svg"
            alt="Noury"
            width={170}
            height={60}
            priority
            className="h-14 sm:h-16 w-auto object-contain"
          />
          <p className="mt-1 text-sm font-bold text-noury-teal tracking-wide">
            No Worries
          </p>
        </div>

        <p className="mt-2 text-xs sm:text-sm text-[#466560] max-w-md mx-auto leading-relaxed">
          Playful path toward freshness and healthy living: fruit, water, food, refreshing lifestyle.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D2E2DD] text-noury-teal hover:border-noury-mint hover:text-noury-mint shadow-xs transition"
          >
            <span>🎁</span>
            <span>Kartu Stempel & Riwayat Pesanan Saya</span>
          </Link>
        </div>
      </div>

      {/* Search Bar & Category Tabs */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Cari fruit bowl, smoothie, infused water, healthy food..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-[#D0E2DD] bg-white px-4 py-3 pl-11 text-sm text-[#183331] placeholder:text-[#839F9B] focus:outline-none focus:ring-2 focus:ring-noury-mint shadow-xs"
          />
          <svg
            className="absolute left-4 top-3.5 h-4 w-4 text-[#7A9C96]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Categories (Horizontal Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? "bg-noury-mint text-white shadow-md shadow-noury-mint/20"
                  : "border border-[#DCE8E4] bg-white text-[#4A6864] hover:bg-[#F0F6F4] hover:text-[#183331]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#688580]">
            <span className="text-3xl block mb-2">🥗</span>
            <p className="text-base font-semibold text-[#183331]">Menu belum tersedia</p>
            <p className="text-xs mt-1 text-[#688580]">
              Silakan cek kembali nanti atau pilih kategori menu lainnya.
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartQty = cart.get(product.id) || 0;
            const isOutOfStock = product.trackInventory && product.stock <= 0;

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DCE8E4] bg-white p-3 sm:p-4 transition-all hover:border-noury-mint/60 hover:shadow-lg hover:shadow-noury-mint/10"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F4F9F7]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        {product.type === "FRUIT_BOWL"
                          ? "🍉"
                          : product.type === "SMOOTHIE_JUICE"
                          ? "🥤"
                          : product.type === "INFUSED_WATER"
                          ? "💧"
                          : product.type === "HEALTHY_FOOD"
                          ? "🥗"
                          : "✨"}
                      </div>
                    )}

                    {/* Stock / Type badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="rounded-md bg-white/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold uppercase text-[#295B53] border border-[#CCE0DA] shadow-xs">
                        {product.type === "FRUIT_BOWL"
                          ? "Fruit Bowl"
                          : product.type === "SMOOTHIE_JUICE"
                          ? "Smoothie"
                          : product.type === "INFUSED_WATER"
                          ? "Infused Water"
                          : product.type === "HEALTHY_FOOD"
                          ? "Healthy Eat"
                          : "Menu Segar"}
                      </span>
                    </div>

                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
                        <span className="rounded-lg bg-red-100 border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="mt-3">
                    <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-[#183331] group-hover:text-noury-teal transition-colors">
                      {product.name}
                    </h3>
                    <p className="line-clamp-2 mt-1 text-[11px] text-[#5C7D77]">
                      {product.description || "Menu segar kaya nutrisi pilihan Noury."}
                    </p>
                  </div>
                </div>

                {/* Price & Cart Actions */}
                <div className="mt-3 pt-2.5 border-t border-[#EDF4F1] flex items-center justify-between gap-1">
                  <span className="font-mono text-xs sm:text-sm font-black text-noury-teal">
                    {formatRupiah(product.price)}
                  </span>

                  {isOutOfStock ? (
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      Kosong
                    </span>
                  ) : inCartQty > 0 ? (
                    <div className="flex items-center gap-1.5 rounded-xl bg-[#EDF6F3] border border-noury-mint/30 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(product.id, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-noury-mint text-white font-bold text-xs hover:bg-noury-teal transition cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold text-[#183331]">
                        {inCartQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(product.id, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-noury-mint text-white font-bold text-xs hover:bg-noury-teal transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product.id)}
                      className="rounded-xl bg-noury-mint hover:bg-noury-teal text-white px-2.5 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span> Tambah
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {cartList.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl">
          <div className="flex items-center justify-between rounded-2xl border border-[#CDE1DC] bg-white/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-noury-mint text-white font-bold text-base shadow-sm">
                🥗
              </div>
              <div>
                <p className="text-xs text-[#52706C]">
                  <strong className="text-[#183331]">{totalQuantity} menu</strong> dipilih
                </p>
                <p className="text-sm font-black font-mono text-noury-teal">
                  {formatRupiah(rawTotalPrice)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCheckout}
              className="rounded-xl bg-noury-mint hover:bg-noury-teal text-white font-bold text-xs px-4 py-2.5 shadow-md shadow-noury-mint/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Lanjut Pre-Order</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Login Modal before Pre-Order */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Wajib Masuk Akun untuk Pre-Order"
        description="Untuk keamanan tiket penukaran dan pencatatan stempel, silakan masuk dengan akun Google Anda."
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="p-2">
            <Image
              src="/icons/Logo.svg"
              alt="Noury"
              width={140}
              height={50}
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="rounded-2xl border border-[#DCE8E4] bg-[#F6FAF8] p-3.5 text-xs text-[#4A6864] text-left space-y-1.5 w-full">
            <p className="font-bold text-[#183331]">Kenapa harus masuk akun?</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Tiket QR penukaran tersimpan aman di akun Anda</li>
              <li>Dapatkan stempel loyalitas setelah verifikasi</li>
              <li>Mencegah pesanan fiktif (projek mahasiswa KWH)</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleGoogleLoginForCheckout}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-bold py-3 px-4 shadow-sm transition active:scale-98 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
            <span className="text-xs">Masuk Cepat dengan Google</span>
          </button>
        </div>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Konfirmasi Pre-Order Noury"
        description="Amankan menu sehat Anda. Ambil saat Market Day atau jadwal Batch Pre-Order."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCheckoutOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleCheckoutSubmit}
              loading={submitting}
              className="bg-noury-mint hover:bg-noury-teal text-white font-bold"
            >
              Kirim Pre-Order ({formatRupiah(finalTotalPrice)})
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3.5 text-xs text-[#334D48]">
          {/* Member Authenticated Info */}
          {user && (
            <div className="rounded-xl border border-noury-mint/30 bg-[#F0F7F4] p-2.5 flex items-center gap-2">
              <span className="text-base">👤</span>
              <div className="text-[11px]">
                <p className="font-bold text-[#183331]">Akun: {user.displayName || user.email}</p>
                <p className="text-noury-teal">Stempel saat ini: {account?.stampsCount || 0}★ (Pesanan yang memenuhi syarat akan menambah stempel)</p>
              </div>
            </div>
          )}

          {/* Order Summary Box */}
          <div className="rounded-xl border border-[#DCE8E4] bg-[#F9FBFA] p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#63847F] block mb-1.5">
              Ringkasan Menu
            </span>
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto divide-y divide-[#EBF2EF] pr-1">
              {cartList.map((item) => (
                <div key={item.productId} className="flex justify-between items-center py-1">
                  <span>
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-[#183331]">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discount line if voucher selected */}
            {selectedCoupon && (
              <div className="mt-2 pt-2 border-t border-[#DCE8E4] flex justify-between text-noury-teal font-bold">
                <span>Diskon Kupon ({selectedCoupon.code}):</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-[#DCE8E4] flex justify-between font-bold text-sm">
              <span>Total Tagihan:</span>
              <span className="text-noury-teal font-mono">{formatRupiah(finalTotalPrice)}</span>
            </div>
          </div>

          {/* Available Voucher Selector */}
          {user && availableCoupons.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-noury-teal mb-1.5 block">
                🎟️ Gunakan Voucher Diskon
              </label>
              <div className="flex flex-col gap-1.5">
                {availableCoupons.map((coupon) => {
                  const isSelected = selectedCoupon?.id === coupon.id;
                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => setSelectedCoupon(isSelected ? null : coupon)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        isSelected
                          ? "border-noury-teal bg-noury-teal/10 text-[#183331]"
                          : "border-[#DCE8E4] bg-white text-[#4A6864] hover:border-noury-mint/50"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#183331]">
                          {coupon.title} ({coupon.code})
                        </p>
                        <p className="text-[10px] text-[#63847F]">{coupon.description}</p>
                      </div>
                      <span className="text-xs font-black text-noury-teal">
                        {isSelected ? "Dipakai ✓" : `Potongan ${formatRupiah(coupon.discountAmount)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Inputs */}
          <Input
            label="Nama Lengkap Pemesan"
            placeholder="Contoh: Budi Santoso"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <Input
            label="Nomor WhatsApp (Wajib untuk Tiket QR Penukaran)"
            placeholder="Contoh: 081234567890"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            helperText="Tiket penukaran dan konfirmasi akan dikaitkan dengan nomor WhatsApp ini."
          />

          <Input
            label="Email (Opsional)"
            type="email"
            placeholder="Contoh: budi@gmail.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />

          <Input
            label="Catatan Tambahan (Opsional)"
            placeholder="Contoh: Less sugar / Ambil jam 12 siang"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />

          {/* Pickup Method — Market Day vs Batch Pre-Order */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#63847F] mb-1.5 block">
              Pilihan Waktu & Pengambilan Pesanan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickupMethod("MARKET_DAY")}
                className={`rounded-xl border py-2 px-2.5 text-left transition-all cursor-pointer ${
                  pickupMethod === "MARKET_DAY"
                    ? "border-noury-mint bg-noury-mint/15 text-[#183331] font-bold"
                    : "border-[#DCE8E4] bg-white text-[#4A6864]"
                }`}
              >
                <p className="text-xs font-bold">🎪 Stand Market Day</p>
                <p className="text-[10px] text-[#63847F] font-normal">Ambil di stan saat hari H Market Day</p>
              </button>

              <button
                type="button"
                onClick={() => setPickupMethod("BATCH_PICKUP")}
                className={`rounded-xl border py-2 px-2.5 text-left transition-all cursor-pointer ${
                  pickupMethod === "BATCH_PICKUP"
                    ? "border-noury-mint bg-noury-mint/15 text-[#183331] font-bold"
                    : "border-[#DCE8E4] bg-white text-[#4A6864]"
                }`}
              >
                <p className="text-xs font-bold">📦 {batchSettings.activeBatchName}</p>
                <p className="text-[10px] text-[#63847F] font-normal">{batchSettings.batchPickupSchedule}</p>
              </button>
            </div>

            {pickupMethod === "BATCH_PICKUP" && (
              <p className="mt-1.5 text-[10px] text-[#47957F] bg-[#EDF6F3] p-2 rounded-lg border border-[#D0E5DF]">
                📍 <strong>Lokasi Pengambilan:</strong> {batchSettings.batchPickupLocation}
              </p>
            )}
          </div>

          {/* Payment Method Selector — QRIS & Bank Transfer only (NO COD) */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#63847F] mb-1.5 block">
              Metode Pembayaran (Wajib Transfer di Muka)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "border-noury-mint bg-noury-mint/15 text-noury-teal"
                    : "border-[#DCE8E4] bg-white text-[#4A6864]"
                }`}
              >
                📱 QRIS (E-Wallet / Bank)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-noury-mint bg-noury-mint/15 text-noury-teal"
                    : "border-[#DCE8E4] bg-white text-[#4A6864]"
                }`}
              >
                🏦 Transfer {paymentSettings.bankName || "Bank"}
              </button>
            </div>
          </div>

          {/* Dynamic Payment Details (QRIS barcode vs Bank details) */}
          {paymentMethod === "QRIS" ? (
            <div className="rounded-xl border border-[#DCE8E4] bg-[#F9FBFA] p-3 text-center space-y-2">
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
                  Barcode QRIS tersedia. Silakan gunakan scanner e-wallet Anda ke nama merchant di atas.
                </div>
              )}
              <p className="text-[10px] text-[#63847F]">
                Dapat di-scan melalui GoPay, OVO, Dana, ShopeePay, LinkAja, BCA, Mandiri, dll.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#DCE8E4] bg-[#F9FBFA] p-3 text-xs space-y-1">
              <p className="font-semibold text-[#183331]">Rekening Tujuan Pembayaran:</p>
              <p className="text-[#4A6864]">Bank: <strong className="text-[#183331]">{paymentSettings.bankName}</strong></p>
              <p className="text-[#4A6864]">No. Rekening: <strong className="text-noury-teal font-mono">{paymentSettings.bankAccountNumber}</strong></p>
              <p className="text-[#4A6864]">Atas Nama: <strong className="text-[#183331]">{paymentSettings.bankAccountHolder}</strong></p>
              {paymentSettings.paymentInstructions && (
                <p className="text-[10px] text-[#7A9C96] pt-1 border-t border-[#EDF4F1]">{paymentSettings.paymentInstructions}</p>
              )}
            </div>
          )}

          {/* Upload Proof */}
          <div className="rounded-xl border border-[#DCE8E4] bg-[#F9FBFA] p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#63847F] block mb-1">
              Upload Bukti Transfer / Pembayaran
            </span>
            {proofUrl ? (
              <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-noury-mint">
                <Image src={proofUrl} alt="Bukti transfer" fill className="object-cover" unoptimized />
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingProof}
                className="text-xs text-[#52706C] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-noury-mint/15 file:text-noury-teal cursor-pointer"
              />
            )}
            <p className="text-[10px] text-[#7A9C96] mt-1">
              Jika belum sempat upload sekarang, Anda dapat mengunggahnya nanti di dashboard akun Anda.
            </p>
          </div>
        </form>
      </Modal>

      {/* Success Dialog Modal */}
      <Modal
        isOpen={Boolean(successOrderNumber)}
        onClose={() => setSuccessOrderNumber(null)}
        title="Pre-Order Berhasil Dibuat! 🎉"
        description="Pesanan Anda telah tercatat di sistem Noury."
        size="sm"
        footer={
          <div className="flex flex-col gap-2 w-full">
            {successOrderNumber && (
              <Link
                href={`/order/${successOrderNumber}`}
                className="w-full text-center py-2.5 rounded-xl bg-noury-mint hover:bg-noury-teal text-white font-bold text-xs shadow-md transition"
              >
                🎫 Buka Tiket QR Penukaran
              </Link>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSuccessOrderNumber(null)}
              className="w-full font-bold"
            >
              Tutup
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 py-2 text-xs text-[#334D48]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-noury-mint/20 border border-noury-mint/40 text-noury-teal text-2xl font-bold">
            ✓
          </div>
          <div>
            <p className="text-[#63847F]">Nomor Pesanan Anda:</p>
            <p className="text-xl font-mono font-black text-noury-teal tracking-wider">
              {successOrderNumber}
            </p>
          </div>
          <p className="text-[11px] text-[#52706C] leading-relaxed bg-[#F9FBFA] p-3 rounded-xl border border-[#DCE8E4]">
            Simpan nomor pesanan ini. Tiket penukaran QR juga otomatis tersimpan di halaman <strong>Akun Saya</strong>.
          </p>
        </div>
      </Modal>
    </div>
  );
}
