"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, parseRupiah } from "@/lib/utils/money";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import type { Product, ProductType, BundleItem } from "@/lib/types";

interface ProductFormProps {
  initialData?: Product;
  availableProducts?: Product[]; // For bundle items selection
  isEdit?: boolean;
}

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "FOOD", label: "Makanan (Food)" },
  { value: "DRINK", label: "Minuman (Drink)" },
  { value: "MERCH", label: "Merchandise (Merch)" },
  { value: "BUNDLE", label: "Paket Bundling (Bundle)" },
  { value: "OTHER", label: "Lainnya (Other)" },
];

export function ProductForm({
  initialData,
  availableProducts = [],
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<ProductType>(initialData?.type || "FOOD");
  const [category, setCategory] = useState(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priceInput, setPriceInput] = useState(
    initialData?.price ? initialData.price.toString() : ""
  );
  const [costPriceInput, setCostPriceInput] = useState(
    initialData?.costPrice ? initialData.costPrice.toString() : ""
  );
  const [stockInput, setStockInput] = useState(
    initialData?.stock !== undefined ? initialData.stock.toString() : "0"
  );
  const [trackInventory, setTrackInventory] = useState(
    initialData?.trackInventory ?? true
  );
  const [isPreOrderAvailable, setIsPreOrderAvailable] = useState(
    initialData?.isPreOrderAvailable ?? false
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");

  // Bundle items state (only used if type === "BUNDLE")
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(
    initialData?.bundleItems || []
  );

  // Image upload handler
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("File harus berupa gambar", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 5MB", "error");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "black-market/products");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal upload gambar");
      }

      setImageUrl(result.url);
      toast("Gambar berhasil diupload", "success");
    } catch (err) {
      console.error(err);
      toast(
        err instanceof Error ? err.message : "Gagal mengupload gambar ke Cloudinary",
        "error"
      );
    } finally {
      setUploadingImage(false);
    }
  }

  // Bundle item handlers
  function addBundleItem(productId: string) {
    if (!productId) return;
    if (bundleItems.some((item) => item.productId === productId)) {
      toast("Produk sudah ada di dalam paket bundling", "warning");
      return;
    }
    setBundleItems((prev) => [...prev, { productId, quantity: 1 }]);
  }

  function updateBundleItemQty(productId: string, delta: number) {
    setBundleItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  }

  function removeBundleItem(productId: string) {
    setBundleItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast("Nama produk wajib diisi", "error");
      return;
    }

    const price = parseRupiah(priceInput);
    if (price <= 0) {
      toast("Harga jual harus lebih dari Rp 0", "error");
      return;
    }

    const costPrice = costPriceInput ? parseRupiah(costPriceInput) : undefined;
    const stock = parseInt(stockInput, 10) || 0;

    if (type === "BUNDLE" && bundleItems.length === 0) {
      toast("Paket bundling harus memiliki minimal 1 produk komponen", "error");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        type,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        price,
        costPrice,
        stock,
        trackInventory,
        isPreOrderAvailable,
        isActive,
        imageUrl: imageUrl || undefined,
        bundleItems: type === "BUNDLE" ? bundleItems : undefined,
      };

      if (isEdit && initialData?.id) {
        const res = await updateProductAction(initialData.id, payload);
        if (!res.success) {
          throw new Error(res.message);
        }
        toast("Produk berhasil diperbarui!", "success");
      } else {
        const res = await createProductAction(payload);
        if (!res.success) {
          throw new Error(res.message);
        }
        toast("Produk baru berhasil ditambahkan!", "success");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }

  const numericPrice = parseRupiah(priceInput);
  const numericCostPrice = parseRupiah(costPriceInput);
  const margin = numericPrice - numericCostPrice;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basic Information */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          Informasi Dasar Produk
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <Input
              label="Nama Produk *"
              placeholder="Contoh: Paket Sosis Bakar / T-Shirt Black Market"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Tipe Produk *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <Input
              label="Kategori (Opsional)"
              placeholder="Contoh: Snack, Coffee, Sticker, Pin"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Deskripsi (Opsional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail produk, bahan, atau porsi..."
              disabled={loading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">
          Harga & Inventaris
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Selling Price */}
          <div>
            <Input
              label="Harga Jual (Rp) *"
              type="number"
              min="0"
              step="500"
              placeholder="15000"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              helperText={numericPrice > 0 ? formatRupiah(numericPrice) : undefined}
              required
              disabled={loading}
            />
          </div>

          {/* Cost Price */}
          <div>
            <Input
              label="Modal / HPP (Rp)"
              type="number"
              min="0"
              step="500"
              placeholder="8000"
              value={costPriceInput}
              onChange={(e) => setCostPriceInput(e.target.value)}
              helperText={
                numericCostPrice > 0
                  ? `${formatRupiah(numericCostPrice)} (Est. margin: ${formatRupiah(
                      margin
                    )})`
                  : "Untuk perhitungan margin/laba"
              }
              disabled={loading}
            />
          </div>

          {/* Stock */}
          <div>
            <Input
              label="Stok Tersedia *"
              type="number"
              min="0"
              step="1"
              placeholder="50"
              value={stockInput}
              onChange={(e) => setStockInput(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Inventory & Pre-order Toggles */}
        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800/80 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200">
                Pantau Stok Otomatis
              </span>
              <p className="text-xs text-zinc-500">
                Stok akan otomatis berkurang saat pesanan POS atau Pre-Order selesai.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPreOrderAvailable}
              onChange={(e) => setIsPreOrderAvailable(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200">
                Tersedia untuk Pre-Order
              </span>
              <p className="text-xs text-zinc-500">
                Produk ini akan tampil di katalog publik dan dapat dipesan sebelum Market Day.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200">
                Status Produk Aktif
              </span>
              <p className="text-xs text-zinc-500">
                Jika dinonaktifkan, produk tidak akan muncul di POS kasir maupun katalog.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Cloudinary Image Upload */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xs">
        <h2 className="text-base font-semibold text-zinc-100 mb-1">
          Foto Produk (Cloudinary)
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Upload foto merchandise atau makanan untuk ditampilkan di POS dan katalog publik.
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          {imageUrl ? (
            <div className="relative h-32 w-32 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
              <Image
                src={imageUrl}
                alt="Product preview"
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700 transition-colors"
                title="Hapus foto"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40 text-zinc-500">
              <span className="text-xs">Belum ada foto</span>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              id="product-image-upload"
              onChange={handleImageUpload}
              disabled={uploadingImage || loading}
              className="text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer"
            />
            {uploadingImage && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                Mengupload ke Cloudinary...
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Format yang didukung: JPG, PNG, WebP. Maksimal 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Bundling Section (Conditional) */}
      {type === "BUNDLE" && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6 backdrop-blur-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Komposisi Paket Bundling
              </h2>
              <p className="text-xs text-zinc-400">
                Pilih produk individual yang termasuk di dalam paket ini. Stok komponen akan otomatis terpotong saat bundle terjual.
              </p>
            </div>
          </div>

          {/* Add item to bundle dropdown */}
          <div className="flex items-center gap-2 mb-4">
            <select
              id="select-bundle-product"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addBundleItem(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>
                + Pilih produk untuk dimasukkan ke dalam paket...
              </option>
              {availableProducts
                .filter((p) => p.type !== "BUNDLE" && p.id !== initialData?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatRupiah(p.price)})
                  </option>
                ))}
            </select>
          </div>

          {/* Selected bundle items list */}
          {bundleItems.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-2">
              Belum ada komponen produk yang dipilih untuk paket ini.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {bundleItems.map((item) => {
                const prod = availableProducts.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {prod ? prod.name : `Produk ID: ${item.productId}`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {prod ? formatRupiah(prod.price) : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border border-zinc-700 rounded-lg px-2 py-1 bg-zinc-950">
                        <button
                          type="button"
                          onClick={() => updateBundleItemQty(item.productId, -1)}
                          className="text-zinc-400 hover:text-white px-1 text-sm font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-zinc-200 min-w-[1.5rem] text-center">
                          {item.quantity}x
                        </span>
                        <button
                          type="button"
                          onClick={() => updateBundleItemQty(item.productId, 1)}
                          className="text-zinc-400 hover:text-white px-1 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBundleItem(item.productId)}
                        className="text-xs text-red-400 hover:text-red-300 p-1"
                        title="Hapus dari bundle"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || uploadingImage}
          onClick={() => router.push("/admin/products")}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={uploadingImage}
        >
          {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
        </Button>
      </div>
    </form>
  );
}
