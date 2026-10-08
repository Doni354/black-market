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
  { value: "FRUIT_BOWL", label: "Fruit Bowl & Salad Buah" },
  { value: "SMOOTHIE_JUICE", label: "Cold-Pressed Smoothie & Juice" },
  { value: "INFUSED_WATER", label: "Infused Water Segar" },
  { value: "HEALTHY_FOOD", label: "Healthy Food & Wraps" },
  { value: "BUNDLE", label: "Paket Bundling Hemat" },
  { value: "FOOD", label: "Makanan Sehat Lainnya" },
  { value: "DRINK", label: "Minuman Sehat Lainnya" },
  { value: "OTHER", label: "Lainnya" },
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
  const [type, setType] = useState<ProductType>(initialData?.type || "FRUIT_BOWL");
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
      formData.append("folder", "noury/products");

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
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#183331] mb-4">
          Informasi Dasar Produk
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <Input
              label="Nama Produk *"
              placeholder="Contoh: Fresh Fruit Bowl / Green Detox Smoothie / Infused Water"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#183331]">
              Tipe Produk *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              disabled={loading}
              className="w-full rounded-xl border border-[#D5E4DF] bg-[#FAFCFB] px-3.5 py-2.5 text-sm text-[#183331] transition-colors focus:outline-none focus:ring-2 focus:ring-[#47957F]"
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
              placeholder="Contoh: Fruit Bowls, Smoothies, Infused Water, Healthy Snack"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[#183331]">
              Deskripsi (Opsional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail menu, komposisi buah segar, rasa, atau manfaat sehatnya..."
              disabled={loading}
              className="w-full rounded-xl border border-[#D5E4DF] bg-[#FAFCFB] px-3.5 py-2.5 text-sm text-[#183331] transition-colors placeholder:text-[#8AA59F] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#183331] mb-4">
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
        <div className="mt-6 flex flex-col gap-3.5 border-t border-[#EEF5F2] pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-[#C4D9D2] text-[#47957F] focus:ring-[#47957F]"
            />
            <div>
              <span className="text-sm font-semibold text-[#183331]">
                Pantau Stok Otomatis
              </span>
              <p className="text-xs text-[#52706C]">
                Stok akan otomatis berkurang saat pesanan POS kasir atau tiket Pre-Order berhasil.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPreOrderAvailable}
              onChange={(e) => setIsPreOrderAvailable(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-[#C4D9D2] text-[#47957F] focus:ring-[#47957F]"
            />
            <div>
              <span className="text-sm font-semibold text-[#183331]">
                Tersedia untuk Pre-Order
              </span>
              <p className="text-xs text-[#52706C]">
                Menu ini akan tampil di katalog publik dan dapat dipesan sebelum Market Day.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-[#C4D9D2] text-[#47957F] focus:ring-[#47957F]"
            />
            <div>
              <span className="text-sm font-semibold text-[#183331]">
                Status Menu Aktif
              </span>
              <p className="text-xs text-[#52706C]">
                Jika dinonaktifkan, menu tidak akan muncul di POS kasir maupun katalog.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Cloudinary Image Upload */}
      <div className="rounded-2xl border border-[#E2ECE8] bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-[#183331] mb-1">
          Foto Menu / Produk
        </h2>
        <p className="text-xs text-[#52706C] mb-4">
          Upload foto hidangan segar atau botol minuman untuk ditampilkan di kasir dan website pelanggan.
        </p>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          {imageUrl ? (
            <div className="relative h-32 w-32 rounded-2xl overflow-hidden border border-[#D5E4DF] bg-[#F4F9F7]">
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
                className="absolute top-1.5 right-1.5 rounded-full bg-rose-600 p-1 text-white hover:bg-rose-700 transition-colors shadow-xs"
                title="Hapus foto"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-dashed border-[#C4D9D2] bg-[#F7FAF9] text-[#7A9C96]">
              <span className="text-xs font-medium">Belum ada foto</span>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              id="product-image-upload"
              onChange={handleImageUpload}
              disabled={uploadingImage || loading}
              className="text-sm text-[#52706C] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EAF5F1] file:text-[#2A5E56] hover:file:bg-[#D8EDE5] cursor-pointer"
            />
            {uploadingImage && (
              <p className="text-xs text-[#47957F] font-semibold flex items-center gap-1.5">
                Mengupload ke Cloudinary...
              </p>
            )}
            <p className="text-xs text-[#7A9C96]">
              Format yang didukung: JPG, PNG, WebP. Maksimal 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Bundling Section (Conditional) */}
      {type === "BUNDLE" && (
        <div className="rounded-2xl border border-[#D1E8DF] bg-[#F4FAF7] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#183331]">
                Komposisi Paket Bundling
              </h2>
              <p className="text-xs text-[#52706C]">
                Pilih menu individual yang termasuk di dalam paket ini. Stok komponen akan otomatis terpotong saat bundle terjual.
              </p>
            </div>
          </div>

          {/* Add item to bundle dropdown */}
          <div className="flex items-center gap-2 mb-4">
            <select
              id="select-bundle-product"
              className="flex-1 rounded-xl border border-[#D5E4DF] bg-white px-3.5 py-2.5 text-sm text-[#183331] focus:outline-none focus:ring-2 focus:ring-[#47957F]"
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
            <p className="text-xs text-[#7A9C96] italic py-2">
              Belum ada komponen produk yang dipilih untuk paket ini.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {bundleItems.map((item) => {
                const prod = availableProducts.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded-xl border border-[#E2ECE8] bg-white px-4 py-2.5 shadow-xs"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#183331]">
                        {prod ? prod.name : `Produk ID: ${item.productId}`}
                      </p>
                      <p className="text-xs text-[#7A9C96]">
                        {prod ? formatRupiah(prod.price) : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border border-[#D5E4DF] rounded-xl px-2.5 py-1 bg-[#FAFCFB]">
                        <button
                          type="button"
                          onClick={() => updateBundleItemQty(item.productId, -1)}
                          className="text-[#52706C] hover:text-[#183331] px-1 text-sm font-bold"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#183331] min-w-[1.5rem] text-center">
                          {item.quantity}x
                        </span>
                        <button
                          type="button"
                          onClick={() => updateBundleItemQty(item.productId, 1)}
                          className="text-[#52706C] hover:text-[#183331] px-1 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBundleItem(item.productId)}
                        className="text-xs text-rose-600 hover:text-rose-700 p-1 font-bold"
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
