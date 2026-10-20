import type { Money } from "@/lib/catalog/types";
import type { CartLine, CartLineIssue } from "./types";

// Money math in integer cents. Prices include IGV, so tax is extracted, not
// added. Rounding is per line (pending final decision, see README).

export const toCents = (m: Money) => Math.round(Number(m) * 100);
export const fromCents = (c: number): Money => (c / 100).toFixed(2);

/** IGV contained in a tax-inclusive amount: amount − amount / (1 + rate). */
export function includedTaxCents(amountCents: number, taxRate: number): number {
  return amountCents - Math.round(amountCents / (1 + taxRate));
}

/** Totals with optional per-line discount allocations (cents, see promotions/engine). */
export function cartTotals(
  lines: (Pick<CartLine, "quantity" | "unitPrice"> & { id?: string })[],
  taxRate: number,
  allocations: Record<string, number> = {},
) {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const line of lines) {
    const lineCents = toCents(line.unitPrice) * line.quantity;
    const lineDiscount = (line.id && allocations[line.id]) || 0;
    subtotal += lineCents;
    discount += lineDiscount;
    tax += includedTaxCents(lineCents - lineDiscount, taxRate);
  }
  return {
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: fromCents(subtotal),
    discountTotal: fromCents(discount),
    taxIncluded: fromCents(tax),
    total: fromCents(subtotal - discount),
  };
}

export function lineIssue(
  line: { quantity: number; unitPrice: Money; unitPriceSnapshot: Money; available: number; allowBackorder: boolean },
  exists = true,
): CartLineIssue | null {
  if (!exists) return "unavailable";
  if (!line.allowBackorder && line.available <= 0) return "out_of_stock";
  if (!line.allowBackorder && line.quantity > line.available) return "insufficient_stock";
  if (toCents(line.unitPrice) !== toCents(line.unitPriceSnapshot)) return "price_changed";
  return null;
}

/** 0–100 progress toward free shipping, and what's missing. */
export function freeShippingProgress(subtotal: Money, threshold: Money | null) {
  if (!threshold) return null;
  const t = toCents(threshold);
  const s = toCents(subtotal);
  return {
    reached: s >= t,
    remaining: fromCents(Math.max(0, t - s)),
    percent: t > 0 ? Math.min(100, Math.round((s / t) * 100)) : 100,
  };
}
