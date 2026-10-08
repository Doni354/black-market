"use client";

import Link from "next/link";
import { HomeNavbar } from "./HomeNavbar";
import { HomeCatalog } from "./HomeCatalog";
import type { Product } from "@/lib/types";

interface HomeClientProps {
  products: Product[];
}

export function HomeClient({ products }: HomeClientProps) {
  return (
    <div className="min-h-screen bg-[#FAFCFA] text-[#183331] flex flex-col selection:bg-[#47957F] selection:text-white">
      {/* Top Navbar */}
      <HomeNavbar />

      {/* Main Catalog Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-5">
        <HomeCatalog products={products} />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E4EFEB] bg-[#F4F9F7] py-8 text-xs text-[#5C7D77]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-bold text-[#204743]">Noury — No Worries</p>
            <p className="text-[11px] text-[#71918B] mt-0.5">
              Playful path toward freshness and healthy living: fruit, water, food.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/account"
              className="text-[#3A645E] hover:text-[#47957F] transition-colors"
            >
              Tiket & Akun Saya
            </Link>
            <span className="text-[#CADAD6]">•</span>
            <Link
              href="/admin/login"
              className="text-[#65857F] hover:text-[#47957F] transition-colors flex items-center gap-1"
            >
              <span>🔒</span>
              <span>Portal Kasir & Staf</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
