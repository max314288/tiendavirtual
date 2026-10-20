import type { Money } from "./types";

/** Whole-number discount percentage, or null when there is no real discount. */
export function discountPercent(price: Money, compareAtPrice: Money | null): number | null {
  if (!compareAtPrice) return null;
  const p = Number(price);
  const c = Number(compareAtPrice);
  if (!(c > p) || p < 0) return null;
  const pct = Math.round(((c - p) / c) * 100);
  return pct > 0 ? pct : null;
}

/** compare_at − price as a decimal string, or null. */
export function savings(price: Money, compareAtPrice: Money | null): Money | null {
  if (!compareAtPrice) return null;
  // Work in cents to avoid float drift.
  const cents = Math.round(Number(compareAtPrice) * 100) - Math.round(Number(price) * 100);
  return cents > 0 ? (cents / 100).toFixed(2) : null;
}
