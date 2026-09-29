"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { formatRupiah } from "@/lib/utils/money";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createCustomerOrderAction } from "@/lib/actions/orders";
import { CustomMerchModal } from "@/components/home/CustomMerchModal";
import type { Product, PaymentMethod } from "@/lib/types";

interface HomeCatalogProps {
  products: Product[];
  onOpenTracker: () => void;
}

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "✨ Semua Produk" },
  { key: "FOOD", label: "🍔 Makanan" },
  { key: "DRINK", label: "🍹 Minuman" },
  { key: "MERCH", label: "👕 Merchandise" },
  { key: "BUNDLE", label: "🎁 Paket Bundling" },
];

export function HomeCatalog({ products, onOpenTracker }: HomeCatalogProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  // Customer Pre-Order Cart: Map<productId, quantity>
  const [cart, setCart] = useState<Map<string, number>>(new Map());

  // Custom Merch Request Modal
  const [isCustomMerchOpen, setIsCustomMerchOpen] = useState(false);

  // Customer Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [pickupMethod, setPickupMethod] = useState<"MARKET_DAY" | "FLEXIBLE">("MARKET_DAY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);

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

  const totalPrice = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartList]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar", "error");
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
        throw new Error(data.error || "Gagal upload gambar");
      }

      setProofUrl(data.url);
      toast("Bukti transfer berhasil diunggah", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan upload",
        "error"
      );
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      toast("Nama pemesan wajib diisi", "warning");
      return;
    }
    if (!customerPhone.trim()) {
      toast("Nomor WhatsApp wajib diisi untuk pengiriman tiket", "warning");
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
        throw new Error(res.message || "Gagal memproses pesanan.");
      }

      setSuccessOrderNumber(res.result.order.orderNumber);
      setCart(new Map());
      setIsCheckoutOpen(false);
      toast("Pre-Order Anda berhasil dibuat!", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Terjadi kesalahan pemesanan",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Hero Banner (Mobile-Optimized) */}
      <div className="relative overflow-hidden rounded-3xl border border-red-900/40 bg-gradient-to-b from-red-950/40 via-zinc-900/80 to-zinc-950 p-6 sm:p-8 text-center shadow-2xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-950/60 px-3 py-1 text-[11px] font-semibold text-red-400 mb-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Market Day Pre-Order Dibuka
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
          Black Market
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Amankan merchandise edisi terbatas dan menu favorit Anda lebih awal. Dapatkan tiket QR untuk penukaran instan di stan kami!
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenTracker}
            className="text-xs text-zinc-400 hover:text-white underline font-medium"
          >
            Sudah pesan? Cek tiket di sini →
          </button>
        </div>
      </div>

      {/* Custom Merch Banner (Pin, Sticker, Gantungan Kunci) */}
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/70 via-zinc-900 to-zinc-900 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 text-[11px] font-bold">
            <span>🎨</span> CUSTOM DESAIN SENDIRI
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Punya Desain Sendiri? Request Custom Merch di Sini!
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl">
            Pesan Pin, Sticker, atau Gantungan Kunci dengan desain pilihanmu. Kami buatkan mock-up, konfirmasi via WhatsApp, dan siap diambil kapan saja!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCustomMerchOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition whitespace-nowrap cursor-pointer self-start sm:self-auto flex items-center gap-1.5 active:scale-95"
        >
          <span>✨</span> Request Custom Merch
        </button>
      </div>

      {/* Search Bar & Category Carousel */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Cari kaos, kopi, makanan, bundling..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 pl-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
          />
          <svg
            className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Categories (Horizontal Swipe on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                  : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid (2 columns on mobile, 3-4 on desktop) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500">
            <p className="text-base font-semibold">Tidak ada produk ditemukan</p>
            <p className="text-xs mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartQty = cart.get(product.id) || 0;
            const isOutOfStock = product.trackInventory && product.stock <= 0;

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xs transition-all hover:border-zinc-700 hover:bg-zinc-900"
              >
                {/* Image Aspect Box */}
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-700 font-mono text-2xl font-bold">
                      BM
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {product.type === "BUNDLE" && (
                      <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                        BUNDLING
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="rounded-md bg-zinc-900/90 border border-zinc-700 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                        Habis
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-2 leading-snug">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block leading-none">Harga</span>
                      <span className="text-xs sm:text-sm font-black text-red-400">
                        {formatRupiah(product.price)}
                      </span>
                    </div>

                    {/* Quantity controller or add button */}
                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(product.id, -1)}
                          className="h-6 w-6 rounded bg-zinc-700 text-zinc-200 font-bold hover:bg-zinc-600 flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-4 text-center text-xs font-bold text-white">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(product.id, 1)}
                          className="h-6 w-6 rounded bg-zinc-700 text-zinc-200 font-bold hover:bg-zinc-600 flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(product.id)}
                        className="rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-md shadow-red-950/30 hover:bg-red-500 disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
                      >
                        + Pesan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Bar (Sticky Mobile Action) */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-600/50 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md">
            <div>
              <span className="text-[11px] text-zinc-400 block">
                🛒 {totalQuantity} Item Dipilih
              </span>
              <span className="text-base font-black text-red-400">
                {formatRupiah(totalPrice)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-950/50 hover:bg-red-500 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Lanjut Pesan</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Customer Checkout Pre-Order Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Formulir Pre-Order Customer"
        description="Lengkapi data Anda untuk penerbitan tiket penukaran Market Day."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || uploadingProof}
              onClick={() => setIsCheckoutOpen(false)}
            >
              Kembali
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={uploadingProof || !customerName.trim() || !customerPhone.trim()}
              onClick={handleCheckoutSubmit}
              className="font-bold px-5"
            >
              Konfirmasi Pre-Order
            </Button>
          </>
        }
      >
        <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3.5 text-xs text-zinc-300">
          {/* Order Summary Box */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">
              Ringkasan Pesanan Anda
            </span>
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto divide-y divide-zinc-800/60 pr-1">
              {cartList.map((item) => (
                <div key={item.productId} className="flex justify-between items-center py-1">
                  <span>
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-semibold text-zinc-200">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-850 flex justify-between font-bold text-sm">
              <span>Total Tagihan:</span>
              <span className="text-red-400">{formatRupiah(totalPrice)}</span>
            </div>
          </div>

          {/* Customer Inputs */}
          <Input
            label="Nama Lengkap Pemesan"
            placeholder="Contoh: Budi Santoso"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />

          <Input
            label="Nomor WhatsApp (Wajib untuk Tiket QR)"
            placeholder="Contoh: 08123456789"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            helperText="Kami akan mengaitkan tiket penukaran dengan nomor WhatsApp ini."
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
            placeholder="Contoh: Titip teman / Ambil sore"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />

          {/* Waktu & Metode Pengambilan */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Waktu & Lokasi Pengambilan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickupMethod("MARKET_DAY")}
                className={`rounded-xl border py-2 px-2.5 text-left transition-all cursor-pointer ${
                  pickupMethod === "MARKET_DAY"
                    ? "border-red-600 bg-red-600/10 text-white font-bold"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                <p className="text-xs font-bold">🎪 Stand Event</p>
                <p className="text-[10px] text-zinc-400 font-normal">Ambil saat Market Day</p>
              </button>
              <button
                type="button"
                onClick={() => setPickupMethod("FLEXIBLE")}
                className={`rounded-xl border py-2 px-2.5 text-left transition-all cursor-pointer ${
                  pickupMethod === "FLEXIBLE"
                    ? "border-red-600 bg-red-600/10 text-white font-bold"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                <p className="text-xs font-bold">📦 Ambil Kapan Saja</p>
                <p className="text-[10px] text-zinc-400 font-normal">Fleksibel setelah jadi</p>
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === "QRIS"
                    ? "border-red-600 bg-red-600/10 text-red-400 font-bold"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                📱 QRIS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === "BANK_TRANSFER"
                    ? "border-red-600 bg-red-600/10 text-red-400 font-bold"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                🏦 Transfer
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === "COD"
                    ? "border-red-600 bg-red-600/10 text-red-400 font-bold"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                💵 COD
              </button>
            </div>
          </div>

          {/* Contextual Payment Instructions / Proof Upload */}
          {paymentMethod === "COD" ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <span>💵</span> Bayar di Tempat (COD)
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                Pesanan Anda akan langsung disiapkan. Bayar secara tunai atau QRIS saat mengambil pesanan di stan Market Day.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Upload Bukti Transfer (Opsional)
              </span>
              {proofUrl ? (
                <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-zinc-700">
                  <Image src={proofUrl} alt="Bukti transfer" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingProof}
                  className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
                />
              )}
              <p className="text-[10px] text-zinc-500 mt-1">
                Jika belum transfer sekarang, Anda dapat melampirkannya nanti saat konfirmasi.
              </p>
            </div>
          )}
        </form>
      </Modal>

      {/* Success Dialog Modal */}
      <Modal
        isOpen={Boolean(successOrderNumber)}
        onClose={() => setSuccessOrderNumber(null)}
        title="Pre-Order Berhasil Dibuat! 🎉"
        description="Pesanan Anda telah tercatat di sistem Black Market."
        size="sm"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => setSuccessOrderNumber(null)}
            className="w-full font-bold"
          >
            Selesai
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 py-2 text-xs text-zinc-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xl font-bold">
            ✓
          </div>
          <div>
            <p className="text-zinc-400">Nomor Pesanan Anda:</p>
            <p className="text-xl font-mono font-black text-red-400 tracking-wider">
              {successOrderNumber}
            </p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800">
            Simpan nomor pesanan ini. Anda dapat mengecek status verifikasi dan tiket penukaran QR kapan saja melalui tombol <strong>Cek Tiket</strong> di atas.
          </p>
        </div>
      </Modal>

      {/* Custom Merch Request Modal */}
      <CustomMerchModal
        isOpen={isCustomMerchOpen}
        onClose={() => setIsCustomMerchOpen(false)}
      />
    </div>
  );
}
