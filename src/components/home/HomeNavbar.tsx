"use client";

import Link from "next/link";
import Image from "next/image";
import { useCustomerAuth } from "@/lib/auth/customer-context";

export function HomeNavbar() {
  const { user, account } = useCustomerAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#E4EFEB] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Direct Brand Logo (Without background container/frame) */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/icons/Logo.svg"
            alt="Noury — No Worries"
            width={125}
            height={44}
            className="h-10 w-auto object-contain transition-transform group-hover:scale-102"
            priority
          />
        </Link>

        {/* Navigation links & Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          <Link
            href="/products"
            className="text-xs font-semibold text-[#3A5E58] hover:text-[#47957F] transition-colors px-2.5 py-1"
          >
            Katalog Menu
          </Link>

          {/* Customer Portal Link */}
          <Link
            href="/account"
            className="flex items-center gap-1.5 rounded-xl border border-[#D5E6E1] bg-[#F2F8F6] hover:bg-[#E4F2ED] px-3 py-1.5 text-xs font-bold text-[#2A5E56] transition-all shadow-xs"
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="User"
                    width={18}
                    height={18}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span>👤</span>
                )}
                <span className="max-w-[80px] truncate sm:max-w-none">
                  {user.displayName?.split(" ")[0] || "Akun Saya"}
                </span>
                {account?.stampsCount ? (
                  <span className="ml-0.5 rounded-full bg-[#CDD272] text-[#223908] px-1.5 py-0.2 text-[9px] font-black">
                    {account.stampsCount}★
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span>🎁</span>
                <span>Kupon & Akun</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
