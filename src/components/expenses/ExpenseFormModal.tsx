"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, parseRupiah } from "@/lib/utils/money";
import { createExpenseAction } from "@/lib/actions/expenses";
import type { ExpenseCategory, PaymentMethod } from "@/lib/types";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "FOOD_MATERIAL", label: "🍉 Bahan Baku Buah, Sayur & Bahan Segar" },
  { value: "MERCH_PRODUCTION", label: "🥣 Mangkok, Wadah & Botol Minuman" },
  { value: "PACKAGING", label: "📦 Cup, Sendok, Sedotan & Kantong Segar" },
  { value: "OPERATIONAL", label: "🧊 Es Batu Kristal, Air Galon & Operasional Stand" },
  { value: "PROMOTION", label: "📢 Cetak Brosur, Banner & Promosi" },
  { value: "OTHER", label: "📎 Kebutuhan Stand Lainnya" },
];

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSuccess,
}: ExpenseFormModalProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState<ExpenseCategory>("FOOD_MATERIAL");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const numericAmount = parseRupiah(amountInput);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File bukti harus berupa gambar", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 5MB", "error");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "noury/expense-receipts");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal upload gambar nota");
      }

      setProofUrl(data.url);
      toast("Nota pengeluaran berhasil diunggah", "success");
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

    if (numericAmount <= 0) {
      setErrorMsg("Nominal pengeluaran harus lebih besar dari Rp 0.");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("Deskripsi keperluan pengeluaran wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createExpenseAction({
        category,
        amount: numericAmount,
        description: description.trim(),
        paymentMethod,
        proofUrl: proofUrl || undefined,
      });

      if (!res.success) {
        throw new Error(res.message || "Gagal mencatat pengeluaran.");
      }

      toast("Pengeluaran berhasil dicatat!", "success");
      // Reset form
      setAmountInput("");
      setDescription("");
      setProofUrl("");
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Pengeluaran Baru"
      description="Masukkan rincian biaya bahan baku buah segar, es kristal, atau kemasan."
      size="md"
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
            disabled={uploadingProof || numericAmount <= 0 || !description.trim()}
            onClick={handleSubmit}
            className="font-bold px-5"
          >
            Simpan Pengeluaran
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs text-[#183331]">
        {/* Category */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#52706C] mb-1.5 block">
            Kategori Pengeluaran
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full rounded-xl border border-[#D5E4DF] bg-white px-3 py-2 text-xs text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F] cursor-pointer"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <Input
            label="Nominal Pengeluaran (Rp)"
            type="number"
            min={0}
            step={1000}
            placeholder="Contoh: 50000"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            helperText={numericAmount > 0 ? formatRupiah(numericAmount) : undefined}
            required
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#52706C] mb-1.5 block">
            Sumber Dana / Metode Bayar
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["CASH", "QRIS", "BANK_TRANSFER", "OTHER"] as PaymentMethod[]).map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-xl border py-2 text-center text-xs font-bold transition-all cursor-pointer ${
                    paymentMethod === m
                      ? "border-[#47957F] bg-[#EAF5F1] text-[#2A5E56]"
                      : "border-[#E2ECE8] bg-white text-[#52706C] hover:bg-[#F8FAF9] hover:text-[#183331]"
                  }`}
                >
                  {m === "BANK_TRANSFER" ? "TRANSFER" : m}
                </button>
              )
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Input
            label="Deskripsi / Keperluan"
            placeholder="Contoh: Beli semangka, melon, es kristal 2 karung & cup"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Proof of Expense (Nota / Struk / Struk Belanja) */}
        <div className="rounded-2xl border border-[#E2ECE8] bg-[#FAFCFB] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#52706C]">
              Foto Nota / Bukti Belanja (Opsional)
            </span>
            {proofUrl && (
              <button
                type="button"
                onClick={() => setProofUrl("")}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold"
              >
                Hapus Foto
              </button>
            )}
          </div>

          {proofUrl ? (
            <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-[#D5E4DF]">
              <Image
                src={proofUrl}
                alt="Nota pengeluaran"
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
                className="text-xs text-[#52706C] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-[#EAF5F1] file:text-[#2A5E56] hover:file:bg-[#D8EDE5] cursor-pointer"
              />
              {uploadingProof && (
                <span className="text-[11px] text-[#47957F] font-semibold">Mengupload...</span>
              )}
            </div>
          )}
          <p className="text-[10px] text-[#7A9C96] mt-1.5">
            Lampirkan struk belanja pasar, nota toko kemasan, atau bukti transfer.
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}
      </form>
    </Modal>
  );
}
