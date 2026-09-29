"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { submitCustomRequestAction } from "@/lib/actions/custom-requests";
import type { CustomMerchType, CustomMerchRequest } from "@/lib/types";

interface CustomMerchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomMerchModal({ isOpen, onClose }: CustomMerchModalProps) {
  const { toast } = useToast();

  const [merchType, setMerchType] = useState<CustomMerchType>("PIN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quantity, setQuantity] = useState("5");
  const [notes, setNotes] = useState("");
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<CustomMerchRequest | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File harus berupa gambar JPG/PNG.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran file maksimal 5MB.", "error");
      return;
    }

    setUploadingDesign(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "black-market/custom-requests");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah desain.");
      }

      setDesignUrl(data.url);
      toast("Desain berhasil diunggah!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengunggah file.", "error");
    } finally {
      setUploadingDesign(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim()) {
      toast("Nama pemesan wajib diisi.", "warning");
      return;
    }

    if (!customerPhone.trim()) {
      toast("Nomor WhatsApp wajib diisi.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCustomRequestAction({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        merchType,
        quantity: Math.max(1, Number(quantity) || 1),
        designUrl: designUrl || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mengirim request.");
      }

      setSubmittedData(res.data);
      toast("Request custom merch berhasil dikirim!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setSubmittedData(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setDesignUrl(null);
    setQuantity("5");
    onClose();
  }

  const merchOptions: Array<{
    type: CustomMerchType;
    label: string;
    icon: string;
    desc: string;
  }> = [
    {
      type: "PIN",
      label: "Pin Peniti",
      icon: "📌",
      desc: "Button pin doff/glossy",
    },
    {
      type: "STICKER",
      label: "Sticker Custom",
      icon: "🏷️",
      desc: "Vinyl die-cut tahan air",
    },
    {
      type: "KEYCHAIN",
      label: "Gantungan Kunci",
      icon: "🔑",
      desc: "Keychain akrilik 2 sisi",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Request Custom Merchandise"
      size="md"
    >
      {submittedData ? (
        <div className="py-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
            🎉
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">
              Request Berhasil Dikirim!
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Terima kasih <strong className="text-zinc-200">{submittedData.customerName}</strong>.
              Tim Black Market akan mereview desain dan menghubungi via WhatsApp untuk konfirmasi mock-up & harga.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono inline-block">
            <span className="text-zinc-500">ID Request: </span>
            <span className="text-red-400 font-bold">{submittedData.requestNumber}</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <a
              href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                `Halo Admin Black Market, saya sudah mengirim Request Custom Merch #${submittedData.requestNumber} (${submittedData.merchType}) atas nama ${submittedData.customerName}. Mohon info selanjutnya ya!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <span>💬</span> Hubungi Admin via WhatsApp
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleResetAndClose}
              className="w-full"
            >
              Selesai & Tutup
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Merch Type Selector */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Pilih Jenis Merchandise
            </label>
            <div className="grid grid-cols-3 gap-2">
              {merchOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setMerchType(opt.type)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    merchType === opt.type
                      ? "bg-red-600/20 border-red-500 text-white shadow-sm shadow-red-500/10"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs font-bold leading-tight">{opt.label}</span>
                  <span className="text-[9px] text-zinc-500 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Lengkap"
              placeholder="Nama kamu / komunitas"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <Input
              label="Nomor WhatsApp"
              placeholder="Contoh: 08123456789"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Estimasi Jumlah (Pcs)"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Upload Mock-up / Desain (Opsional)
              </label>
              {designUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/40">
                    <Image src={designUrl} alt="Design preview" fill className="object-cover" unoptimized />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex-1 truncate">
                    Desain Terunggah
                  </span>
                  <button
                    type="button"
                    onClick={() => setDesignUrl(null)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900 text-xs text-zinc-300 cursor-pointer transition">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{uploadingDesign ? "Mengunggah..." : "Pilih File Gambar"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingDesign}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <Input
            label="Catatan Khusus (Opsional)"
            placeholder="Contoh: Ukuran 44mm, finishing doff, warna dominan merah"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-300">💡 Cara Kerja Custom Merch:</p>
            <p>1. Kirim request dan preview gambar desain di atas.</p>
            <p>2. Tim kami akan menghubungi via WhatsApp untuk konfirmasi sampel & harga.</p>
            <p>3. Jika cocok, pesanan diterbitkan menjadi pre-order (bisa COD atau transfer) dan siap diambil kapan saja setelah selesai diproduksi!</p>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAndClose}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingDesign}
              className="flex-2 bg-red-600 hover:bg-red-500 font-bold"
            >
              {isSubmitting ? "Mengirim Request..." : "Kirim Request Custom"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
