"use client";

import { CheckCircle2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CartUI = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Shows the "added to cart" toast. */
  notify: (message: string) => void;
};

const CartUIContext = createContext<CartUI | null>(null);

export function useCartUI(): CartUI {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used inside <CartUIProvider>");
  return ctx;
}

/** Drawer open state and toast, shared by the header, the drawer and "add to cart" buttons. */
export function CartUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => ({ isOpen, open, close, notify }), [isOpen, open, close, notify]);

  return (
    <CartUIContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-margin-mobile lg:bottom-6">
        {toast && (
          <p
            key={toast.id}
            className="flex items-center gap-space-sm rounded-xl bg-inverse-surface px-space-md py-space-sm text-label-lg text-inverse-on-surface shadow-surface-2 transition-all duration-300 starting:translate-y-4 starting:opacity-0"
          >
            <CheckCircle2 className="size-5 text-tertiary-fixed-dim" aria-hidden />
            {toast.message}
          </p>
        )}
      </div>
    </CartUIContext.Provider>
  );
}
