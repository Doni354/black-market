"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onRemove: (id: string) => void;
}

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-white text-emerald-900 shadow-xl",
  error: "border-rose-200 bg-white text-rose-900 shadow-xl",
  warning: "border-amber-200 bg-white text-amber-900 shadow-xl",
  info: "border-[#CEE4EC] bg-white text-[#1D4A47] shadow-xl",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function Toast({ id, message, variant = "info", duration = 4000, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300",
        "max-w-sm text-sm",
        variantClasses[variant],
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
      role="alert"
    >
      <span className="mt-0.5 text-xs font-bold">{variantIcons[variant]}</span>
      <p className="flex-1">{message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(id), 300);
        }}
        className="mt-0.5 opacity-60 hover:opacity-100"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

// Toast context and provider
interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, variant?: ToastVariant) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            message={t.message}
            variant={t.variant}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
