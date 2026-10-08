"use client";

import { cn } from "@/lib/utils/cn";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[#224440]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-[#173333]",
            "placeholder:text-[#91A8A3]",
            "transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[#47957F]/25 focus:border-[#47957F]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-rose-500 focus:ring-rose-500/25"
              : "border-[#D6E3DE] hover:border-[#B5CEC6]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {helperText && !error && (
          <p className="text-[11px] text-[#60807A]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
