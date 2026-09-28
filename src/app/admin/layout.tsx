/**
 * Admin Layout — Server Component
 *
 * Verifies the session cookie server-side.
 * Redirects to login if not authenticated.
 * Passes user data to AdminShell for rendering.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/layout/AdminShell";
import type { Metadata } from "next";

// Force dynamic rendering — admin pages require auth (runtime env vars)
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: "%s | Black Market Admin",
    default: "Black Market Admin",
  },
  description: "Black Market Operations System",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
