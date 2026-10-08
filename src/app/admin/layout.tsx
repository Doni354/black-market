/**
 * Admin Root Layout
 *
 * Defines metadata for all /admin routes.
 * Authentication is enforced inside the (protected) route group.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Noury Admin",
    default: "Noury Admin",
  },
  description: "Noury Operations System — No Worries",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
