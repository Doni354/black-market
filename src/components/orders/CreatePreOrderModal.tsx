"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils/money";
import { createPreOrderAction } from "@/lib/actions/orders";
import type { Product, PaymentMethod } from "@/lib/types";

interface CreatePreOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
}

export function CreatePreOrderModal({
  isOpen,
  onClose,
  products,
  onSuccess,
}: CreatePreOrderModalProps) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeProducts = products.filter((p) => p.isActive);

  function handleQuantityChange(productId: string, delta: number) {
    setSelectedItems((prev) => {
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

  const orderItems = Array.from(selectedItems.entries()).map(([productId, quantity]) => {
    const product = products.find((p) => p.id === productId)!;
    return {
      productId,
      quantity,
      product,
      subtotal: product ? product.price * quantity : 0,
    };
  });

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!customerName.trim()) {
      setErrorMsg("Nama customer wajib diisi.");
      return;
    }

    if (orderItems.length === 0) {
      setErrorMsg("Pilih minimal satu produk untuk dipesan.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPreOrderAction({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        proofUrl: proofUrl || undefined,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      if (!res.success) {
        throw new Error(res.message || "Gagal membuat pre-order.");
      }

      toast(res.message || "Pre-Order berhasil dibuat!", "success");
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pre-order."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Pre-Order Manual"
      description="Catat pesanan pre-order customer offline atau via WhatsApp untuk penukaran di stan Noury."
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || uploadingProof}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={submitting}
            disabled={uploadingProof || orderItems.length === 0 || !customerName.trim()}
            onClick={handleSubmit}
            className="font-bold px-5 bg-[#47957F] hover:bg-[#3D8383] text-white shadow-md shadow-[#47957F]/20 cursor-pointer"
          >
            Simpan Pre-Order ({formatRupiah(total)})
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs text-zinc-700">
        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <Input
            label="Nama Pemesan"
            placeholder="Contoh: Budi Santoso"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <Input
            label="No. WhatsApp / HP"
            placeholder="Contoh: 08123456789"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
          <Input
            label="Email Pelanggan (Opsional)"
            type="email"
            placeholder="Contoh: budi@gmail.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
          <Input
            label="Catatan Tambahan (Opsional)"
            placeholder="Contoh: Tanpa es / Less sugar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Product Selection List */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Pilih Item Pesanan
          </label>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100 bg-white shadow-xs">
            {activeProducts.length === 0 ? (
              <p className="p-4 text-center text-zinc-400">
                Tidak ada menu aktif tersedia.
              </p>
            ) : (
              activeProducts.map((prod) => {
                const qty = selectedItems.get(prod.id) || 0;
                return (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-2.5 hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-semibold text-zinc-800">{prod.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {formatRupiah(prod.price)}{" "}
                        <span className="text-zinc-400">• Stok: {prod.stock}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(prod.id, -1)}
                          className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
                        >
                          -
                        </button>
                      )}
                      <span className={`w-5 text-center font-bold ${qty > 0 ? "text-[#3D8383]" : "text-zinc-400"}`}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(prod.id, 1)}
                        className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Rencana Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["BANK_TRANSFER", "QRIS", "CASH"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-lg border py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === m
                    ? "border-[#47957F] bg-[#47957F]/10 text-[#3D8383] font-bold"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {m === "BANK_TRANSFER" ? "🏦 Transfer" : m === "QRIS" ? "📱 QRIS" : "💵 Tunai"}
              </button>
            ))}
          </div>
        </div>

        {/* Proof of Payment (Optional) */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Lampiran Bukti Transfer (Opsional)
            </span>
            {proofUrl && (
              <button
                type="button"
                onClick={() => setProofUrl("")}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>

          {proofUrl ? (
            <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-zinc-200">
              <Image
                src={proofUrl}
                alt="Bukti pembayaran"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingProof || submitting}
                className="text-xs text-zinc-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              />
              {uploadingProof && (
                <span className="text-[11px] text-[#47957F]">Mengupload...</span>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {errorMsg}
          </div>
        )}
      </form>
    </Modal>
  );
}
