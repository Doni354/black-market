"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils/money";
import { createCustomerOrderAction } from "@/lib/actions/orders";
import { useToast } from "@/components/ui/Toast";
import type { Product, PaymentMethod } from "@/lib/types";

interface CustomerOrderFormProps {
  products: Product[];
}

export function CustomerOrderForm({ products }: CustomerOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [pickupMethod, setPickupMethod] = useState<"MARKET_DAY" | "FLEXIBLE">("MARKET_DAY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const totalPrice = useMemo(
    () => cartList.reduce((sum, item) => sum + item.subtotal, 0),
    [cartList]
  );

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
      formData.append("folder", "black-market/payment-proofs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal upload gambar bukti.");
      }

      setProofUrl(data.url);
      toast("Bukti pembayaran berhasil diunggah!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Gagal upload bukti transfer.",
        "error"
      );
    } finally {
      setUploadingProof(false);
    }
  }

  // Handle Checkout submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (cartList.length === 0) {
      toast("Pilih minimal satu item untuk memesan.", "warning");
      return;
    }

    if (!customerName.trim()) {
      toast("Nama pemesan wajib diisi.", "warning");
      return;
    }

    if (!customerPhone.trim()) {
      toast("Nomor WhatsApp wajib diisi.", "warning");
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
        paymentMethod,
        proofUrl: proofUrl || undefined,
        items: cartList.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      if (!res.success || !res.result) {
        throw new Error(res.message || "Gagal membuat pre-order.");
      }

      toast(
        `Pre-Order #${res.result.order.orderNumber} berhasil dibuat!`,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            MARKET DAY PRE-ORDER
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100 uppercase">
            Form Pemesanan Tiket
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pesan sekarang dan ambil pesanan Anda langsung di booth Black Market pada hari acara.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 self-start sm:self-auto"
        >
          ← Kembali ke Beranda
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product Selection & Order Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Item Selection */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                Pilih Menu Pre-Order
              </h2>
              <span className="text-xs text-zinc-400">
                {totalQuantity} item dipilih
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {products.map((p) => {
                const qty = cart.get(p.id) || 0;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-600 flex-shrink-0">
                          BM
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs font-mono font-semibold text-red-400 mt-0.5">
                          {formatRupiah(p.price)}
                        </p>
                      </div>
                    </div>

                    {/* Stepper */}
                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.id, -1)}
                          className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-zinc-100 w-4 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.id, 1)}
                          className="w-6 h-6 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition"
                      >
                        + Tambah
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Information */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                2
              </span>
              Informasi Pemesan
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="cust-name"
                  className="block text-zinc-300 font-semibold mb-1"
                >
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-phone"
                  className="block text-zinc-300 font-semibold mb-1"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-red-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Digunakan untuk pelacakan tiket dan konfirmasi pesanan.
                </p>
              </div>

              <div>
                <label
                  htmlFor="cust-email"
                  className="block text-zinc-300 font-semibold mb-1"
                >
                  Email (Opsional)
                </label>
                <input
                  id="cust-email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cust-notes"
                  className="block text-zinc-300 font-semibold mb-1"
                >
                  Catatan Pesanan (Opsional)
                </label>
                <textarea
                  id="cust-notes"
                  rows={2}
                  placeholder="Contoh: Tidak pakai es / ambil jam 13.00 siang"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Order Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Summary Box */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                3
              </span>
              Ringkasan Tagihan
            </h2>

            {cartList.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center italic">
                Belum ada menu yang dipilih. Silakan pilih menu di samping.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-zinc-800 border-b border-zinc-800 pb-2">
                  {cartList.map((item) => (
                    <div
                      key={item.productId}
                      className="py-2 flex justify-between items-center text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center font-mono">
                          {item.quantity}x
                        </span>
                        <span className="text-zinc-200 font-medium">
                          {item.product?.name}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-300 font-semibold">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm font-black pt-1">
                  <span className="text-zinc-300">Total Pembayaran</span>
                  <span className="text-lg font-mono text-red-400">
                    {formatRupiah(totalPrice)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method & Proof Upload */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            {/* Waktu & Lokasi Pengambilan */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">
                Waktu & Lokasi Pengambilan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPickupMethod("MARKET_DAY")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupMethod === "MARKET_DAY"
                      ? "bg-red-600/20 border-red-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-xs font-bold">🎪 Stand Market Day</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Ambil di stan hari H</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPickupMethod("FLEXIBLE")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    pickupMethod === "FLEXIBLE"
                      ? "bg-red-600/20 border-red-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-xs font-bold">📦 Ambil Kapan Saja</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Fleksibel setelah jadi</p>
                </button>
              </div>
            </div>

            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2 pt-2 border-t border-zinc-800/60">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                4
              </span>
              Metode Pembayaran
            </h2>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "bg-red-600/20 border-red-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span>📱 QRIS</span>
                <span className="text-[10px] font-normal text-zinc-400 text-center">E-Wallet / Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "bg-red-600/20 border-red-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span>🏦 Transfer</span>
                <span className="text-[10px] font-normal text-zinc-400 text-center">BCA / Mandiri</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "COD"
                    ? "bg-red-600/20 border-red-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <span>💵 COD</span>
                <span className="text-[10px] font-normal text-zinc-400 text-center">Bayar di Stand</span>
              </button>
            </div>

            {/* Contextual payment instruction */}
            {paymentMethod === "COD" ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1 text-xs text-amber-200">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>💵</span> Bayar Tunai / QRIS Saat Pengambilan (COD)
                </p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Pesanan Anda akan disiapkan lebih awal. Anda dapat melakukan pembayaran langsung di stan Market Day saat mengambil barang dengan menunjukkan Nomor Pesanan.
                </p>
              </div>
            ) : (
              /* Account destination instructions */
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-2 text-xs">
                <p className="font-semibold text-zinc-300">Rekening Tujuan:</p>
                <div className="font-mono text-zinc-200 space-y-1">
                  <p>Bank: <strong className="text-white">BCA</strong></p>
                  <p>No. Rekening: <strong className="text-red-400">1234567890</strong></p>
                  <p>Atas Nama: <strong className="text-white">BLACK MARKET OFFICIAL</strong></p>
                </div>
              </div>
            )}

            {/* Bukti Transfer Upload (Only for Transfer / QRIS) */}
            {paymentMethod !== "COD" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Unggah Bukti Transfer / Screenshot (Opsional)
                </label>

                {proofUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                    <Image
                      src={proofUrl}
                      alt="Bukti Transfer"
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-emerald-400">Bukti berhasil diunggah</p>
                      <p className="text-[11px] text-zinc-400 truncate">Siap diverifikasi admin</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofUrl(null)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950 cursor-pointer transition">
                    <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-zinc-300 font-semibold">
                      {uploadingProof ? "Mengunggah..." : "Pilih Gambar Bukti Transfer"}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-0.5">JPG, PNG, atau Screenshot</span>
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
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || cartList.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-red-600/25 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Kirim Pesanan & Terbitkan Tiket</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
