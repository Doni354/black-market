import { redirect } from "next/navigation";

// Redirect /admin → /admin/dashboard
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
