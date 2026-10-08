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
  default: "bg-[#F0F7F5] text-[#244642] border-[#D1E2DD]",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
  info: "bg-[#EBF5F8] text-[#245D5D] border-[#CEE4EC]",
  muted: "bg-zinc-100 text-zinc-600 border-zinc-200",
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
