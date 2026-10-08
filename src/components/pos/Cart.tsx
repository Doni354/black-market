"use client";

import { useState } from "react";
import { CartItem, type CartItemData } from "./CartItem";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/utils/money";

interface CartProps {
  items: CartItemData[];
  discount: number;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onSetDiscount?: (discount: number) => void;
}

export function Cart({
  items,
  discount,
  onUpdateQty,
  onRemove,
  onClearCart,
  onCheckout,
  onSetDiscount,
}: CartProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountInputValue, setDiscountInputValue] = useState(
    discount > 0 ? String(discount) : ""
  );
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = Math.max(0, subtotal - discount);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Cart Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-800">Pesanan Kasir</h2>
          {totalItemsCount > 0 && (
            <span className="rounded-full bg-[#47957F]/10 px-2 py-0.5 text-xs font-semibold text-[#3D8383] border border-[#47957F]/20">
              {totalItemsCount} item
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center text-zinc-400">
            <svg
              className="h-12 w-12 text-zinc-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
              />
            </svg>
            <p className="text-sm font-semibold text-zinc-700">
              Keranjang masih kosong
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Pilih menu fresh untuk ditambahkan ke pesanan.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer & Checkout */}
      {items.length > 0 && (
        <div className="border-t border-zinc-100 bg-zinc-50/70 p-4 rounded-b-2xl">
          <div className="flex flex-col gap-1.5 mb-4 text-xs text-zinc-500">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-zinc-800">
                {formatRupiah(subtotal)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-between text-[#3D8383] font-semibold">
                <span>Diskon Kupon</span>
                <span>-{formatRupiah(discount)}</span>
              </div>
            )}

            {/* Quick Discount / Coupon Toggle */}
            {onSetDiscount && (
              <div className="pt-0.5">
                {!showDiscountInput ? (
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(true)}
                    className="text-[11px] font-semibold text-[#47957F] hover:text-[#3D8383] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏷️</span>
                    <span>{discount > 0 ? "Ubah Diskon / Kupon" : "+ Tambah Kupon / Diskon"}</span>
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-white border border-[#D5E4DF] space-y-1.5 mt-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#183331]">Diskon Nominal (Rp)</span>
                      <button
                        type="button"
                        onClick={() => setShowDiscountInput(false)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        ✕ Tutup
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="0"
                        value={discountInputValue}
                        onChange={(e) => {
                          setDiscountInputValue(e.target.value);
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          onSetDiscount(Math.min(subtotal, val));
                        }}
                        className="w-full rounded-lg border border-[#D5E4DF] px-2 py-1 text-xs text-[#183331] focus:outline-none focus:ring-1 focus:ring-[#47957F]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountInputValue("5000");
                          onSetDiscount(Math.min(subtotal, 5000));
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EAF5F1] text-[#2A5E56] border border-[#CDE5DD] hover:bg-[#D5EFE7] cursor-pointer"
                      >
                        Rp 5.000
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountInputValue("10000");
                          onSetDiscount(Math.min(subtotal, 10000));
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EAF5F1] text-[#2A5E56] border border-[#CDE5DD] hover:bg-[#D5EFE7] cursor-pointer"
                      >
                        Rp 10.000
                      </button>
                      {discount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDiscountInputValue("");
                            onSetDiscount(0);
                            setShowDiscountInput(false);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer ml-auto"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
              <span>Total Tagihan</span>
              <span className="text-lg font-black text-[#3D8383]">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onCheckout}
            className="w-full text-base font-bold py-3.5 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            Bayar Sekarang ({formatRupiah(total)})
          </Button>
        </div>
      )}
    </div>
  );
}
