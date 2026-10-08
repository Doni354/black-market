"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { CartItem } from "./CartItem";
import { PaymentModal } from "./PaymentModal";
import { ReceiptModal } from "./ReceiptModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { completeSaleAction } from "@/lib/actions/pos";
import type { Product, PaymentMethod } from "@/lib/types";
import type { CartItemData } from "./CartItem";
import type { DirectSaleResult } from "@/lib/db/orders";

interface POSContainerProps {
  products: Product[];
  cashierName: string;
}

export function POSContainer({ products, cashierName }: POSContainerProps) {
  const { toast } = useToast();

  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [discount, setDiscount] = useState<number>(0);

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [completedResult, setCompletedResult] = useState<DirectSaleResult | null>(
    null
  );

  // Map of productId -> quantity for quick lookup in grid
  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cartItems]);

  // Cart operations
  function handleAddToCart(product: Product) {
    if (product.trackInventory && product.stock <= 0) {
      toast(`Stok "${product.name}" sudah habis`, "warning");
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);

      if (existing) {
        if (product.trackInventory && existing.quantity >= product.stock) {
          toast(`Maksimal stok tercapai untuk "${product.name}"`, "warning");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, { product, quantity: 1 }];
    });
  }

  function handleUpdateQty(productId: string, delta: number) {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (item.product.trackInventory && newQty > item.product.stock) {
              toast(
                `Stok tersedia untuk "${item.product.name}" hanya ${item.product.stock}`,
                "warning"
              );
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item): item is CartItemData => item !== null);
    });
  }

  function handleRemoveItem(productId: string) {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function handleClearCart() {
    setCartItems([]);
    setDiscount(0);
  }

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount);
  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  // Checkout handling
  async function handleConfirmPayment(details: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    proofUrl?: string;
  }) {
    const payload = {
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      paymentMethod: details.paymentMethod,
      amountPaid: details.amountPaid,
      discount,
      customerName: details.customerName,
      customerPhone: details.customerPhone,
      notes: details.notes,
      proofUrl: details.proofUrl,
    };

    const res = await completeSaleAction(payload);

    if (!res.success || !res.result) {
      throw new Error(res.message || "Gagal memproses transaksi.");
    }

    // Success! Show receipt and clear cart
    setIsPaymentOpen(false);
    setIsMobileCartOpen(false);
    setCompletedResult(res.result);
    setCartItems([]);
    setDiscount(0);
    toast(`Transaksi #${res.result.order.orderNumber} berhasil!`, "success");
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-6rem)] pb-24 lg:pb-0">
      {/* Left Column: Product Catalog & Search (60-65% width) */}
      <div className="flex-1 lg:overflow-y-auto pr-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#183331]">
              POS / Kasir
            </h1>
            <p className="text-xs text-[#52706C] mt-0.5">
              Pencatatan transaksi penjualan langsung di stand Noury KWH.
            </p>
          </div>
          <Link
            href="/admin/pos/redeem"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EAF5F1] hover:bg-[#D5EFE7] text-[#3D8383] text-xs font-bold border border-[#CDE5DC] transition shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Scan / Redeem Tiket</span>
          </Link>
        </div>

        <ProductGrid
          products={products}
          cart={cartMap}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* Right Column: Sticky Cart for Desktop (hidden on mobile, replaced by bottom sheet) */}
      <div className="hidden lg:block w-96 xl:w-[420px] flex-shrink-0 h-full">
        <Cart
          items={cartItems}
          discount={discount}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onClearCart={handleClearCart}
          onSetDiscount={setDiscount}
          onCheckout={() => setIsPaymentOpen(true)}
        />
      </div>

      {/* Mobile Floating Cart Action Bar (Appears when cart has items) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 z-30 lg:hidden">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#47957F]/40 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5F1] text-sm">
                🛒
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#52706C]">
                  {totalCartCount} item • Cek Keranjang
                </span>
                <span className="text-base font-black text-[#183331]">
                  {formatRupiah(total)}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPaymentOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#47957F] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#47957F]/25 hover:bg-[#3D8383] active:scale-95 transition-transform cursor-pointer"
            >
              <span>Bayar</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer Modal */}
      <Modal
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        title="Keranjang Belanja Kasir"
        description={`${totalCartCount} item dipilih.`}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleClearCart}
              className="text-xs text-[#7A9C96] hover:text-rose-600 cursor-pointer font-medium"
            >
              Kosongkan
            </button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsMobileCartOpen(false);
                setIsPaymentOpen(true);
              }}
              className="font-bold px-5"
            >
              Lanjut Pembayaran ({formatRupiah(total)})
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {cartItems.map((item) => (
            <CartItem
              key={item.product.id}
              item={item}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
      </Modal>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={total}
        subtotal={subtotal}
        discount={discount}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Post-Transaction Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(completedResult)}
        onClose={() => setCompletedResult(null)}
        result={completedResult}
        cashierName={cashierName}
      />
    </div>
  );
}
