"use client";

import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses = {
  primary:
    "bg-[#47957F] hover:bg-[#3D8383] active:bg-[#326D5C] text-white shadow-md shadow-[#47957F]/20",
  secondary:
    "bg-[#EDF4F1] hover:bg-[#DFECE8] active:bg-[#D1E4DE] text-[#1E433E] border border-[#D5E5E0] shadow-xs",
  danger:
    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs",
  ghost:
    "bg-transparent hover:bg-[#F0F7F4] active:bg-[#E3EFEA] text-[#244642]",
  outline:
    "border border-[#CFE1DC] bg-white hover:bg-[#F4F9F7] active:bg-[#EBF3F0] text-[#244642] shadow-2xs",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-xs font-bold rounded-xl gap-2",
  lg: "px-6 py-3 text-sm font-bold rounded-xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47957F] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
