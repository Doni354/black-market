"use client";

import { useState, useMemo } from "react";
import { formatRupiah } from "@/lib/utils/money";
import type { Customer } from "@/lib/types";

interface CustomerTableProps {
  initialCustomers: Customer[];
}

export function CustomerTable({ initialCustomers }: CustomerTableProps) {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const query = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <input
          type="text"
          placeholder="Cari nama, WhatsApp, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3.5">Nama Pelanggan</th>
                <th className="px-4 py-3.5">Kontak / WhatsApp</th>
                <th className="px-4 py-3.5 text-center">Total Order</th>
                <th className="px-4 py-3.5 text-right">Total Transaksi</th>
                <th className="px-4 py-3.5">Terakhir Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-base font-medium">Belum ada data pelanggan</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Customer yang melakukan Pre-Order atau transaksi dengan nomor HP akan otomatis tercatat di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const dateStr =
                    typeof cust.updatedAt === "string"
                      ? new Date(cust.updatedAt).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                        })
                      : "—";

                  return (
                    <tr
                      key={cust.id}
                      className="transition-colors hover:bg-zinc-800/30"
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-100 whitespace-nowrap">
                        {cust.name}
                        {cust.email && (
                          <span className="block text-[11px] text-zinc-500 font-normal">
                            {cust.email}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-300 whitespace-nowrap">
                        {cust.phone ? (
                          <a
                            href={`https://wa.me/${cust.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <span>📱 {cust.phone}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-semibold text-zinc-200 whitespace-nowrap">
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5">
                          {cust.totalOrders}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-400 whitespace-nowrap">
                        {formatRupiah(cust.totalSpent)}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
