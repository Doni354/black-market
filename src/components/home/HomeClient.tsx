"use client";

import { useState } from "react";
import { HomeNavbar } from "./HomeNavbar";
import { HomeCatalog } from "./HomeCatalog";
import { TicketTrackerModal } from "./TicketTrackerModal";
import type { Product } from "@/lib/types";

interface HomeClientProps {
  products: Product[];
}

export function HomeClient({ products }: HomeClientProps) {
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <HomeNavbar onOpenTracker={() => setIsTrackerOpen(true)} />

      {/* Main Catalog Content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-5">
        <HomeCatalog
          products={products}
          onOpenTracker={() => setIsTrackerOpen(true)}
        />
      </main>

      {/* Ticket Tracker Modal */}
      <TicketTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Black Market. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsTrackerOpen(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Lacak Pesanan
            </button>
            <a
              href="/admin/login"
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              Portal Kasir & Admin →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
