"use client";

import { Badge } from "@/components/ui/Badge";
import type { InventoryMovement, InventoryMovementType } from "@/lib/types";

interface MovementHistoryProps {
  movements: InventoryMovement[];
}

const TYPE_CONFIG: Record<
  InventoryMovementType,
  { label: string; variant: "success" | "danger" | "warning" | "info" | "default" }
> = {
  SALE: { label: "Penjualan (Sale)", variant: "danger" },
  PRE_ORDER: { label: "Alokasi PO", variant: "warning" },
  PURCHASE: { label: "Restock (Purchase)", variant: "success" },
  INITIAL: { label: "Stok Awal", variant: "info" },
  ADJUSTMENT: { label: "Penyesuaian", variant: "default" },
  RETURN: { label: "Retur", variant: "success" },
  CANCELLED_ORDER: { label: "Batal Order", variant: "success" },
};

export function MovementHistory({ movements }: MovementHistoryProps) {
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C4D9D2] bg-white p-12 text-center text-[#7A9C96] shadow-xs">
        <p className="text-sm font-bold text-[#183331]">
          Belum ada riwayat pergerakan stok
        </p>
        <p className="mt-1 text-xs text-[#52706C]">
          Transaksi penjualan POS dan penyesuaian porsi akan tercatat otomatis di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2ECE8] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#183331]">
          <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] text-[11px] uppercase tracking-wider text-[#52706C]">
            <tr>
              <th className="px-4 py-3.5 font-semibold">Waktu</th>
              <th className="px-4 py-3.5 font-semibold">Menu / Produk</th>
              <th className="px-4 py-3.5 font-semibold">Jenis Pergerakan</th>
              <th className="px-4 py-3.5 text-center font-semibold">Perubahan (Delta)</th>
              <th className="px-4 py-3.5 font-semibold">Referensi</th>
              <th className="px-4 py-3.5 font-semibold">Catatan</th>
              <th className="px-4 py-3.5 font-semibold">Oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F5F3]">
            {movements.map((m) => {
              const meta = TYPE_CONFIG[m.type] || {
                label: m.type,
                variant: "default",
              };
              const isPositive = m.quantity > 0;
              const dateStr =
                typeof m.createdAt === "string"
                  ? new Date(m.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—";

              return (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-[#F8FAF9]"
                >
                  {/* Timestamp */}
                  <td className="px-4 py-3 text-xs text-[#52706C] whitespace-nowrap">
                    {dateStr}
                  </td>

                  {/* Product Name */}
                  <td className="px-4 py-3 font-semibold text-[#183331] whitespace-nowrap">
                    {m.productName}
                  </td>

                  {/* Movement Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </td>

                  {/* Delta Quantity */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-block font-mono font-bold text-sm ${
                        isPositive ? "text-[#47957F]" : "text-rose-600"
                      }`}
                    >
                      {isPositive ? `+${m.quantity}` : m.quantity}
                    </span>
                  </td>

                  {/* Reference */}
                  <td className="px-4 py-3 text-xs font-mono text-[#52706C] whitespace-nowrap">
                    {m.referenceId || "—"}
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 text-xs text-[#3A5E58] max-w-xs truncate">
                    {m.note || <span className="text-[#A0BCB6] italic">—</span>}
                  </td>

                  {/* Created By */}
                  <td className="px-4 py-3 text-xs text-[#52706C] whitespace-nowrap font-medium">
                    {m.createdBy}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
