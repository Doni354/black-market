"use client";

import Link from "next/link";

interface HomeNavbarProps {
  onOpenTracker: () => void;
}

export function HomeNavbar({ onOpenTracker }: HomeNavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 shadow-md shadow-red-950/40 transition-transform group-hover:scale-105">
            <span className="text-sm font-black text-white tracking-wider">BM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-zinc-100 group-hover:text-red-400 transition-colors">
              BLACK MARKET
            </span>
            <span className="text-[10px] text-zinc-400 leading-none">
              Merchandise & F&B
            </span>
          </div>
        </Link>

        {/* Navigation links & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/products"
            className="hidden sm:inline-block text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1"
          >
            Katalog
          </Link>

          <Link
            href="/order"
            className="hidden sm:inline-block text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-2 py-1"
          >
            Pre-Order
          </Link>

          <button
            type="button"
            onClick={onOpenTracker}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            <span>🎫</span>
            <span className="hidden sm:inline">Cek Tiket / Pesanan</span>
            <span className="sm:hidden">Cek Tiket</span>
          </button>

          <Link
            href="/admin/login"
            className="rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/40 transition-colors"
          >
            Kasir
          </Link>
        </div>
      </div>
    </header>
  );
}
