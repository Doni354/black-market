"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { getCustomerOrdersAction, getLoyaltySettingsAction } from "@/lib/actions/customer";
import { formatRupiah } from "@/lib/utils/money";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import type { Order } from "@/lib/types";
import type { LoyaltySettings } from "@/lib/db/customer-portal";

export function CustomerPortal() {
  const {
    user,
    account,
    loading,
    signInWithGoogle,
    signOutCustomer,
    updatePhone,
    claimReward,
  } = useCustomerAuth();

  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Loyalty settings from admin configuration
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    isLoyaltyEnabled: true,
    stampsRequired: 5,
    minSpendPerStamp: 15000,
    stampRewardDiscount: 5000,
    stampRewardMinOrder: 20000,
  });

  // Phone editing modal
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // Claiming reward loading
  const [isClaiming, setIsClaiming] = useState(false);

  // Load loyalty settings
  useEffect(() => {
    getLoyaltySettingsAction().then((res) => {
      if (res.success && res.data) {
        setLoyaltySettings(res.data);
      }
    });
  }, []);

  // Fetch orders when user is available
  useEffect(() => {
    if (user) {
      setLoadingOrders(true);
      getCustomerOrdersAction(user.uid, account?.phone)
        .then((res) => {
          if (res.success && res.data) {
            setOrders(res.data);
          }
        })
        .finally(() => setLoadingOrders(false));
    }
  }, [user, account?.phone]);

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      toast("Berhasil masuk! Selamat datang di Noury.", "success");
    } catch {
      toast("Gagal masuk dengan Google. Silakan coba lagi.", "error");
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumberInput.trim()) {
      toast("Nomor WhatsApp tidak boleh kosong.", "error");
      return;
    }

    setIsUpdatingPhone(true);
    try {
      const ok = await updatePhone(phoneNumberInput.trim());
      if (ok) {
        toast("Nomor WhatsApp berhasil disimpan!", "success");
        setIsPhoneModalOpen(false);
      } else {
        toast("Gagal menyimpan nomor WhatsApp.", "error");
      }
    } finally {
      setIsUpdatingPhone(false);
    }
  }

  async function handleClaimReward() {
    setIsClaiming(true);
    try {
      const ok = await claimReward();
      if (ok) {
        toast(
          `Voucher reward ${formatRupiah(loyaltySettings.stampRewardDiscount)} berhasil diklaim!`,
          "success"
        );
      } else {
        toast("Gagal mengklaim reward.", "error");
      }
    } finally {
      setIsClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-noury-mint border-t-transparent" />
        <p className="text-xs text-[#63847F] font-medium animate-pulse">
          Memuat akun Noury...
        </p>
      </div>
    );
  }

  // State 1: Unauthenticated Visitor
  if (!user) {
    return (
      <div className="mx-auto max-w-md py-8 px-4 text-center">
        {/* Direct Frameless Brand Logo */}
        <div className="my-4 flex flex-col items-center justify-center">
          <Image
            src="/icons/Logo.svg"
            alt="Noury"
            width={180}
            height={64}
            priority
            className="h-16 w-auto object-contain"
          />
          <p className="mt-1 text-sm font-bold text-noury-teal tracking-wide">
            No Worries
          </p>
        </div>

        <p className="text-xs text-[#52706C] sm:text-sm max-w-sm mx-auto leading-relaxed">
          Playful path toward freshness and healthy living: fruit, water, food, refreshing lifestyle.
        </p>

        {/* Benefits Cards */}
        <div className="my-6 grid grid-cols-1 gap-2.5 text-left">
          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E4] bg-white p-3.5 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-noury-mint/15 text-lg">
              🍉
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#183331]">Kartu Stempel Sehat</h4>
              <p className="text-[11px] text-[#52706C]">
                Kumpulkan {loyaltySettings.stampsRequired} stempel dari pesanan (min. belanja {formatRupiah(loyaltySettings.minSpendPerStamp)}/pesanan) untuk klaim voucher diskon!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E4] bg-white p-3.5 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-noury-lime/20 text-lg">
              🎟️
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#183331]">Voucher Reward Terkendali</h4>
              <p className="text-[11px] text-[#52706C]">
                Reward potongan {formatRupiah(loyaltySettings.stampRewardDiscount)} setelah memenuhi stempel. Sesuai ketentuan kelompok KWH.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE8E4] bg-white p-3.5 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-noury-sky/30 text-lg">
              📱
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#183331]">Tiket QR & Riwayat Aman</h4>
              <p className="text-[11px] text-[#52706C]">
                Lacak pesanan pre-order dan tiket penukaran stan tanpa takut hilang.
              </p>
            </div>
          </div>
        </div>

        {/* Google Sign-in Action */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-[#F2F7F5] text-zinc-900 font-bold py-3.5 px-4 border border-[#CCE0DA] shadow-md transition-all cursor-pointer active:scale-98"
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
          <span className="text-sm">Lanjut dengan Akun Google</span>
        </button>

        <p className="mt-4 text-[11px] text-[#7A9C96]">
          Dengan masuk, Anda setuju untuk mengaitkan akun dengan program loyalitas Noury KWH.
        </p>
      </div>
    );
  }

  // State 2: Authenticated Customer Portal
  const stampsCount = account?.stampsCount || 0;
  const stampsMax = loyaltySettings.stampsRequired || 5;
  const coupons = account?.claimedCoupons || [];

  return (
    <div className="mx-auto max-w-4xl py-6 px-4 space-y-6">
      {/* Customer Header / Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#DCE8E4] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "Avatar"}
                width={56}
                height={56}
                className="rounded-2xl border-2 border-noury-mint shadow-xs object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-noury-mint text-white text-xl font-bold">
                {user.displayName?.charAt(0) || "N"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#183331]">
                  {user.displayName || "Sobat Noury"}
                </h2>
                <span className="rounded-full bg-noury-mint/15 border border-noury-mint/30 px-2 py-0.5 text-[10px] font-semibold text-noury-teal">
                  Member Sehat
                </span>
              </div>
              <p className="text-xs text-[#63847F]">{user.email}</p>

              {/* WhatsApp Link Status */}
              <div className="mt-1 flex items-center gap-2">
                {account?.phone ? (
                  <span className="text-[11px] text-noury-teal flex items-center gap-1 font-mono">
                    <span>💬</span> WhatsApp: {account.phone}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                    <span>⚠️</span> WhatsApp belum terhubung
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPhoneNumberInput(account?.phone || "");
                    setIsPhoneModalOpen(true);
                  }}
                  className="text-[10px] font-semibold text-noury-teal hover:underline cursor-pointer"
                >
                  {account?.phone ? "Ubah" : "Hubungkan WhatsApp"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/"
              className="rounded-xl bg-noury-mint hover:bg-noury-teal text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-all cursor-pointer"
            >
              🥗 Pesan Menu
            </Link>
            <button
              type="button"
              onClick={signOutCustomer}
              className="rounded-xl border border-[#DCE8E4] bg-white hover:bg-[#F2F7F5] text-[#52706C] hover:text-[#183331] text-xs font-medium px-3 py-2 transition-all cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Digital Loyalty Stamp Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#CCE0DA] bg-gradient-to-br from-[#EBF5F1] via-[#F6FAF8] to-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥑</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#183331]">
                Kartu Stempel Sehat Noury
              </h3>
              <p className="text-[11px] text-[#52706C]">
                1 Stempel setiap kali belanja min. {formatRupiah(loyaltySettings.minSpendPerStamp)}
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-noury-mint/15 text-noury-teal border border-noury-mint/30">
            {stampsCount} / {stampsMax} Stempel
          </span>
        </div>

        {/* Dynamic Stamp Slots */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 py-3">
          {Array.from({ length: stampsMax }).map((_, idx) => {
            const isStamped = idx < stampsCount;
            const isLast = idx === stampsMax - 1;
            const icons = ["🍉", "🥑", "🥤", "🍓", "🥗", "🎁"];
            const icon = isLast ? "🎁" : icons[idx % (icons.length - 1)];

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border text-center transition-all ${
                  isStamped
                    ? "border-noury-mint bg-white shadow-xs"
                    : "border-[#DCE8E4] bg-white/50 opacity-60"
                }`}
              >
                <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#F0F7F4] text-lg sm:text-xl shadow-inner">
                  {isStamped ? (
                    <>
                      <span>{icon}</span>
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-noury-teal text-white text-[10px] font-black">
                        ✓
                      </span>
                    </>
                  ) : (
                    <span className="grayscale opacity-40">{icon}</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-bold ${
                    isStamped ? "text-noury-teal" : "text-[#7A9C96]"
                  }`}
                >
                  {isLast ? "Reward!" : `Stempel ${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Claim Reward Banner if >= stampsRequired */}
        {stampsCount >= stampsMax && (
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white border border-noury-mint/40 p-3.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-bounce">🎉</span>
              <div>
                <p className="text-xs font-bold text-noury-teal">
                  Stempel Penuh! Anda berhak mendapatkan Diskon {formatRupiah(loyaltySettings.stampRewardDiscount)}!
                </p>
                <p className="text-[11px] text-[#52706C]">
                  Klaim sekarang dan gunakan pada pesanan menu berikutnya (min. belanja {formatRupiah(loyaltySettings.stampRewardMinOrder)}).
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isClaiming}
              onClick={handleClaimReward}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-noury-mint hover:bg-noury-teal text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isClaiming ? "Mengklaim..." : "Klaim Voucher Sekarang →"}
            </button>
          </div>
        )}
      </div>

      {/* Kupon & Voucher Saya */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#183331] flex items-center gap-2">
            <span>🎟️</span> Kupon & Voucher Saya ({coupons.length})
          </h3>
          <span className="text-[11px] text-[#63847F]">
            Gunakan saat checkout pre-order / di kasir
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-6 text-center text-[#7A9C96]">
            <p className="text-xs">Belum ada kupon yang tersedia.</p>
            <p className="text-[11px] text-[#8EA9A4] mt-1">
              Kumpulkan {stampsMax} stempel dari pembelian untuk membuka voucher reward!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                  coupon.isUsed
                    ? "border-zinc-200 bg-zinc-50 opacity-60"
                    : "border-noury-mint/40 bg-white shadow-xs"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-noury-mint/15 text-noury-teal text-[10px] font-bold uppercase tracking-wider">
                      Hemat {formatRupiah(coupon.discountAmount)}
                    </span>
                    <h4 className="mt-1.5 text-xs font-bold text-[#183331]">
                      {coupon.title}
                    </h4>
                    <p className="text-[11px] text-[#52706C] mt-0.5 leading-relaxed">
                      {coupon.description}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      coupon.isUsed
                        ? "bg-zinc-200 text-zinc-600"
                        : "bg-noury-mint/15 text-noury-teal border border-noury-mint/30"
                    }`}
                  >
                    {coupon.isUsed ? "Sudah Dipakai" : "Tersedia"}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#EDF4F1] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-noury-teal">
                    <span>Kode:</span>
                    <span className="bg-[#EDF6F3] px-2 py-0.5 rounded border border-[#CCE0DA]">
                      {coupon.code}
                    </span>
                  </div>
                  {!coupon.isUsed && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast(`Kode ${coupon.code} berhasil disalin!`, "success");
                      }}
                      className="text-[11px] font-bold text-noury-teal hover:underline cursor-pointer"
                    >
                      Salin Kode
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tiket & Riwayat Pesanan Saya */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#183331] flex items-center gap-2">
            <span>🎫</span> Tiket & Riwayat Pesanan Saya
          </h3>
          <span className="text-[11px] text-[#63847F]">
            Tunjukkan tiket ke staf kami di stand
          </span>
        </div>

        {loadingOrders ? (
          <div className="py-8 text-center text-xs text-[#7A9C96] animate-pulse">
            Memuat daftar pesanan...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE8E4] bg-white p-6 text-center text-[#7A9C96]">
            <p className="text-xs">Belum ada pesanan yang tercatat.</p>
            <Link
              href="/"
              className="mt-2 inline-block text-xs font-bold text-noury-teal hover:underline"
            >
              Lihat katalog menu segar Noury →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isReady = order.status === "READY_FOR_REDEMPTION";
              const isWaiting =
                order.status === "WAITING_VERIFICATION" ||
                order.status === "PENDING_PAYMENT";

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#DCE8E4] bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDF4F1] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#183331]">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isReady
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isWaiting
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-noury-mint/15 text-noury-teal border border-noury-mint/30"
                          }`}
                        >
                          {order.status === "READY_FOR_REDEMPTION"
                            ? "✅ Siap Diambil di Stand"
                            : order.status === "WAITING_VERIFICATION"
                            ? "⏳ Verifikasi Pembayaran"
                            : order.status === "PENDING_PAYMENT"
                            ? "💳 Menunggu Pembayaran"
                            : order.status === "COMPLETED"
                            ? "🎉 Selesai"
                            : order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#63847F] mt-0.5">
                        {order.pickupMethod === "BATCH_PICKUP"
                          ? `📦 Pre-Order: ${order.batchInfo || "Jadwal Batch"}`
                          : order.pickupMethod === "FLEXIBLE"
                          ? "📦 Pengambilan Fleksibel"
                          : "🎪 Stand Event Market Day"}
                      </p>
                    </div>

                    <div className="text-right sm:text-right">
                      <span className="text-xs font-black text-noury-teal font-mono">
                        {formatRupiah(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Order items preview */}
                  <div className="text-[11px] text-[#334D48] space-y-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="text-[#63847F] font-mono">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions: Direct link to QR ticket */}
                  <div className="pt-2 border-t border-[#EDF4F1] flex items-center justify-between">
                    <span className="text-[10px] text-[#7A9C96]">
                      Metode: {order.paymentMethod}
                    </span>
                    <Link
                      href={`/order/${order.orderNumber}`}
                      className="px-3.5 py-1.5 rounded-xl bg-noury-mint hover:bg-noury-teal text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🎫</span> Buka Tiket QR Penukaran
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phone Update Modal */}
      <Modal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        title="Hubungkan Nomor WhatsApp"
      >
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <p className="text-xs text-[#52706C]">
            Nomor WhatsApp digunakan untuk mengonfirmasi pesanan dan menghubungkan tiket QR penukaran Anda.
          </p>

          <div>
            <label className="text-xs font-semibold text-[#183331] block mb-1">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phoneNumberInput}
              onChange={(e) => setPhoneNumberInput(e.target.value)}
              className="w-full rounded-xl border border-[#D0E2DD] bg-white px-3.5 py-2.5 text-sm text-[#183331] placeholder:text-[#839F9B] focus:border-noury-mint focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPhoneModalOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#52706C] hover:text-[#183331] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUpdatingPhone}
              className="px-4 py-2 rounded-xl bg-noury-mint hover:bg-noury-teal text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUpdatingPhone ? "Menyimpan..." : "Simpan Nomor"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
