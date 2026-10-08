"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl sm:max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0e1b1b]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        className={cn(
          "relative flex max-h-[88vh] w-full flex-col rounded-2xl border border-[#DCE8E4] bg-white p-4 sm:p-6 shadow-2xl transition-all text-[#183331]",
          sizeClasses[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header (Fixed) */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EDF4F1] pb-3.5">
          <div>
            <h3 id="modal-title" className="text-base sm:text-lg font-bold text-[#173333]">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-[#5D7E78]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#829E99] hover:bg-[#F0F7F5] hover:text-[#173333] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body (Scrollable if needed) */}
        {children && (
          <div className="flex-1 overflow-y-auto py-3.5 pr-1 text-xs sm:text-sm text-[#2E4E4B]">
            {children}
          </div>
        )}

        {/* Footer (Fixed) */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-[#EDF4F1] pt-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
