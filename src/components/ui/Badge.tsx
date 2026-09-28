import { cn } from "@/lib/utils/cn";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-emerald-950 text-emerald-400 border-emerald-800",
  warning: "bg-yellow-950/70 text-yellow-400 border-yellow-800/60",
  danger: "bg-red-950 text-red-400 border-red-800",
  info: "bg-blue-950 text-blue-400 border-blue-800",
  muted: "bg-zinc-900 text-zinc-500 border-zinc-800",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Helper to get badge variant based on order status
export function getOrderStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DRAFT: "muted",
    PENDING_PAYMENT: "warning",
    WAITING_VERIFICATION: "warning",
    PAID: "success",
    READY_FOR_REDEMPTION: "info",
    REDEEMED: "success",
    COMPLETED: "success",
    CANCELLED: "danger",
  };
  return map[status] ?? "default";
}

// Helper to get badge variant based on payment status
export function getPaymentStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    UNPAID: "danger",
    PENDING: "warning",
    PAID: "success",
    FAILED: "danger",
    REFUNDED: "muted",
  };
  return map[status] ?? "default";
}
