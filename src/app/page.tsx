import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Black Market",
  description: "Black Market — Merchandise & F&B. Temukan produk terbaik kami.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <div className="max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 shadow-2xl shadow-amber-500/30">
            <span className="text-3xl font-black text-black">BM</span>
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-zinc-100">
          BLACK MARKET
        </h1>
        <p className="mt-3 text-lg text-zinc-400">
          Merchandise & F&B
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            Lihat Produk
          </Link>
          <Link
            href="/order"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Pre-Order
          </Link>
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8">
          <Link
            href="/admin/login"
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Admin →
          </Link>
        </div>
      </div>
    </div>
  );
}
