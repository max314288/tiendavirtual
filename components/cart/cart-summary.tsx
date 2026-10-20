import { Lock, Truck } from "lucide-react";
import Link from "next/link";
import { freeShippingProgress } from "@/lib/cart/totals";
import type { Cart } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";

type Props = {
  cart: Cart;
  locale: string;
  freeShippingThreshold: string | null;
};

const BLOCKING = new Set(["out_of_stock", "insufficient_stock", "unavailable"]);

export function hasBlockingIssues(cart: Cart) {
  return cart.lines.some((l) => l.issue && BLOCKING.has(l.issue));
}

export function FreeShippingBar({ subtotal, threshold, locale, currencyCode }: { subtotal: string; threshold: string | null; locale: string; currencyCode: string }) {
  const progress = freeShippingProgress(subtotal, threshold);
  if (!progress) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-space-xs text-label-md text-on-surface">
        <Truck className="size-4 text-secondary" aria-hidden />
        {progress.reached ? (
          "¡Tienes envío gratis!"
        ) : (
          <span>
            Te faltan <strong>{formatMoney(progress.remaining, currencyCode, locale)}</strong> para envío gratis
          </span>
        )}
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
        aria-label="Avance hacia el envío gratis"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-secondary transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

/** Totals block. Prices include IGV; shipping is chosen at checkout (Phase 4). */
export function CartTotals({ cart, locale, freeShippingThreshold }: Props) {
  const money = (m: string) => formatMoney(m, cart.currencyCode, locale);
  const freeShipping = cart.promotion?.freeShipping || freeShippingProgress(cart.subtotal, freeShippingThreshold)?.reached;
  return (
    <dl className="space-y-1.5 text-body-md text-on-surface-variant">
      <div className="flex justify-between">
        <dt>Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "producto" : "productos"})</dt>
        <dd className="text-on-surface">{money(cart.subtotal)}</dd>
      </div>
      {cart.discountTotal !== "0.00" && (
        <div className="flex justify-between text-on-tertiary-container">
          <dt>Descuento{cart.promotion ? ` (${cart.promotion.code})` : ""}</dt>
          <dd>−{money(cart.discountTotal)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>Envío</dt>
        <dd className={freeShipping ? "text-on-tertiary-container" : ""}>{freeShipping ? "Gratis" : "Se calcula en el checkout"}</dd>
      </div>
      <div className="flex items-baseline justify-between pt-space-xs text-title-md text-on-surface">
        <dt>Total</dt>
        <dd>{money(cart.total)}</dd>
      </div>
      <div className="flex justify-between text-label-sm">
        <dt>Incluye IGV</dt>
        <dd>{money(cart.taxIncluded)}</dd>
      </div>
    </dl>
  );
}

export function CheckoutButton({ cart }: { cart: Cart }) {
  if (hasBlockingIssues(cart)) {
    return (
      <div className="space-y-space-xs">
        <button
          type="button"
          disabled
          className="flex h-12 w-full items-center justify-center gap-space-sm rounded-xl bg-secondary text-label-lg text-on-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Lock className="size-4" aria-hidden />
          Ir a pagar
        </button>
        <p className="text-center text-label-sm text-on-surface-variant">Resuelve los productos marcados para continuar.</p>
      </div>
    );
  }
  return (
    <Link
      href="/checkout"
      className="flex h-12 w-full items-center justify-center gap-space-sm rounded-xl bg-secondary text-label-lg text-on-secondary transition-colors hover:bg-secondary-container"
    >
      <Lock className="size-4" aria-hidden />
      Ir a pagar
    </Link>
  );
}
