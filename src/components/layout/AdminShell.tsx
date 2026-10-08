"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import type { User } from "@/lib/types";

interface AdminShellProps {
  user: User;
  children: React.ReactNode;
}

export function AdminShell({ user, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isPos = pathname === "/admin/pos";
  const isRedeem = pathname.startsWith("/admin/pos/redeem");
  const isOrders = pathname.startsWith("/admin/orders");
  const isDashboard = pathname === "/admin/dashboard";

  return (
    <div className="flex h-screen bg-[#F8FAF9] text-[#183331]">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="flex h-14 items-center justify-between border-b border-[#E2ECE8] bg-white/95 px-4 lg:hidden print:hidden backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/Logo.svg"
              alt="Noury"
              width={75}
              height={26}
              className="h-6 w-auto object-contain"
            />
            <span className="text-sm font-bold text-[#183331]">Noury</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#F0F7F5] border border-[#D1E2DD] px-2.5 py-0.5 text-[10px] font-bold text-[#244642]">
              {user.role}
            </span>
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-[#52706C] hover:bg-[#F0F7F5] hover:text-[#183331] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6 bg-[#F8FAF9]">
          {children}
        </main>

        {/* Bottom Navigation Bar (Mobile Cashier & Admin, hidden on large screens and print) */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-[#E2ECE8] bg-white/95 px-2 backdrop-blur-md lg:hidden print:hidden shadow-lg">
          {/* POS */}
          <Link
            href="/admin/pos"
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isPos ? "text-[#47957F] font-bold" : "text-[#7A9C96] hover:text-[#183331]"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isPos ? "bg-[#47957F]/15" : ""}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isPos ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
            <span className="text-[10px] mt-0.5">Kasir</span>
          </Link>

          {/* Redeem Scanner */}
          <Link
            href="/admin/pos/redeem"
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isRedeem ? "text-[#47957F] font-bold" : "text-[#7A9C96] hover:text-[#183331]"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isRedeem ? "bg-[#47957F]/15" : ""}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isRedeem ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h3v3h-3v-3zM16.5 19.5h3v-3h-3v3zM19.5 13.5h.008v.008H19.5V13.5zM13.5 19.5h.008v.008H13.5V19.5z" />
              </svg>
            </div>
            <span className="text-[10px] mt-0.5">Redeem</span>
          </Link>

          {/* Orders */}
          <Link
            href="/admin/orders"
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isOrders ? "text-[#47957F] font-bold" : "text-[#7A9C96] hover:text-[#183331]"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isOrders ? "bg-[#47957F]/15" : ""}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isOrders ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <span className="text-[10px] mt-0.5">Pesanan</span>
          </Link>

          {/* Dashboard */}
          <Link
            href="/admin/dashboard"
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isDashboard ? "text-[#47957F] font-bold" : "text-[#7A9C96] hover:text-[#183331]"
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isDashboard ? "bg-[#47957F]/15" : ""}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDashboard ? 2.2 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <span className="text-[10px] mt-0.5">Dashboard</span>
          </Link>

          {/* More / Menu */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-1 text-[#7A9C96] hover:text-[#183331] transition-colors cursor-pointer"
          >
            <div className="p-1 rounded-xl">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <span className="text-[10px] mt-0.5">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
