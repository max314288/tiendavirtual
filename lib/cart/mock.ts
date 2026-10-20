import type { MockProduct } from "@/lib/catalog/mock/data";
import type { Variant } from "@/lib/catalog/types";
import type { MockCart, MockCartItem } from "@/lib/mock-db";
import { evaluatePromotion, type Promotion } from "@/lib/promotions/engine";
import { cartTotals, lineIssue } from "./totals";
import { MAX_LINE_QUANTITY, type Cart, type CartLine } from "./types";

// Pure helpers for the mock cart; the backend does the same with SQL.

export type VariantRef = { product: MockProduct; variant: Variant };

export function findVariant(products: MockProduct[], variantId: string): VariantRef | null {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function toLine(item: MockCartItem, ref: VariantRef | null): CartLine {
  if (!ref) {
    return {
      id: item.id,
      variantId: item.variantId,
      productSlug: "",
      productName: "Producto no disponible",
      variantTitle: "",
      sku: "",
      image: null,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      compareAtPrice: null,
      lineTotal: "0.00",
      discountAmount: "0.00",
      available: 0,
      allowBackorder: false,
      issue: "unavailable",
    };
  }
  const { product, variant } = ref;
  const line = {
    quantity: item.quantity,
    unitPrice: variant.price,
    unitPriceSnapshot: item.unitPriceSnapshot,
    available: variant.available,
    allowBackorder: variant.allowBackorder,
  };
  return {
    id: item.id,
    variantId: variant.id,
    productSlug: product.slug,
    productName: product.name,
    variantTitle: variant.title,
    sku: variant.sku,
    image: variant.image ?? product.featuredImage,
    ...line,
    compareAtPrice: variant.compareAtPrice,
    lineTotal: ((Math.round(Number(variant.price) * 100) * item.quantity) / 100).toFixed(2),
    discountAmount: "0.00",
    issue: lineIssue(line),
  };
}

export type PromotionContext = {
  promotions: Promotion[];
  now: Date;
  /** How many times this customer already redeemed each promotion id. */
  timesUsed: Record<string, number>;
};

export function buildCart(
  cart: MockCart,
  products: MockProduct[],
  taxRate: number,
  currencyCode: string,
  promo: PromotionContext = { promotions: [], now: new Date(0), timesUsed: {} },
): Cart {
  const lines = cart.items.map((item) => toLine(item, findVariant(products, item.variantId)));
  // Unavailable lines don't count toward totals or promotions.
  const billable = lines.filter((l) => l.issue !== "unavailable");

  let allocations: Record<string, number> = {};
  let promotion: Cart["promotion"] = null;
  let promotionError: string | null = null;
  const code = cart.promotionCode ?? null;
  if (code) {
    const p = promo.promotions.find((x) => x.code === code);
    if (!p) {
      promotionError = `El cupón ${code} ya no existe.`;
    } else {
      const result = evaluatePromotion(
        p,
        billable.map((l) => ({
          id: l.id,
          lineCents: Math.round(Number(l.unitPrice) * 100) * l.quantity,
          categoryPaths: products.find((pr) => pr.slug === l.productSlug)?.categoryPaths ?? [],
        })),
        promo.now,
        promo.timesUsed[p.id] ?? 0,
      );
      if (result.ok) {
        allocations = result.allocations;
        promotion = { code, label: p.label, freeShipping: result.freeShipping };
      } else {
        promotionError = result.reason;
      }
    }
  }

  for (const l of lines) l.discountAmount = ((allocations[l.id] ?? 0) / 100).toFixed(2);

  return {
    id: cart.id,
    currencyCode,
    lines,
    ...cartTotals(billable, taxRate, allocations),
    promotion,
    promotionError,
    updatedAt: cart.updatedAt,
  };
}

export type AddCheck = { ok: true; quantity: number } | { ok: false; error: string };

/** Validates the resulting quantity for a line (existing + added). */
export function checkQuantity(ref: VariantRef | null, desired: number): AddCheck {
  if (!ref || ref.product.variants.length === 0) return { ok: false, error: "Este producto ya no está disponible." };
  const { variant } = ref;
  if (desired > MAX_LINE_QUANTITY) {
    return { ok: false, error: `Puedes llevar hasta ${MAX_LINE_QUANTITY} unidades por producto.` };
  }
  if (!variant.allowBackorder) {
    if (variant.available <= 0) return { ok: false, error: "Este producto está agotado." };
    if (desired > variant.available) {
      return {
        ok: false,
        error: `Solo quedan ${variant.available} ${variant.available === 1 ? "unidad" : "unidades"} disponibles.`,
      };
    }
  }
  return { ok: true, quantity: desired };
}

/** Moves guest items into the customer's cart, capping quantities by stock. */
export function mergeItems(target: MockCartItem[], source: MockCartItem[], products: MockProduct[]): MockCartItem[] {
  const merged = target.map((i) => ({ ...i }));
  for (const item of source) {
    const existing = merged.find((i) => i.variantId === item.variantId);
    const ref = findVariant(products, item.variantId);
    const limit = ref && !ref.variant.allowBackorder ? Math.min(MAX_LINE_QUANTITY, ref.variant.available) : MAX_LINE_QUANTITY;
    if (existing) {
      existing.quantity = Math.max(1, Math.min(limit, existing.quantity + item.quantity));
    } else {
      merged.push({ ...item, quantity: Math.max(1, Math.min(limit, item.quantity)) });
    }
  }
  return merged;
}
