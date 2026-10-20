import { toCents } from "@/lib/cart/totals";
import type { Money } from "@/lib/catalog/types";
import { formatMoney } from "@/lib/money";

/**
 * Promotion rules (Modelo BD v2 §7: promotions, promotion_codes,
 * promotion_targets). Pure so the mock backend and tests share it; the real
 * backend applies the same rules in SQL.
 */

export type PromotionType = "percentage" | "fixed_amount" | "free_shipping";

export type Promotion = {
  id: string;
  /** promotion_codes.code; null for automatic promotions. */
  code: string | null;
  /** Shopper-facing label, e.g. "10% de bienvenida". */
  label: string;
  type: PromotionType;
  /** Percent (10 = 10%) or amount in currency units. Ignored for free shipping. */
  value: number;
  appliesTo: "order" | "categories";
  /** promotion_targets of type category (ltree paths, subtree included). */
  categoryPaths: string[];
  minSubtotal: Money | null;
  maxDiscount: Money | null;
  startsAt: string;
  endsAt: string | null;
  usageLimitPerCustomer: number | null;
};

export type PromoLine = { id: string; lineCents: number; categoryPaths: string[] };

export type PromotionResult =
  | { ok: true; discountCents: number; freeShipping: boolean; allocations: Record<string, number> }
  | { ok: false; reason: string };

const inCategory = (line: PromoLine, paths: string[]) =>
  line.categoryPaths.some((c) => paths.some((p) => c === p || c.startsWith(`${p}.`)));

/** Splits a discount across lines proportionally; rounding remainder goes to the largest line. */
export function allocate(discountCents: number, lines: PromoLine[]): Record<string, number> {
  const base = lines.reduce((s, l) => s + l.lineCents, 0);
  const out: Record<string, number> = {};
  if (base === 0 || discountCents === 0) return out;
  let assigned = 0;
  for (const l of lines) {
    out[l.id] = Math.floor((discountCents * l.lineCents) / base);
    assigned += out[l.id];
  }
  const largest = lines.reduce((a, b) => (b.lineCents > a.lineCents ? b : a));
  out[largest.id] += discountCents - assigned;
  return out;
}

export function evaluatePromotion(promo: Promotion, lines: PromoLine[], now: Date, timesUsedByCustomer = 0): PromotionResult {
  if (new Date(promo.startsAt) > now) return { ok: false, reason: "Este cupón todavía no está vigente." };
  if (promo.endsAt && new Date(promo.endsAt) < now) return { ok: false, reason: "Este cupón ya venció." };
  if (promo.usageLimitPerCustomer !== null && timesUsedByCustomer >= promo.usageLimitPerCustomer) {
    return { ok: false, reason: "Ya usaste este cupón." };
  }

  const subtotal = lines.reduce((s, l) => s + l.lineCents, 0);
  if (promo.minSubtotal && subtotal < toCents(promo.minSubtotal)) {
    // v1 sells in PEN only (README, Alcance v1).
    return { ok: false, reason: `Este cupón aplica en compras desde ${formatMoney(promo.minSubtotal, "PEN", "es-PE")}.` };
  }

  const eligible = promo.appliesTo === "categories" ? lines.filter((l) => inCategory(l, promo.categoryPaths)) : lines;
  if (eligible.length === 0) return { ok: false, reason: "Tu carrito no tiene productos que apliquen a este cupón." };

  if (promo.type === "free_shipping") return { ok: true, discountCents: 0, freeShipping: true, allocations: {} };

  const eligibleCents = eligible.reduce((s, l) => s + l.lineCents, 0);
  let discount = promo.type === "percentage" ? Math.round((eligibleCents * promo.value) / 100) : Math.round(promo.value * 100);
  if (promo.maxDiscount) discount = Math.min(discount, toCents(promo.maxDiscount));
  discount = Math.min(discount, eligibleCents); // never below zero
  return { ok: true, discountCents: discount, freeShipping: false, allocations: allocate(discount, eligible) };
}

export const normalizeCode = (code: string) => code.trim().toUpperCase();

