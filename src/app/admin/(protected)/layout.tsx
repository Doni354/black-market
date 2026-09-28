/**
 * Protected Admin Layout — Server Component
 *
 * Verifies session cookie server-side for all protected admin routes.
 * Redirects to /admin/login if unauthenticated.
 * Wraps page content inside AdminShell (sidebar, header, toast provider).
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/layout/AdminShell";

// Force dynamic rendering — auth requires runtime checks
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
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
