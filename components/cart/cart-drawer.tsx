"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Cart } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";
import { CartLineItem } from "./cart-line-item";
import { CartTotals, CheckoutButton, FreeShippingBar } from "./cart-summary";
import { useCartUI } from "./cart-ui";

type Props = {
  cart: Cart | null;
  currencyCode: string;
  locale: string;
  freeShippingThreshold: string | null;
};

/** Header cart button + right-side drawer (full screen on mobile). */
export function CartDrawer({ cart, currencyCode, locale, freeShippingThreshold }: Props) {
  const { isOpen, open, close } = useCartUI();
  const ref = useRef<HTMLDialogElement>(null);
  const count = cart?.itemCount ?? 0;
  const total = formatMoney(cart?.total ?? "0", currencyCode, locale);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`Carrito, ${count} ${count === 1 ? "producto" : "productos"}, total ${total}`}
        className="flex h-11 min-w-touch items-center justify-center gap-space-sm rounded-xl bg-primary px-space-sm text-label-lg text-on-primary shadow-surface-1 transition-colors hover:bg-surface-tint sm:px-space-md"
      >
        <ShoppingBag className="size-5" aria-hidden />
        <span className="hidden sm:inline">Carrito</span>
        {count > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-label-sm text-on-secondary">{count}</span>
        )}
        <span className="hidden border-l border-on-primary/20 pl-space-xs text-label-md md:inline">{total}</span>
      </button>

      <dialog
        ref={ref}
        aria-label="Tu carrito"
        onClose={close}
        onClick={(e) => {
          // Backdrop click, or a link inside (product, "Ver carrito") navigates away.
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.closest("a")) close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-none translate-x-full bg-surface-container-lowest p-0 text-on-surface shadow-surface-2 transition-[translate,display,overlay] transition-discrete duration-200 ease-out backdrop:bg-backdrop backdrop:backdrop-blur-[4px] open:translate-x-0 starting:open:translate-x-full sm:w-[440px]"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-outline-variant/40 px-space-md py-space-sm">
            <h2 className="text-headline-sm">
              Tu carrito <span className="text-body-md text-on-surface-variant">({count})</span>
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar carrito"
              className="flex size-touch items-center justify-center rounded-lg hover:bg-surface-container-low"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          {cart && cart.lines.length > 0 ? (
            <>
              <div className="bg-surface-container-low px-space-md py-space-sm empty:hidden">
                <FreeShippingBar subtotal={cart.subtotal} threshold={freeShippingThreshold} locale={locale} currencyCode={currencyCode} />
              </div>
              <ul className="flex-1 space-y-space-sm overflow-y-auto px-space-md py-space-md">
                {cart.lines.map((line) => (
                  <CartLineItem key={line.id} line={line} currencyCode={currencyCode} locale={locale} compact />
                ))}
              </ul>
              <footer className="space-y-space-md border-t border-outline-variant/40 p-space-md">
                <CartTotals cart={cart} locale={locale} freeShippingThreshold={freeShippingThreshold} />
                <CheckoutButton cart={cart} />
                <div className="grid grid-cols-2 gap-space-xs">
                  <Link
                    href="/carrito"
                    className="flex h-11 items-center justify-center rounded-xl border border-outline-variant text-label-md hover:bg-surface-container-low"
                  >
                    Ver carrito
                  </Link>
                  <button type="button" onClick={close} className="h-11 rounded-xl bg-surface-container-low text-label-md hover:bg-surface-container">
                    Seguir comprando
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-space-sm px-space-lg text-center">
              <ShoppingBag className="size-10 text-on-surface-variant" aria-hidden />
              <p className="text-title-md">Tu carrito está vacío</p>
              <p className="text-body-md text-on-surface-variant">Explora el catálogo y agrega tus favoritos.</p>
              <Link href="/buscar" className="mt-space-sm inline-flex h-11 items-center rounded-xl bg-primary px-space-lg text-label-lg text-on-primary">
                Explorar productos
              </Link>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
